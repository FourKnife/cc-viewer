# Phase 29: Step 编辑器全面增强 — PLAN

**Phase:** 29-step-editor-enhancement
**Status:** Ready for execution
**Planned:** 2026-04-28

---

## Goal

扩展 step 类型体系（scroll/keyboard/hover/select/assert），提供可视化元素选择器（iframe 点击选取），并增加复制步骤和拖拽排序功能。

---

## 当前状态

- 现有 step 类型：`click`、`wait`、`fill`（共 3 种）
- 执行逻辑在 `public/inspector-inject.js` 的 `run-step` handler
- StepsEditor 为简单列表，无复制/排序能力

---

## Step 1 — src/i18n.js：新增翻译键

在 `"visual.scenario.stepValue"` 条目（约第 8082 行）之后插入：

```js
  "visual.scenario.stepScroll": { "zh": "滚动", "en": "Scroll", "ja": "スクロール" },
  "visual.scenario.stepKeyboard": { "zh": "按键", "en": "Keyboard", "ja": "キー入力" },
  "visual.scenario.stepHover": { "zh": "悬停", "en": "Hover", "ja": "ホバー" },
  "visual.scenario.stepSelect": { "zh": "下拉选择", "en": "Select", "ja": "選択" },
  "visual.scenario.stepAssert": { "zh": "断言", "en": "Assert", "ja": "アサート" },
  "visual.scenario.stepX": { "zh": "X偏移", "en": "X offset", "ja": "X移動" },
  "visual.scenario.stepY": { "zh": "Y偏移", "en": "Y offset", "ja": "Y移動" },
  "visual.scenario.stepKey": { "zh": "按键名", "en": "Key name", "ja": "キー名" },
  "visual.scenario.stepExpected": { "zh": "预期文本", "en": "Expected text", "ja": "期待値" },
  "visual.scenario.stepCopy": { "zh": "复制", "en": "Copy", "ja": "コピー" },
  "visual.scenario.pickElement": { "zh": "选取元素", "en": "Pick element", "ja": "要素選択" },
```

---

## Step 2 — public/inspector-inject.js：5 种新 step 处理 + pick-element 模式

### 2a — 替换 `run-step` handler 中的 `} else {` 兜底（约第 285 行）

将：
```js
        } else {
          sendToParent('step-done', { stepIndex: stepIndex });
        }
```

替换为：
```js
        } else if (step.type === 'scroll') {
          var scrollTarget = step.selector ? document.querySelector(step.selector) : window;
          if (step.selector && !scrollTarget) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          scrollTarget.scrollBy(step.x || 0, step.y || 0);
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'hover') {
          var hoverEl2 = document.querySelector(step.selector);
          if (!hoverEl2) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          hoverEl2.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          hoverEl2.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'keyboard') {
          var keyTarget = step.selector ? document.querySelector(step.selector) : document.activeElement;
          ['keydown', 'keypress', 'keyup'].forEach(function(t) {
            var evt = new KeyboardEvent(t, { key: step.key || '', code: step.key || '', bubbles: true, cancelable: true });
            (keyTarget || document.body).dispatchEvent(evt);
          });
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'select') {
          var selectEl = document.querySelector(step.selector);
          if (!selectEl) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          selectEl.value = step.value || '';
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'assert') {
          var assertEl = document.querySelector(step.selector);
          if (!assertEl) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          var actual = assertEl.textContent.trim();
          var expected = step.expected || '';
          if (actual.includes(expected)) {
            sendToParent('step-done', { stepIndex: stepIndex });
          } else {
            sendToParent('step-error', { stepIndex: stepIndex, reason: 'assert failed: expected "' + expected + '" in "' + actual + '"' });
          }
        } else {
          sendToParent('step-done', { stepIndex: stepIndex });
        }
```

### 2b — 在 `run-step` 处理块之后（约第 292 行，`});` 之前）插入 pick-element 模式

```js
    if (e.data.type === 'start-pick-element') {
      var pickHandler = function(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var t = evt.target;
        if (t === hoverOverlay || t === selectOverlay) return;
        sendToParent('picked-element', { selector: generateSelector(t) });
        document.removeEventListener('click', pickHandler, true);
      };
      document.addEventListener('click', pickHandler, true);
    }
```

---

## Step 3 — src/components/VisualEditor/ScenarioPanel.jsx：StepsEditor 全面增强

### 3a — imports 添加新图标

在现有 icons import 行追加 `CopyOutlined, AimOutlined, HolderOutlined`：

```js
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, EditOutlined, MinusCircleOutlined, CameraOutlined, PushpinOutlined, PushpinFilled, CopyOutlined, AimOutlined, HolderOutlined } from '@ant-design/icons';
```

### 3b — 用新版 StepsEditor 完整替换原实现（第 43–79 行）

```jsx
function StepsEditor({ steps, onChange, onPickElement }) {
  const dragIndex = useRef(null);

  const addStep = () => onChange([...steps, { type: 'click', selector: '' }]);
  const removeStep = (i) => onChange(steps.filter((_, idx) => idx !== i));
  const copyStep = (i) => onChange([...steps.slice(0, i + 1), { ...steps[i] }, ...steps.slice(i + 1)]);
  const updateStep = (i, field, val) => {
    onChange(steps.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  const hasSelector = (type) => ['click', 'fill', 'hover', 'keyboard', 'select', 'assert'].includes(type);

  return (
    <div>
      {steps.map((s, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => { dragIndex.current = i; }}
          onDragOver={e => e.preventDefault()}
          onDrop={() => {
            const from = dragIndex.current;
            if (from === null || from === i) return;
            const next = [...steps];
            const [removed] = next.splice(from, 1);
            next.splice(i, 0, removed);
            dragIndex.current = null;
            onChange(next);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}
        >
          <HolderOutlined style={{ cursor: 'grab', color: 'var(--text-muted)', flexShrink: 0 }} />
          <select
            value={s.type}
            onChange={e => updateStep(i, 'type', e.target.value)}
            style={{ fontSize: 12, padding: '1px 4px', height: 24 }}
          >
            <option value="click">{t('visual.scenario.stepClick')}</option>
            <option value="wait">{t('visual.scenario.stepWait')}</option>
            <option value="fill">{t('visual.scenario.stepFill')}</option>
            <option value="scroll">{t('visual.scenario.stepScroll')}</option>
            <option value="keyboard">{t('visual.scenario.stepKeyboard')}</option>
            <option value="hover">{t('visual.scenario.stepHover')}</option>
            <option value="select">{t('visual.scenario.stepSelect')}</option>
            <option value="assert">{t('visual.scenario.stepAssert')}</option>
          </select>

          {/* selector 字段：click/fill/hover/keyboard/select/assert */}
          {hasSelector(s.type) && (
            <>
              <Input
                size="small"
                placeholder={t('visual.scenario.stepSelector')}
                value={s.selector || ''}
                onChange={e => updateStep(i, 'selector', e.target.value)}
                style={{ width: 130 }}
              />
              {onPickElement && (
                <AimOutlined
                  title={t('visual.scenario.pickElement')}
                  style={{ cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
                  onClick={() => onPickElement(selector => updateStep(i, 'selector', selector))}
                />
              )}
            </>
          )}

          {/* type-specific extra fields */}
          {s.type === 'wait' && (
            <Input size="small" type="number" placeholder={t('visual.scenario.stepMs')} value={s.ms || ''} onChange={e => updateStep(i, 'ms', Number(e.target.value))} style={{ width: 80 }} />
          )}
          {s.type === 'fill' && (
            <Input size="small" placeholder={t('visual.scenario.stepValue')} value={s.value || ''} onChange={e => updateStep(i, 'value', e.target.value)} style={{ width: 90 }} />
          )}
          {s.type === 'scroll' && (
            <>
              <Input size="small" type="number" placeholder={t('visual.scenario.stepX')} value={s.x || ''} onChange={e => updateStep(i, 'x', Number(e.target.value))} style={{ width: 60 }} />
              <Input size="small" type="number" placeholder={t('visual.scenario.stepY')} value={s.y || ''} onChange={e => updateStep(i, 'y', Number(e.target.value))} style={{ width: 60 }} />
            </>
          )}
          {s.type === 'keyboard' && (
            <Input size="small" placeholder={t('visual.scenario.stepKey')} value={s.key || ''} onChange={e => updateStep(i, 'key', e.target.value)} style={{ width: 90 }} />
          )}
          {s.type === 'select' && (
            <Input size="small" placeholder={t('visual.scenario.stepValue')} value={s.value || ''} onChange={e => updateStep(i, 'value', e.target.value)} style={{ width: 90 }} />
          )}
          {s.type === 'assert' && (
            <Input size="small" placeholder={t('visual.scenario.stepExpected')} value={s.expected || ''} onChange={e => updateStep(i, 'expected', e.target.value)} style={{ width: 110 }} />
          )}

          <CopyOutlined
            title={t('visual.scenario.stepCopy')}
            style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
            onClick={() => copyStep(i)}
          />
          <MinusCircleOutlined onClick={() => removeStep(i)} style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={addStep} type="dashed" style={{ marginTop: 4 }}>
        {t('visual.scenario.steps')}
      </Button>
    </div>
  );
}
```

### 3c — ScenarioForm 接受并转发 onPickElement prop（第 81 行）

```js
function ScenarioForm({ initial, onSave, onCancel, onPickElement }) {
```

在 `ScenarioForm` 内 `<StepsEditor>` 处（约第 151 行）添加 prop：

```jsx
<StepsEditor steps={steps} onChange={setSteps} onPickElement={onPickElement} />
```

### 3d — ScenarioPanel 接受 onPickElement prop（第 161 行）并向下传递

```js
export default function ScenarioPanel({ compact = false, onRunScenario, ..., onPickElement }) {
```

在组件内所有 `<ScenarioForm>` 调用处（showAdd、showRecordSave、editingId 三处）加上：

```jsx
onPickElement={onPickElement}
```

---

## Step 4 — src/App.jsx：pick element 状态与 handlers

### 4a — constructor state 新增（约第 46 行，现有状态对象中）

```js
      pickingElement: false,
```

### 4b — 新增两个 handler 方法（放在 handleStopRecording 之后）

```js
  handlePickElement = (callback) => {
    this._pickCallback = callback;
    this.setState({ pickingElement: true });
  };

  handlePickedElement = (selector) => {
    if (this._pickCallback) {
      this._pickCallback(selector);
      this._pickCallback = null;
    }
    this.setState({ pickingElement: false });
  };
```

### 4c — PagePreview props 新增两个（约第 684 行）

```jsx
pickingElement={this.state.pickingElement}
onPickedElement={this.handlePickedElement}
```

### 4d — BottomTabPanel 内 ScenarioPanel（约第 720 行）新增 prop

```jsx
onPickElement={this.handlePickElement}
```

### 4e — 全屏 ScenarioPanel（约第 746 行）新增 prop

```jsx
onPickElement={this.handlePickElement}
```

---

## Step 5 — src/components/VisualEditor/PagePreview.jsx：pick 模式支持

### 5a — 组件 props 新增（第 167 行）

```js
export default function PagePreview({ ..., pickingElement, onPickedElement }) {
```

### 5b — handleMessage switch 新增 case（第 341 行之后，`step-error` case 后）

```js
        case 'picked-element':
          onPickedElement?.(e.data.data.selector);
          break;
```

同时在 useEffect 依赖数组（第 361 行）追加 `onPickedElement`：

```js
  }, [onElementHover, onElementSelect, onElementDeselect, sendInspectorCmd, inspecting, captureElementScreenshot, sendNextStep, onPickedElement]);
```

### 5c — 新增 useEffect 监听 pickingElement 变化（放在「Sketch 预览自动轮询」useEffect 之前）

```js
  useEffect(() => {
    if (!pickingElement) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { source: 'cc-visual-parent', type: 'start-pick-element' }, '*'
    );
  }, [pickingElement]);
```

---

## Step 6 — 构建与测试验证

```bash
npm run build
npm run test
```

---

## Acceptance Criteria

1. **8 种 step 类型**：StepsEditor 下拉显示 click/wait/fill/scroll/keyboard/hover/select/assert
2. **字段正确**：每种类型显示对应输入字段（scroll 有 X/Y，keyboard 有 key，assert 有 expected 等）
3. **复制按钮**：每行 CopyOutlined 按钮点击后在下方插入该 step 的副本
4. **拖拽排序**：HolderOutlined 图标行可拖拽，松开后 steps 顺序更新
5. **选取元素**：AimOutlined 按钮点击 → 进入 pick 模式 → 点击 iframe 元素 → selector 自动填入
6. **5 种新类型执行正确**：scroll 滚动页面/元素，hover 触发 mouseover，keyboard 派发按键事件，select 设置 value，assert 校验文本
7. **构建通过**：`npm run build` 无错误

---

## Files Changed

| File | Action |
|------|--------|
| `src/i18n.js` | 新增 11 个翻译键 |
| `public/inspector-inject.js` | 新增 5 种 step 处理 + pick-element 模式 |
| `src/components/VisualEditor/ScenarioPanel.jsx` | StepsEditor 重写 + ScenarioForm/ScenarioPanel 转发 onPickElement |
| `src/App.jsx` | pickingElement 状态 + handlePickElement/handlePickedElement + props 传递 |
| `src/components/VisualEditor/PagePreview.jsx` | pick 模式 useEffect + picked-element message case |

---

## Out of Scope

- Step 分组折叠 — 复杂度高，延至 M2
- 录制时暂停/恢复 — Phase 30
- AI 生成新类型 step — Phase 30
