---
phase: phase-22
plan: 01
type: execute
wave: 1
depends_on:
  - phase-21
files_modified:
  - server.js
  - src/utils/scenarioStorage.js
  - src/components/VisualEditor/ScenarioPanel.jsx
  - src/components/VisualEditor/SideMenu.jsx
  - src/App.jsx
  - src/components/VisualEditor/PagePreview.jsx
  - src/i18n.js
  - test/scenarios.test.js
autonomous: true
requirements:
  - PHASE-22-SCENARIO-DATA-LAYER
  - PHASE-22-SCENARIO-PANEL-UI
  - PHASE-22-BASIC-RUN
must_haves:
  truths:
    - "GET /api/scenarios returns { scenarios: [] } when .cleffa/scenarios.json does not exist"
    - "POST /api/scenarios creates a scenario with a generated id and persists to .cleffa/scenarios.json"
    - "PUT /api/scenarios/:id updates the matching scenario in .cleffa/scenarios.json"
    - "DELETE /api/scenarios/:id removes the matching scenario from .cleffa/scenarios.json"
    - "SideMenu renders a 'scenarios' item with ExperimentOutlined icon and label visual.menuScenarios"
    - "App.jsx renders ScenarioPanel when visualMenuKey === 'scenarios'"
    - "ScenarioPanel fetches and lists scenarios on mount"
    - "ScenarioPanel add form creates a scenario via POST /api/scenarios"
    - "ScenarioPanel delete button removes a scenario via DELETE /api/scenarios/:id"
    - "ScenarioPanel run button calls onRunScenario(scenario)"
    - "App.jsx sets pendingScenario and switches to ui-edit when onRunScenario is called"
    - "PagePreview injects scenario.storage into iframe.contentWindow.localStorage then navigates when pendingScenario changes"
    - "i18n keys visual.menuScenarios, visual.scenario.add, visual.scenario.run, visual.scenario.delete, visual.scenario.edit, visual.scenario.empty are added"
    - "All existing tests continue to pass"
    - "npm run build exits 0"
  artifacts:
    - path: "src/utils/scenarioStorage.js"
      provides: "Frontend API client for scenario CRUD"
      exports: ["getScenarios", "createScenario", "updateScenario", "deleteScenario"]
    - path: "src/components/VisualEditor/ScenarioPanel.jsx"
      provides: "Scenario list + CRUD + run UI"
    - path: "test/scenarios.test.js"
      provides: "Unit tests for scenario server routes"
  key_links:
    - from: "src/components/VisualEditor/ScenarioPanel.jsx"
      to: "src/utils/scenarioStorage.js"
      via: "import { getScenarios, createScenario, updateScenario, deleteScenario }"
    - from: "src/App.jsx"
      to: "src/components/VisualEditor/ScenarioPanel.jsx"
      via: "render when visualMenuKey === 'scenarios'"
    - from: "src/App.jsx"
      to: "src/components/VisualEditor/PagePreview.jsx"
      via: "pendingScenario prop"
---

<objective>
Implement the Scenario system data layer and panel UI for Phase 22 of M1.6.

Builds: server CRUD routes for .cleffa/scenarios.json, a frontend scenarioStorage utility, a ScenarioPanel component (list + add/edit/delete + run), SideMenu entry, App.jsx wiring, and PagePreview storage-inject + navigate support.

Purpose: Let developers save named page states (URL + localStorage data) and replay them with one click, eliminating manual re-navigation to reach specific app states.

Output: Full scenario CRUD working end-to-end. Clicking "Run" in ScenarioPanel injects localStorage into the iframe and navigates to the target URL.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/milestones/v1.6-REQUIREMENTS.md

Key facts discovered during planning:

1. **server.js structure**:
   - Single file, routes handled with if/else chains
   - `randomBytes` already imported from `node:crypto`
   - `readFileSync`, `writeFileSync`, `existsSync`, `mkdirSync` already imported from `node:fs`
   - `join` already imported from `node:path`
   - Project dir: `process.env.CCV_PROJECT_DIR || process.cwd()`
   - Scenario routes go before the proxy route (line ~2779)

2. **Scenario storage path**: `join(projectDir, '.cleffa', 'scenarios.json')`
   - Auto-create `.cleffa/` dir on first write
   - JSON format: `{ "scenarios": [...] }`
   - ID generation: `randomBytes(8).toString('hex')`

3. **SideMenu.jsx** (src/components/VisualEditor/SideMenu.jsx):
   - Items array with `{ key, icon, label }` objects
   - Currently: ui-edit (EditOutlined), launcher (RocketOutlined), pipeline (ApiOutlined)
   - Add: scenarios (ExperimentOutlined) after launcher

4. **App.jsx current state**:
   - `visualMenuKey` state controls which panel renders
   - `pendingScenario: null` to be added to state
   - `handlePreviewUrlChange` already exists
   - Renders `ScenarioPanel` in the `visualMenuKey === 'scenarios'` branch
   - Passes `pendingScenario` and `onScenarioDone` to PagePreview

5. **PagePreview runScenario mechanism** (prop-based, no refs):
   - App.jsx adds `pendingScenario` state (null | scenario object)
   - ScenarioPanel calls `onRunScenario(scenario)` → App sets `pendingScenario` + `visualMenuKey = 'ui-edit'`
   - PagePreview receives `pendingScenario` prop + `onScenarioDone` callback
   - `useEffect` on `pendingScenario`: inject storage into `iframeRef.current.contentWindow.localStorage`, then `handleNavigate(scenario.url)`, then `onScenarioDone()`
   - Storage injection works because proxy makes iframe same-origin with cc-viewer server

6. **i18n**: Add to `src/i18n.js` before the closing `};` of `i18nData`
   - Keys: `visual.menuScenarios`, `visual.scenario.add`, `visual.scenario.run`,
     `visual.scenario.delete`, `visual.scenario.edit`, `visual.scenario.empty`
   - Only zh/en needed (ja optional)

7. **ScenarioPanel UI** (Anti-AI-Slop: minimal, functional):
   - List: scenario name + URL, with Run / Edit / Delete buttons per row
   - Add form: inline collapse (not modal) — name input, URL input, storage key-value editor
   - Storage editor: list of [key, value] pairs with add/remove row
   - Empty state: show `visual.scenario.empty` message

Key facts discovered during planning:

1. **server.js structure**:
   - Single file, routes handled with if/else chains
   - `randomBytes` already imported from `node:crypto`
   - `readFileSync`, `writeFileSync`, `existsSync`, `mkdirSync` already imported from `node:fs`
   - `join` already imported from `node:path`
   - Project dir: `process.env.CCV_PROJECT_DIR || process.cwd()`
   - Scenario routes go before the proxy route (line ~2779)

2. **Scenario storage path**: `join(projectDir, '.cleffa', 'scenarios.json')`
   - Auto-create `.cleffa/` dir on first write
   - JSON format: `{ "scenarios": [...] }`
   - ID generation: `randomBytes(8).toString('hex')`

3. **SideMenu.jsx** (src/components/VisualEditor/SideMenu.jsx):
   - Items array with `{ key, icon, label }` objects
   - Currently: ui-edit (EditOutlined), launcher (RocketOutlined), pipeline (ApiOutlined)
   - Add: scenarios (ExperimentOutlined) after launcher

4. **App.jsx current state**:
   - `visualMenuKey` state controls which panel renders
   - `pendingScenario: null` to be added to state
   - `handlePreviewUrlChange` already exists
   - Renders `ScenarioPanel` in the `visualMenuKey === 'scenarios'` branch
   - Passes `pendingScenario` and `onScenarioDone` to PagePreview

5. **PagePreview runScenario mechanism** (prop-based, no refs):
   - App.jsx adds `pendingScenario` state (null | scenario object)
   - ScenarioPanel calls `onRunScenario(scenario)` → App sets `pendingScenario` + `visualMenuKey = 'ui-edit'`
   - PagePreview receives `pendingScenario` prop + `onScenarioDone` callback
   - `useEffect` on `pendingScenario`: inject storage into `iframeRef.current.contentWindow.localStorage`, then `handleNavigate(scenario.url)`, then `onScenarioDone()`
   - Storage injection works because proxy makes iframe same-origin with cc-viewer server

6. **i18n**: Add to `src/i18n.js` before the closing `};` of `i18nData`
   - Keys: `visual.menuScenarios`, `visual.scenario.add`, `visual.scenario.run`,
     `visual.scenario.delete`, `visual.scenario.edit`, `visual.scenario.empty`
   - Only zh/en needed (ja optional)

7. **ScenarioPanel UI** (Anti-AI-Slop: minimal, functional):
   - List: scenario name + URL, with Run / Edit / Delete buttons per row
   - Add form: inline collapse (not modal) — name input, URL input, storage key-value editor
   - Storage editor: list of [key, value] pairs with add/remove row
   - Empty state: show `visual.scenario.empty` message
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add scenario CRUD routes to server.js + unit tests</name>
  <files>server.js, test/scenarios.test.js</files>
  <behavior>
    - GET /api/scenarios → { scenarios: [] } when file missing
    - POST /api/scenarios → creates scenario with id, persists to .cleffa/scenarios.json
    - PUT /api/scenarios/:id → updates matching scenario
    - DELETE /api/scenarios/:id → removes matching scenario
    - .cleffa/ directory auto-created on first write
  </behavior>
  <action>
**Step 1 — Write test file first (RED)**

Create `test/scenarios.test.js`:

```js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:7779';
const TMP_DIR = join(process.cwd(), 'tmp-scenario-test');

// Helper: start a minimal test server pointing at TMP_DIR
// We test the route logic by importing the handler directly via fetch against a running server.
// Since server.js is a monolith, we test via HTTP against the real server started with CCV_PROJECT_DIR=TMP_DIR.
// For unit isolation, we test the helper functions extracted below.

// Instead, test the route logic by calling the server's scenario helpers directly.
// We extract the helpers as pure functions and test them.

import { readScenariosFile, writeScenariosFile, scenariosFilePath } from '../server.js';

describe('scenario storage helpers', () => {
  before(() => {
    mkdirSync(TMP_DIR, { recursive: true });
    process.env.CCV_SCENARIO_TEST_DIR = TMP_DIR;
  });

  after(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
    delete process.env.CCV_SCENARIO_TEST_DIR;
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
```

Run — MUST fail (RED):
```
CCV_LOG_DIR=tmp node --test test/scenarios.test.js
```

**Step 2 — Add exported helpers + routes to server.js (GREEN)**

In `server.js`, add the following exported helper functions near the top (after imports, before the main handler):

```js
// ─── Scenario storage helpers (exported for testing) ───────────────────────
export function scenariosFilePath(projectDir) {
  return join(projectDir, '.cleffa', 'scenarios.json');
}

export function readScenariosFile(projectDir) {
  const filePath = scenariosFilePath(projectDir);
  if (!existsSync(filePath)) return [];
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    return Array.isArray(data.scenarios) ? data.scenarios : [];
  } catch {
    return [];
  }
}

export function writeScenariosFile(projectDir, scenarios) {
  const filePath = scenariosFilePath(projectDir);
  const dir = join(projectDir, '.cleffa');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify({ scenarios }, null, 2), 'utf-8');
}
```

Then add the route handlers in the main request handler, before the proxy route block (`// GET /api/proxy/:port/*`):

```js
  // GET /api/scenarios
  if (url === '/api/scenarios' && method === 'GET') {
    const projectDir = process.env.CCV_PROJECT_DIR || process.cwd();
    const scenarios = readScenariosFile(projectDir);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ scenarios }));
    return;
  }

  // POST /api/scenarios
  if (url === '/api/scenarios' && method === 'POST') {
    const projectDir = process.env.CCV_PROJECT_DIR || process.cwd();
    const body = await readBody(req);
    const data = JSON.parse(body);
    const scenarios = readScenariosFile(projectDir);
    const newScenario = {
      id: randomBytes(8).toString('hex'),
      name: data.name || 'Untitled',
      url: data.url || '/',
      storage: data.storage || {},
      steps: data.steps || [],
    };
    scenarios.push(newScenario);
    writeScenariosFile(projectDir, scenarios);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(newScenario));
    return;
  }

  // PUT /api/scenarios/:id
  const scenarioPutMatch = url.match(/^\/api\/scenarios\/([^/]+)$/) && method === 'PUT' ? url.match(/^\/api\/scenarios\/([^/]+)$/) : null;
  if (scenarioPutMatch) {
    const projectDir = process.env.CCV_PROJECT_DIR || process.cwd();
    const id = scenarioPutMatch[1];
    const body = await readBody(req);
    const data = JSON.parse(body);
    const scenarios = readScenariosFile(projectDir);
    const idx = scenarios.findIndex(s => s.id === id);
    if (idx === -1) { res.writeHead(404); res.end('Not found'); return; }
    scenarios[idx] = { ...scenarios[idx], ...data, id };
    writeScenariosFile(projectDir, scenarios);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(scenarios[idx]));
    return;
  }

  // DELETE /api/scenarios/:id
  const scenarioDeleteMatch = url.match(/^\/api\/scenarios\/([^/]+)$/) && method === 'DELETE' ? url.match(/^\/api\/scenarios\/([^/]+)$/) : null;
  if (scenarioDeleteMatch) {
    const projectDir = process.env.CCV_PROJECT_DIR || process.cwd();
    const id = scenarioDeleteMatch[1];
    const scenarios = readScenariosFile(projectDir);
    const filtered = scenarios.filter(s => s.id !== id);
    writeScenariosFile(projectDir, filtered);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
```

Note: `readBody` is a helper already used in server.js. Verify its name by searching for existing POST body parsing patterns.

Run — MUST pass (GREEN):
```
CCV_LOG_DIR=tmp node --test test/scenarios.test.js
```
  </action>
  <verify>
    <automated>CCV_LOG_DIR=tmp node --test test/scenarios.test.js</automated>
  </verify>
  <done>server.js has scenario CRUD routes + exported helpers. All scenario tests pass.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create scenarioStorage.js frontend utility</name>
  <files>src/utils/scenarioStorage.js</files>
  <action>
Create `src/utils/scenarioStorage.js`:

```js
import { apiUrl } from './apiUrl';

export async function getScenarios() {
  const res = await fetch(apiUrl('/api/scenarios'));
  const data = await res.json();
  return data.scenarios || [];
}

export async function createScenario(scenario) {
  const res = await fetch(apiUrl('/api/scenarios'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });
  return res.json();
}

export async function updateScenario(id, scenario) {
  const res = await fetch(apiUrl(`/api/scenarios/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });
  return res.json();
}

export async function deleteScenario(id) {
  const res = await fetch(apiUrl(`/api/scenarios/${id}`), { method: 'DELETE' });
  return res.json();
}
```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>scenarioStorage.js created with getScenarios/createScenario/updateScenario/deleteScenario.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Add i18n keys for scenario UI</name>
  <files>src/i18n.js</files>
  <action>
In `src/i18n.js`, add the following entries before the closing `};` of `i18nData` (after `visual.launcher.pages`):

```js
  "visual.menuScenarios": {
    "zh": "场景",
    "en": "Scenarios"
  },
  "visual.scenario.add": {
    "zh": "新增场景",
    "en": "Add Scenario"
  },
  "visual.scenario.run": {
    "zh": "运行",
    "en": "Run"
  },
  "visual.scenario.delete": {
    "zh": "删除",
    "en": "Delete"
  },
  "visual.scenario.edit": {
    "zh": "编辑",
    "en": "Edit"
  },
  "visual.scenario.empty": {
    "zh": "暂无场景，点击「新增场景」创建",
    "en": "No scenarios yet. Click \"Add Scenario\" to create one."
  },
  "visual.scenario.name": {
    "zh": "场景名称",
    "en": "Name"
  },
  "visual.scenario.url": {
    "zh": "目标 URL",
    "en": "Target URL"
  },
  "visual.scenario.storage": {
    "zh": "localStorage 注入",
    "en": "localStorage Inject"
  },
  "visual.scenario.storageKey": {
    "zh": "键",
    "en": "Key"
  },
  "visual.scenario.storageValue": {
    "zh": "值",
    "en": "Value"
  },
  "visual.scenario.save": {
    "zh": "保存",
    "en": "Save"
  },
  "visual.scenario.cancel": {
    "zh": "取消",
    "en": "Cancel"
  }
```
  </action>
  <verify>
    <automated>grep -q "visual.menuScenarios" src/i18n.js && grep -q "visual.scenario.run" src/i18n.js</automated>
  </verify>
  <done>All scenario i18n keys added to src/i18n.js.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Add scenarios menu item to SideMenu.jsx</name>
  <files>src/components/VisualEditor/SideMenu.jsx</files>
  <action>
In `src/components/VisualEditor/SideMenu.jsx`:

1. Add `ExperimentOutlined` to the antd icons import
2. Add `scenarios` item to the `items` array after `launcher`

Updated file:

```jsx
import React from 'react';
import { EditOutlined, ApiOutlined, RocketOutlined, ExperimentOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './SideMenu.module.css';

const items = [
  { key: 'ui-edit', icon: EditOutlined, label: () => t('visual.menuUIEdit') },
  { key: 'launcher', icon: RocketOutlined, label: () => t('visual.menuLauncher') },
  { key: 'scenarios', icon: ExperimentOutlined, label: () => t('visual.menuScenarios') },
  { key: 'pipeline', icon: ApiOutlined, label: () => t('visual.menuPipeline') },
];

export default function SideMenu({ activeKey, onSelect }) {
  return (
    <div className={styles.sideMenu}>
      {items.map((item) => (
        <div
          key={item.key}
          className={`${styles.menuItem}${activeKey === item.key ? ' ' + styles.menuItemActive : ''}`}
          onClick={() => onSelect(item.key)}
        >
          <item.icon className={styles.menuIcon} />
          <span className={styles.menuLabel}>{item.label()}</span>
        </div>
      ))}
    </div>
  );
}
```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>SideMenu has scenarios item with ExperimentOutlined icon.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Create ScenarioPanel.jsx</name>
  <files>src/components/VisualEditor/ScenarioPanel.jsx</files>
  <action>
Create `src/components/VisualEditor/ScenarioPanel.jsx`:

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Space, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, EditOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import { getScenarios, createScenario, updateScenario, deleteScenario } from '../../utils/scenarioStorage';
import styles from './styles.module.css';

function StorageEditor({ pairs, onChange }) {
  const addRow = () => onChange([...pairs, { key: '', value: '' }]);
  const removeRow = (i) => onChange(pairs.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) => {
    const next = pairs.map((p, idx) => idx === i ? { ...p, [field]: val } : p);
    onChange(next);
  };
  return (
    <div>
      {pairs.map((p, i) => (
        <Space key={i} style={{ display: 'flex', marginBottom: 4 }}>
          <Input
            size="small"
            placeholder={t('visual.scenario.storageKey')}
            value={p.key}
            onChange={e => updateRow(i, 'key', e.target.value)}
            style={{ width: 120 }}
          />
          <Input
            size="small"
            placeholder={t('visual.scenario.storageValue')}
            value={p.value}
            onChange={e => updateRow(i, 'value', e.target.value)}
            style={{ width: 180 }}
          />
          <MinusCircleOutlined onClick={() => removeRow(i)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
        </Space>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={addRow} type="dashed" style={{ marginTop: 4 }}>
        {t('visual.scenario.storageKey')}
      </Button>
    </div>
  );
}

function ScenarioForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [url, setUrl] = useState(initial?.url || '');
  const [pairs, setPairs] = useState(
    Object.entries(initial?.storage || {}).map(([key, value]) => ({ key, value }))
  );

  const handleSave = () => {
    if (!name.trim() || !url.trim()) { message.warning('Name and URL are required'); return; }
    const storage = {};
    pairs.forEach(p => { if (p.key.trim()) storage[p.key.trim()] = p.value; });
    onSave({ name: name.trim(), url: url.trim(), storage, steps: initial?.steps || [] });
  };

  return (
    <div className={styles.scenarioForm}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input
          size="small"
          placeholder={t('visual.scenario.name')}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Input
          size="small"
          placeholder={t('visual.scenario.url')}
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('visual.scenario.storage')}</Typography.Text>
        <StorageEditor pairs={pairs} onChange={setPairs} />
        <Space>
          <Button size="small" type="primary" onClick={handleSave}>{t('visual.scenario.save')}</Button>
          <Button size="small" onClick={onCancel}>{t('visual.scenario.cancel')}</Button>
        </Space>
      </Space>
    </div>
  );
}

export default function ScenarioPanel({ onRunScenario }) {
  const [scenarios, setScenarios] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await getScenarios();
      setScenarios(list);
    } catch (err) {
      console.warn('Failed to load scenarios:', err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data) => {
    await createScenario(data);
    setShowAdd(false);
    load();
  };

  const handleEdit = async (id, data) => {
    await updateScenario(id, data);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id) => {
    await deleteScenario(id);
    load();
  };

  return (
    <div className={styles.scenarioPanel}>
      <div className={styles.scenarioPanelHeader}>
        <Typography.Text strong>{t('visual.menuScenarios')}</Typography.Text>
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={() => { setShowAdd(v => !v); setEditingId(null); }}
        >
          {t('visual.scenario.add')}
        </Button>
      </div>

      {showAdd && (
        <ScenarioForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {scenarios.length === 0 && !showAdd ? (
        <div className={styles.scenarioEmpty}>
          <Typography.Text type="secondary">{t('visual.scenario.empty')}</Typography.Text>
        </div>
      ) : (
        <div className={styles.scenarioList}>
          {scenarios.map(s => (
            <div key={s.id} className={styles.scenarioItem}>
              {editingId === s.id ? (
                <ScenarioForm
                  initial={s}
                  onSave={(data) => handleEdit(s.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className={styles.scenarioItemInfo}>
                    <Typography.Text strong style={{ fontSize: 13 }}>{s.name}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>{s.url}</Typography.Text>
                  </div>
                  <Space size={4}>
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => onRunScenario?.(s)}
                    >
                      {t('visual.scenario.run')}
                    </Button>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => { setEditingId(s.id); setShowAdd(false); }}
                    >
                      {t('visual.scenario.edit')}
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(s.id)}
                    >
                      {t('visual.scenario.delete')}
                    </Button>
                  </Space>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>ScenarioPanel.jsx created with list, add/edit/delete form, run button.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Add ScenarioPanel CSS to styles.module.css</name>
  <files>src/components/VisualEditor/styles.module.css</files>
  <action>
In `src/components/VisualEditor/styles.module.css`, append the following CSS classes at the end of the file:

```css
/* ─── ScenarioPanel ─────────────────────────────────────────────────────── */
.scenarioPanel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.scenarioPanelHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}
.scenarioList {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.scenarioItem {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.scenarioItemInfo {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.scenarioEmpty {
  padding: 24px 12px;
  text-align: center;
}
.scenarioForm {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-base-alt);
}
```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>ScenarioPanel CSS classes added to styles.module.css.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 7: Wire ScenarioPanel into App.jsx + add pendingScenario state</name>
  <files>src/App.jsx</files>
  <action>
In `src/App.jsx`:

**Part A — Add import** (after existing VisualEditor imports):
```js
import ScenarioPanel from './components/VisualEditor/ScenarioPanel';
```

**Part B — Add state** in constructor (after `availablePages: []`):
```js
pendingScenario: null,
```

**Part C — Add handler method** (after `handlePreviewUrlChange`):
```js
handleRunScenario = (scenario) => {
  this.setState({ pendingScenario: scenario, visualMenuKey: 'ui-edit' });
};
```

**Part D — Add scenarios branch** in the visual render section.

Find the existing else branch:
```jsx
) : (
  <div className={styles.visualPipelinePlaceholder}>
    {t('visual.pipelineComingSoon')}
  </div>
)}
```

Replace with:
```jsx
) : this.state.visualMenuKey === 'scenarios' ? (
  <div className={styles.visualPreviewArea}>
    <ScenarioPanel onRunScenario={this.handleRunScenario} />
  </div>
) : (
  <div className={styles.visualPipelinePlaceholder}>
    {t('visual.pipelineComingSoon')}
  </div>
)}
```

**Part E — Pass pendingScenario props to PagePreview**:

Find the existing PagePreview usage and add two props:
```jsx
pendingScenario={this.state.pendingScenario}
onScenarioDone={() => this.setState({ pendingScenario: null })}
```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>App.jsx wired: ScenarioPanel renders for scenarios key, pendingScenario state flows to PagePreview.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 8: Add runScenario support to PagePreview.jsx</name>
  <files>src/components/VisualEditor/PagePreview.jsx</files>
  <action>
In `src/components/VisualEditor/PagePreview.jsx`:

**Part A — Add props** to the function signature:
```js
export default function PagePreview({ port, previewUrl: externalUrl, onPreviewUrlChange, onElementHover, onElementSelect, onElementDeselect, selectedElement, sketchMcpStatus, onElementScreenshot, pendingScenario, onScenarioDone })
```

**Part B — Add useEffect** after the existing useEffects (after the ResizeObserver effect):

```js
// 执行 pendingScenario：注入 localStorage → 导航
useEffect(() => {
  if (!pendingScenario) return;
  const iframe = iframeRef.current;
  // 注入 localStorage（代理同源，可直接访问 contentWindow）
  try {
    const win = iframe?.contentWindow;
    if (win && pendingScenario.storage) {
      Object.entries(pendingScenario.storage).forEach(([k, v]) => {
        win.localStorage.setItem(k, v);
      });
    }
  } catch (err) {
    console.warn('localStorage inject failed:', err);
  }
  handleNavigate(pendingScenario.url);
  onScenarioDone?.();
}, [pendingScenario]); // eslint-disable-line react-hooks/exhaustive-deps
```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>PagePreview handles pendingScenario: injects localStorage and navigates, then calls onScenarioDone.</done>
</task>

</tasks>

<verification>
After all tasks complete, run the full verification sequence:

```bash
# 1. Scenario unit tests
CCV_LOG_DIR=tmp node --test test/scenarios.test.js

# 2. Full test suite (no regressions)
CCV_LOG_DIR=tmp node --test 2>&1 | tail -5

# 3. Production build
npm run build 2>&1 | tail -10
```

Expected: all tests pass, build exits 0.

Manual spot-check (if browser available):
1. Navigate to visual mode → SideMenu shows 场景 (ExperimentOutlined icon)
2. Click 场景 → ScenarioPanel renders with empty state message
3. Click 新增场景 → inline form appears with name/URL/storage fields
4. Fill in name="Test", url="/", add a storage key → Save → scenario appears in list
5. Click 运行 → switches to UI Edit mode, iframe navigates to "/"
6. Verify localStorage was injected (open browser devtools in iframe)
7. Edit and delete scenarios work correctly
8. Restart cc-viewer → scenarios persist from .cleffa/scenarios.json
</verification>

<success_criteria>
- `test/scenarios.test.js` passes 100%
- Full `node --test` suite passes with no regressions
- `npm run build` exits 0
- SideMenu shows 场景 item with ExperimentOutlined icon
- ScenarioPanel renders when visualMenuKey === 'scenarios'
- CRUD operations persist to .cleffa/scenarios.json
- Run button injects localStorage and navigates iframe
- All i18n keys present in src/i18n.js
</success_criteria>

<output>
After completion, create `.planning/phases/phase-22/phase-22-01-SUMMARY.md` with:
- New files created and their contents
- Files modified and what changed in each
- Confirmation that all tests pass and build succeeds
- Note on any edge cases discovered during implementation
</output>
