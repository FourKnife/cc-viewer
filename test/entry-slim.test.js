/**
 * Unit tests for src/utils/entry-slim.js
 * 覆盖 createIncrementalSlimmer 和 restoreSlimmedEntry 的防御检查。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createIncrementalSlimmer,
  createEntrySlimmer,
  restoreSlimmedEntry,
  slimBodyBigFields,
  SYSTEM_TEXT_KEEP_PREFIX,
} from '../src/utils/entry-slim.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const isMainAgent = (entry) => !!entry.mainAgent;

function makeMainAgent(msgCount, opts = {}) {
  const messages = [];
  for (let i = 0; i < msgCount; i++) {
    messages.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `msg-${i}` });
  }
  return {
    timestamp: opts.timestamp || new Date().toISOString(),
    url: opts.url || 'https://api.anthropic.com/v1/messages',
    mainAgent: true,
    body: {
      messages,
      metadata: opts.metadata || { user_id: opts.userId || 'user-1', request_id: `r-${Math.random()}` },
      model: 'claude-opus-4-6',
      tools: opts.tools || [
        { name: 'Bash', description: 'X'.repeat(20000), input_schema: { type: 'object', properties: { cmd: {} } } },
        { name: 'Read', description: 'X'.repeat(10000), input_schema: { type: 'object' } },
      ],
      system: opts.system || [
        { type: 'text', text: 'You are Claude Code, Anthropic\'s official CLI for Claude. ' + 'A'.repeat(50000), cache_control: { type: 'ephemeral' } },
      ],
      tool_choice: opts.tool_choice || { type: 'auto' },
    },
    response: { status: 200, body: {} },
  };
}

function makeSubAgent(msgCount) {
  const messages = [];
  for (let i = 0; i < msgCount; i++) {
    messages.push({ role: 'user', content: `sub-${i}` });
  }
  return {
    timestamp: new Date().toISOString(),
    url: 'https://api.anthropic.com/v1/messages',
    mainAgent: false,
    body: { messages, model: 'claude-sonnet-4-6' },
    response: { status: 200, body: {} },
  };
}

// ─── createIncrementalSlimmer ─────────────────────────────────────────────────

describe('createIncrementalSlimmer', () => {
  it('should slim previous MainAgent entries in the same session', () => {
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    // Entry 0: 10 messages
    const e0 = makeMainAgent(10);
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);
    assert.equal(e0._slimmed, undefined, 'first entry should not be slimmed');

    // Entry 1: 15 messages (same session, cumulative)
    const e1 = makeMainAgent(15);
    slimmer.processEntry(e1, requests, 1);
    requests.push(e1);
    assert.equal(requests[0]._slimmed, true, 'entry 0 should be slimmed');
    assert.equal(requests[0].body.messages.length, 0, 'entry 0 messages should be empty');
    assert.equal(requests[0]._messageCount, 10);
    assert.equal(requests[0]._fullEntryIndex, 1, 'entry 0 should point to entry 1');

    // Entry 2: 20 messages (same session)
    const e2 = makeMainAgent(20);
    slimmer.processEntry(e2, requests, 2);
    requests.push(e2);
    assert.equal(requests[1]._slimmed, true, 'entry 1 should be slimmed');
    assert.equal(requests[1]._fullEntryIndex, 2, 'entry 1 should point to entry 2');
    // Entry 0 should also be updated to point to entry 2 (cascade)
    assert.equal(requests[0]._fullEntryIndex, 2, 'entry 0 should cascade to entry 2');
    // Entry 2 should remain full
    assert.equal(requests[2]._slimmed, undefined);
    assert.equal(requests[2].body.messages.length, 20);
  });

  it('should clear sessionSlimmedIndices on session boundary', () => {
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    // Session 1: entries 0, 1
    const e0 = makeMainAgent(10);
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);

    const e1 = makeMainAgent(15);
    slimmer.processEntry(e1, requests, 1);
    requests.push(e1);
    assert.equal(requests[0]._slimmed, true);
    assert.equal(requests[0]._fullEntryIndex, 1);

    // Session 2: entry 2 has 6 messages with different userId (new session, not transient)
    const e2 = makeMainAgent(6, { userId: 'user-2' });
    slimmer.processEntry(e2, requests, 2);
    requests.push(e2);

    // Entry 0 should still point to entry 1 (not updated to entry 2 — different session)
    assert.equal(requests[0]._fullEntryIndex, 1);

    // Session 2: entry 3 (12 messages)
    const e3 = makeMainAgent(12, { userId: 'user-2' });
    slimmer.processEntry(e3, requests, 3);
    requests.push(e3);
    assert.equal(requests[2]._slimmed, true, 'session 2 entry should be slimmed');
    assert.equal(requests[2]._fullEntryIndex, 3);
    // Entry 0 from session 1 should NOT be updated
    assert.equal(requests[0]._fullEntryIndex, 1);
  });

  it('should remove index from sessionSlimmedIndices on dedup', () => {
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    // Entry 0: 10 messages
    const e0 = makeMainAgent(10);
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);

    // Entry 1: 15 messages — slims entry 0
    const e1 = makeMainAgent(15);
    slimmer.processEntry(e1, requests, 1);
    requests.push(e1);
    assert.equal(requests[0]._slimmed, true);
    assert.equal(requests[0]._fullEntryIndex, 1);

    // Dedup replaces entry 0 with a completed version
    const e0completed = makeMainAgent(10);
    requests[0] = e0completed;
    slimmer.onDedup(0);

    // Entry 2: 20 messages — should NOT try to update entry 0's _fullEntryIndex
    const e2 = makeMainAgent(20);
    slimmer.processEntry(e2, requests, 2);
    requests.push(e2);

    // Entry 0 (completed) should NOT have _fullEntryIndex (it was removed from set)
    assert.equal(requests[0]._fullEntryIndex, undefined, 'deduped entry should not have _fullEntryIndex');
    // Entry 1 should be slimmed and point to entry 2
    assert.equal(requests[1]._slimmed, true);
    assert.equal(requests[1]._fullEntryIndex, 2);
  });

  it('should skip transient requests', () => {
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    // Entry 0: 15 messages
    const e0 = makeMainAgent(15);
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);

    // Transient entry: only 2 messages, looks like new session but prevCount > 10
    const eTransient = makeMainAgent(2, { userId: 'user-2' });
    slimmer.processEntry(eTransient, requests, 1);
    requests.push(eTransient);

    // Entry 0 should NOT be slimmed (transient was skipped)
    assert.equal(requests[0]._slimmed, undefined);

    // Entry 2: 20 messages (same session as entry 0, continues normally)
    const e2 = makeMainAgent(20);
    slimmer.processEntry(e2, requests, 2);
    requests.push(e2);
    assert.equal(requests[0]._slimmed, true, 'entry 0 should now be slimmed');
    assert.equal(requests[0]._fullEntryIndex, 2);
  });

  it('should not slim non-MainAgent entries', () => {
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    const e0 = makeMainAgent(10);
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);

    const sub = makeSubAgent(5);
    slimmer.processEntry(sub, requests, 1);
    requests.push(sub);

    // SubAgent should not affect slim state; entry 0 should not be slimmed
    assert.equal(requests[0]._slimmed, undefined);
    assert.equal(sub._slimmed, undefined);
  });

  it('should detect session boundary by message count drop (same userId)', () => {
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    // Session 1: 20 messages
    const e0 = makeMainAgent(20);
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);

    const e1 = makeMainAgent(25);
    slimmer.processEntry(e1, requests, 1);
    requests.push(e1);
    assert.equal(requests[0]._slimmed, true);

    // Session 2: message count drops from 25 to 5 (same userId) → new session
    const e2 = makeMainAgent(5);
    slimmer.processEntry(e2, requests, 2);
    requests.push(e2);

    // Entry 0 should still point to entry 1 (session 1), not entry 2 (session 2)
    assert.equal(requests[0]._fullEntryIndex, 1, 'session 1 entries should not cascade to session 2');

    // Session 2 continues: entry 3 slims entry 2
    const e3 = makeMainAgent(10);
    slimmer.processEntry(e3, requests, 3);
    requests.push(e3);
    assert.equal(requests[2]._slimmed, true);
    assert.equal(requests[2]._fullEntryIndex, 3);
  });

  it('should slim entries with _deltaFormat after reconstruction', () => {
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    const e0 = makeMainAgent(10);
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);

    const eDelta = makeMainAgent(15);
    eDelta._deltaFormat = true;
    slimmer.processEntry(eDelta, requests, 1);
    requests.push(eDelta);

    // After reconstruction, delta entries have full messages and should be slimmed
    assert.equal(requests[0]._slimmed, true);
    assert.equal(requests[0].body.messages.length, 0);
    assert.equal(requests[0]._fullEntryIndex, 1);
  });
});

// ─── restoreSlimmedEntry defensive check ──────────────────────────────────────

describe('restoreSlimmedEntry', () => {
  it('should restore slimmed entry from fullEntry', () => {
    const full = makeMainAgent(20);
    const slimmed = {
      ...makeMainAgent(10),
      _slimmed: true,
      _messageCount: 10,
      _fullEntryIndex: 1,
    };
    slimmed.body.messages = [];
    const requests = [slimmed, full];

    const restored = restoreSlimmedEntry(slimmed, requests);
    assert.equal(restored.body.messages.length, 10);
    assert.notEqual(restored, slimmed, 'should return new object');
  });

  it('should return original entry when fullEntry has fewer messages than _messageCount', () => {
    const full = makeMainAgent(5); // only 5 messages, but slimmed expects 10
    const slimmed = {
      ...makeMainAgent(10),
      _slimmed: true,
      _messageCount: 10,
      _fullEntryIndex: 1,
    };
    slimmed.body.messages = [];
    const requests = [slimmed, full];

    const result = restoreSlimmedEntry(slimmed, requests);
    assert.equal(result, slimmed, 'should return original when fullEntry has insufficient messages');
  });

  it('should return original entry when not slimmed', () => {
    const entry = makeMainAgent(10);
    const requests = [entry];
    assert.equal(restoreSlimmedEntry(entry, requests), entry);
  });

  it('should return original entry when _fullEntryIndex is null', () => {
    const entry = makeMainAgent(10);
    entry._slimmed = true;
    entry._fullEntryIndex = null;
    const requests = [entry];
    assert.equal(restoreSlimmedEntry(entry, requests), entry);
  });

  it('should restore tools/system/metadata/tool_choice from fullEntry', () => {
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    const e0 = makeMainAgent(10);
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);

    const e1 = makeMainAgent(15);
    slimmer.processEntry(e1, requests, 1);
    requests.push(e1);

    // entry 0 现在已被 slim 且 body.tools 仅保留 name
    assert.equal(requests[0]._slimmed, true);
    assert.equal(requests[0].body.tools.length, 2);
    assert.equal(requests[0].body.tools[0].name, 'Bash');
    assert.equal(requests[0].body.tools[0].description, undefined, 'description should be stripped');
    assert.equal(requests[0].body.tools[0].input_schema, undefined, 'input_schema should be stripped');

    // system text 被截断
    assert.ok(requests[0].body.system[0].text.length <= 2048);
    assert.ok(requests[0].body.system[0].text.startsWith('You are Claude Code'));
    assert.deepEqual(requests[0].body.system[0].cache_control, { type: 'ephemeral' });

    // metadata 仅保留 user_id
    assert.equal(requests[0].body.metadata.user_id, 'user-1');
    assert.equal(requests[0].body.metadata.request_id, undefined);

    // tool_choice 被删除
    assert.equal('tool_choice' in requests[0].body, false);

    // restore 后从 fullEntry 还原所有字段
    const restored = restoreSlimmedEntry(requests[0], requests);
    assert.equal(restored.body.tools[0].description.length, 20000);
    assert.equal(restored.body.tools[0].input_schema.type, 'object');
    assert.equal(restored.body.system[0].text.length > 2048, true);
    assert.equal(restored.body.metadata.request_id, requests[1].body.metadata.request_id);
    assert.deepEqual(restored.body.tool_choice, { type: 'auto' });
  });

  it('should not mutate fullEntry body when slim runs (incremental path)', () => {
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    const e0 = makeMainAgent(10);
    const origToolsRef = e0.body.tools;
    const origSystemRef = e0.body.system;
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);

    const e1 = makeMainAgent(15);
    slimmer.processEntry(e1, requests, 1);
    requests.push(e1);

    // 增量路径 clone 后 e0 实例本身的 body 不应被替换（关键：React state 引用不变）
    assert.equal(e0.body.tools, origToolsRef, 'original e0.body.tools reference must not be mutated');
    assert.equal(e0.body.system, origSystemRef, 'original e0.body.system reference must not be mutated');
    // 而 requests[0] 是 cloned slimmed entry
    assert.notEqual(requests[0], e0, 'requests[0] should be the cloned slimmed entry, not e0');
    assert.equal(requests[0].body.tools[0].description, undefined);
  });

  it('should slim body.tools/system in batch slimmer', () => {
    const entries = [];
    const e0 = makeMainAgent(10);
    const e1 = makeMainAgent(15);
    entries.push(e0, e1);

    const slimmer = createEntrySlimmer(isMainAgent);
    slimmer.process(e0, entries, 0);
    slimmer.process(e1, entries, 1);
    slimmer.finalize(entries);

    assert.equal(entries[0]._slimmed, true);
    assert.equal(entries[0].body.tools[0].description, undefined);
    assert.ok(entries[0].body.system[0].text.length <= 2048);
    assert.equal('tool_choice' in entries[0].body, false);
    // entry 1 是 fullEntry，未变
    assert.equal(entries[1]._slimmed, undefined);
    assert.equal(entries[1].body.tools[0].description.length, 20000);
  });

  it('should preserve identifiers needed for isMainAgent detection in slimmed system text', () => {
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    const e0 = makeMainAgent(10);
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);

    const e1 = makeMainAgent(15);
    slimmer.processEntry(e1, requests, 1);
    requests.push(e1);

    // slim 后 system text 必须仍包含 "You are Claude Code" 标识
    const sysText = requests[0].body.system.map(s => s.text || '').join('');
    assert.ok(sysText.includes('You are Claude Code'), 'slimmed system must retain MainAgent identifier');
    // tools[].name 必须保留（isMainAgent 旧路径依赖 body.tools.some(t=>t.name==='Edit') 等）
    assert.ok(Array.isArray(requests[0].body.tools));
    assert.equal(requests[0].body.tools[0].name, 'Bash');
    assert.equal(requests[0].body.tools[1].name, 'Read');
  });

  it('should restore cascaded slimmed entry using cascaded _fullEntryIndex', () => {
    // Build entries via the slimmer so cascade is applied correctly
    const slimmer = createIncrementalSlimmer(isMainAgent);
    const requests = [];

    // Entry 0: MainAgent, 10 messages
    const e0 = makeMainAgent(10);
    slimmer.processEntry(e0, requests, 0);
    requests.push(e0);

    // Entry 1: non-MainAgent — should not affect slim state
    const e1 = makeSubAgent(5);
    slimmer.processEntry(e1, requests, 1);
    requests.push(e1);

    // Entry 2: MainAgent, 20 messages — slims entry 0 and cascades _fullEntryIndex to 2
    const e2 = makeMainAgent(20);
    slimmer.processEntry(e2, requests, 2);
    requests.push(e2);

    // Verify cascade happened: entry 0 points to entry 2
    assert.equal(requests[0]._slimmed, true);
    assert.equal(requests[0]._fullEntryIndex, 2, 'entry 0 should cascade to entry 2');

    // restoreSlimmedEntry should slice entry 2's messages down to entry 0's original count (10)
    const restored = restoreSlimmedEntry(requests[0], requests);
    assert.notEqual(restored, requests[0], 'should return new object');
    assert.equal(restored.body.messages.length, 10, 'restored entry should have original 10 messages sliced from entry 2');
  });
});

// ─── slimBodyBigFields edge cases ─────────────────────────────────────────────

describe('slimBodyBigFields edge cases', () => {
  it('should truncate body.system when it is a long string (not array)', () => {
    const body = {
      messages: [{ role: 'user', content: 'x' }],
      system: 'You are Claude Code, ' + 'A'.repeat(SYSTEM_TEXT_KEEP_PREFIX * 2),
    };
    const slimmed = slimBodyBigFields(body);
    assert.equal(typeof slimmed.system, 'string');
    assert.equal(slimmed.system.length, SYSTEM_TEXT_KEEP_PREFIX);
    assert.ok(slimmed.system.startsWith('You are Claude Code'));
    // 短字符串不截断
    const shortBody = { messages: [], system: 'short text' };
    assert.equal(slimBodyBigFields(shortBody).system, 'short text');
  });

  it('should normalize tools entries that lack a name', () => {
    const body = {
      messages: [{ role: 'user', content: 'x' }],
      tools: [
        { name: 'Bash', description: 'X'.repeat(5000) },
        { description: 'no-name tool', input_schema: { type: 'object' } },
        null,
        { name: '', description: 'empty-name tool' },
      ],
    };
    const slimmed = slimBodyBigFields(body);
    assert.equal(slimmed.tools.length, 4);
    // tool with name: { name } only
    assert.deepEqual(slimmed.tools[0], { name: 'Bash' });
    // no-name tool: 不能保留 description（避免变相绕过 slim）
    assert.deepEqual(slimmed.tools[1], { name: null });
    assert.equal('description' in slimmed.tools[1], false, 'no-name tool must not retain description');
    // null entry: 也降级为 { name: null }
    assert.deepEqual(slimmed.tools[2], { name: null });
    // empty-string name 视为无 name
    assert.deepEqual(slimmed.tools[3], { name: null });
  });

  it('should handle body.metadata when null/undefined', () => {
    // metadata 是 null
    const bodyNull = {
      messages: [{ role: 'user', content: 'x' }],
      metadata: null,
    };
    const slimmedNull = slimBodyBigFields(bodyNull);
    assert.equal(slimmedNull.metadata, null, 'null metadata should pass through unchanged');

    // metadata 缺失
    const bodyMissing = { messages: [{ role: 'user', content: 'x' }] };
    const slimmedMissing = slimBodyBigFields(bodyMissing);
    assert.equal('metadata' in slimmedMissing, false, 'missing metadata stays missing');

    // metadata 无 user_id
    const bodyNoUserId = {
      messages: [{ role: 'user', content: 'x' }],
      metadata: { request_id: 'r-123', some_other: 'value' },
    };
    const slimmedNoUserId = slimBodyBigFields(bodyNoUserId);
    assert.deepEqual(slimmedNoUserId.metadata, {}, 'metadata without user_id slims to empty object');
  });
});
