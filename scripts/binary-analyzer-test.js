const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT_PATH = path.join(
  __dirname,
  '..',
  'skills',
  'reverse-engineering-and-binary-analysis',
  'scripts',
  'binary_analyzer.py',
);

function getPythonCommand() {
  for (const cmd of ['python', 'python3', 'py']) {
    const res = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (res.status === 0) return cmd;
  }
  return null;
}

const pythonCmd = getPythonCommand();

test('binary_analyzer.py prints help and exits with status 0', { skip: !pythonCmd }, () => {
  const res = spawnSync(pythonCmd, [SCRIPT_PATH, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Zero-dependency Binary Triage & Reverse Engineering Tool/);
  assert.match(res.stdout, /--strings/);
  assert.match(res.stdout, /--mitigations/);
});

test('binary_analyzer.py handles non-existent file cleanly with error', { skip: !pythonCmd }, () => {
  const missingPath = path.join(os.tmpdir(), `non_existent_${Date.now()}.bin`);
  const res = spawnSync(pythonCmd, [SCRIPT_PATH, '--file', missingPath], { encoding: 'utf8' });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /File not found/);
});

test('binary_analyzer.py parses 0-byte empty file without crashing', { skip: !pythonCmd }, () => {
  const tmpFile = path.join(os.tmpdir(), `empty_${Date.now()}.bin`);
  fs.writeFileSync(tmpFile, Buffer.alloc(0));
  try {
    const res = spawnSync(pythonCmd, [SCRIPT_PATH, '--file', tmpFile], { encoding: 'utf8' });
    assert.equal(res.status, 0);
    assert.match(res.stdout, /Size\s+:\s+0 bytes/);
    assert.match(res.stdout, /Format\s+:\s+Unknown \(Too short\)/);
    assert.match(res.stdout, /Entropy\s+:\s+0\.0 \/ 8\.0/);
    assert.match(res.stdout, /\[STATUS\] Triage complete\./);
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

test('binary_analyzer.py analyzes synthetic ELF binary, mitigations, and crypto constants', { skip: !pythonCmd }, () => {
  const tmpFile = path.join(os.tmpdir(), `test_elf_${Date.now()}.bin`);
  const buf = Buffer.alloc(512);

  // ELF Magic + 64-bit + Little-endian
  buf.write('\x7fELF', 0);
  buf[4] = 2; // 64-bit
  buf[5] = 1; // Little-endian
  buf[6] = 1; // ELF version
  buf.writeUInt16LE(3, 16); // e_type = ET_DYN (PIE / Shared object)
  buf.writeUInt16LE(0x3E, 18); // e_machine = AMD64 (x86_64)

  // ELF64 Header fields:
  // e_phoff at offset 32 (8 bytes) -> 64
  buf.writeBigUInt64LE(64n, 32);
  // e_phentsize at offset 54 (2 bytes) -> 56
  buf.writeUInt16LE(56, 54);
  // e_phnum at offset 56 (2 bytes) -> 2
  buf.writeUInt16LE(2, 56);

  // Phdr 0 at offset 64: PT_GNU_STACK (0x6474e551)
  // In Elf64_Phdr: p_type (offset 0), p_flags (offset 4) = 6 (RW, not executable)
  buf.writeUInt32LE(0x6474e551, 64);
  buf.writeUInt32LE(0x00000006, 68);

  // Phdr 1 at offset 120 (64 + 56): PT_GNU_RELRO (0x6474e552)
  buf.writeUInt32LE(0x6474e552, 120);

  // Symbol strings: stack canary + high signal IOC
  buf.write('__stack_chk_fail\x00', 180);
  buf.write('https://api.internal.target.org/v1/auth\x00', 210);
  buf.write('flag{reverse_engineering_validated}\x00', 270);

  // AES S-box constant signature
  const aesSbox = Buffer.from([
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0
  ]);
  aesSbox.copy(buf, 340);

  fs.writeFileSync(tmpFile, buf);
  try {
    const res = spawnSync(pythonCmd, [SCRIPT_PATH, '--file', tmpFile, '--strings', '--mitigations'], { encoding: 'utf8' });
    assert.equal(res.status, 0);
    assert.match(res.stdout, /Format\s+:\s+ELF/);
    assert.match(res.stdout, /Bitness\s+:\s+64-bit/);
    assert.match(res.stdout, /Architecture\s+:\s+x86_64 \(AMD64\)/);
    assert.match(res.stdout, /\[NX \/ Stack Execution\]:\s+Enabled \(NX Active\)/);
    assert.match(res.stdout, /\[PIE \/ ASLR\]:\s+Enabled \(Position-Independent Executable \/ PIE\)/);
    assert.match(res.stdout, /\[RELRO\]:\s+Enabled \(GNU_RELRO present\)/);
    assert.match(res.stdout, /\[Stack Canary\]:\s+Detected \(__stack_chk_fail present\)/);
    assert.match(res.stdout, /Cryptographic Signatures Detected:/);
    assert.match(res.stdout, /AES S-box/);
    assert.match(res.stdout, /https:\/\/api\.internal\.target\.org\/v1\/auth/);
    assert.match(res.stdout, /flag\{reverse_engineering_validated\}/);
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

test('binary_analyzer.py extracts UTF-16LE wide strings and checks PE mitigations', { skip: !pythonCmd }, () => {
  const tmpFile = path.join(os.tmpdir(), `test_pe_${Date.now()}.bin`);
  const buf = Buffer.alloc(1024);

  // MZ header
  buf.write('MZ', 0);
  buf.writeUInt32LE(0x80, 0x3C); // e_lfanew -> 0x80

  // PE Signature at 0x80
  buf.write('PE\x00\x00', 0x80);

  // COFF Header (20 bytes): machine = 0x8664 (x86_64)
  buf.writeUInt16LE(0x8664, 0x84);

  // Optional Header starts at 0x80 + 24 = 0x98
  // Magic = 0x20b (PE32+)
  buf.writeUInt16LE(0x20B, 0x98);

  // DllCharacteristics offset = 0x98 + 70 = 0xDE
  // Set DYNAMIC_BASE (0x0040) + HIGH_ENTROPY_VA (0x0020) + NX_COMPAT (0x0100) + GUARD_CF (0x4000) = 0x4160
  buf.writeUInt16LE(0x4160, 0xDE);

  // Embed a UTF-16LE string: "https://auth.enterprise.local/login"
  const utf16Target = Buffer.from('https://auth.enterprise.local/login', 'utf16le');
  utf16Target.copy(buf, 0x120);

  // Embed secret token: "access_token_secret_9999"
  const utf16Secret = Buffer.from('access_token_secret_9999', 'utf16le');
  utf16Secret.copy(buf, 0x200);

  fs.writeFileSync(tmpFile, buf);
  try {
    const res = spawnSync(pythonCmd, [SCRIPT_PATH, '--file', tmpFile, '--strings', '--mitigations'], { encoding: 'utf8' });
    assert.equal(res.status, 0);
    assert.match(res.stdout, /Format\s+:\s+PE \(Portable Executable\)/);
    assert.match(res.stdout, /Architecture\s+:\s+x86_64/);
    assert.match(res.stdout, /Bitness\s+:\s+64-bit/);
    assert.match(res.stdout, /\[ASLR \(Dynamic Base\)\]:\s+Enabled/);
    assert.match(res.stdout, /\[High-Entropy 64-bit ASLR\]:\s+Enabled/);
    assert.match(res.stdout, /\[DEP \/ NX Compat\]:\s+Enabled/);
    assert.match(res.stdout, /\[Control Flow Guard \(CFG\)\]:\s+Enabled/);
    assert.match(res.stdout, /https:\/\/auth\.enterprise\.local\/login/);
    assert.match(res.stdout, /access_token_secret_9999/);
  } finally {
    fs.unlinkSync(tmpFile);
  }
});
