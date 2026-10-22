---
name: reverse-engineering-and-binary-analysis
description: Analyzes compiled binaries, bytecodes, protocols, and firmware using static decompilation and dynamic tracing. Use when reverse engineering executables (ELF, PE, Mach-O), analyzing disassembled assembly, decompiling bytecodes (APK, Java, .NET, WASM), inspecting binary network protocols, unpacking firmware, or diagnosing stripped binaries and anti-analysis evasion techniques.
---

# Reverse Engineering and Binary Analysis

## Overview

A disciplined, evidence-based reverse engineering workflow. When inspecting compiled artifacts, closed-source binaries, undocumented network protocols, or firmware images, do not guess control flow or infer behavior from surface strings alone. Ground all findings in reproducible static decompilation, verified instruction semantics, dynamic tracing traces, and structured wire specifications.

## When to Use

- Analyzing compiled native binaries (ELF, PE/COFF, Mach-O) for vulnerabilities, logic, or algorithmic recovery
- Decompiling and auditing managed bytecodes: Android APK/DEX (`jadx`, `apktool`), Java `.class`, .NET CIL (`ilspycmd`, `dnSpy`), Python `.pyc` (`pycdc`), WebAssembly (`wasm-decompile`)
- Reconstructing undocumented network protocols, custom serialization formats, and packet framing from PCAP traffic
- Extracting and auditing embedded firmware images, SquashFS/JFFS2 filesystems, and IoT bootloaders (`binwalk`)
- Recovering structure from modern stripped binaries: Go `gopclntab`, Rust symbol demangling, C++ RTTI/vtables
- Investigating obfuscation, packed binaries (UPX, custom stubs), and anti-analysis evasions (anti-debugging, timing checks)

**When NOT to use:**

- Standard open-source source-code audits where clean source and build definitions exist — use `security-and-hardening`
- Normal high-level application bug debugging with access to source and debug symbols — use `debugging-and-error-recovery`
- General code refactoring or readability passes — use `code-simplification`

## The Five-Phase Reverse Engineering Workflow

```
[Phase 1: Triage & Fingerprinting]
       │ file type, architecture, entropy, protections (checksec), packing
       ▼
[Phase 2: Static Disassembly & Decompilation]
       │ CFG mapping, entry points, symbol recovery, struct/type synthesis
       ▼
[Phase 3: Dynamic Tracing & Instrumentation]
       │ registers, memory layout, syscalls (strace), API hooks (Frida/GDB)
       ▼
[Phase 4: Protocol & Wire Reconstruction]
       │ frame boundaries, magic bytes, length fields, TLV/protobuf schemas
       ▼
[Phase 5: Synthesis & High-Level Spec]
       │ verified pseudo-code, domain data models, security assessment
```

### Phase 1: Triage and Fingerprinting

Before loading into heavy decompilers, run fast non-invasive triage to establish invariants:

```bash
# 1. Format, architecture, endianness, and linkage
file target_binary

# 2. Exploit mitigation & binary protection checks
# (Checks NX/DEP, PIE/ASLR, Stack Canary, RELRO, Fortify Source)
checksec --file=target_binary

# 3. Header inspection & section mapping
readelf -h -S target_binary       # Linux ELF
dumpbin /HEADERS target_binary    # Windows PE
otool -hv -l target_binary        # macOS Mach-O

# 4. Entropy analysis (detect packing, compression, encryption)
# High entropy (> 7.2) across text/data sections indicates packing or encryption
binwalk target_binary
```

### Phase 2: Static Disassembly and Decompilation

When analyzing code structures:

1. **Locate Entry Points & Canonical Roots:**
   - Look beyond `_start` or entry point to resolve compiler initialization and locate `main` or subsystem dispatchers.
   - For shared libraries / DLLs, identify exported entry points and initialization functions (`.init`, `.init_array`, `DllMain`).

2. **Recover Strings and Cross-References (XREFs):**
   - Extract ASCII, UTF-8, and UTF-16 strings with their file and virtual addresses.
   - Pivot from distinctive error messages, logging formats, API URLs, and format strings directly to their referencing functions.

3. **Reconstruct Types and Data Structures:**
   - Map pointer offsets to memory structures (e.g., `[rax + 0x18]` accessed alongside `[rax + 0x20]` signals an object/struct).
   - Trace memory allocations (`malloc`, `VirtualAlloc`, `mmap`) to record struct sizes and member alignment.

4. **Decompiler Output Treatment:**
   - Treat AI-assisted or Ghidra/IDA decompiler variable names as **hypotheses**, not verified ground truth.
   - Rename variables only when register flow or type constraints confirm the role (e.g., file descriptors, buffer lengths).

### Phase 3: Stripped Modern Language Specializations

Modern compiled languages carry distinct runtime footprints:

| Ecosystem | Triaging Characteristics | Recovery Procedure |
|---|---|---|
| **Go** | Statically linked runtime; runtime type structures; panic metadata | Locate and parse `runtime.gopclntab` to extract function names, line tables, and source file paths. Traverse `runtime.types` to recover struct names and signatures. |
| **Rust** | Demangled naming (`_RNv...`); verbose panic strings; monomorphized templates | Demangle symbols using `rustfilt`. Pivot on panic formatting strings (`src/.../lib.rs:LINE:COL`) to locate module boundaries. |
| **C++** | Mangled names (`_Z...`); virtual method tables (`vtable`) | Reconstruct class hierarchies from RTTI (`type_info`) structures and vtable pointer arrays in `.rodata`. |
| **.NET / CIL** | Structured metadata tables, IL bytecode | Decompile assemblies directly using `ilspycmd` or `dnSpy` to recover high-fidelity C# source and symbols. |
| **Android / Java** | Dalvik Executable (`.dex`), manifest, resource tables | Disassemble and decompile with `jadx --deobf -d out target.apk` or unpack resources with `apktool d target.apk`. |

### Phase 4: Dynamic Tracing and Instrumentation

When static analysis is obscured or inconclusive, verify behavior at runtime:

```bash
# Syscall and library call tracing
strace -f -s 512 -e trace=network,file ./target_binary
ltrace -f -s 256 ./target_binary

# GDB + pwndbg / GEF dynamic inspection
gdb -q ./target_binary
# Inside GDB:
# break *0x401234               # Breakpoint at candidate dispatcher
# run < input_payload           # Run under controlled input
# info registers                # Inspect register states
# x/32gx $rsp                   # Examine stack memory
# telescope $rsp 16             # Contextual memory dereference
```

For dynamic API interception and parameter mutation, write structured Frida hooks:

```javascript
// Example: Hooking an internal validation or encryption routine
Interceptor.attach(Module.findExportByName(null, "validate_token"), {
  onEnter: function (args) {
    console.log("[*] validate_token called with ptr:", args[0]);
    console.log("[*] Buffer contents:", hexdump(args[0], { length: 32 }));
  },
  onLeave: function (retval) {
    console.log("[*] Return value before:", retval.toInt32());
    retval.replace(ptr(1)); // Force validation success for triage
  }
});
```

### Phase 5: Protocol & Wire Framing Reverse Engineering

When reconstructing unknown binary or network protocols from PCAP files or memory buffers:

1. **Demarcate Frame Boundaries:**
   - Identify fixed **magic bytes** / sync words at the frame header (e.g., `0xAA55`, `0x424C5A59`).
   - Identify **length fields**: inspect 2-byte or 4-byte fields near the header (offsets 2-8). Test big-endian vs little-endian values against observed packet sizes.
   - Detect **message types**: 1-byte or 2-byte enumeration fields following magic bytes or length headers.

2. **Map Field Encodings:**
   - Varints / Protobuf: scan for MSB-continuation bytes (0x80 bit set).
   - TLV (Type-Length-Value): look for repeating `[Type (1-2B)] [Len (1-2B)] [Value (Len B)]` triads.
   - Checksums / CRCs: look for 2-byte (CRC-16) or 4-byte (CRC-32/Adler32) sequences at trailing offsets.

3. **Construct Executable Parser Specification:**
   - Formalize the reversed structure in a verified Python `struct` or Kaitai Struct definition rather than informal notes.

```python
import struct

def parse_reversed_packet(payload: bytes) -> dict:
    if len(payload) < 8:
        raise ValueError("Payload under minimum frame size")
    magic, msg_type, length = struct.unpack(">HHI", payload[:8])
    if magic != 0x534B:
        raise ValueError(f"Invalid magic identifier: {hex(magic)}")
    data = payload[8:8 + length]
    return {"type": msg_type, "length": length, "body": data}
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I can tell what this binary does just by reading the `strings` output." | Strings contain decoy strings, library noise, and dead code. String presence does not prove execution without verified XREFs. |
| "The decompiler pseudocode is the exact source code." | Decompilers make heuristic guesses on types, loop constructs, and signedness. Always cross-check critical logic against the raw disassembly. |
| "Modern stripped Go/Rust binaries cannot be deciphered." | Go binaries carry full function and line metadata in `gopclntab`. Rust binaries retain demangled symbol references and explicit panic locations. |
| "I will test this malware sample directly in my terminal shell." | Dynamic execution without isolated sandboxing or verification of sample safety risks system compromise. Never execute untrusted binaries on host machines. |

## Red Flags

- Claiming a binary behavior without identifying the virtual address, offset, or function responsible
- Omitting the target architecture (x86-64, ARM64, MIPS), calling convention, or endianness from analysis notes
- Modifying bytes or patching jumps without documenting the original byte sequence and CRC/hash delta
- Assuming big-endian when analyzing x86/x64 binaries (x86 is strictly little-endian)

## Verification

Before concluding a reverse engineering task, confirm:

- [ ] Target file architecture, bitness, endianness, and binary protections (`checksec`) are recorded
- [ ] Key functions and addresses are cited with virtual addresses or reproducible offsets
- [ ] Stripped language recovery steps (Go symbols, Rust demangling, RTTI) were attempted if applicable
- [ ] Decompiled pseudocode has been validated against underlying disassembly for critical branches
- [ ] If reversing a protocol or file format, a working parser script is written and tested against sample inputs
- [ ] No untrusted binary was executed outside an isolated environment
