'use strict';

const assert = require('assert');
const path = require('path');
const {
  estimateTokens,
  skeletonize,
  skeletonizeJS,
  skeletonizePython,
  skeletonizeGo,
  skeletonizeRust,
  compressLog,
  slimJSON,
  pruneObservations,
  auditCacheStructure,
} = require('../skills/token-optimization/scripts/token-optimizer');

console.log('Running comprehensive token-optimizer test suite...');

// 1. Test estimateTokens
{
  assert.strictEqual(estimateTokens(''), 0);
  assert.strictEqual(estimateTokens(null), 0);
  const text = 'Hello world, this is an agent token test.';
  const tokens = estimateTokens(text);
  assert(tokens >= 7 && tokens <= 12, `Unexpected token count for simple text: ${tokens}`);

  const code = `
  function calculateTotal(items: Item[]): number {
    return items.reduce((sum, item) => sum + item.price, 0);
  }
  `;
  const codeTokens = estimateTokens(code);
  assert(codeTokens >= 15 && codeTokens <= 35, `Unexpected token count for code: ${codeTokens}`);
  console.log('  ✓ estimateTokens passed');
}

// 2. Test skeletonizeJS - Standard, Multi-line, and String/Comment Braces
{
  const tsCode = `
import { Request, Response } from 'express';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    // Tricky comment with { open brace that shouldn't corrupt depth
    const template = \`inner \${1+2} with { fake braces }\`;
    console.log('Database connected');
  }

  // Multi-line method signature with parameters across lines
  public async createUser(
    name: string,
    email: string,
    role: string = 'member'
  ): Promise<UserDTO> {
    const query = 'INSERT INTO users VALUES (?, ?, ?)';
    await this.db.query(query, [name, email, role]);
    return { id: '1', name, email };
  }

  public async findUserById(id: string): Promise<UserDTO | null> {
    const query = 'SELECT * FROM users WHERE id = ?';
    const row = await this.db.query(query, [id]);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
    };
  }

  public async deleteUser(id: string): Promise<boolean> {
    await this.db.execute('DELETE FROM users WHERE id = ?', [id]);
    return true;
  }
}
`;

  const res = skeletonize(tsCode, 'UserService.ts');
  assert(res.reductionPercent >= 30, `Expected at least 30% reduction, got ${res.reductionPercent}%`);
  assert(res.skeleton.includes('export interface UserDTO'), 'Should retain interface');
  assert(res.skeleton.includes('createUser('), 'Should retain multi-line createUser signature');
  assert(res.skeleton.includes('findUserById(id: string)'), 'Should retain findUserById signature');
  assert(res.skeleton.includes('deleteUser(id: string)'), 'Should retain deleteUser signature');
  assert(!res.skeleton.includes('SELECT * FROM users'), 'Should prune inner SQL implementation');
  assert(!res.skeleton.includes('INSERT INTO users'), 'Should prune multi-line createUser body');
  console.log(`  ✓ skeletonizeJS passed with multi-line signatures and string brace masking (${res.originalTokens} -> ${res.skeletonTokens} tokens, -${res.reductionPercent}%)`);
}

// 3. Test skeletonizePython - Multi-line def, nested methods, and docstrings
{
  const pyCode = `
from typing import List, Optional
import math

class DataProcessor:
    """Class docstring describing the processor."""

    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold
        self.cache = {}

    # Multi-line def signature
    def process_records(
        self,
        records: List[dict],
        max_batch_size: int = 100,
    ) -> List[dict]:
        """Process records and filter out low confidence values."""
        results = []
        for r in records:
            score = math.sqrt(r.get('val', 0))
            if score > self.threshold:
                results.append({'id': r['id'], 'score': score})
        return results

    def clear_cache(self) -> None:
        self.cache.clear()
`;

  const res = skeletonize(pyCode, 'processor.py');
  assert(res.reductionPercent >= 20, `Expected at least 20% reduction, got ${res.reductionPercent}%`);
  assert(res.skeleton.includes('class DataProcessor:'), 'Should retain class header');
  assert(res.skeleton.includes('def process_records('), 'Should retain multi-line def header');
  assert(res.skeleton.includes('def clear_cache(self) -> None:'), 'Should retain clear_cache def header');
  assert(!res.skeleton.includes('score = math.sqrt'), 'Should prune python function body');
  assert(!res.skeleton.includes('self.cache.clear()'), 'Should prune clear_cache body');
  console.log(`  ✓ skeletonizePython passed with multi-line def signatures (${res.originalTokens} -> ${res.skeletonTokens} tokens, -${res.reductionPercent}%)`);
}

// 4. Test skeletonizeGo
{
  const goCode = `
package main

import (
  "fmt"
  "net/http"
)

type ServerConfig struct {
  Port int
  Host string
}

type Greeter interface {
  Greet(name string) string
}

func (s *ServerConfig) StartServer() error {
  fmt.Printf("Starting on %s:%d\n", s.Host, s.Port)
  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Hello"))
  })
  return http.ListenAndServe(":8080", nil)
}
`;

  const res = skeletonize(goCode, 'server.go');
  assert(res.reductionPercent >= 20, `Expected Go reduction, got ${res.reductionPercent}%`);
  assert(res.skeleton.includes('type ServerConfig struct'), 'Must preserve Go struct');
  assert(res.skeleton.includes('type Greeter interface'), 'Must preserve Go interface');
  assert(res.skeleton.includes('func (s *ServerConfig) StartServer() error'), 'Must preserve func signature');
  assert(!res.skeleton.includes('http.HandleFunc'), 'Must prune inner Go body');
  console.log(`  ✓ skeletonizeGo passed (${res.originalTokens} -> ${res.skeletonTokens} tokens, -${res.reductionPercent}%)`);
}

// 5. Test skeletonizeRust
{
  const rustCode = `
pub struct Config {
    pub timeout_ms: u64,
}

pub trait Worker {
    fn run(&self) -> Result<(), String>;
}

pub async fn execute_task(id: &str, config: &Config) -> Result<String, String> {
    let raw = format!("Task {} starting", id);
    println!("{}", raw);
    Ok("done".to_string())
}
`;

  const res = skeletonize(rustCode, 'worker.rs');
  assert(res.reductionPercent >= 15, `Expected Rust reduction, got ${res.reductionPercent}%`);
  assert(res.skeleton.includes('pub struct Config'), 'Must preserve Rust struct');
  assert(res.skeleton.includes('pub trait Worker'), 'Must preserve Rust trait');
  assert(res.skeleton.includes('pub async fn execute_task'), 'Must preserve fn signature');
  assert(!res.skeleton.includes('let raw = format!'), 'Must prune inner Rust body');
  console.log(`  ✓ skeletonizeRust passed (${res.originalTokens} -> ${res.skeletonTokens} tokens, -${res.reductionPercent}%)`);
}

// 6. Test slimJSON
{
  const bulkyPayload = {
    status: 'success',
    data: {
      user: {
        id: 101,
        name: 'Alice',
        email: 'alice@example.com',
        middleName: null,
        metadata: {},
        tags: [],
        auditLog: null,
      },
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
        { id: 4, name: 'Item 4' },
        { id: 5, name: 'Item 5' },
        { id: 6, name: 'Item 6' },
        { id: 7, name: 'Item 7' },
        { id: 8, name: 'Item 8' },
      ],
      emptySection: {},
    },
    errors: [],
  };

  const res = slimJSON(bulkyPayload, { maxArrayItems: 3 });
  assert(res.reductionPercent >= 30, `Expected JSON reduction >= 30%, got ${res.reductionPercent}%`);
  assert(!res.slimmed.includes('middleName'), 'Must drop null field middleName');
  assert(!res.slimmed.includes('emptySection'), 'Must drop empty object emptySection');
  assert(res.slimmed.includes('more items truncated'), 'Must truncate array beyond threshold');
  console.log(`  ✓ slimJSON passed (${res.originalTokens} -> ${res.slimmedTokens} tokens, -${res.reductionPercent}%)`);
}

// 7. Test pruneObservations
{
  const conversation = [
    { role: 'user', content: 'Run git status and tests' },
    { role: 'assistant', content: 'Running command...' },
    { role: 'tool', name: 'run_command', content: 'PASS test 1\nPASS test 2\n'.repeat(50) },
    { role: 'user', content: 'Fix the bug in auth' },
    { role: 'assistant', content: 'Investigating auth...' },
    { role: 'user', content: 'What is the current status?' },
  ];

  const res = pruneObservations(conversation, { keepRecentTurns: 1, maxObservationChars: 200 });
  assert(res.prunedCount === 1, `Expected 1 tool observation to be pruned, got ${res.prunedCount}`);
  assert(res.savedTokens > 50, `Expected token savings, got ${res.savedTokens}`);
  assert(res.prunedMessages[2].content.includes('Historical tool observation from turn'), 'Should replace with stub');
  console.log(`  ✓ pruneObservations passed (${res.prunedCount} observations pruned, saved ${res.savedTokens} tokens)`);
}

// 8. Test compressLog
{
  const verboseTestLog = `
PASS src/math.test.ts (2.3s)
  ✓ adds two numbers (3ms)
  ✓ subtracts two numbers (2ms)
  ✓ multiplies numbers (1ms)
  ✓ divides numbers (2ms)
PASS src/utils.test.ts (1.1s)
  ✓ parses date correctly (5ms)
  ✓ formats currency (2ms)
FAIL src/auth.test.ts (4.8s)
  ● AuthService › login with invalid password
    AssertionError: Expected status 401 but received 500
      at Object.<anonymous> (src/auth.test.ts:45:18)
      at Promise.then.completed (node_modules/jest-circus/build/utils.js:333:28)
      at new Promise (<anonymous>)
  ✓ should refresh access token (12ms)
Test Suites: 1 failed, 2 passed, 3 total
Tests:       1 failed, 6 passed, 7 total
Snapshots:   0 total
Time:        5.21s
`;

  const res = compressLog(verboseTestLog);
  assert(res.reductionPercent >= 20, `Expected reduction in verbose log, got ${res.reductionPercent}%`);
  assert(res.compressed.includes('AssertionError: Expected status 401 but received 500'), 'Must retain failing assertion');
  assert(res.compressed.includes('src/auth.test.ts:45:18'), 'Must retain failing stack line');
  assert(!res.compressed.includes('✓ adds two numbers'), 'Must strip noisy passing test items');
  console.log(`  ✓ compressLog passed (${res.originalTokens} -> ${res.compressedTokens} tokens, -${res.reductionPercent}%)`);
}

// 9. Test auditCacheStructure
{
  const goodPrompt = [
    { name: 'system_instructions', content: 'You are an AI assistant', isStatic: true },
    { name: 'tools_schema', content: 'tools definition JSON', isStatic: true },
    { name: 'project_rules', content: 'CLAUDE.md conventions', isStatic: true },
    { name: 'user_turn', content: 'Refactor this function', isStatic: false },
  ];
  const goodAudit = auditCacheStructure(goodPrompt);
  assert.strictEqual(goodAudit.cacheOptimized, true);
  assert.strictEqual(goodAudit.score, 100);

  const badPrompt = [
    { name: 'system_instructions', content: 'You are an AI assistant', isStatic: true },
    { name: 'timestamp', content: 'Current time is 10:20:15', isStatic: false },
    { name: 'tools_schema', content: 'tools definition JSON', isStatic: true },
    { name: 'user_turn', content: 'Hello', isStatic: false },
  ];
  const badAudit = auditCacheStructure(badPrompt);
  assert.strictEqual(badAudit.cacheOptimized, false);
  assert(badAudit.findings.some((f) => f.includes('Cache Invalidation Hazard')));
  console.log('  ✓ auditCacheStructure passed');
}

console.log('\nAll comprehensive token-optimizer tests passed successfully!');
