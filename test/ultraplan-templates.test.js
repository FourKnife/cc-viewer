import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomTemplate, buildLocalUltraplan, ULTRAPLAN_VARIANTS } from '../src/utils/ultraplanTemplates.js';

describe('ultraplanTemplates: buildCustomTemplate', () => {
  it('returns empty string for empty body', () => {
    assert.equal(buildCustomTemplate(''), '');
  });

  it('returns empty string for whitespace-only body', () => {
    assert.equal(buildCustomTemplate('   \n\t  '), '');
  });

  it('returns empty string for null/undefined', () => {
    assert.equal(buildCustomTemplate(null), '');
    assert.equal(buildCustomTemplate(undefined), '');
  });

  it('wraps body in <system-reminder> with [SCOPED INSTRUCTION] preamble', () => {
    const out = buildCustomTemplate('You are a reviewer.');
    assert.ok(out.startsWith('<system-reminder>'), `missing opening tag: ${out.slice(0, 40)}`);
    assert.ok(out.endsWith('</system-reminder>'), `missing closing tag: ${out.slice(-40)}`);
    assert.ok(out.includes('[SCOPED INSTRUCTION]'), 'missing preamble');
    assert.ok(out.includes('You are a reviewer.'), 'body content missing');
  });

  it('trims surrounding whitespace from body', () => {
    const out = buildCustomTemplate('  hello  \n');
    assert.ok(out.includes('hello'));
    assert.ok(!out.includes('  hello  '));
  });
});

describe('ultraplanTemplates: buildLocalUltraplan', () => {
  it('uses codeExpert template by default', () => {
    const out = buildLocalUltraplan('build feature X');
    assert.ok(out.includes(ULTRAPLAN_VARIANTS.codeExpert));
    assert.ok(out.endsWith('build feature X'));
  });

  it('uses researchExpert template when variant is researchExpert', () => {
    const out = buildLocalUltraplan('research Y', 'researchExpert');
    assert.ok(out.includes(ULTRAPLAN_VARIANTS.researchExpert));
  });

  it('falls back to codeExpert for unknown variant (non-custom)', () => {
    const out = buildLocalUltraplan('task', 'unknownVariant');
    assert.ok(out.includes(ULTRAPLAN_VARIANTS.codeExpert));
  });

  it('returns empty string for variant=custom with empty content', () => {
    assert.equal(buildLocalUltraplan('task', 'custom', undefined, ''), '');
    assert.equal(buildLocalUltraplan('task', 'custom', undefined, '   '), '');
    assert.equal(buildLocalUltraplan('task', 'custom', undefined, undefined), '');
  });

  it('assembles custom variant with wrapped template + user prompt', () => {
    const out = buildLocalUltraplan('ship it', 'custom', undefined, 'You are an auditor.');
    assert.ok(out.includes('<system-reminder>'), 'wrapper missing');
    assert.ok(out.includes('You are an auditor.'), 'custom body missing');
    assert.ok(out.includes('[SCOPED INSTRUCTION]'), 'preamble missing');
    assert.ok(out.endsWith('ship it'), 'user prompt should be appended last');
  });

  it('supports optional seedPlan prefix', () => {
    const out = buildLocalUltraplan('task', 'codeExpert', 'DRAFT PLAN');
    assert.ok(out.startsWith('Here is a draft plan to refine:'));
    assert.ok(out.includes('DRAFT PLAN'));
    assert.ok(out.includes(ULTRAPLAN_VARIANTS.codeExpert));
  });

  it('assembles custom variant with seedPlan', () => {
    const out = buildLocalUltraplan('task', 'custom', 'DRAFT', 'auditor role');
    assert.ok(out.startsWith('Here is a draft plan to refine:'));
    assert.ok(out.includes('DRAFT'));
    assert.ok(out.includes('auditor role'));
    assert.ok(out.endsWith('task'));
  });
});
