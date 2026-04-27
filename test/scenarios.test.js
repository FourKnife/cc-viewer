import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TMP_DIR = join(process.cwd(), 'tmp-scenario-test');

import { readScenariosFile, writeScenariosFile, scenariosFilePath } from '../server.js';

describe('scenario storage helpers', () => {
  before(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('scenariosFilePath returns path under projectDir', () => {
    const p = scenariosFilePath(TMP_DIR);
    assert.ok(p.includes('.cleffa'));
    assert.ok(p.endsWith('scenarios.json'));
  });

  it('readScenariosFile returns empty array when file missing', () => {
    const result = readScenariosFile(TMP_DIR);
    assert.deepEqual(result, []);
  });

  it('writeScenariosFile creates .cleffa dir and persists data', () => {
    const scenarios = [{ id: 'abc', name: 'Test', url: '/test', storage: {}, steps: [] }];
    writeScenariosFile(TMP_DIR, scenarios);
    const result = readScenariosFile(TMP_DIR);
    assert.deepEqual(result, scenarios);
  });

  it('writeScenariosFile overwrites existing data', () => {
    writeScenariosFile(TMP_DIR, [{ id: '1', name: 'A', url: '/a', storage: {}, steps: [] }]);
    writeScenariosFile(TMP_DIR, [{ id: '2', name: 'B', url: '/b', storage: {}, steps: [] }]);
    const result = readScenariosFile(TMP_DIR);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '2');
  });
});
