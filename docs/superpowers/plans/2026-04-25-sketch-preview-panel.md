# Sketch 预览图并排面板实施计划

> **For agentic workers:** Handle each task in order. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 在可视化编辑器的 UI 渲染视图中，新增一个可切换的 Sketch 截图预览面板，与 iframe 并排显示，支持自动轮询刷新和缩放适配。

**Architecture:** PagePreview.jsx 内新增面板状态和轮询逻辑，不涉及后端改动。利用现有 `/api/sketch-screenshot` 接口（已返回 `{image, width, height, name}`）。缩放因子 = iframe容器宽度 / 750。

**Tech Stack:** React (hooks), CSS Modules, Ant Design icons, Sketch MCP API

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/components/VisualEditor/PagePreview.jsx` | 修改 | 新增按钮、面板、轮询逻辑 |
| `src/components/VisualEditor/styles.module.css` | 修改 | 预览面板相关样式 |
| `src/i18n.js` | 修改 | 新增 2 个翻译键 |

---

## Chunk 1: 样式与国际化

### Task 1: 添加 i18n 翻译键

**File:** `src/i18n.js` — 在 `visual.compareSketch` (line 7451) 之前插入新键

- [ ] **插入 visual.sketchPreview 和 visual.sketchPreviewEmpty**

在 `src/i18n.js` line 7443 (`},` 结束 `visual.emptyGuide`) 和 line 7444 (`"visual.screenshot"`) 之间，或直接在 `visual.screenshot` 之前插入：

```js
  "visual.sketchPreview": {
    "zh": "Sketch 预览",
    "en": "Sketch Preview",
    "ja": "Sketchプレビュー"
  },
  "visual.sketchPreviewEmpty": {
    "zh": "等待选中图层...",
    "en": "Waiting for layer selection...",
    "ja": "レイヤー選択を待機中..."
  },
```

### Task 2: 添加 CSS 样式

**File:** `src/components/VisualEditor/styles.module.css` — 在 `.iframeArea` (line 155) 附近或文件末尾新增

- [ ] **插入预览面板样式**

在 `styles.module.css` 末尾新增以下样式：

```css
/* ─── Sketch Preview Panel ─── */
.previewRow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 0 12px;
}
.sketchPreviewPanel {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  overflow: hidden;
}
.sketchPreviewImg {
  display: block;
  border-radius: 4px;
  border: 1px solid var(--border-primary);
  background: #fff;
  object-fit: contain;
}
.sketchPreviewLabel {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sketchPreviewSize {
  font-size: 10px;
  color: var(--text-tertiary);
  text-align: center;
}
.sketchPreviewEmpty {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 20px;
}
.urlSketchActive {
  color: var(--color-primary-light) !important;
}
```

---

## Chunk 2: PagePreview 逻辑

### Task 3: 新增 state、ref、effects

**File:** `src/components/VisualEditor/PagePreview.jsx` — 修改组件内部逻辑（hooks 区域）

- [ ] **新增 imports（如需要）**

`SketchSvgIcon` 已经存在 import（用于 struct compare 按钮）。确认没有额外 import 需求。

- [ ] **新增 state 和 ref**

在 `PagePreview` 函数内，现有 hooks 后面（约 line 157-162 区域）添加：

```js
const [sketchPreviewVisible, setSketchPreviewVisible] = useState(false);
const [sketchPreviewData, setSketchPreviewData] = useState(null);
const frameRef = useRef(null);
const [frameWidth, setFrameWidth] = useState(430);
```

- [ ] **新增 ResizeObserver effect**

在 handleNavigate 附近（约 after line 208）添加：

```js
// 检测 mobileFrame 实际宽度，用于 Sketch 缩放
useEffect(() => {
  const el = frameRef.current;
  if (!el) return;
  const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
      setFrameWidth(entry.contentRect.width);
    }
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);
```

- [ ] **新增 Sketch 轮询 effect**

在现有 message listener effect（约 line 273 附近）之后添加：

```js
// Sketch 预览自动轮询
useEffect(() => {
  if (!sketchPreviewVisible) return;
  const fetchSketch = async () => {
    try {
      const res = await fetch(apiUrl('/api/sketch-screenshot')).then(r => r.json());
      if (!res.error && res.image) {
        setSketchPreviewData({ image: res.image, width: res.width, height: res.height, name: res.name });
      }
    } catch (err) {
      console.warn('Sketch preview poll failed:', err);
    }
  };
  fetchSketch();
  const timer = setInterval(fetchSketch, 2000);
  return () => clearInterval(timer);
}, [sketchPreviewVisible]);
```

- [ ] **将 `mobileFrame` 的 ref 从 `div` 改为 `frameRef` 绑定**

在 JSX 中要将原本只是 className 的 mobileFrame div 加上 `ref={frameRef}`。

### Task 4: 新增按钮和预览面板 JSX

**File:** `src/components/VisualEditor/PagePreview.jsx` — 修改 return 中的 JSX

- [ ] **URL 栏新增 Sketch 预览按钮**

在 CameraOutlined 截图按钮（关闭标签 `</Tooltip>` 之后，约 line 406）和 struct compare 按钮（`autoComparing ?` 之前）之间插入：

```jsx
        <Tooltip title={t('visual.sketchPreview')}>
          <SketchSvgIcon
            className={`${styles.urlRefresh} ${sketchPreviewVisible ? styles.urlSketchActive : ''}`}
            onClick={() => setSketchPreviewVisible(v => !v)}
          />
        </Tooltip>
```

- [ ] **修改 iframeArea 为弹性行布局**

将现有的 iframeArea 内容从：
```jsx
      <div className={styles.iframeArea}>
        <div className={styles.mobileFrame}>
          {iframeSrc && (
            <iframe ... />
          )}
        </div>
      </div>
```
改为：
```jsx
      <div className={styles.iframeArea}>
        <div className={styles.previewRow}>
          <div className={styles.mobileFrame} ref={frameRef}>
            {iframeSrc && (
              <iframe ... />
            )}
          </div>
          {sketchPreviewVisible && (
            <div className={styles.sketchPreviewPanel} style={{ width: frameWidth }}>
              {sketchPreviewData ? (
                <>
                  <img
                    src={sketchPreviewData.image}
                    className={styles.sketchPreviewImg}
                    alt="Sketch"
                    style={{
                      width: '100%',
                      height: 'auto',
                    }}
                  />
                  <div className={styles.sketchPreviewLabel}>{sketchPreviewData.name}</div>
                  <div className={styles.sketchPreviewSize}>
                    {sketchPreviewData.width} × {sketchPreviewData.height} px
                    （缩放 {((frameWidth / 750) * 100).toFixed(0)}%）
                  </div>
                </>
              ) : (
                <div className={styles.sketchPreviewEmpty}>{t('visual.sketchPreviewEmpty')}</div>
              )}
            </div>
          )}
        </div>
      </div>
```

### Task 5: Build 验证

- [ ] **运行构建**

```bash
npm run build
```

Expected: Build 成功，无错误

- [ ] **手动检查**

启动 dev server 后：
1. 进入可视化编辑模式
2. 确认 URL 工具栏出现 Sketch 图标按钮
3. 点击按钮，右侧出现预览面板
4. 在 Sketch 中选中图层，确认面板自动更新
5. 再次点击按钮，面板关闭
6. 窗口缩放时，缩放比例正确更新

---

## 风险与注意事项

| 风险 | 缓解措施 |
|------|---------|
| Sketch MCP 未启动时按钮无反应 | 按钮无状态限制，点击后面板显示"等待选中图层" |
| 2s 轮询过于频繁 | 可在后续调整为 3s，当前 2s 对本地 MCP 无压力 |
| mobileFrame 宽度变化导致缩放闪烁 | ResizeObserver 在下一帧更新，用户体验平滑 |
| 预览面板高度超出 iframe 区域 | 使用 `overflow: hidden` 和 `object-fit: contain` 控制 |
