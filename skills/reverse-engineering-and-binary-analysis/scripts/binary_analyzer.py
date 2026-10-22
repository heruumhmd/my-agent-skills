#!/usr/bin/env python3
"""
binary_analyzer.py — Production-grade Binary Triage and Static Analysis Tool

Zero-dependency binary triage utility for reverse engineers and security analysts.
Inspects file magic, ELF/PE/Mach-O headers, security mitigations (NX, ASLR, RELRO, CFG),
Shannon entropy (packing/encryption detection), cryptographic constant signatures,
and printable ASCII/UTF-16 string IOCs.
"""

import sys
import os
import struct
import math
import re
import argparse
from typing import Dict, List, Tuple, Any, Optional

# Standard cryptographic constant patterns
CRYPTO_PATTERNS = {
    "AES S-box": bytes([
        0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
        0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0
    ]),
    "AES Inverse S-box": bytes([
        0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb
    ]),
    "SHA-256 K-Constants (LE)": struct.pack(
        "<8I", 0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5
    ),
    "SHA-256 K-Constants (BE)": struct.pack(
        ">8I", 0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5
    ),
    "SHA-256 Initial Hash (H0..H7) (LE)": struct.pack(
        "<8I", 0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ),
    "SHA-512 Initial Constants (first 32B)": struct.pack(
        "<4Q", 0x6a09e667f3bcc908, 0xbb67ae8584caa73b, 0x3c6ef372fe94f82b, 0xa54ff53a5f1d36f1
    ),
    "MD5 Init Constants (LE)": struct.pack(
        "<4I", 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476
    ),
    "MD5 Init Constants (BE)": struct.pack(
        ">4I", 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476
    ),
    "ChaCha20 Sigma": b"expand 32-byte k",
    "RC4 Sequential Init": bytes(range(64)),
}


def calculate_entropy(data: bytes) -> float:
    """Calculate Shannon entropy for a byte slice (0.0 to 8.0)."""
    if not data:
        return 0.0
    entropy = 0.0
    length = len(data)
    counts = [0] * 256
    for b in data:
        counts[b] += 1
    for count in counts:
        if count > 0:
            p = count / length
            entropy -= p * math.log2(p)
    return entropy


def detect_file_type(data: bytes) -> Dict[str, Any]:
    """Detect file container and architecture using magic numbers."""
    if len(data) < 4:
        return {"format": "Unknown (Too short)", "magic": data.hex()}

    if data.startswith(b"\x7fELF"):
        bitness = "64-bit" if len(data) > 4 and data[4] == 2 else "32-bit"
        endian = "Little-endian" if len(data) > 5 and data[5] == 1 else "Big-endian"
        arch_id = struct.unpack("<H" if endian == "Little-endian" else ">H", data[18:20])[0] if len(data) >= 20 else 0
        arch_map = {
            0x03: "x86",
            0x3E: "x86_64 (AMD64)",
            0x28: "ARM (32-bit)",
            0xB7: "AArch64 (ARM64)",
            0x08: "MIPS",
            0xF3: "RISC-V",
        }
        arch = arch_map.get(arch_id, f"Unknown (0x{arch_id:04x})")
        return {"format": "ELF", "bitness": bitness, "endian": endian, "architecture": arch}

    if data.startswith(b"MZ"):
        pe_offset = struct.unpack("<I", data[0x3C:0x40])[0] if len(data) >= 0x40 else 0
        is_pe = len(data) >= pe_offset + 4 and data[pe_offset:pe_offset+4] == b"PE\x00\x00"
        arch = "Unknown"
        bitness = "Unknown"
        if is_pe and len(data) >= pe_offset + 6:
            machine = struct.unpack("<H", data[pe_offset+4:pe_offset+6])[0]
            pe_archs = {
                0x14c: ("x86", "32-bit"),
                0x8664: ("x86_64", "64-bit"),
                0xaa64: ("ARM64", "64-bit"),
                0x01c0: ("ARM", "32-bit"),
                0x0200: ("Intel Itanium (IA-64)", "64-bit"),
            }
            if machine in pe_archs:
                arch, bitness = pe_archs[machine]
        return {
            "format": "PE (Portable Executable)" if is_pe else "MS-DOS Executable",
            "bitness": bitness,
            "architecture": arch,
            "pe_offset": pe_offset if is_pe else None,
        }

    if data.startswith((b"\xfe\xed\xfa\xce", b"\xce\xfa\xed\xfe", b"\xfe\xed\xfa\xcf", b"\xcf\xfa\xed\xfe")):
        is_64 = data.startswith((b"\xfe\xed\xfa\xcf", b"\xcf\xfa\xed\xfe"))
        endian = "Big-endian" if data.startswith((b"\xfe\xed\xfa\xce", b"\xfe\xed\xfa\xcf")) else "Little-endian"
        return {"format": "Mach-O (macOS/iOS)", "bitness": "64-bit" if is_64 else "32-bit", "endian": endian}

    if data.startswith(b"\x00asm"):
        return {"format": "WebAssembly (WASM)", "bitness": "32/64-bit"}

    if data.startswith(b"PK\x03\x04"):
        return {"format": "ZIP Archive / JAR / APK / DOCX", "bitness": "N/A"}

    if data.startswith(b"\x1f\x8b"):
        return {"format": "GZIP Archive", "bitness": "N/A"}

    if data.startswith(b"SQLite format 3\x00"):
        return {"format": "SQLite3 Database", "bitness": "N/A"}

    return {"format": "Raw Binary / Data / Firmware", "magic": data[:16].hex()}


def extract_strings(data: bytes, min_len: int = 4, max_strings: int = 100) -> Dict[str, List[str]]:
    """
    Extract printable ASCII and UTF-16LE/BE strings across the binary.
    Categorizes strings into high-signal buckets (network/url, ipv4, filesystem,
    credential/flag, crypto/algo) and general strings.
    """
    categories: Dict[str, List[str]] = {
        "network/url": [],
        "ipv4": [],
        "filesystem": [],
        "credential/flag": [],
        "crypto/algo": [],
        "general": []
    }
    seen = set()

    def categorize_and_add(s: str):
        cleaned = s.strip()
        if len(cleaned) < min_len or cleaned in seen:
            return
        seen.add(cleaned)

        cat = "general"
        if re.search(r"https?://|ftp://|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", cleaned, re.I):
            cat = "network/url"
        elif re.search(r"(?<![A-Za-z0-9_])(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?![A-Za-z0-9_])", cleaned):
            if not re.search(r"(?:version|ver|assembly|v\d)", cleaned, re.I):
                cat = "ipv4"
        elif re.search(r"/(?:etc|bin|usr|var|tmp|home|lib)/|[A-Za-z]:\\[A-Za-z0-9_.\\]+", cleaned):
            cat = "filesystem"
        elif re.search(r"(?:^|[\b_])(?:password|passwd|secret|apikey|api_key|access_token|private_key|token|flag\{|bearer\s)", cleaned, re.I):
            cat = "credential/flag"
        elif re.search(r"(?:^|[\b_])(?:aes|sha256|sha512|md5|chacha20|rsa|ecdsa|cipher)", cleaned, re.I):
            cat = "crypto/algo"

        if cat != "general" and len(categories[cat]) < max_strings:
            categories[cat].append(cleaned)
        elif cat == "general" and len(categories["general"]) < max_strings:
            categories["general"].append(cleaned)

    # 1. ASCII extraction
    ascii_re = re.compile(rb"[\x20-\x7E]{" + str(min_len).encode() + rb",}")
    for m in ascii_re.finditer(data):
        categorize_and_add(m.group().decode("latin1", errors="ignore"))

    # 2. UTF-16LE extraction (Windows wide-character strings)
    utf16le_re = re.compile(rb"(?:[\x20-\x7E]\x00){" + str(min_len).encode() + rb",}")
    for m in utf16le_re.finditer(data):
        try:
            categorize_and_add(m.group().decode("utf-16le", errors="ignore"))
        except Exception:
            pass

    # 3. UTF-16BE extraction (Big-endian wide-character strings)
    utf16be_re = re.compile(rb"(?:\x00[\x20-\x7E]){" + str(min_len).encode() + rb",}")
    for m in utf16be_re.finditer(data):
        try:
            categorize_and_add(m.group().decode("utf-16be", errors="ignore"))
        except Exception:
            pass

    return categories


def scan_crypto_constants(data: bytes) -> List[Tuple[str, int]]:
    """Locate cryptographic constant patterns in data."""
    found = []
    for name, pattern in CRYPTO_PATTERNS.items():
        offset = 0
        while True:
            idx = data.find(pattern, offset)
            if idx == -1:
                break
            found.append((name, idx))
            offset = idx + len(pattern)
    return found


def inspect_security_mitigations(data: bytes, file_info: Dict[str, Any]) -> Dict[str, str]:
    """Examine binary mitigations (NX/DEP, ASLR/PIE, Canary hints, RELRO, CFG)."""
    mitigations = {}
    fmt = file_info.get("format", "")

    if fmt == "ELF":
        endian = file_info.get("endian", "Little-endian")
        endian_char = "<" if endian == "Little-endian" else ">"
        is_64 = file_info.get("bitness") == "64-bit"

        # Check for PIE in e_type (offset 16 in ELF header)
        if len(data) >= 18:
            e_type = struct.unpack(f"{endian_char}H", data[16:18])[0]
            if e_type == 3:
                mitigations["PIE / ASLR"] = "Enabled (Position-Independent Executable / PIE)"
            elif e_type == 2:
                mitigations["PIE / ASLR"] = "Disabled (Fixed Load Address)"

        # Program header inspection for PT_GNU_STACK and PT_GNU_RELRO
        ph_parsed = False
        pt_gnu_stack_id = 0x6474e551
        pt_gnu_relro_id = 0x6474e552

        try:
            if is_64 and len(data) >= 64:
                e_phoff = struct.unpack(f"{endian_char}Q", data[32:40])[0]
                e_phentsize = struct.unpack(f"{endian_char}H", data[54:56])[0]
                e_phnum = struct.unpack(f"{endian_char}H", data[56:58])[0]
                if e_phoff > 0 and e_phentsize >= 56 and e_phnum > 0:
                    ph_parsed = True
                    for i in range(min(e_phnum, 128)):
                        ph_offset = e_phoff + (i * e_phentsize)
                        if len(data) < ph_offset + 56:
                            break
                        p_type = struct.unpack(f"{endian_char}I", data[ph_offset:ph_offset+4])[0]
                        if p_type == pt_gnu_stack_id:
                            p_flags = struct.unpack(f"{endian_char}I", data[ph_offset+4:ph_offset+8])[0]
                            has_exec = bool(p_flags & 0x1)  # PF_X = 1
                            mitigations["NX / Stack Execution"] = "Disabled (Vulnerable / Executable Stack)" if has_exec else "Enabled (NX Active)"
                        elif p_type == pt_gnu_relro_id:
                            mitigations["RELRO"] = "Enabled (GNU_RELRO present)"
            elif not is_64 and len(data) >= 52:
                e_phoff = struct.unpack(f"{endian_char}I", data[28:32])[0]
                e_phentsize = struct.unpack(f"{endian_char}H", data[42:44])[0]
                e_phnum = struct.unpack(f"{endian_char}H", data[44:46])[0]
                if e_phoff > 0 and e_phentsize >= 32 and e_phnum > 0:
                    ph_parsed = True
                    for i in range(min(e_phnum, 128)):
                        ph_offset = e_phoff + (i * e_phentsize)
                        if len(data) < ph_offset + 32:
                            break
                        p_type = struct.unpack(f"{endian_char}I", data[ph_offset:ph_offset+4])[0]
                        if p_type == pt_gnu_stack_id:
                            # In Elf32_Phdr, p_flags is at offset 24 (NOT offset 4!)
                            p_flags = struct.unpack(f"{endian_char}I", data[ph_offset+24:ph_offset+28])[0]
                            has_exec = bool(p_flags & 0x1)  # PF_X = 1
                            mitigations["NX / Stack Execution"] = "Disabled (Vulnerable / Executable Stack)" if has_exec else "Enabled (NX Active)"
                        elif p_type == pt_gnu_relro_id:
                            mitigations["RELRO"] = "Enabled (GNU_RELRO present)"
        except Exception:
            pass

        if "NX / Stack Execution" not in mitigations:
            mitigations["NX / Stack Execution"] = "Unknown / Stripped or non-standard headers" if not ph_parsed else "Default (Executable Stack Assumed)"

        # Check for stack canary references
        if b"__stack_chk_fail" in data:
            mitigations["Stack Canary"] = "Detected (__stack_chk_fail present)"
        else:
            mitigations["Stack Canary"] = "Not found in symbol strings"

    elif "PE" in fmt:
        pe_offset = file_info.get("pe_offset")
        if pe_offset is not None and len(data) >= pe_offset + 96:
            dll_char_pos = pe_offset + 24 + 70
            if len(data) >= dll_char_pos + 2:
                dll_char = struct.unpack("<H", data[dll_char_pos:dll_char_pos+2])[0]
                mitigations["ASLR (Dynamic Base)"] = "Enabled" if (dll_char & 0x0040) else "Disabled"
                mitigations["High-Entropy 64-bit ASLR"] = "Enabled" if (dll_char & 0x0020) else "Disabled"
                mitigations["DEP / NX Compat"] = "Enabled" if (dll_char & 0x0100) else "Disabled"
                mitigations["Control Flow Guard (CFG)"] = "Enabled" if (dll_char & 0x4000) else "Disabled"
                mitigations["Isolation / No SEH"] = "Enabled" if (dll_char & 0x0400) else "Disabled"

        if b"__security_cookie" in data or b"__security_check_cookie" in data:
            mitigations["Stack Canary / GS Cookie"] = "Detected (__security_cookie present)"
        else:
            mitigations["Stack Canary / GS Cookie"] = "Not found in symbol strings"

    elif "Mach-O" in fmt:
        if len(data) >= 28:
            endian = file_info.get("endian", "Little-endian")
            fmt_char = "<I" if endian == "Little-endian" else ">I"
            flags = struct.unpack(fmt_char, data[24:28])[0]
            mitigations["PIE / ASLR"] = "Enabled" if (flags & 0x200000) else "Disabled"
            mitigations["NX / Stack Execution"] = "Disabled (Stack Execution Allowed)" if (flags & 0x20000) else "Enabled (NX Active)"

    return mitigations


def run_triage(filepath: str, verbose: bool = False) -> Dict[str, Any]:
    """Execute complete binary triage pipeline on a target file."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")

    file_size = os.path.getsize(filepath)
    with open(filepath, "rb") as f:
        data = f.read()

    file_type = detect_file_type(data)
    entropy = calculate_entropy(data)
    is_packed = entropy > 7.1

    mitigations = inspect_security_mitigations(data, file_type)
    crypto_matches = scan_crypto_constants(data)
    string_cats = extract_strings(data, min_len=4, max_strings=200 if verbose else 50)

    high_signal = []
    for cat in ["network/url", "ipv4", "filesystem", "credential/flag", "crypto/algo"]:
        for s in string_cats[cat]:
            high_signal.append((cat, s))

    general = [("general", s) for s in string_cats["general"]]

    return {
        "file_path": filepath,
        "file_size_bytes": file_size,
        "shannon_entropy": round(entropy, 4),
        "packing_indicator": "Likely Packed/Encrypted" if is_packed else "Likely Unpacked/Standard Native",
        "file_type": file_type,
        "mitigations": mitigations,
        "crypto_constants_found": crypto_matches,
        "high_signal_strings": high_signal,
        "general_strings": general,
    }


def main():
    parser = argparse.ArgumentParser(description="Zero-dependency Binary Triage & Reverse Engineering Tool")
    parser.add_argument("--file", "-f", required=True, help="Target binary file to analyze")
    parser.add_argument("--strings", "-s", action="store_true", help="Print interesting extracted strings")
    parser.add_argument("--entropy", "-e", action="store_true", help="Show entropy breakdown")
    parser.add_argument("--mitigations", "-m", action="store_true", help="Inspect binary security mitigations")
    parser.add_argument("--verbose", "-v", action="store_true", help="Detailed output")
    args = parser.parse_args()

    try:
        report = run_triage(args.file, verbose=args.verbose)
        print("=" * 60)
        print("  BINARY TRIAGE & STATIC ANALYSIS REPORT")
        print("=" * 60)
        print(f" Target File  : {report['file_path']}")
        print(f" Size         : {report['file_size_bytes']} bytes")
        print(f" Format       : {report['file_type'].get('format')}")
        print(f" Architecture : {report['file_type'].get('architecture', 'N/A')}")
        print(f" Bitness      : {report['file_type'].get('bitness', 'N/A')}")
        print(f" Entropy      : {report['shannon_entropy']} / 8.0 ({report['packing_indicator']})")
        print("-" * 60)

        if report["mitigations"]:
            print(" Security Mitigations:")
            for k, v in report["mitigations"].items():
                print(f"   [{k}]: {v}")
            print("-" * 60)

        if report["crypto_constants_found"]:
            print(" Cryptographic Signatures Detected:")
            for name, offset in report["crypto_constants_found"]:
                print(f"   [0x{offset:08x}] {name}")
            print("-" * 60)

        if args.strings or args.verbose:
            print(" Extracted Strings Sample (High Signal IOCs):")
            displayed = 0
            for cat, s in report["high_signal_strings"]:
                print(f"   ({cat:15s}) {s[:80]}")
                displayed += 1
                if displayed >= 30 and not args.verbose:
                    break

            if displayed == 0 or args.verbose:
                print(" General Strings:")
                for cat, s in report["general_strings"][: (50 if args.verbose else 15)]:
                    print(f"   ({cat:15s}) {s[:80]}")
            print("-" * 60)

        print("[STATUS] Triage complete.")

    except Exception as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
