# Phase 30: 录制体验优化 + AI 生成改进 — PLAN

**Phase:** 30-recording-optimization-ai-improvement
**Status:** Ready for execution
**Planned:** 2026-04-28

---

## Goal

完善录制交互（暂停/恢复、实时状态指示）并提升 AI 生成灵活性（可配置模型、新 step 类型支持、step 精炼、错误重试）。

---

## 当前状态

- 录制只有"开始/停止"两种状态，无暂停/恢复
- inspector-inject.js 录制仅支持 click/fill，缺少 pause-recording/resume-recording 消息
- StepsEditor 无插入功能和复选框精炼模式
- ScenarioForm handleAiGenerate 固定调用 haiku 模型
- `/api/generate-scenario` prompt 只写 click/fill/wait 三种类型，模型硬编码 haiku
- 已有 i18n 键：record/stopRecord/recording/aiGenerate/aiPrompt/aiGenerating/aiError

---

## Step 1 — src/i18n.js：新增翻译键

在 `"visual.scenario.aiError"` 条目（末行，约第 8111 行）之后插入：

```js
  "visual.scenario.pauseRecord": { "zh": "暂停", "en": "Pause", "ja": "一時停止" },
  "visual.scenario.resumeRecord": { "zh": "恢复", "en": "Resume", "ja": "再開" },
  "visual.scenario.recordingPaused": { "zh": "已暂停", "en": "Paused", "ja": "一時停止中" },
  "visual.scenario.insertStep": { "zh": "插入步骤", "en": "Insert step", "ja": "ステップ挿入" },
  "visual.scenario.refineSelected": { "zh": "精炼选中", "en": "Refine selected", "ja": "選択を精練" },
  "visual.scenario.refinePlaceholder": { "zh": "描述修改方式（如：把这个 click 改成 hover）", "en": "Describe changes (e.g. change click to hover)", "ja": "変更方法を記述" },
  "visual.scenario.selectModel": { "zh": "模型", "en": "Model", "ja": "モデル" },
  "visual.scenario.retry": { "zh": "重试", "en": "Retry", "ja": "再試行" },
  "visual.scenario.refineError": { "zh": "精炼失败，请重试", "en": "Refine failed. Please retry.", "ja": "精練失敗" },
```

---

## Step 2 — public/inspector-inject.js：暂停/恢复录制

### 2a — 新增暂停状态变量

在第 6 行 `let recording = false;` 之后新增：

```js
let recordingPaused = false;
```

### 2b — 在 stop-recording handler 之后插入 pause/resume handler

在 `stop-recording` handler（约第 262 行）后的 `if (e.data.type === 'run-step')` 之前插入：

```js
    if (e.data.type === 'pause-recording') {
      recordingPaused = true;
      if (recordingOverlay) {
        recordingOverlay.style.background = '#faad14';
        recordingOverlay.textContent = '⏸ PAUSED';
      }
    }
    if (e.data.type === 'resume-recording') {
      recordingPaused = false;
      if (recordingOverlay) {
        recordingOverlay.style.background = '#ff4d4f';
        recordingOverlay.textContent = '● REC';
      }
    }
```

### 2c — onRecordClick 和 onRecordInput 添加暂停守卫

在第 220 行（`onRecordClick` 函数内 `if (!recording) return;` 后）：

```js
    if (recordingPaused) return;
```

在第 228 行（`onRecordInput` 函数内 `if (!recording) return;` 后）：

```js
    if (recordingPaused) return;
```

---

## Step 3 — src/App.jsx：新增暂停状态与 handlers

### 3a — constructor state 新增（第 53 行附近，现有状态对象中）

```js
      isPaused: false,
```

### 3b — handlePauseRecording 和 handleResumeRecording（放在 handleStopRecording 之后，约第 181–183 行）

```js
  handlePauseRecording = () => {
    this.setState({ isPaused: true });
  };

  handleResumeRecording = () => {
    this.setState({ isPaused: false });
  };
```

### 3c — handleStopRecording 重置 isPaused（第 180–182 行）

修改为：

```js
  handleStopRecording = () => {
    this.setState({ isRecording: false, isPaused: false });
  };
```

### 3d — handleStartRecording 重置 isPaused（第 176–178 行）

修改为：

```js
  handleStartRecording = () => {
    this.setState({ isRecording: true, recordedSteps: [], isPaused: false, visualMenuKey: 'ui-edit' });
  };
```

### 3e — BottomTabPanel 内 ScenarioPanel（约第 743 行）新增 props

```jsx
                                isPaused={this.state.isPaused}
                                onPauseRecording={this.handlePauseRecording}
                                onResumeRecording={this.handleResumeRecording}
```

### 3f — 全屏 ScenarioPanel（约第 769 行）新增同样 props

```jsx
                                isPaused={this.state.isPaused}
                                onPauseRecording={this.handlePauseRecording}
                                onResumeRecording={this.handleResumeRecording}
```

---

## Step 4 — src/components/VisualEditor/PagePreview.jsx：转发暂停/恢复消息

### 4a — useEffect 监听 isPaused（放在 pick element useEffect 之后，约第 372 行之后）

```js
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    if (isPaused) {
      iframe.contentWindow.postMessage(
        { source: 'cc-visual-parent', type: 'pause-recording' }, '*'
      );
    } else {
      iframe.contentWindow.postMessage(
        { source: 'cc-visual-parent', type: 'resume-recording' }, '*'
      );
    }
  }, [isPaused]);
```

### 4b — PagePreview props 新增（第 167 行）

```js
export default function PagePreview({ ..., isPaused }) {
```

注意：仅在录制状态下传递 `isPaused`（在 App.jsx PagePreview props 中补充）。

### 4c — App.jsx PagePreview props 新增 isPaused（约第 698 行）

```jsx
                          isRecording={this.state.isRecording}
                          isPaused={this.state.isPaused}
                          onRecordedStep={this.handleRecordedStep}
```

---

## Step 5 — src/components/VisualEditor/ScenarioPanel.jsx：录制暂停 UI + 插入 + 精炼 + 模型

### 5a — imports 新增图标

在现有 icons import 行追加 `InsertRowBelowOutlined, PauseCircleOutlined, PlayCircleFilled`：

```js
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, PlayCircleFilled, EditOutlined, MinusCircleOutlined, CameraOutlined, PushpinOutlined, PushpinFilled, CopyOutlined, AimOutlined, HolderOutlined, InsertRowBelowOutlined, PauseCircleOutlined } from '@ant-design/icons';
```

### 5b — StepsEditor 新增 insertStep 和复选框 + 精炼

**替换 StepsEditor 函数签名**（第 43 行）：

```js
function StepsEditor({ steps, onChange, onPickElement, selectedIndices, onToggleSelect, onInsertStep }) {
```

**addStep 后新增 insertStep（第 47–48 行）：**

```js
  const insertStep = (i) => onChange([...steps.slice(0, i + 1), { type: 'click', selector: '' }, ...steps.slice(i + 1)]);
```

**hasSelector 保持不变。**

**每行渲染新增复选框和插入按钮（在 HolderOutlined 后，第 74–75 行之后）：**

在 `<HolderOutlined ... />` 行之后插入：

```jsx
              {onToggleSelect && (
                <input
                  type="checkbox"
                  checked={selectedIndices?.includes(i) || false}
                  onChange={() => onToggleSelect(i)}
                  style={{ margin: 0, flexShrink: 0 }}
                />
              )}
```

**在 CopyOutlined 和 MinusCircleOutlined 之间**（约第 131–136 行）插入插入按钮：

```jsx
          {onInsertStep && (
            <InsertRowBelowOutlined
              title={t('visual.scenario.insertStep')}
              style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
              onClick={() => insertStep(i)}
            />
          )}
```

### 5c — ScenarioForm 新增 model 下拉、精炼模式、错误重试

**state 新增**（第 152–156 行）：

```js
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [aiRefineMode, setAiRefineMode] = useState(false);
  const [aiModel, setAiModel] = useState('claude-haiku-4-5-20251001');
  const [aiError, setAiError] = useState(null);
```

**handleAiGenerate 替换为**（第 164–187 行）：

```js
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const isRefine = selectedIndices.length > 0;
      const body = isRefine
        ? { description: aiPrompt, url, steps: selectedIndices.map(i => steps[i]), model: aiModel }
        : { description: aiPrompt, url, model: aiModel };
      const res = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error);
      } else if (isRefine) {
        const newSteps = [...steps];
        data.steps.forEach((step, idx) => {
          if (idx < selectedIndices.length) {
            newSteps[selectedIndices[idx]] = step;
          }
        });
        setSteps(newSteps);
        setSelectedIndices([]);
        setShowAiInput(false);
        setAiPrompt('');
        message.success(`已精炼 ${Math.min(data.steps.length, selectedIndices.length)} 个步骤`);
      } else {
        setSteps(data.steps || []);
        setShowAiInput(false);
        setAiPrompt('');
        message.success(`已生成 ${(data.steps || []).length} 个步骤`);
      }
    } catch (e) {
      setAiError('network_error');
    } finally {
      setAiLoading(false);
    }
  };
```

**handleToggleSelect 新增**（放在 handleAiGenerate 之前或之后）：

```js
  const handleToggleSelect = (i) => {
    setSelectedIndices(prev =>
      prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]
    );
  };
```

**AI 区域替换**（第 202–214 行，AI input + button）：

```jsx
        {showAiInput && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input.TextArea
              size="small"
              rows={2}
              placeholder={selectedIndices.length > 0 ? t('visual.scenario.refinePlaceholder') : t('visual.scenario.aiPrompt')}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
            />
            <Space size={4}>
              <select
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                style={{ fontSize: 12, padding: '1px 4px', height: 24 }}
                title={t('visual.scenario.selectModel')}
              >
                <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001</option>
              </select>
              <Button size="small" type="primary" loading={aiLoading} onClick={handleAiGenerate}>
                {aiLoading ? t('visual.scenario.aiGenerating') : (selectedIndices.length > 0 ? t('visual.scenario.refineSelected') : t('visual.scenario.aiGenerate'))}
              </Button>
            </Space>
            {aiError && (
              <Space size={4}>
                <Typography.Text type="danger" style={{ fontSize: 12 }}>
                  {t('visual.scenario.aiError')}
                </Typography.Text>
                <Button size="small" onClick={handleAiGenerate}>
                  {t('visual.scenario.retry')}
                </Button>
              </Space>
            )}
          </Space>
        )}
```

**AI 生成按钮文本动态**（第 198 行）：

```jsx
          <Button size="small" type="dashed" onClick={() => { setShowAiInput(v => !v); setSelectedIndices([]); setAiError(null); }}>
            {t('visual.scenario.aiGenerate')}
          </Button>
```

**StepsEditor 调用传递新 props**（第 216 行）：

```jsx
        <StepsEditor steps={steps} onChange={setSteps} onPickElement={onPickElement} selectedIndices={selectedIndices} onToggleSelect={handleToggleSelect} onInsertStep={() => {}} />
```

### 5d — ScenarioPanel 暂停/恢复 UI（录制状态区，第 307–318 行）

**替换录制状态区为**：

```jsx
      {isRecording && (
        <div style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
          <Space size={8}>
            <Typography.Text type={isPaused ? 'warning' : 'danger'} style={{ fontSize: 12 }}>
              {isPaused ? '⏸' : '●'} {isPaused ? t('visual.scenario.recordingPaused') : t('visual.scenario.recording')} ({(recordedSteps || []).length} {t('visual.scenario.steps')})
            </Typography.Text>
            {isPaused ? (
              <Button size="small" icon={<PlayCircleFilled />} onClick={onResumeRecording}>
                {t('visual.scenario.resumeRecord')}
              </Button>
            ) : (
              <Button size="small" icon={<PauseCircleOutlined />} onClick={onPauseRecording}>
                {t('visual.scenario.pauseRecord')}
              </Button>
            )}
            <Button size="small" danger onClick={handleStopAndSave}>
              {t('visual.scenario.stopRecord')}
            </Button>
          </Space>
          <div style={{ maxHeight: 120, overflowY: 'auto', marginTop: 4 }}>
            {(recordedSteps || []).map((s, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '1px 0' }}>
                {i + 1}. [{s.type}] {s.selector}{s.value ? ` = "${s.value}"` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
```

### 5e — ScenarioPanel 函数签名新增 props

第 226 行：

```js
export default function ScenarioPanel({ compact = false, onRunScenario, scenarioProgress, onBatchRun, pinnedScenarioId, onPinScenario, isRecording, onStartRecording, onStopRecording, recordedSteps, onPickElement, isPaused, onPauseRecording, onResumeRecording }) {
```

---

## Step 6 — server.js：AI 生成 prompt 升级 + 模型配置 + refine 支持

### 6a — 请求体解析（更新第 2861 行）

```js
        const { description, url: pageUrl, steps: refineSteps, model: requestModel } = JSON.parse(body);
```

### 6b — 使用请求中模型（第 2892 行）

将硬编码模型替换为：

```js
          model: requestModel || 'claude-haiku-4-5-20251001',
```

### 6c — 更新 prompt 规则（第 2880–2888 行）

将 Rules 替换为：

```js
  Rules:
  1. Return ONLY a valid JSON array, no markdown, no explanation.
  2. Each step must be one of:
     - { "type": "click", "selector": "CSS_SELECTOR" }
     - { "type": "fill", "selector": "CSS_SELECTOR", "value": "TEXT" }
     - { "type": "wait", "ms": NUMBER }
     - { "type": "scroll", "selector": "CSS_SELECTOR", "x": NUMBER, "y": NUMBER }
     - { "type": "keyboard", "key": "KEY_NAME" }
     - { "type": "hover", "selector": "CSS_SELECTOR" }
     - { "type": "select", "selector": "CSS_SELECTOR", "value": "OPTION_VALUE" }
     - { "type": "assert", "selector": "CSS_SELECTOR", "expected": "TEXT" }
  3. Use specific, stable CSS selectors (prefer id, data-testid, aria-label over class names).
  4. Add wait steps (300-500ms) after clicks that trigger navigation or async operations.
  5. Generate 3-10 steps maximum.`;
```

### 6d — refine 模式 prompt（在 description 判断后，生成 prompt 处）

当 `refineSteps` 存在时，使用不同 prompt（放在 `const prompt = \`...\` 处判断）：

```js
        const prompt = refineSteps
          ? `You are a frontend test automation expert. Modify the existing steps according to the user's instructions.

Existing steps:
${JSON.stringify(refineSteps, null, 2)}

User instructions: ${description}

Rules:
1. Return ONLY a valid JSON array, no markdown, no explanation.
2. Each step type reference: click/fill/wait/scroll/keyboard/hover/select/assert.
3. Return exactly the same number of steps as the existing steps above, only modifying the ones that need to change.
4. Preserve the order of existing steps unless the user explicitly asks to reorder.
5. Use specific, stable CSS selectors.

Return only the JSON array.`
          : `You are a frontend test automation expert. Generate a JSON array of scenario steps based on the user's description.

Page URL: ${pageUrl || 'unknown'}
User description: ${description}

Rules:
1. Return ONLY a valid JSON array, no markdown, no explanation.
2. Each step must be one of:
   - { "type": "click", "selector": "CSS_SELECTOR" }
   - { "type": "fill", "selector": "CSS_SELECTOR", "value": "TEXT" }
   - { "type": "wait", "ms": NUMBER }
   - { "type": "scroll", "selector": "CSS_SELECTOR", "x": NUMBER, "y": NUMBER }
   - { "type": "keyboard", "key": "KEY_NAME" }
   - { "type": "hover", "selector": "CSS_SELECTOR" }
   - { "type": "select", "selector": "CSS_SELECTOR", "value": "OPTION_VALUE" }
   - { "type": "assert", "selector": "CSS_SELECTOR", "expected": "TEXT" }
3. Use specific, stable CSS selectors (prefer id, data-testid, aria-label over class names).
4. Add wait steps (300-500ms) after clicks that trigger navigation or async operations.
5. Generate 3-10 steps maximum.

Return only the JSON array.`;
```

---

## Step 7 — 构建与测试验证

```bash
npm run build
npm run test
```

---

## Acceptance Criteria

### R3: 录制体验优化
1. **暂停/恢复**：录制中可点击暂停按钮，暂停时操作不被录制；恢复后继续捕获；指示器从红色变为黄色
2. **插入步骤**：录制结束后 StepsEditor 每行有插入图标，点击后在当前行之后插入空白 step
3. **向后兼容**：已有录制流程（开始 → 操作 → 停止 → 保存）完全不变
4. **状态指示**：录制状态区同时显示步数和暂停/录制状态，颜色双重编码

### R4: AI 生成改进
5. **新 step 类型**：AI 生成可产出 scroll/keyboard/hover/select/assert 新类型（prompt 升级）
6. **模型选择 UI**：AI 输入区域旁有模型下拉，当前显示 `claude-haiku-4-5-20251001`
7. **精炼模式**：选中 step 后按钮变为"精炼选中"，输入指令后修改选中的 step（不修改其他 step）
8. **错误重试**：生成/精炼失败时显示错误文本 + 重试按钮
9. **向后兼容**：无选中 step 时按钮保持"AI 生成"，全量生成模式正常

### 通用
10. **构建通过**：`npm run build` 无错误
11. **i18n 完整**：所有新增 UI 控件有对应中/英/日翻译键

---

## Files Changed

| File | Action |
|------|--------|
| `src/i18n.js` | 新增 10 个翻译键 |
| `public/inspector-inject.js` | 新增 recordingPaused 变量 + pause/resume handler + 暂停守卫 |
| `src/App.jsx` | 新增 isPaused 状态 + handlePauseRecording/handleResumeRecording + props 传递 |
| `src/components/VisualEditor/ScenarioPanel.jsx` | StepsEditor 新增复选框/插入按钮；ScenarioForm 新增 model/精炼/错误重试；ScenarioPanel 暂停/恢复 UI |
| `src/components/VisualEditor/PagePreview.jsx` | isPaused prop + pause-resume 消息转发 useEffect |
| `server.js` | AI prompt 升级 8 种类型 + 可配置模型 + refine 模式 |

---

## Out of Scope

- 录制过程中实时插入步骤（复杂度高，延至 M2）
- 多模型切换的实际后端逻辑（当前只有 haiku 可用，UI 保留选择器即可）
- AI 精炼结果预览确认框（用户已选择直接替换方案）
- Step 分组折叠 — 阶段 29 延期至 M2
