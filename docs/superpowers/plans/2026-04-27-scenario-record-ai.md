# Scenario Recording + AI Generation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为场景系统添加两个功能：(A) 录制模式——在 iframe 中操作页面自动生成步骤；(B) AI 生成——用自然语言描述操作流程，AI 生成对应的 steps 数组。

**Architecture:**
- 方案A：扩展 `inspector-inject.js` 支持 `recording` 模式，录制时捕获 click/input 事件并生成稳健 CSS selector，通过 postMessage 发回父窗口；`PagePreview.jsx` 接收 `recorded-step` 消息并通过回调传给 `ScenarioPanel`；`ScenarioPanel` 新增录制 UI 入口。
- 方案B：`server.js` 新增 `/api/generate-scenario` 端点，复用已有 Anthropic API 调用模式；`ScenarioForm` 新增"AI 生成"按钮和描述输入框。

**Tech Stack:** React, Ant Design, Node.js HTTP server, Anthropic Messages API (claude-sonnet-4-20250514), postMessage protocol

---

## Chunk 1: inspector-inject.js 录制模式

### Task 1: 扩展 inspector-inject.js 支持录制模式

**Files:**
- Modify: `public/inspector-inject.js`

**背景：**
当前 `inspector-inject.js` 在 `onClick` 中调用 `e.preventDefault()` + `e.stopPropagation()`，阻止了页面正常响应。录制模式需要让点击穿透到页面，同时捕获事件信息。

**CSS Selector 生成策略（优先级从高到低）：**
1. `#id`（唯一 id）
2. `[data-testid="..."]`
3. `[aria-label="..."]`
4. tag + 唯一 class 组合
5. nth-child 路径（兜底）

- [ ] **Step 1: 在 inspector-inject.js 顶部添加 recording 状态变量**

在 `let enabled = true;` 后添加：
```js
let recording = false;
let recordingOverlay = null;
```

- [ ] **Step 2: 添加 generateSelector 函数**

在 `sendToParent` 函数前插入：
```js
function generateSelector(el) {
  if (!el || el === document.body) return 'body';
  if (el.id) return '#' + el.id;
  var testId = el.getAttribute('data-testid');
  if (testId) return '[data-testid="' + testId + '"]';
  var ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return '[aria-label="' + ariaLabel + '"]';
  // 尝试唯一 class 组合
  if (el.className && typeof el.className === 'string') {
    var classes = el.className.trim().split(/\s+/).filter(function(c) { return c && !c.match(/^[0-9]/) && c.length < 40; });
    for (var i = 0; i < classes.length; i++) {
      var sel = el.tagName.toLowerCase() + '.' + classes[i];
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    if (classes.length > 0) {
      var combined = el.tagName.toLowerCase() + '.' + classes.slice(0, 2).join('.');
      if (document.querySelectorAll(combined).length === 1) return combined;
    }
  }
  // nth-child 路径兜底
  var path = [];
  var cur = el;
  while (cur && cur !== document.body) {
    var tag = cur.tagName.toLowerCase();
    var siblings = cur.parentElement ? Array.from(cur.parentElement.children).filter(function(c) { return c.tagName === cur.tagName; }) : [];
    if (siblings.length > 1) {
      tag += ':nth-of-type(' + (siblings.indexOf(cur) + 1) + ')';
    }
    path.unshift(tag);
    cur = cur.parentElement;
  }
  return path.join(' > ');
}
```

- [ ] **Step 3: 添加录制模式的事件处理函数**

在 `onKeyDown` 函数后插入：
```js
function onRecordClick(e) {
  if (!recording) return;
  var target = e.target;
  if (target === recordingOverlay) return;
  var selector = generateSelector(target);
  sendToParent('recorded-step', { type: 'click', selector: selector, tag: target.tagName.toLowerCase(), text: (target.innerText || '').slice(0, 50) });
}

function onRecordInput(e) {
  if (!recording) return;
  var target = e.target;
  if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') return;
  var selector = generateSelector(target);
  sendToParent('recorded-step', { type: 'fill', selector: selector, value: target.value });
}
```

---

## Chunk 3: ScenarioPanel 录制 UI

### Task 3: ScenarioPanel 新增录制入口和实时步骤展示

**Files:**
- Modify: `src/components/VisualEditor/ScenarioPanel.jsx`

**背景：**
ScenarioPanel 需要：
1. 新增 `onStartRecording` / `onStopRecording` / `isRecording` / `recordedSteps` props
2. 在面板顶部添加"录制"按钮（录制中变为"停止录制"）
3. 录制中实时显示已捕获的步骤列表
4. 录制停止后弹出保存表单（预填 steps）

- [ ] **Step 1: 在 ScenarioPanel props 中添加录制相关 props**

找到：
```js
export default function ScenarioPanel({ onRunScenario, scenarioProgress, onBatchRun, pinnedScenarioId, onPinScenario }) {
```
替换为：
```js
export default function ScenarioPanel({ onRunScenario, scenarioProgress, onBatchRun, pinnedScenarioId, onPinScenario, isRecording, onStartRecording, onStopRecording, recordedSteps }) {
```

- [ ] **Step 2: 在 ScenarioPanel 内部添加录制状态和保存逻辑**

在 `const [editingId, setEditingId] = useState(null);` 后添加：
```js
const [showRecordSave, setShowRecordSave] = useState(false);
const [pendingRecordedSteps, setPendingRecordedSteps] = useState([]);

const handleStopAndSave = () => {
  onStopRecording?.();
  setPendingRecordedSteps(recordedSteps || []);
  setShowRecordSave(true);
  setShowAdd(false);
  setEditingId(null);
};

const handleSaveRecorded = async (data) => {
  await createScenario(data);
  setShowRecordSave(false);
  setPendingRecordedSteps([]);
  load();
};
```

- [ ] **Step 3: 在面板 header 添加录制按钮**

找到：
```js
<Button size="small" icon={<PlusOutlined />} onClick={() => { setShowAdd(v => !v); setEditingId(null); }}>
  {t('visual.scenario.add')}
</Button>
```
替换为：
```js
{isRecording ? (
  <Button size="small" danger onClick={handleStopAndSave}>
    {t('visual.scenario.stopRecord')}
  </Button>
) : (
  <Button size="small" icon={<span style={{color:'#ff4d4f'}}>●</span>} onClick={() => { onStartRecording?.(); setShowAdd(false); setEditingId(null); }}>
    {t('visual.scenario.record')}
  </Button>
)}
<Button size="small" icon={<PlusOutlined />} onClick={() => { setShowAdd(v => !v); setEditingId(null); }}>
  {t('visual.scenario.add')}
</Button>
```

- [ ] **Step 4: 在 scenarioProgress 下方添加录制中步骤实时展示**

在 `{showAdd && (` 前插入：
```js
{isRecording && (
  <div style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
    <Typography.Text type="danger" style={{ fontSize: 12 }}>● {t('visual.scenario.recording')} ({(recordedSteps || []).length} {t('visual.scenario.steps')})</Typography.Text>
    <div style={{ maxHeight: 120, overflowY: 'auto', marginTop: 4 }}>
      {(recordedSteps || []).map((s, i) => (
        <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '1px 0' }}>
          {i + 1}. [{s.type}] {s.selector}{s.value ? ` = "${s.value}"` : ''}
        </div>
      ))}
    </div>
  </div>
)}
{showRecordSave && (
  <ScenarioForm
    initial={{ steps: pendingRecordedSteps }}
    onSave={handleSaveRecorded}
    onCancel={() => { setShowRecordSave(false); setPendingRecordedSteps([]); }}
  />
)}
```

- [ ] **Step 5: 构建验证**

```bash
cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add src/components/VisualEditor/ScenarioPanel.jsx
git commit -m "feat(scenario): ScenarioPanel 录制 UI + 实时步骤展示"
```

---

## Chunk 4: App.jsx 录制状态管理

### Task 4: App.jsx 连接录制状态到 PagePreview 和 ScenarioPanel

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 在 App state 中添加录制相关状态**

在 `pinnedScenario: null,` 后添加：
```js
isRecording: false,
recordedSteps: [],
```

- [ ] **Step 2: 添加录制控制方法**

在 `handlePinScenario` 方法后添加：
```js
handleStartRecording = () => {
  this.setState({ isRecording: true, recordedSteps: [], visualMenuKey: 'ui-edit' });
};

handleStopRecording = () => {
  this.setState({ isRecording: false });
};

handleRecordedStep = (step) => {
  this.setState(prev => ({ recordedSteps: [...prev.recordedSteps, step] }));
};
```

- [ ] **Step 3: 将录制 props 传给 PagePreview**

找到 PagePreview 的 JSX，添加：
```jsx
isRecording={this.state.isRecording}
onRecordedStep={this.handleRecordedStep}
```

- [ ] **Step 4: 将录制 props 传给 ScenarioPanel**

找到 ScenarioPanel 的 JSX，添加：
```jsx
isRecording={this.state.isRecording}
onStartRecording={this.handleStartRecording}
onStopRecording={this.handleStopRecording}
recordedSteps={this.state.recordedSteps}
```

- [ ] **Step 5: 构建验证**

```bash
cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat(scenario): App.jsx 录制状态管理"
```

---

## Chunk 5: i18n 新增录制相关翻译键

### Task 5: 添加录制功能的 i18n 翻译

**Files:**
- Modify: `src/i18n.js`

- [ ] **Step 1: 在 visual.scenario.pinned 后添加新翻译键**

找到：
```js
"visual.scenario.pinned": { "zh": "场景", "en": "Scenario" }
```
替换为：
```js
"visual.scenario.pinned": { "zh": "场景", "en": "Scenario" },
"visual.scenario.record": { "zh": "录制", "en": "Record" },
"visual.scenario.stopRecord": { "zh": "停止录制", "en": "Stop Recording" },
"visual.scenario.recording": { "zh": "录制中", "en": "Recording" },
"visual.scenario.aiGenerate": { "zh": "AI 生成", "en": "AI Generate" },
"visual.scenario.aiPrompt": { "zh": "描述操作流程（如：点击登录按钮，填写用户名密码）", "en": "Describe the flow (e.g. click login, fill username and password)" },
"visual.scenario.aiGenerating": { "zh": "AI 生成中...", "en": "Generating..." },
"visual.scenario.aiError": { "zh": "AI 生成失败，请检查 API Key 配置", "en": "AI generation failed. Check API Key config." }
```

- [ ] **Step 2: 构建验证**

```bash
cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n.js
git commit -m "feat(scenario): 新增录制和 AI 生成 i18n 翻译键"
```

---

## Chunk 6: server.js AI 生成端点

### Task 6: server.js 新增 /api/generate-scenario 端点

**Files:**
- Modify: `server.js`

**背景：**
复用 `/api/compare-analyze` 的 Anthropic API 调用模式（`_cachedApiKey` + `httpsRequest` 到 `api.anthropic.com/v1/messages`）。
AI 生成场景不需要 streaming，直接返回 JSON。

- [ ] **Step 1: 在 /api/scenarios GET 端点前插入新端点**

找到：
```js
// GET /api/scenarios
```
在其前插入：
```js
// POST /api/generate-scenario
if (url === '/api/generate-scenario' && method === 'POST') {
  let body = '';
  req.on('data', c => { body += c; if (body.length > 64 * 1024) req.destroy(); });
  req.on('end', () => {
    try {
      const { description, url: pageUrl } = JSON.parse(body);
      if (!description) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing_description' }));
        return;
      }
      const apiKey = _cachedApiKey;
      const authHeader = _cachedAuthHeader;
      if (!apiKey && !authHeader) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'no_api_key' }));
        return;
      }
      const prompt = `You are a frontend test automation expert. Generate a JSON array of scenario steps based on the user's description.

Page URL: ${pageUrl || 'unknown'}
User description: ${description}

Rules:
1. Return ONLY a valid JSON array, no markdown, no explanation.
2. Each step must be one of:
   - { "type": "click", "selector": "CSS_SELECTOR" }
   - { "type": "fill", "selector": "CSS_SELECTOR", "value": "TEXT" }
   - { "type": "wait", "ms": NUMBER }
3. Use specific, stable CSS selectors (prefer id, data-testid, aria-label over class names).
4. Add wait steps (300-500ms) after clicks that trigger navigation or async operations.
5. Generate 3-10 steps maximum.

Return only the JSON array.`;

      const apiBody = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });
      const headers = { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' };
      if (apiKey) headers['x-api-key'] = apiKey;
      else if (authHeader) headers['authorization'] = authHeader;

      const apiReq = httpsRequest({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(apiBody) },
        timeout: 30000,
      }, (apiRes) => {
        let data = '';
        apiRes.on('data', c => { data += c; });
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const text = parsed.content?.[0]?.text || '[]';
            const match = text.match(/\[[\s\S]*\]/);
            const steps = match ? JSON.parse(match[0]) : [];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ steps }));
          } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'parse_error', steps: [] }));
          }
        });
      });
      apiReq.on('error', (e) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e) }));
      });
      apiReq.write(apiBody);
      apiReq.end();
    } catch (e) {
      res.writeHead(400);
      res.end('Bad request');
    }
  });
  return;
}
```

- [ ] **Step 2: 构建验证**

```bash
cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat(scenario): server.js 新增 /api/generate-scenario 端点"
```

---

## Chunk 7: ScenarioForm AI 生成 UI

### Task 7: ScenarioForm 新增 AI 生成按钮

**Files:**
- Modify: `src/components/VisualEditor/ScenarioPanel.jsx`

**背景：**
在 ScenarioForm 的 Steps 区域旁添加"AI 生成"按钮，点击后弹出描述输入框，调用 `/api/generate-scenario`，将返回的 steps 填入表单。

- [ ] **Step 1: 在 ScenarioForm 中添加 AI 生成状态**

在 `const [steps, setSteps] = useState(initial?.steps || []);` 后添加：
```js
const [aiPrompt, setAiPrompt] = useState('');
const [aiLoading, setAiLoading] = useState(false);
const [showAiInput, setShowAiInput] = useState(false);
```

- [ ] **Step 2: 添加 handleAiGenerate 函数**

在 `handleSave` 函数后添加：
```js
const handleAiGenerate = async () => {
  if (!aiPrompt.trim()) return;
  setAiLoading(true);
  try {
    const res = await fetch('/api/generate-scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: aiPrompt, url: url }),
    });
    const data = await res.json();
    if (data.error) {
      message.error(t('visual.scenario.aiError'));
    } else {
      setSteps(data.steps || []);
      setShowAiInput(false);
      setAiPrompt('');
      message.success(`已生成 ${(data.steps || []).length} 个步骤`);
    }
  } catch (e) {
    message.error(t('visual.scenario.aiError'));
  } finally {
    setAiLoading(false);
  }
};
```

- [ ] **Step 3: 在 Steps 标题旁添加 AI 生成按钮**

找到：
```jsx
<Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('visual.scenario.steps')}</Typography.Text>
<StepsEditor steps={steps} onChange={setSteps} />
```
替换为：
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('visual.scenario.steps')}</Typography.Text>
  <Button size="small" type="dashed" onClick={() => setShowAiInput(v => !v)}>
    {t('visual.scenario.aiGenerate')}
  </Button>
</div>
{showAiInput && (
  <Space direction="vertical" style={{ width: '100%' }}>
    <Input.TextArea
      size="small"
      rows={2}
      placeholder={t('visual.scenario.aiPrompt')}
      value={aiPrompt}
      onChange={e => setAiPrompt(e.target.value)}
    />
    <Button size="small" type="primary" loading={aiLoading} onClick={handleAiGenerate}>
      {aiLoading ? t('visual.scenario.aiGenerating') : t('visual.scenario.aiGenerate')}
    </Button>
  </Space>
)}
<StepsEditor steps={steps} onChange={setSteps} />
```

- [ ] **Step 4: 构建验证**

```bash
cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/components/VisualEditor/ScenarioPanel.jsx
git commit -m "feat(scenario): ScenarioForm 新增 AI 生成步骤功能"
```

---

## 风险与缓解

| 风险 | 缓解策略 |
|------|---------|
| 录制模式下 click 事件与 inspector 模式冲突 | recording 时强制 `enabled=false`，两套监听器互斥 |
| CSS selector 不唯一导致回放失败 | generateSelector 有 5 级降级策略，最终 nth-child 路径兜底 |
| AI 生成的 selector 不匹配真实 DOM | 生成后填入 StepsEditor，用户可手动修改 |
| Anthropic API 无 key 时 AI 生成失败 | 端点返回 `{ error: 'no_api_key' }`，前端显示友好提示 |
| iframe 跨域限制 | 项目已有 proxy 机制，inspector-inject.js 通过 proxy 注入，不受跨域影响 |

## 执行顺序

Chunk 1 → Chunk 2 → Chunk 4 → Chunk 3 → Chunk 5 → Chunk 6 → Chunk 7

- [ ] **Step 4: 在 message 监听器中处理 start-recording / stop-recording 指令**

在 `if (e.data.type === 'run-step')` 块前插入：
```js
if (e.data.type === 'start-recording') {
  recording = true;
  enabled = false;
  if (hoverOverlay) hoverOverlay.style.display = 'none';
  if (selectOverlay) selectOverlay.style.display = 'none';
  // 录制指示器
  if (!recordingOverlay) {
    recordingOverlay = document.createElement('div');
    recordingOverlay.style.cssText = 'position:fixed;top:8px;right:8px;z-index:2147483647;background:#ff4d4f;color:#fff;padding:4px 10px;border-radius:4px;font-size:12px;pointer-events:none;';
    recordingOverlay.textContent = '● REC';
    document.body.appendChild(recordingOverlay);
  }
  recordingOverlay.style.display = 'block';
}
if (e.data.type === 'stop-recording') {
  recording = false;
  if (recordingOverlay) recordingOverlay.style.display = 'none';
}
```

- [ ] **Step 5: 在初始化区域注册录制事件监听**

在 `document.addEventListener('click', onClick, true);` 后添加：
```js
document.addEventListener('click', onRecordClick, true);
document.addEventListener('change', onRecordInput, true);
```

- [ ] **Step 6: 构建验证**

```bash
cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -5
```
Expected: 无错误

- [ ] **Step 7: Commit**

```bash
git add public/inspector-inject.js
git commit -m "feat(scenario): inspector 支持录制模式 + generateSelector"
```

---

## Chunk 2: PagePreview.jsx 接收录制步骤

### Task 2: PagePreview 新增录制控制和步骤回调

**Files:**
- Modify: `src/components/VisualEditor/PagePreview.jsx:167`

**背景：**
PagePreview 已有 postMessage 监听（`handleMessage`），需要：
1. 新增 `onRecordedStep` prop 接收录制步骤
2. 新增 `isRecording` prop 控制录制状态
3. 在 `handleMessage` 中处理 `recorded-step` 消息
4. 新增 `sendRecordingCmd` 函数向 iframe 发送 start/stop-recording

- [ ] **Step 1: 在 PagePreview 函数签名中添加新 props**

找到：
```js
export default function PagePreview({ port, previewUrl: externalUrl, onPreviewUrlChange, onElementHover, onElementSelect, onElementDeselect, selectedElement, sketchMcpStatus, onElementScreenshot, pendingScenario, onScenarioDone, onStepProgress, onScreenshotReady, pinnedScenario, onUnpinScenario }) {
```
替换为：
```js
export default function PagePreview({ port, previewUrl: externalUrl, onPreviewUrlChange, onElementHover, onElementSelect, onElementDeselect, selectedElement, sketchMcpStatus, onElementScreenshot, pendingScenario, onScenarioDone, onStepProgress, onScreenshotReady, pinnedScenario, onUnpinScenario, isRecording, onRecordedStep }) {
```

- [ ] **Step 2: 添加 sendRecordingCmd 函数**

在 `sendInspectorCmd` 函数后插入：
```js
const sendRecordingCmd = useCallback((start) => {
  const iframe = iframeRef.current;
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(
      { source: 'cc-visual-parent', type: start ? 'start-recording' : 'stop-recording' },
      '*'
    );
  }
}, []);
```

- [ ] **Step 3: 在 handleMessage 中处理 recorded-step**

在 `case 'step-error':` 块后，`}` 前插入：
```js
case 'recorded-step':
  onRecordedStep?.(e.data.data);
  break;
```

- [ ] **Step 4: 添加 isRecording 变化的 useEffect**

在 `sendNextStep` 函数后插入：
```js
useEffect(() => {
  if (isRecording !== undefined) {
    sendRecordingCmd(isRecording);
  }
}, [isRecording, sendRecordingCmd]);
```

- [ ] **Step 5: 构建验证**

```bash
cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add src/components/VisualEditor/PagePreview.jsx
git commit -m "feat(scenario): PagePreview 支持录制模式 props"
```

---

## 风险与缓解

| 风险 | 缓解策略 |
|------|---------|
| 录制模式下 click 事件与 inspector 模式冲突 | recording 时强制 `enabled=false`，两套监听器互斥 |
| CSS selector 不唯一导致回放失败 | generateSelector 有 5 级降级策略，最终 nth-child 路径兜底 |
| AI 生成的 selector 不匹配真实 DOM | 生成后填入 StepsEditor，用户可手动修改 |
| Anthropic API 无 key 时 AI 生成失败 | 端点返回 `{ error: 'no_api_key' }`，前端显示友好提示 |
| iframe 跨域限制 | 项目已有 proxy 机制，inspector-inject.js 通过 proxy 注入，不受跨域影响 |

## 执行顺序

Chunk 1 → Chunk 2 → Chunk 4 → Chunk 3 → Chunk 5 → Chunk 6 → Chunk 7

---
