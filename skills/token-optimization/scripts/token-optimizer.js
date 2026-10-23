#!/usr/bin/env node
/**
 * token-optimizer.js
 *
 * Production-grade CLI and module for LLM token economy, prompt compression,
 * multi-language AST structural code skeletonization (JS/TS, Python, Go, Rust),
 * MCP/tool output JSON slimming, log filtering, and context pruning.
 * Zero external dependencies — pure Node.js standard library.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Token Estimation ────────────────────────────────────────────────────────

/**
 * Estimates token count using a refined code/text heuristic.
 * Source code has higher token density due to symbols, indentation, and casing.
 * @param {string} text - Input text
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  if (text.length === 0) return 0;

  // Standard BPE heuristic:
  // Words, subwords, camelCase, snake_case
  const words = text.match(/[a-zA-Z0-9_]+/g) || [];
  let wordTokens = 0;
  for (const w of words) {
    const subWords = w
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[_\s]+/)
      .filter(Boolean);
    wordTokens += Math.max(1, subWords.length);
  }

  // Count punctuation & symbols
  const symbols = text.replace(/[a-zA-Z0-9_\s]/g, '');
  const symbolTokens = Math.ceil(symbols.length / 1.5);

  // Count newlines and extra indentation blocks (4+ spaces)
  const newlines = (text.match(/\n/g) || []).length;
  const indents = (text.match(/[ ]{4}/g) || []).length;
  const whitespaceTokens = Math.ceil(newlines * 0.7) + indents;

  const total = wordTokens + symbolTokens + whitespaceTokens;
  return Math.max(1, Math.round(total));
}

// ─── Code Skeletonization Helpers ────────────────────────────────────────────

/**
 * Strips comments and string literals from a line to safely count structural characters
 * like braces, parentheses, and colons without false positives from strings or comments.
 * @param {string} line
 * @param {{ inBlockComment: boolean, inTemplateLiteral: boolean }} state
 * @returns {{ masked: string, inBlockComment: boolean, inTemplateLiteral: boolean }}
 */
function maskCodeLine(line, state = { inBlockComment: false, inTemplateLiteral: false }) {
  let masked = '';
  let inBlockComment = state.inBlockComment;
  let inTemplateLiteral = state.inTemplateLiteral;
  let inQuote = null; // ' or "

  for (let c = 0; c < line.length; c++) {
    const ch = line[c];
    const prev = c > 0 ? line[c - 1] : '';
    const next = c + 1 < line.length ? line[c + 1] : '';

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        c++; // consume '/'
      }
      masked += ' ';
      continue;
    }

    if (inTemplateLiteral) {
      if (ch === '`' && prev !== '\\') {
        inTemplateLiteral = false;
      }
      masked += ' ';
      continue;
    }

    if (inQuote) {
      if (ch === inQuote && prev !== '\\') {
        inQuote = null;
      }
      masked += ' ';
      continue;
    }

    // Check start of block comment /*
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      c++; // consume '*'
      masked += '  ';
      continue;
    }

    // Check single line comment //
    if (ch === '/' && next === '/') {
      masked += ' '.repeat(line.length - c);
      break;
    }

    // Check template literal `
    if (ch === '`') {
      inTemplateLiteral = true;
      masked += ' ';
      continue;
    }

    // Check string quote " or '
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      masked += ' ';
      continue;
    }

    masked += ch;
  }

  return {
    masked,
    inBlockComment,
    inTemplateLiteral,
  };
}

// ─── Multi-Language Code Skeletonization ─────────────────────────────────────

/**
 * Strips function and method bodies from JavaScript / TypeScript code,
 * retaining signatures, types, interfaces, classes, and exported declarations.
 * Accurately handles multi-line signatures, generics, and masks strings/comments.
 * @param {string} code - Source code
 * @returns {string} Skeletonized code
 */
function skeletonizeJS(code) {
  const lines = code.split(/\r?\n/);
  const result = [];
  let braceDepth = 0;
  let inSkippedBody = false;
  let bodyStartDepth = 0;

  let state = { inBlockComment: false, inTemplateLiteral: false };
  let pendingFunctionHeader = false;
  let headerLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Preserve comments that are docstrings or type pragmas
    if (!state.inBlockComment && (trimmed.startsWith('/**') || trimmed.startsWith('/*'))) {
      if (!trimmed.includes('*/')) state.inBlockComment = true;
      if (!inSkippedBody) result.push(line);
      continue;
    }
    if (state.inBlockComment) {
      if (trimmed.includes('*/')) state.inBlockComment = false;
      if (!inSkippedBody) result.push(line);
      continue;
    }

    if (!inSkippedBody && (trimmed.startsWith('//') || trimmed.startsWith('*'))) {
      result.push(line);
      continue;
    }

    // Preserve top-level imports and exports of types/interfaces directly
    if (!inSkippedBody && !pendingFunctionHeader) {
      if (/^import\b/.test(trimmed) || /^(export\s+)?(type|interface)\s+/.test(trimmed)) {
        result.push(line);
        continue;
      }
    }

    // Mask line to eliminate braces inside strings or comments
    const maskResult = maskCodeLine(line, state);
    state.inBlockComment = maskResult.inBlockComment;
    state.inTemplateLiteral = maskResult.inTemplateLiteral;
    const masked = maskResult.masked;

    const openBraces = (masked.match(/\{/g) || []).length;
    const closeBraces = (masked.match(/\}/g) || []).length;

    // Detect function / method start
    const looksLikeFuncStart =
      /^(export\s+)?(default\s+)?(async\s+)?function\b/.test(trimmed) ||
      /^(?:(?:public|private|protected|static|async|override|get|set|\*)\s+)+[\w$]+\s*\(/.test(trimmed) ||
      /^[\w$]+\s*\([^)]*$/.test(trimmed) ||
      /^(?:(?:public|private|protected)\s+)?constructor\s*\(/.test(trimmed) ||
      /^(?:const|let|var)\s+[\w$]+\s*=\s*(?:async\s*)?(?:\([^)]*|[\w$]+)\s*(?::\s*[^=>]+)?\s*=>/.test(trimmed);

    if (!inSkippedBody && !pendingFunctionHeader && looksLikeFuncStart) {
      if (openBraces > 0 && openBraces > closeBraces) {
        // Single line signature with opening brace
        const headerPart = line.replace(/\{[^{}]*$/, '{ /* ... implementation omitted for token efficiency ... */ }');
        result.push(headerPart);
        inSkippedBody = true;
        bodyStartDepth = braceDepth;
        braceDepth += (openBraces - closeBraces);
        continue;
      } else {
        // Multi-line signature
        pendingFunctionHeader = true;
        headerLines = [line];
        continue;
      }
    }

    if (pendingFunctionHeader) {
      headerLines.push(line);
      if (openBraces > 0) {
        // Function opening brace found
        pendingFunctionHeader = false;
        const lastIdx = headerLines.length - 1;
        headerLines[lastIdx] = headerLines[lastIdx].replace(/\{[^{}]*$/, '{ /* ... implementation omitted for token efficiency ... */ }');
        for (const hl of headerLines) {
          result.push(hl);
        }
        headerLines = [];
        inSkippedBody = true;
        bodyStartDepth = braceDepth;
        braceDepth += (openBraces - closeBraces);
        continue;
      }
      continue;
    }

    braceDepth += (openBraces - closeBraces);

    if (inSkippedBody) {
      if (braceDepth <= bodyStartDepth) {
        inSkippedBody = false;
      }
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Strips function and method bodies from Python code,
 * retaining signatures, decorators, classes, and docstrings.
 * Correctly handles multi-line parameter signatures and nested methods.
 * @param {string} code - Python source code
 * @returns {string} Skeletonized Python code
 */
function skeletonizePython(code) {
  const lines = code.split(/\r?\n/);
  const result = [];
  let inFunctionBody = false;
  let functionIndent = 0;
  let inDocstring = false;
  let docstringDelimiter = null;
  let pendingDef = false;
  let defIndent = 0;
  let defLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (!inFunctionBody && !pendingDef) result.push(line);
      continue;
    }

    const currentIndent = line.search(/\S/);

    // Multi-line docstring handling
    if (!inDocstring && (trimmed.startsWith('"""') || trimmed.startsWith("'''"))) {
      const delim = trimmed.slice(0, 3);
      if (trimmed.length > 3 && trimmed.slice(3).includes(delim)) {
        if (inFunctionBody) result.push(line);
        continue;
      }
      inDocstring = true;
      docstringDelimiter = delim;
      result.push(line);
      continue;
    } else if (inDocstring) {
      result.push(line);
      if (trimmed.includes(docstringDelimiter)) inDocstring = false;
      continue;
    }

    // Check if starting a def
    if (!pendingDef && (/^def\s+[\w_]+/.test(trimmed) || /^async\s+def\s+[\w_]+/.test(trimmed))) {
      if (trimmed.endsWith(':')) {
        result.push(line);
        inFunctionBody = true;
        functionIndent = currentIndent;
        result.push(' '.repeat(currentIndent + 4) + '"""[Implementation omitted for token optimization]"""');
        result.push(' '.repeat(currentIndent + 4) + '...');
        continue;
      } else {
        pendingDef = true;
        defIndent = currentIndent;
        defLines = [line];
        continue;
      }
    }

    if (pendingDef) {
      defLines.push(line);
      if (trimmed.endsWith(':')) {
        for (const dl of defLines) result.push(dl);
        defLines = [];
        pendingDef = false;
        inFunctionBody = true;
        functionIndent = defIndent;
        result.push(' '.repeat(defIndent + 4) + '"""[Implementation omitted for token optimization]"""');
        result.push(' '.repeat(defIndent + 4) + '...');
      }
      continue;
    }

    // Check class or decorator
    if (/^class\s+[\w_]+/.test(trimmed) || /^@[\w_]+/.test(trimmed)) {
      inFunctionBody = false;
      result.push(line);
      continue;
    }

    // Inside function body: skip lines deeper than functionIndent
    if (inFunctionBody) {
      if (currentIndent <= functionIndent && !trimmed.startsWith('#')) {
        inFunctionBody = false;
        // Proceed to re-evaluate this line as normal code
      } else {
        continue;
      }
    }

    // Check if exiting a function directly into another def
    if (/^def\s+[\w_]+/.test(trimmed) || /^async\s+def\s+[\w_]+/.test(trimmed)) {
      if (trimmed.endsWith(':')) {
        result.push(line);
        inFunctionBody = true;
        functionIndent = currentIndent;
        result.push(' '.repeat(currentIndent + 4) + '"""[Implementation omitted for token optimization]"""');
        result.push(' '.repeat(currentIndent + 4) + '...');
        continue;
      } else {
        pendingDef = true;
        defIndent = currentIndent;
        defLines = [line];
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Strips function bodies from Go source code while retaining struct fields,
 * interfaces, imports, and method signatures.
 * @param {string} code - Go source code
 * @returns {string} Skeletonized Go code
 */
function skeletonizeGo(code) {
  const lines = code.split(/\r?\n/);
  const result = [];
  let braceDepth = 0;
  let inSkippedBody = false;
  let bodyStartDepth = 0;
  let state = { inBlockComment: false, inTemplateLiteral: false };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('//')) {
      if (!inSkippedBody) result.push(line);
      continue;
    }

    const maskResult = maskCodeLine(line, state);
    state.inBlockComment = maskResult.inBlockComment;
    const masked = maskResult.masked;

    const openBraces = (masked.match(/\{/g) || []).length;
    const closeBraces = (masked.match(/\}/g) || []).length;

    const isFunc = /^func\s+/.test(trimmed);

    if (!inSkippedBody && isFunc && openBraces > 0) {
      const headerPart = line.replace(/\{[^{}]*$/, '{ /* ... implementation omitted ... */ }');
      result.push(headerPart);
      inSkippedBody = true;
      bodyStartDepth = braceDepth;
      braceDepth += (openBraces - closeBraces);
      continue;
    }

    braceDepth += (openBraces - closeBraces);

    if (inSkippedBody) {
      if (braceDepth <= bodyStartDepth) {
        inSkippedBody = false;
      }
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Strips function bodies from Rust source code while retaining trait declarations,
 * struct definitions, enums, and function signatures.
 * @param {string} code - Rust source code
 * @returns {string} Skeletonized Rust code
 */
function skeletonizeRust(code) {
  const lines = code.split(/\r?\n/);
  const result = [];
  let braceDepth = 0;
  let inSkippedBody = false;
  let bodyStartDepth = 0;
  let state = { inBlockComment: false, inTemplateLiteral: false };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('//')) {
      if (!inSkippedBody) result.push(line);
      continue;
    }

    const maskResult = maskCodeLine(line, state);
    state.inBlockComment = maskResult.inBlockComment;
    const masked = maskResult.masked;

    const openBraces = (masked.match(/\{/g) || []).length;
    const closeBraces = (masked.match(/\}/g) || []).length;

    const isFunc = /^(?:pub\s+(?:\([^)]+\)\s+)?)?(?:async\s+)?fn\s+/.test(trimmed);

    if (!inSkippedBody && isFunc && openBraces > 0) {
      const headerPart = line.replace(/\{[^{}]*$/, '{ /* ... implementation omitted ... */ }');
      result.push(headerPart);
      inSkippedBody = true;
      bodyStartDepth = braceDepth;
      braceDepth += (openBraces - closeBraces);
      continue;
    }

    braceDepth += (openBraces - closeBraces);

    if (inSkippedBody) {
      if (braceDepth <= bodyStartDepth) {
        inSkippedBody = false;
      }
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Skeletonizes code according to language extension.
 * @param {string} code - Code string
 * @param {string} filename - Filename for extension matching
 * @returns {{ skeleton: string, originalTokens: number, skeletonTokens: number, reductionPercent: number }}
 */
function skeletonize(code, filename = 'code.ts') {
  const ext = path.extname(filename).toLowerCase();
  let skeleton = code;

  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    skeleton = skeletonizeJS(code);
  } else if (['.py', '.pyi'].includes(ext)) {
    skeleton = skeletonizePython(code);
  } else if (ext === '.go') {
    skeleton = skeletonizeGo(code);
  } else if (ext === '.rs') {
    skeleton = skeletonizeRust(code);
  } else {
    // Generic fallback: remove comment blocks and blank line clusters
    skeleton = code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n');
  }

  const originalTokens = estimateTokens(code);
  const skeletonTokens = estimateTokens(skeleton);
  const reductionPercent = originalTokens > 0
    ? Math.round(((originalTokens - skeletonTokens) / originalTokens) * 100)
    : 0;

  return {
    skeleton,
    originalTokens,
    skeletonTokens,
    reductionPercent: Math.max(0, reductionPercent),
  };
}

// ─── Tool Call / MCP Output JSON Slimming ───────────────────────────────────

/**
 * Recursively cleans JSON objects by stripping nulls, undefined values,
 * empty objects, empty arrays, and truncating oversized collections.
 * Essential for compressing tool results (e.g. MCP responses, git/fs scans).
 * @param {any} value - Object or array
 * @param {{ maxArrayItems?: number, dropEmpty?: boolean }} options
 * @returns {any} Cleaned value
 */
function cleanObject(value, options = { maxArrayItems: 5, dropEmpty: true }) {
  if (value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    const cleanedArr = value
      .map((item) => cleanObject(item, options))
      .filter((item) => item !== undefined);

    if (options.dropEmpty && cleanedArr.length === 0) return undefined;

    if (options.maxArrayItems && cleanedArr.length > options.maxArrayItems) {
      const kept = cleanedArr.slice(0, options.maxArrayItems);
      kept.push(`... [${cleanedArr.length - options.maxArrayItems} more items truncated for token efficiency]`);
      return kept;
    }
    return cleanedArr;
  }

  if (typeof value === 'object') {
    const cleanedObj = {};
    let hasKeys = false;
    for (const [k, v] of Object.entries(value)) {
      const cleanedVal = cleanObject(v, options);
      if (cleanedVal !== undefined) {
        cleanedObj[k] = cleanedVal;
        hasKeys = true;
      }
    }
    if (options.dropEmpty && !hasKeys) return undefined;
    return cleanedObj;
  }

  return value;
}

/**
 * Compresses JSON string payloads or objects by stripping nulls, empty collections,
 * and excess formatting whitespace.
 * @param {string|object} input - JSON string or object
 * @param {{ maxArrayItems?: number, pretty?: boolean }} options
 * @returns {{ slimmed: string, originalTokens: number, slimmedTokens: number, reductionPercent: number }}
 */
function slimJSON(input, options = { maxArrayItems: 5, pretty: false }) {
  let parsed;
  let rawStr = '';

  if (typeof input === 'string') {
    rawStr = input;
    try {
      parsed = JSON.parse(input);
    } catch {
      return {
        slimmed: input,
        originalTokens: estimateTokens(input),
        slimmedTokens: estimateTokens(input),
        reductionPercent: 0,
      };
    }
  } else {
    parsed = input;
    rawStr = JSON.stringify(input, null, 2);
  }

  const cleaned = cleanObject(parsed, { maxArrayItems: options.maxArrayItems, dropEmpty: true }) || {};
  const slimmed = options.pretty ? JSON.stringify(cleaned, null, 2) : JSON.stringify(cleaned);

  const originalTokens = estimateTokens(rawStr);
  const slimmedTokens = estimateTokens(slimmed);
  const reductionPercent = originalTokens > 0
    ? Math.round(((originalTokens - slimmedTokens) / originalTokens) * 100)
    : 0;

  return {
    slimmed,
    originalTokens,
    slimmedTokens,
    reductionPercent: Math.max(0, reductionPercent),
  };
}

// ─── Terminal / Log Output Compression ───────────────────────────────────────

/**
 * Filters voluminous build, test, and lint terminal outputs.
 * Extracts failing assertions, error stacks, and execution summaries,
 * while dropping noisy pass lines, progress indicators, and redundant logs.
 * @param {string} rawLog - Raw terminal output
 * @param {number} maxErrorLines - Max error context lines to preserve (default 25)
 * @returns {{ compressed: string, originalTokens: number, compressedTokens: number, reductionPercent: number }}
 */
function compressLog(rawLog, maxErrorLines = 25) {
  if (!rawLog) return { compressed: '', originalTokens: 0, compressedTokens: 0, reductionPercent: 0 };

  const lines = rawLog.split(/\r?\n/);
  const filtered = [];
  let inError = false;
  let errorCount = 0;
  let passedCount = 0;
  let preservedErrorLines = 0;

  const failurePatterns = [
    /\bFAIL\b/i,
    /\bERROR\b/i,
    /\bfailed\b/i,
    /AssertionError/i,
    /TypeError:/i,
    /ReferenceError:/i,
    /SyntaxError:/i,
    /Expected:.*Received:/i,
    /at\s+[\w$./\\-]+\s+\([^)]+:\d+:\d+\)/,
    /at\s+[^:]+:\d+:\d+/,
    /exit code [1-9]\d*/i,
  ];

  const passPatterns = [
    /^\s*✓\s+/,
    /^\s*PASS\s+/,
    /^\s*ok\s+\d+/,
    /\[\d+\/\d+\]\s+Building/,
    /^\s*downloading\s+/i,
    /^\s*fetching\s+/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();

    // Count passes without cluttering output
    if (passPatterns.some((p) => p.test(trimmed))) {
      passedCount++;
      inError = false;
      continue;
    }

    // Check for error onset
    const isErrorLine = failurePatterns.some((p) => p.test(trimmed));
    if (isErrorLine) {
      if (!inError) {
        errorCount++;
        inError = true;
        preservedErrorLines = 0;
      }
    }

    if (inError) {
      if (preservedErrorLines < maxErrorLines) {
        filtered.push(line);
        preservedErrorLines++;
      } else if (preservedErrorLines === maxErrorLines) {
        filtered.push('    ... [Remaining stack trace truncated for token efficiency] ...');
        preservedErrorLines++;
      }
      if (trimmed === '' || (!line.startsWith(' ') && !line.startsWith('\t') && !isErrorLine)) {
        inError = false;
      }
      continue;
    }

    // Keep test summary / final report lines
    if (
      /(Tests?:|Suites?:|Time:|Ran \d+|passed|failed|skipped)/i.test(trimmed) &&
      !passPatterns.some((p) => p.test(trimmed))
    ) {
      filtered.push(line);
    }
  }

  const header = `[Filtered ${passedCount} passing lines | ${errorCount} error event(s)]`;
  const compressed = filtered.length > 0
    ? `${header}\n${filtered.join('\n')}`
    : `${header}\nAll test/build steps completed cleanly.`;

  const originalTokens = estimateTokens(rawLog);
  const compressedTokens = estimateTokens(compressed);
  const reductionPercent = originalTokens > 0
    ? Math.round(((originalTokens - compressedTokens) / originalTokens) * 100)
    : 0;

  return {
    compressed,
    originalTokens,
    compressedTokens,
    reductionPercent: Math.max(0, reductionPercent),
  };
}

// ─── Multi-Turn Observation Pruning (Context Pruning) ────────────────────────

/**
 * Prunes stale tool observation outputs from historical conversation turns.
 * Replaces voluminous tool outputs older than keepRecentTurns with concise receipts.
 * @param {Array<{ role: string, content: string, name?: string }>} messages
 * @param {{ keepRecentTurns?: number, maxObservationChars?: number }} options
 * @returns {{ prunedMessages: Array, prunedCount: number, savedTokens: number }}
 */
function pruneObservations(messages, options = { keepRecentTurns: 3, maxObservationChars: 600 }) {
  if (!Array.isArray(messages)) return { prunedMessages: [], prunedCount: 0, savedTokens: 0 };

  const keepRecentTurns = options.keepRecentTurns ?? 3;
  const maxObservationChars = options.maxObservationChars ?? 600;
  const total = messages.length;
  let prunedCount = 0;
  let tokensBefore = 0;
  let tokensAfter = 0;

  const prunedMessages = messages.map((msg, index) => {
    const isRecent = index >= total - keepRecentTurns * 2;
    const isTool = msg.role === 'tool' || msg.name === 'run_command' || msg.name === 'bash_executor';
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

    tokensBefore += estimateTokens(content);

    if (!isRecent && isTool && content.length > maxObservationChars) {
      prunedCount++;
      const firstLine = content.split('\n').find((l) => l.trim().length > 0) || 'Command execution';
      const stub = `[Historical tool observation from turn ${Math.floor(index / 2) + 1} pruned for token economy | summary: ${firstLine.slice(0, 120)}]`;
      tokensAfter += estimateTokens(stub);
      return {
        ...msg,
        content: stub,
      };
    }

    tokensAfter += estimateTokens(content);
    return msg;
  });

  return {
    prunedMessages,
    prunedCount,
    savedTokens: Math.max(0, tokensBefore - tokensAfter),
  };
}

// ─── Repository / Context Waste Audit ────────────────────────────────────────

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  'vendor',
  '.venv',
  '__pycache__',
]);

/**
 * Recursively scans directory and audits token footprint.
 * @param {string} dirPath - Directory to measure
 * @returns {{ totalFiles: number, totalBytes: number, totalTokens: number, topConsumers: Array }}
 */
function measurePath(dirPath) {
  const stats = {
    totalFiles: 0,
    totalBytes: 0,
    totalTokens: 0,
    topConsumers: [],
  };

  function walk(current) {
    if (!fs.existsSync(current)) return;
    const stat = fs.statSync(current);

    if (stat.isDirectory()) {
      const base = path.basename(current);
      if (IGNORED_DIRS.has(base)) return;
      const entries = fs.readdirSync(current);
      for (const entry of entries) {
        walk(path.join(current, entry));
      }
    } else if (stat.isFile()) {
      const ext = path.extname(current).toLowerCase();
      const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.bin'];
      if (binaryExts.includes(ext)) return;

      try {
        const content = fs.readFileSync(current, 'utf8');
        const tokens = estimateTokens(content);
        stats.totalFiles++;
        stats.totalBytes += stat.size;
        stats.totalTokens += tokens;

        stats.topConsumers.push({
          file: path.relative(dirPath, current).replaceAll('\\', '/'),
          bytes: stat.size,
          tokens,
        });
      } catch {
        // Skip unreadable files
      }
    }
  }

  walk(dirPath);

  stats.topConsumers.sort((a, b) => b.tokens - a.tokens);
  stats.topConsumers = stats.topConsumers.slice(0, 10);

  return stats;
}

// ─── Cache Friendliness Audit ────────────────────────────────────────────────

/**
 * Audits prompt sections for static prefix alignment and cache stability.
 * @param {Array<{ name: string, content: string, isStatic: boolean }>} sections
 * @returns {{ cacheOptimized: boolean, score: number, findings: string[] }}
 */
function auditCacheStructure(sections) {
  const findings = [];
  let dynamicSeen = false;
  let breaksCache = false;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.isStatic && dynamicSeen) {
      findings.push(
        `Cache Invalidation Hazard: Static section '${section.name}' appears AFTER dynamic content. Move all invariant sections to the prefix.`
      );
      breaksCache = true;
    }
    if (!section.isStatic) {
      dynamicSeen = true;
    }
  }

  if (!breaksCache) {
    findings.push('Cache Architecture Optimal: Invariant prefix preserved across prompt sequence.');
  }

  return {
    cacheOptimized: !breaksCache,
    score: breaksCache ? 40 : 100,
    findings,
  };
}

// ─── CLI Dispatcher ──────────────────────────────────────────────────────────

function runCli() {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
Token Optimizer CLI — High-Efficiency LLM Token Compression Utility

Usage:
  node token-optimizer.js measure <dir|file>     Measure token footprint & top consumers
  node token-optimizer.js skeletonize <file>      Strip implementation bodies (saves 70-85%)
  node token-optimizer.js compress-log <file>     Filter verbose build/test logs to errors only
  node token-optimizer.js slim-json <file>        Strip nulls, empty objects & truncate arrays
  node token-optimizer.js estimate "<text>"       Quick token estimate for inline text
    `);
    process.exit(0);
  }

  if (command === 'measure') {
    const targetPath = path.resolve(target || '.');
    const result = measurePath(targetPath);
    console.log('\n--- TOKEN FOOTPRINT AUDIT ---');
    console.log(`Scanned Path    : ${targetPath}`);
    console.log(`Total Files     : ${result.totalFiles}`);
    console.log(`Total Bytes     : ${(result.totalBytes / 1024).toFixed(1)} KB`);
    console.log(`Estimated Tokens: ${result.totalTokens.toLocaleString()}`);
    console.log('\nTop 10 Token Consumers:');
    for (const c of result.topConsumers) {
      console.log(`  - ${c.tokens.toLocaleString().padStart(6)} tokens | ${c.file}`);
    }
    return;
  }

  if (command === 'skeletonize') {
    if (!target || !fs.existsSync(target)) {
      console.error(`Error: File not found: ${target}`);
      process.exit(1);
    }
    const code = fs.readFileSync(target, 'utf8');
    const result = skeletonize(code, target);
    console.log(result.skeleton);
    console.error(
      `\n[Token Savings: ${result.originalTokens} → ${result.skeletonTokens} tokens (-${result.reductionPercent}%)]`
    );
    return;
  }

  if (command === 'compress-log') {
    if (!target || !fs.existsSync(target)) {
      console.error(`Error: Log file not found: ${target}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(target, 'utf8');
    const result = compressLog(raw);
    console.log(result.compressed);
    console.error(
      `\n[Log Compression: ${result.originalTokens} → ${result.compressedTokens} tokens (-${result.reductionPercent}%)]`
    );
    return;
  }

  if (command === 'slim-json') {
    if (!target || !fs.existsSync(target)) {
      console.error(`Error: JSON file not found: ${target}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(target, 'utf8');
    const result = slimJSON(raw, { pretty: true });
    console.log(result.slimmed);
    console.error(
      `\n[JSON Slimming: ${result.originalTokens} → ${result.slimmedTokens} tokens (-${result.reductionPercent}%)]`
    );
    return;
  }

  if (command === 'estimate') {
    const text = target || '';
    const tokens = estimateTokens(text);
    console.log(`Estimated Tokens: ${tokens} (${text.length} chars)`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

if (require.main === module) {
  runCli();
}

module.exports = {
  estimateTokens,
  skeletonize,
  skeletonizeJS,
  skeletonizePython,
  skeletonizeGo,
  skeletonizeRust,
  compressLog,
  slimJSON,
  pruneObservations,
  measurePath,
  auditCacheStructure,
};
