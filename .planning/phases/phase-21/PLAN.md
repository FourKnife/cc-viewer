---
phase: phase-21
plan: 01
type: execute
wave: 1
depends_on:
  - phase-20
files_modified:
  - src/utils/stripAnsi.js
  - test/stripAnsi.test.js
  - src/utils/parseAvailablePages.js
  - test/parseAvailablePages.test.js
  - src/components/VisualEditor/ProjectLauncher.jsx
  - src/App.jsx
  - src/i18n.js
autonomous: true
requirements:
  - PHASE-21-ANSI-FILTER
  - PHASE-21-AVAILABLE-PAGES
must_haves:
  truths:
    - "stripAnsi(text) removes ANSI/VT100 control sequences from text"
    - "stripAnsi(null) returns '' and stripAnsi(undefined) returns ''"
    - "stripAnsi('hello') returns 'hello' unchanged"
    - "stripAnsi('\x1b[32mgreen\x1b[0m') returns 'green'"
    - "stripAnsi('\x1b[2K') returns '' (empty CSI sequences produce empty string from that segment)"
    - "parseAvailablePages(text) extracts { name, url } objects from 'Available Pages:' blocks"
    - "parseAvailablePages(text) returns [] when no match"
    - "ProjectLauncher renders stripAnsi(output) instead of raw output"
    - "ProjectLauncher accepts availablePages, onPreviewUrlChange, onSelectMenu props"
    - "ProjectLauncher renders available pages as clickable buttons"
    - "Clicking a page button calls onPreviewUrlChange(url) and onSelectMenu('ui-edit')"
    - "App.jsx maintains availablePages state, updated when projectOutput changes"
    - "i18n key 'visual.launcher.pages' is added"
    - "All existing tests continue to pass"
    - "npm run build exits 0"
  artifacts:
    - path: "src/utils/stripAnsi.js"
      provides: "ANSI escape sequence filter"
      exports: ["stripAnsi"]
    - path: "test/stripAnsi.test.js"
      provides: "Unit tests for stripAnsi"
    - path: "src/utils/parseAvailablePages.js"
      provides: "Available Pages parser"
      exports: ["parseAvailablePages"]
    - path: "test/parseAvailablePages.test.js"
      provides: "Unit tests for parseAvailablePages"
  key_links:
    - from: "src/components/VisualEditor/ProjectLauncher.jsx"
      to: "src/utils/stripAnsi.js"
      via: "import { stripAnsi }"
      pattern: "stripAnsi"
    - from: "src/App.jsx"
      to: "src/utils/parseAvailablePages.js"
      via: "import { parseAvailablePages }"
      pattern: "parseAvailablePages"
    - from: "src/App.jsx"
      to: "src/components/VisualEditor/ProjectLauncher.jsx"
      via: "pass availablePages prop"
      pattern: "availablePages"
---

<objective>
Implement ANSI escape code filtering and Available Pages parsing for the ProjectLauncher. Strip ANSI sequences from project output before rendering, and parse the "Available Pages:" section of build output into clickable navigation buttons that auto-navigate to the UI editor.

Purpose: Clean up noisy log output and replace manual URL copy-paste with one-click navigation to preview pages.

Output: New stripAnsi.js and parseAvailablePages.js utilities with tests, updated ProjectLauncher.jsx with filtered output and page buttons, updated App.jsx with availablePages state and prop wiring.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-21/CONTEXT.md

Key facts discovered during planning:

1. **ProjectLauncher current state** (after Phase 20):
   - Props: `{ status, output, onStart, onStop, defaultPath }`
   - Output rendered as: `<pre ref={logRef} className={styles.logContent}>{output}</pre>`
   - No ANSI filtering, no available pages display yet

2. **App.jsx current state** (after Phase 20):
   - `projectOutput` is managed by AppBase (passed to ProjectLauncher via state)
   - `handlePreviewUrlChange(url)` exists at App.jsx line 124
   - SideMenu `onSelect` sets `visualMenuKey`
   - ProjectLauncher rendered at line 519-526 with props: status, output, onStart, onStop, defaultPath

3. **Available Pages log format**:
   ```
   Available Pages:
   - demo:    http://localhost:3002/demo.html
   - transferInCKK:  http://localhost:3002/transferInCKK.html
   ```

4. **Test runner**: `node --test` (ESM, package type=module)
   - Existing test pattern: `import { stripAnsi } from '../src/utils/stripAnsi.js'`
   - Run with: `CCV_LOG_DIR=tmp node --test test/stripAnsi.test.js`

5. **ANSI sequences commonly seen**:
   - CSI color: `\x1b[32m` (green), `\x1b[39m` (default), `\x1b[0m` (reset)
   - CSI cursor/clear: `\x1b[2K` (clear line), `\x1b[1A` (cursor up), `\x1b[G` (cursor to column 0)
   - OSC: `\x1b]0;title\x07` (set window title)
   - Spinner: `⠸ Compiling... \r` (individual spinner chars, carriage return overwrite)
   - Build progress: `\x1b[36m⠸\x1b[39m \x1b[90mCompiling...\x1b[39m`

6. **Edge case: stripAnsi and empty output**
   - After stripping, output might be empty for some lines (pure ANSI lines)
   - Should preserve newlines so line numbers don't shift
   - Empty/whitespace-only lines after stripping can be kept as-is (harmless)

7. **Edge case: parseAvailablePages persistence**
   - `availablePages` state lives in App.jsx so it persists across view mode switches
   - The parser re-runs on every projectOutput update (in componentDidUpdate)
   - Only update if the parsed result actually changed (to avoid unnecessary re-renders)
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create stripAnsi utility with unit tests</name>
  <files>src/utils/stripAnsi.js, test/stripAnsi.test.js</files>
  <behavior>
    - stripAnsi(null) → ''
    - stripAnsi(undefined) → ''
    - stripAnsi('hello world') → 'hello world'
    - stripAnsi('\x1b[32mgreen\x1b[0m') → 'green'
    - stripAnsi('\x1b[2K') → ''
    - stripAnsi('\x1b[1A\x1b[2K\x1b[G') → ''
    - stripAnsi('\x1b[36m⠸\x1b[39m \x1b[90mCompiling...\x1b[39m') → '⠸ Compiling...'
    - stripAnsi('\x1b]0;Title\x07') → ''
    - Mixed ANSI sequences and text: all ANSI removed
    - Newlines preserved
  </behavior>
  <action>
**Step 1 — Write the test file first (RED phase)**

Create `test/stripAnsi.test.js`:

```js
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
```

Run the tests — they MUST fail (RED):
```
CCV_LOG_DIR=tmp node --test test/stripAnsi.test.js
```

**Step 2 — Implement stripAnsi (GREEN phase)**

Create `src/utils/stripAnsi.js`:

```js
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
  return text.replace(/\x1B(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\)|[ -/]*[@-~]|[0-9A-Za-z])/g, '');
}
```

Run the tests — they MUST pass (GREEN):
```
CCV_LOG_DIR=tmp node --test test/stripAnsi.test.js
```
  </action>
  <verify>
    <automated>CCV_LOG_DIR=tmp node --test test/stripAnsi.test.js</automated>
  </verify>
  <done>stripAnsi.js created. All 10 test cases pass. stripAnsi(null) → '', stripAnsi('\x1b[32mgreen\x1b[0m') → 'green', CSI/OSC/ESC sequences removed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create parseAvailablePages utility with unit tests</name>
  <files>src/utils/parseAvailablePages.js, test/parseAvailablePages.test.js</files>
  <behavior>
    - parseAvailablePages(null) → []
    - parseAvailablePages('no pages here') → []
    - parseAvailablePages('Available Pages:\n- demo: http://localhost:3002/demo.html') → [{name:'demo', url:'http://localhost:3002/demo.html'}]
    - parseAvailablePages with multiple pages → array of all pages
    - parseAvailablePages with extra spacing → still matches
    - parseAvailablePages with text before/after → only parses the pages block
    - parseAvailablePages with no pages after header → []
  </behavior>
  <action>
**Step 1 — Write the test file first (RED phase)**

Create `test/parseAvailablePages.test.js`:

```js
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
```

Run the tests — they MUST fail (RED):
```
CCV_LOG_DIR=tmp node --test test/parseAvailablePages.test.js
```

**Step 2 — Implement parseAvailablePages (GREEN phase)**

Create `src/utils/parseAvailablePages.js`:

```js
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
```

Run the tests — they MUST pass (GREEN):
```
CCV_LOG_DIR=tmp node --test test/parseAvailablePages.test.js
```
  </action>
  <verify>
    <automated>CCV_LOG_DIR=tmp node --test test/parseAvailablePages.test.js</automated>
  </verify>
  <done>parseAvailablePages.js created. All 7 test cases pass. parseAvailablePages(null) → [], parseAvailablePages with real log format returns correct {name, url} array.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Add i18n key visual.launcher.pages</name>
  <files>src/i18n.js</files>
  <action>
In `src/i18n.js`, add the following entry after `visual.launcher.stopped`:

```js
"visual.launcher.pages": {
  "zh": "可用页面",
  "en": "Available Pages",
  "ja": "利用可能なページ"
},
```
  </action>
  <verify>
    <automated>grep -q "visual.launcher.pages" src/i18n.js</automated>
  </verify>
  <done>i18n key visual.launcher.pages added with zh/en/ja translations.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Update ProjectLauncher to strip ANSI and show available pages</name>
  <files>src/components/VisualEditor/ProjectLauncher.jsx</files>
  <action>
In `src/components/VisualEditor/ProjectLauncher.jsx`:

1. Add `stripAnsi` import
2. Add new props: `availablePages`, `onPreviewUrlChange`, `onSelectMenu`
3. Strip ANSI from output before rendering: `stripAnsi(output)`
4. Render available pages as clickable buttons above the log panel

New file content:

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, Typography, Alert } from 'antd';
import { PlayCircleOutlined, StopOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import { stripAnsi } from '../../utils/stripAnsi';
import styles from './styles.module.css';

export default function ProjectLauncher({
  status,
  output,
  onStart,
  onStop,
  defaultPath,
  availablePages = [],
  onPreviewUrlChange,
  onSelectMenu,
}) {
  const [projectPath, setProjectPath] = useState('');
  const [command, setCommand] = useState('npm run mock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const logRef = useRef(null);

  // defaultPath 变化时自动填充项目路径
  useEffect(() => {
    if (defaultPath && !projectPath) {
      setProjectPath(defaultPath);
    }
  }, [defaultPath]);

  // 日志自动滚到底部
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [output]);

  const handleStart = async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      await onStart(projectPath, command);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isRunning = status?.status === 'running';
  const isStarting = status?.status === 'starting';
  const showLog = output && (isStarting || isRunning || error);

  const handlePageClick = (page) => {
    onPreviewUrlChange?.(page.url);
    onSelectMenu?.('ui-edit');
  };

  return (
    <div className={styles.launcher}>
      <div className={styles.launcherHeader}>
        <Typography.Title level={5} style={{ margin: 0 }}>{t('visual.projectLauncher')}</Typography.Title>
      </div>

      <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
        <div>
          <Typography.Text type="secondary">{t('visual.projectPath')}</Typography.Text>
          <Input
            placeholder="/path/to/react-project"
            value={projectPath}
            onChange={e => setProjectPath(e.target.value)}
            disabled={isRunning || isStarting}
            prefix={<FolderOpenOutlined />}
          />
        </div>

        <div>
          <Typography.Text type="secondary">{t('visual.startCommand')}</Typography.Text>
          <Input
            placeholder="npm run dev"
            value={command}
            onChange={e => setCommand(e.target.value)}
            disabled={isRunning || isStarting}
          />
        </div>

        {error && <Alert type="error" message={error} showIcon />}

        {isRunning && (
          <Alert
            type="success"
            message={t('visual.running', { port: status.port })}
            showIcon
          />
        )}

        <Space>
          {!isRunning ? (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
              loading={loading || isStarting}
              disabled={!projectPath}
            >
              {isStarting ? t('visual.starting') : t('visual.start')}
            </Button>
          ) : (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={onStop}
            >
              {t('visual.stop')}
            </Button>
          )}
        </Space>

        {/* Available Pages 快捷导航 */}
        {availablePages.length > 0 && (
          <div>
            <Typography.Text type="secondary">{t('visual.launcher.pages')}</Typography.Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {availablePages.map((page) => (
                <Button
                  key={page.url}
                  size="small"
                  type="default"
                  onClick={() => handlePageClick(page)}
                >
                  {page.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {showLog && (
          <div className={styles.logPanel}>
            <Typography.Text type="secondary" className={styles.logTitle}>
              {t('visual.log')}
            </Typography.Text>
            <pre ref={logRef} className={styles.logContent}>
              {stripAnsi(output)}
            </pre>
          </div>
        )}
      </Space>
    </div>
  );
}
```

Key changes from current version:
- Added `stripAnsi` import
- Added `availablePages`, `onPreviewUrlChange`, `onSelectMenu` props
- Added `handlePageClick` handler
- Added available pages buttons section (rendered after start/stop buttons, before log)
- Changed `{output}` to `{stripAnsi(output)}` in the log `<pre>` element
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>ProjectLauncher updated: ANSI-stripped output, available pages buttons rendered when pages exist, page clicks navigate to UI edit mode.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Update App.jsx with availablePages state and pass props</name>
  <files>src/App.jsx</files>
  <action>
In `src/App.jsx`:

1. Add `import { parseAvailablePages } from './utils/parseAvailablePages';` at the top
2. Add `availablePages: []` to constructor state initial values (around line 41)
3. Add `componentDidUpdate` logic to parse available pages when projectOutput changes
4. Pass new props to ProjectLauncher

**Part A: Add import** (top of file, near other imports):
After `import { apiUrl } from './utils/apiUrl';` or similar util imports, add:
```js
import { parseAvailablePages } from './utils/parseAvailablePages';
```

**Part B: Add state** in constructor (around line 38):
```js
availablePages: [],
```

**Part C: Add parsing logic** in componentDidUpdate (after the existing projectStatus/selectedElement logic):
```js
// 当 projectOutput 更新时，解析 Available Pages
if (this.state.projectOutput !== prevState.projectOutput && this.state.projectOutput) {
  const pages = parseAvailablePages(this.state.projectOutput);
  if (JSON.stringify(pages) !== JSON.stringify(this.state.availablePages)) {
    this.setState({ availablePages: pages });
  }
}
```

**Part D: Update ProjectLauncher props** in the launcher rendering section (around lines 519-526):
```jsx
<ProjectLauncher
  status={this.state.projectStatus}
  output={this.state.projectOutput}
  availablePages={this.state.availablePages}
  onStart={this.handleStartProject}
  onStop={this.handleStopProject}
  defaultPath={this.state.projectDir}
  onPreviewUrlChange={this.handlePreviewUrlChange}
  onSelectMenu={(key) => this.setState({ visualMenuKey: key })}
/>
```

Note: Since `handlePreviewUrlChange` is already a bound method at line 124, and visualMenuKey setter is just `(key) => this.setState({ visualMenuKey: key })`, we can pass these directly.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>App.jsx updated: availablePages state, parseAvailablePages in componentDidUpdate, new props passed to ProjectLauncher.</done>
</task>

</tasks>

<verification>
After all tasks complete, run the full verification sequence:

```bash
# 1. Unit tests for stripAnsi
CCV_LOG_DIR=tmp node --test test/stripAnsi.test.js

# 2. Unit tests for parseAvailablePages
CCV_LOG_DIR=tmp node --test test/parseAvailablePages.test.js

# 3. Full test suite (must not regress)
CCV_LOG_DIR=tmp node --test 2>&1 | tail -5

# 4. Production build
npm run build 2>&1 | tail -10
```

Expected: all tests pass, build exits 0.

Manual spot-check (if browser available):
1. Navigate to visual mode → click "启动器" in SideMenu
2. Start a React project
3. Observe that log output no longer shows `[32m`, `[2K` etc.
4. After build completes, verify "Available Pages" section appears with clickable buttons
5. Click a page button → navigates to UI edit mode, iframe loads the selected page
6. Switch back to "启动器" → page list still persists
</verification>

<success_criteria>
- `test/stripAnsi.test.js` passes 100% (10 test cases)
- `test/parseAvailablePages.test.js` passes 100% (7 test cases)
- Full `node --test` suite passes with no regressions
- `npm run build` exits 0
- `stripAnsi(null)` → `''`, `stripAnsi('\x1b[32mtext\x1b[0m')` → `'text'`
- `parseAvailablePages(null)` → `[]`, `parseAvailablePages(logWithPages)` → `[{name, url}, ...]`
- ProjectLauncher renders ANSI-filtered output
- Available pages appear as clickable buttons in ProjectLauncher when project is running
- Clicking a page button updates preview URL and switches to ui-edit mode
</success_criteria>

<output>
After completion, create `.planning/phases/phase-21/phase-21-01-SUMMARY.md` with:
- New files created and their contents
- Files modified and what changed in each
- Confirmation that all tests pass and build succeeds
- Note on any edge cases discovered during implementation
</output>
