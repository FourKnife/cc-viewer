import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAvailablePages } from '../src/utils/parseAvailablePages.js';

describe('parseAvailablePages', () => {
  it('returns empty array for null/undefined', () => {
    assert.deepEqual(parseAvailablePages(null), []);
    assert.deepEqual(parseAvailablePages(undefined), []);
  });

  it('returns empty array when no Available Pages block', () => {
    assert.deepEqual(parseAvailablePages('no pages here'), []);
    assert.deepEqual(parseAvailablePages(''), []);
  });

  it('parses a single page', () => {
    const input = `Available Pages:\n- demo: http://localhost:3002/demo.html`;
    const result = parseAvailablePages(input);
    assert.deepEqual(result, [{ name: 'demo', url: 'http://localhost:3002/demo.html' }]);
  });

  it('parses multiple pages', () => {
    const input = `Available Pages:\n- demo: http://localhost:3002/demo.html\n- transferInCKK: http://localhost:3002/transferInCKK.html`;
    const result = parseAvailablePages(input);
    assert.deepEqual(result, [
      { name: 'demo', url: 'http://localhost:3002/demo.html' },
      { name: 'transferInCKK', url: 'http://localhost:3002/transferInCKK.html' },
    ]);
  });

  it('handles extra spacing around colons', () => {
    const input = `Available Pages:\n- demo  :  http://localhost:3002/demo.html`;
    const result = parseAvailablePages(input);
    assert.deepEqual(result, [{ name: 'demo', url: 'http://localhost:3002/demo.html' }]);
  });

  it('only parses pages after the Available Pages header', () => {
    const input = `Some build output\nAvailable Pages:\n- demo: http://localhost:3002/demo.html\nBuild finished`;
    const result = parseAvailablePages(input);
    assert.deepEqual(result, [{ name: 'demo', url: 'http://localhost:3002/demo.html' }]);
  });

  it('returns empty array when header exists but no page entries', () => {
    const input = `Available Pages:\n`;
    assert.deepEqual(parseAvailablePages(input), []);
  });

  it('handles real-world log format with ANSI-stripped text', () => {
    const input = `Available Pages:\n  - demo:    http://localhost:3002/demo.html\n  - transferInCKK:  http://localhost:3002/transferInCKK.html`;
    const result = parseAvailablePages(input);
    assert.deepEqual(result, [
      { name: 'demo', url: 'http://localhost:3002/demo.html' },
      { name: 'transferInCKK', url: 'http://localhost:3002/transferInCKK.html' },
    ]);
  });
});
