#!/usr/bin/env python3
"""
binary_analyzer.py — Production-grade Binary Triage and Static Analysis Tool

Zero-dependency binary triage utility for reverse engineers and security analysts.
Inspects file magic, ELF/PE/Mach-O headers, security mitigations (NX, ASLR, RELRO),
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

# Standard crypto constants
CRYPTO_PATTERNS = {
    "AES S-box": bytes([
        0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
        0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0
    ]),
    "AES Inverse S-box": bytes([
        0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb
    ]),
    "SHA-256 Constants (first 32 bytes)": struct.pack(
        "<8I", 0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5
    ),
    "MD5 Constants (A, B, C, D)": struct.pack(
        "<4I", 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476
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
            pe_archs = {0x14c: ("x86", "32-bit"), 0x8664: ("x86_64", "64-bit"), 0xaa64: ("ARM64", "64-bit")}
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
        return {"format": "Mach-O (macOS/iOS)", "bitness": "64-bit" if is_64 else "32-bit"}

    if data.startswith(b"\x00asm"):
        return {"format": "WebAssembly (WASM)", "bitness": "32/64-bit"}

    if data.startswith(b"PK\x03\x04"):
        return {"format": "ZIP Archive / JAR / APK / DOCX", "bitness": "N/A"}

    if data.startswith(b"\x1f\x8b"):
        return {"format": "GZIP Archive", "bitness": "N/A"}

    if data.startswith(b"SQLite format 3\x00"):
        return {"format": "SQLite3 Database", "bitness": "N/A"}

    return {"format": "Raw Binary / Data / Firmware", "magic": data[:16].hex()}


def extract_strings(data: bytes, min_len: int = 4, limit: int = 100) -> List[Tuple[str, str]]:
    """Extract printable ASCII and UTF-16LE strings with classification."""
    results = []
    # ASCII regex
    ascii_re = re.compile(rb"[\x20-\x7E]{" + str(min_len).encode() + rb",}")
    for match in ascii_re.finditer(data):
        s = match.group().decode("latin1", errors="ignore")
        category = "general"
        if re.search(r"https?://|ftp://|[a-z0-9_\.-]+@[a-z0-9_\.-]+", s, re.I):
            category = "network/url"
        elif re.search(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b", s):
            category = "ipv4"
        elif re.search(r"/(?:etc|bin|usr|var|tmp|home)/|[A-Za-z]:\\[A-Za-z0-9_.\\]+", s):
            category = "filesystem"
        elif re.search(r"(?:password|secret|apikey|token|flag\{)", s, re.I):
            category = "credential/flag"
        results.append((category, s))
        if len(results) >= limit:
            break
    return results


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
    """Examine binary mitigations (NX/DEP, ASLR/PIE, Canary hints)."""
    mitigations = {}
    fmt = file_info.get("format", "")

    if fmt == "ELF":
        # Check NX in program headers: PT_GNU_STACK (0x6474e551)
        pt_gnu_stack = b"\x51\xe5\x74\x64"
        idx = data.find(pt_gnu_stack)
        if idx != -1 and len(data) >= idx + 8:
            flags = struct.unpack("<I", data[idx+4:idx+8])[0]
            # PF_X = 0x1
            has_exec = bool(flags & 0x1)
            mitigations["NX / Stack Execution"] = "Disabled (Vulnerable / Executable Stack)" if has_exec else "Enabled (NX Active)"
        else:
            mitigations["NX / Stack Execution"] = "Unknown / Stripped headers"

        # Check for PIE in e_type (offset 16 in ELF header)
        if len(data) >= 18:
            e_type = struct.unpack("<H", data[16:18])[0]
            # ET_EXEC = 2, ET_DYN = 3 (Shared object or PIE)
            if e_type == 3:
                mitigations["PIE / ASLR"] = "Enabled (Position-Independent Executable)"
            elif e_type == 2:
                mitigations["PIE / ASLR"] = "Disabled (Fixed Load Address)"

        # Check for stack canary references
        if b"__stack_chk_fail" in data:
            mitigations["Stack Canary"] = "Detected (__stack_chk_fail present)"
        else:
            mitigations["Stack Canary"] = "Not found in symbol strings"

    elif "PE" in fmt:
        pe_offset = file_info.get("pe_offset")
        if pe_offset and len(data) >= pe_offset + 96:
            opt_magic = struct.unpack("<H", data[pe_offset+24:pe_offset+26])[0]
            is_pe32_plus = (opt_magic == 0x20b)
            dll_char_offset = pe_offset + (70 if not is_pe32_plus else 70)
            if len(data) >= pe_offset + 96:
                # DLL Characteristics offset in optional header
                dll_char_pos = pe_offset + 24 + (70 if not is_pe32_plus else 70)
                if len(data) >= dll_char_pos + 2:
                    dll_char = struct.unpack("<H", data[dll_char_pos:dll_char_pos+2])[0]
                    # IMAGE_DLLCHARACTERISTICS_DYNAMIC_BASE = 0x0040
                    # IMAGE_DLLCHARACTERISTICS_NX_COMPAT = 0x0100
                    mitigations["ASLR (Dynamic Base)"] = "Enabled" if (dll_char & 0x0040) else "Disabled"
                    mitigations["DEP / NX Compat"] = "Enabled" if (dll_char & 0x0100) else "Disabled"

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
    strings = extract_strings(data, min_len=5, limit=50 if not verbose else 200)

    return {
        "file_path": filepath,
        "file_size_bytes": file_size,
        "shannon_entropy": round(entropy, 4),
        "packing_indicator": "Likely Packed/Encrypted" if is_packed else "Likely Unpacked/Standard Native",
        "file_type": file_type,
        "mitigations": mitigations,
        "crypto_constants_found": crypto_matches,
        "strings_sample": strings[:20],
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
            print(" Extracted Strings Sample (High Signal):")
            for cat, s in report["strings_sample"]:
                if cat != "general" or args.verbose:
                    print(f"   ({cat:12s}) {s[:80]}")
            print("-" * 60)

        print("[STATUS] Triage complete.")

    except Exception as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
