import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stripAnsi } from '../src/utils/stripAnsi.js';

describe('stripAnsi', () => {
  it('returns empty string for null/undefined', () => {
    assert.equal(stripAnsi(null), '');
    assert.equal(stripAnsi(undefined), '');
  });

  it('returns plain text unchanged', () => {
    assert.equal(stripAnsi('hello world'), 'hello world');
  });

  it('removes CSI color sequences', () => {
    assert.equal(stripAnsi('\x1b[32mgreen\x1b[0m'), 'green');
  });

  it('removes CSI cursor/clear sequences', () => {
    assert.equal(stripAnsi('\x1b[2K'), '');
    assert.equal(stripAnsi('\x1b[1A\x1b[2K\x1b[G'), '');
  });

  it('removes mixed ANSI sequences preserving visible text', () => {
    const input = '\x1b[36m⠸\x1b[39m \x1b[90mCompiling...\x1b[39m';
    assert.equal(stripAnsi(input), '⠸ Compiling...');
  });

  it('removes OSC sequences (window title)', () => {
    assert.equal(stripAnsi('\x1b]0;My Title\x07'), '');
  });

  it('removes all ANSI in complex log output', () => {
    const input = '\x1b[32mCompiled successfully!\x1b[0m\n\x1b[90mWAIT\x1b[0m  Compiling...\n';
    assert.equal(stripAnsi(input), 'Compiled successfully!\nWAIT  Compiling...\n');
  });

  it('preserves newlines', () => {
    const input = '\x1b[32mline1\x1b[0m\n\x1b[31mline2\x1b[0m\n';
    assert.equal(stripAnsi(input), 'line1\nline2\n');
  });

  it('handles empty string', () => {
    assert.equal(stripAnsi(''), '');
  });

  it('handles string with only ANSI sequences', () => {
    assert.equal(stripAnsi('\x1b[?25l\x1b[?25h'), '');
  });
});
