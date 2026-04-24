/**
 * Builds a structured XML context string for the selected element,
 * suitable for injection into AI prompts.
 *
 * @param {Object|null} element - Selected element from the inspector
 * @param {string[]} screenshotPaths - Absolute paths to screenshot files
 * @returns {string} XML string, or '' if element is falsy
 */
export function buildElementContext(element, screenshotPaths = []) {
  if (!element) return '';

  const cs = element.computedStyle || {};

  // --- padding shorthand ---
  const pt = cs.paddingTop    || '';
  const pr = cs.paddingRight  || '';
  const pb = cs.paddingBottom || '';
  const pl = cs.paddingLeft   || '';
  let padding = '';
  if (pt && pr && pb && pl) {
    if (pt === pr && pt === pb && pt === pl) {
      padding = pt;
    } else if (pt === pb && pr === pl) {
      padding = `${pt} ${pr}`;
    } else {
      padding = `${pt} ${pr} ${pb} ${pl}`;
    }
  } else {
    padding = [pt, pr, pb, pl].filter(Boolean).join(' ') || '';
  }

  // --- sourceInfo ---
  const si = element.sourceInfo || {};
  const componentLine = si.componentName
    ? `  <component>${si.componentName}</component>\n`
    : '';
  const fileLine = si.fileName
    ? `  <file>${si.fileName}${si.lineNumber != null ? ':' + si.lineNumber : ''}</file>\n`
    : '';

  // --- screenshot tags (one per path, only when present) ---
  const screenshotLines = (screenshotPaths || [])
    .map(p => `  <screenshot>${p}</screenshot>`)
    .join('\n');
  const screenshotBlock = screenshotLines ? screenshotLines + '\n' : '';

  const classVal = element.className || '';
  const idVal    = element.id        || '';
  const textVal  = element.text != null ? element.text : '';

  return (
    `<selected-element>\n` +
    `  <tag>${element.tag || ''}</tag>\n` +
    screenshotBlock +
    componentLine +
    fileLine +
    `  <class>${classVal}</class>\n` +
    `  <id>${idVal}</id>\n` +
    `  <selector>${element.selector || ''}</selector>\n` +
    `  <text>${textVal}</text>\n` +
    `  <styles>\n` +
    `    <color>${cs.color || ''}</color>\n` +
    `    <background-color>${cs.backgroundColor || ''}</background-color>\n` +
    `    <font-size>${cs.fontSize || ''}</font-size>\n` +
    `    <font-weight>${cs.fontWeight || ''}</font-weight>\n` +
    `    <border-radius>${cs.borderRadius || ''}</border-radius>\n` +
    `    <padding>${padding}</padding>\n` +
    `  </styles>\n` +
    `</selected-element>`
  );
}
