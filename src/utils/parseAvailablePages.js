/**
 * Parses "Available Pages:" blocks from project build output.
 *
 * Matches lines following the "Available Pages:" header that match:
 *   - <name>: <url>
 *
 * @param {string|null|undefined} text - Raw log text (ANSI-stripped preferred)
 * @returns {Array<{name: string, url: string}>}
 */
export function parseAvailablePages(text) {
  if (!text) return [];

  const results = [];
  // Split into lines and find the "Available Pages:" header
  const lines = text.split('\n');
  let inPagesSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'Available Pages:') {
      inPagesSection = true;
      continue;
    }

    if (inPagesSection) {
      // Stop if we hit an empty line or a line that doesn't start with '-'
      if (!trimmed || !trimmed.startsWith('-')) {
        inPagesSection = false;
        continue;
      }

      // Match: - <name>: <url>
      // Allow optional leading/trailing whitespace around name and url
      const match = trimmed.match(/^-\s+([\w-]+)\s*:\s*(.+)$/);
      if (match) {
        results.push({ name: match[1], url: match[2].trim() });
      }
    }
  }

  return results;
}
