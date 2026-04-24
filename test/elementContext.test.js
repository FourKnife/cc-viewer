import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildElementContext } from '../src/utils/elementContext.js';

const baseElement = {
  tag: 'button',
  id: '',
  className: 'btn-primary large',
  text: '提交',
  selector: 'button.btn-primary',
  computedStyle: {
    color: 'rgb(255,255,255)',
    backgroundColor: 'rgb(24,144,255)',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '6px',
    paddingTop: '8px',
    paddingRight: '16px',
    paddingBottom: '8px',
    paddingLeft: '16px',
  },
  sourceInfo: {
    componentName: 'Button',
    fileName: 'src/components/Button.jsx',
    lineNumber: 42,
  },
};

describe('buildElementContext', () => {
  it('returns empty string for null element', () => {
    assert.equal(buildElementContext(null), '');
    assert.equal(buildElementContext(null, []), '');
    assert.equal(buildElementContext(undefined), '');
  });

  it('wraps output in <selected-element> root tag', () => {
    const out = buildElementContext(baseElement);
    assert.ok(out.startsWith('<selected-element>'), 'should start with <selected-element>');
    assert.ok(out.trimEnd().endsWith('</selected-element>'), 'should end with </selected-element>');
  });

  it('includes basic element fields in correct order', () => {
    const out = buildElementContext(baseElement);
    assert.ok(out.includes('<tag>button</tag>'));
    assert.ok(out.includes('<component>Button</component>'));
    assert.ok(out.includes('<file>src/components/Button.jsx:42</file>'));
    assert.ok(out.includes('<class>btn-primary large</class>'));
    assert.ok(out.includes('<id></id>'), '<id></id> must be present even when empty');
    assert.ok(out.includes('<selector>button.btn-primary</selector>'));
    assert.ok(out.includes('<text>提交</text>'));
  });

  it('emits no <screenshot> tag when screenshotPaths is empty', () => {
    const out = buildElementContext(baseElement);
    assert.ok(!out.includes('<screenshot>'), 'no screenshot tag when none provided');
  });

  it('emits no <screenshot> tag when screenshotPaths is []', () => {
    const out = buildElementContext(baseElement, []);
    assert.ok(!out.includes('<screenshot>'), 'no screenshot tag for empty array');
  });

  it('emits one <screenshot> tag for a single path', () => {
    const out = buildElementContext(baseElement, ['/tmp/elem-123.png']);
    assert.ok(out.includes('<screenshot>/tmp/elem-123.png</screenshot>'));
  });

  it('emits multiple <screenshot> tags for multiple paths', () => {
    const out = buildElementContext(baseElement, ['/tmp/a.png', '/tmp/b.png']);
    assert.ok(out.includes('<screenshot>/tmp/a.png</screenshot>'));
    assert.ok(out.includes('<screenshot>/tmp/b.png</screenshot>'));
  });

  it('includes all 6 style properties', () => {
    const out = buildElementContext(baseElement);
    assert.ok(out.includes('<color>rgb(255,255,255)</color>'));
    assert.ok(out.includes('<background-color>rgb(24,144,255)</background-color>'));
    assert.ok(out.includes('<font-size>14px</font-size>'));
    assert.ok(out.includes('<font-weight>500</font-weight>'));
    assert.ok(out.includes('<border-radius>6px</border-radius>'));
  });

  it('collapses padding to 2-value shorthand when top===bottom and left===right', () => {
    const out = buildElementContext(baseElement);
    assert.ok(out.includes('<padding>8px 16px</padding>'), `got: ${out}`);
  });

  it('collapses padding to 1-value shorthand when all 4 sides equal', () => {
    const el = {
      ...baseElement,
      computedStyle: { ...baseElement.computedStyle, paddingTop: '8px', paddingRight: '8px', paddingBottom: '8px', paddingLeft: '8px' },
    };
    const out = buildElementContext(el);
    assert.ok(out.includes('<padding>8px</padding>'), `got: ${out}`);
  });

  it('uses 4-value padding when no shorthand applies', () => {
    const el = {
      ...baseElement,
      computedStyle: { ...baseElement.computedStyle, paddingTop: '1px', paddingRight: '2px', paddingBottom: '3px', paddingLeft: '4px' },
    };
    const out = buildElementContext(el);
    assert.ok(out.includes('<padding>1px 2px 3px 4px</padding>'), `got: ${out}`);
  });

  it('emits empty style tags when computedStyle fields are missing', () => {
    const el = { ...baseElement, computedStyle: {} };
    const out = buildElementContext(el);
    assert.ok(out.includes('<color></color>'));
    assert.ok(out.includes('<background-color></background-color>'));
  });

  it('handles missing sourceInfo gracefully', () => {
    const el = { ...baseElement, sourceInfo: null };
    const out = buildElementContext(el);
    assert.ok(typeof out === 'string');
    assert.ok(out.includes('<selected-element>'));
  });
});
