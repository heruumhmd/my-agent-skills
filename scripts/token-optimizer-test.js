'use strict';

const assert = require('assert');
const path = require('path');
const {
  estimateTokens,
  skeletonize,
  skeletonizeJS,
  skeletonizePython,
  compressLog,
  auditCacheStructure,
} = require('../skills/token-optimization/scripts/token-optimizer');

console.log('Running token-optimizer tests...');

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

// 2. Test skeletonizeJS
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
    console.log('Database connected');
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
  assert(res.skeleton.includes('findUserById(id: string)'), 'Should retain findUserById signature');
  assert(res.skeleton.includes('deleteUser(id: string)'), 'Should retain deleteUser signature');
  assert(!res.skeleton.includes('SELECT * FROM users'), 'Should prune inner SQL implementation');
  console.log(`  ✓ skeletonizeJS passed (${res.originalTokens} -> ${res.skeletonTokens} tokens, -${res.reductionPercent}%)`);
}

// 3. Test skeletonizePython
{
  const pyCode = `
from typing import List, Optional
import math

class DataProcessor:
    """Class docstring describing the processor."""

    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold
        self.cache = {}

    def process_records(self, records: List[dict]) -> List[dict]:
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
  assert(res.skeleton.includes('def process_records'), 'Should retain def header');
  assert(!res.skeleton.includes('score = math.sqrt'), 'Should prune python function body');
  console.log(`  ✓ skeletonizePython passed (${res.originalTokens} -> ${res.skeletonTokens} tokens, -${res.reductionPercent}%)`);
}

// 4. Test compressLog
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

// 5. Test auditCacheStructure
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
    { name: 'tools_schema', content: 'tools definition JSON', isStatic: true }, // Static after dynamic!
    { name: 'user_turn', content: 'Hello', isStatic: false },
  ];
  const badAudit = auditCacheStructure(badPrompt);
  assert.strictEqual(badAudit.cacheOptimized, false);
  assert(badAudit.findings.some((f) => f.includes('Cache Invalidation Hazard')));
  console.log('  ✓ auditCacheStructure passed');
}

console.log('\nAll token-optimizer tests passed successfully!');
