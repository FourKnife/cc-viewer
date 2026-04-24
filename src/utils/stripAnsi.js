/**
 * Strips ANSI/VT100 escape sequences from a string.
 *
 * Handles:
 * - CSI sequences: ESC [ <params> <final>   (e.g. \x1b[32m, \x1b[2K)
 * - OSC sequences: ESC ] <text> ST          (e.g. \x1b]0;title\x07)
 * - Single-char ESC sequences: ESC <char>   (e.g. \x1b7, \x1b8)
 * - ESC sequences with intermediate bytes: ESC <intermediate> <final>
 *
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function stripAnsi(text) {
  if (text == null) return '';
  if (typeof text !== 'string') return String(text);
  // Core pattern: CSI (ESC [ ... ), OSC (ESC ] ... ST), and other ESC sequences
  return text.replace(/\x1B(?:\[[0-9;?]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\)|[ -/]*[@-~]|[0-9A-Za-z])/g, '');
}
