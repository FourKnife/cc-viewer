# Phase 11: Sketch 设计稿对比 + 自动调整命令

## 目标
选中页面元素后，通过工具栏按钮一键触发与 Sketch 设计稿的对比：自动截图选中元素区域、获取 Sketch 图层信息、构建包含完整上下文的 prompt，通过终端发送给 Claude Code，由 CC 自行判断差异并修改代码。

---

## Plan 11.1: 一键对比 Sketch 设计稿并自动发送调整命令

**目标**: 改造 DiffOutlined 按钮，实现选中元素 → 截图 → 获取 Sketch 信息 → 构建 prompt → 发送终端的完整自动化流程

### 任务

#### 11.1.1 添加 i18n 条目
**文件**: `cc-viewer/src/i18n.js`

在中文和英文 locale 的 `visual` 命名空间下新增：

```javascript
// 中文
'visual.autoCompare.noSketch': '请先连接 Sketch MCP',
'visual.autoCompare.noElement': '请先选中一个页面元素',
'visual.autoCompare.comparing': '正在对比...',
'visual.autoCompare.failed': '自动对比失败，请重试',

// English
'visual.autoCompare.noSketch': 'Please connect Sketch MCP first',
'visual.autoCompare.noElement': 'Please select a page element first',
'visual.autoCompare.comparing': 'Comparing...',
'visual.autoCompare.failed': 'Auto compare failed, please retry',
```

#### 11.1.2 传递 props — App.jsx 向 PagePreview 传递 selectedElement 和 sketchMcpStatus
**文件**: `cc-viewer/src/App.jsx`

在 visual 模式布局中（约第 465 行），给 `<PagePreview>` 新增两个 props：

```jsx
<PagePreview
  port={this.state.projectStatus?.port}
  onElementHover={(el) => {}}
  onElementSelect={(el) => this.setState({ selectedElement: el })}
  onElementDeselect={() => this.setState({ selectedElement: null })}
  selectedElement={this.state.selectedElement}        // 新增
  sketchMcpStatus={this.state.sketchMcpStatus}        // 新增
/>
```

无其他改动。

#### 11.1.3 改造 DiffOutlined 按钮 UI 和状态
**文件**: `cc-viewer/src/components/VisualEditor/PagePreview.jsx`

1. **函数签名**新增 props：
   ```javascript
   export default function PagePreview({ port, onElementHover, onElementSelect, onElementDeselect, selectedElement, sketchMcpStatus })
   ```

2. **新增状态**：
   ```javascript
   const [isComparing, setIsComparing] = useState(false);
   ```

3. **新增 import**：
   ```javascript
   import { LoadingOutlined } from '@ant-design/icons';
   import { message } from 'antd';
   ```

4. **DiffOutlined 按钮改造**（约第 167-169 行）：

   替换现有的:
   ```jsx
   <Tooltip title={t('visual.compareSketch')}>
     <DiffOutlined className={styles.urlRefresh} onClick={handleCompareSketch} />
   </Tooltip>
   ```

   改为:
   ```jsx
   <Tooltip title={
     sketchMcpStatus !== 'connected' ? t('visual.autoCompare.noSketch') :
     !selectedElement ? t('visual.autoCompare.noElement') :
     isComparing ? t('visual.autoCompare.comparing') :
     t('visual.compareSketch')
   }>
     {isComparing ? (
       <LoadingOutlined className={styles.urlRefresh} style={{ cursor: 'default' }} />
     ) : (
       <DiffOutlined
         className={`${styles.urlRefresh} ${(!selectedElement || sketchMcpStatus !== 'connected') ? styles.urlBtnDisabled : ''}`}
         onClick={(!selectedElement || sketchMcpStatus !== 'connected' || isComparing) ? undefined : handleAutoCompare}
       />
     )}
   </Tooltip>
   ```

5. **新增 CSS 类** `urlBtnDisabled`（在 `cc-viewer/src/components/VisualEditor/styles.module.css`）:
   ```css
   .urlBtnDisabled {
     opacity: 0.3;
     cursor: not-allowed !important;
   }
   ```

6. **移除** `handleCompareSketch` 函数和 `screenshotData` 状态。
7. **移除** `ScreenshotCompare` import 及底部的 `<ScreenshotCompare>` 渲染。
8. **保留** `handleScreenshot` + CameraOutlined 按钮不变（全页截图仍可用，但不再弹出对比弹窗，仅保存截图数据）。

   > 注意：如果 CameraOutlined 仍依赖 `screenshotData`/`ScreenshotCompare` 弹窗，则保留该部分。仅移除 DiffOutlined 对 `handleCompareSketch` 的调用。经确认，CameraOutlined 使用 `handleScreenshot` 设置 `screenshotData`，而 `ScreenshotCompare` 在有 `screenshotData` 时渲染，所以 **保留** `screenshotData` 状态和 `ScreenshotCompare` 组件，仅将 DiffOutlined 的 onClick 改为 `handleAutoCompare`。

#### 11.1.4 实现 handleAutoCompare 核心逻辑
**文件**: `cc-viewer/src/components/VisualEditor/PagePreview.jsx`

新增 `handleAutoCompare` 函数（在 `handleCompareSketch` 之后或替代它）：

```javascript
const handleAutoCompare = useCallback(async () => {
  if (!selectedElement?.rect || sketchMcpStatus !== 'connected') return;
  setIsComparing(true);
  try {
    // Step 1: 获取 iframe 全页截图
    const html2canvas = (await import('html2canvas')).default;
    const frame = iframeRef.current;
    if (!frame?.contentDocument?.documentElement) throw new Error('iframe not ready');
    const scale = 2;
    const fullCanvas = await html2canvas(frame.contentDocument.documentElement, {
      useCORS: true, scale, allowTaint: true,
      width: frame.clientWidth, height: frame.clientHeight,
    });

    // Step 2: 裁剪到选中元素 bounding box
    const { x, y, width, height } = selectedElement.rect;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.round(width * scale);
    cropCanvas.height = Math.round(height * scale);
    const ctx = cropCanvas.getContext('2d');
    ctx.drawImage(fullCanvas,
      Math.round(x * scale), Math.round(y * scale),
      Math.round(width * scale), Math.round(height * scale),
      0, 0,
      Math.round(width * scale), Math.round(height * scale)
    );

    // Step 3: 上传截图获取临时文件路径
    const blob = await new Promise(resolve => cropCanvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], `element-compare-${Date.now()}.png`, { type: 'image/png' });
    const form = new FormData();
    form.append('file', file);
    const uploadRes = await fetch(apiUrl('/api/upload'), { method: 'POST', body: form });
    const uploadData = await uploadRes.json();
    if (!uploadData.ok) throw new Error(uploadData.error || 'Upload failed');
    const screenshotPath = uploadData.path;

    // Step 4: 获取 Sketch 选中图层信息
    const sketchRes = await fetch(apiUrl('/api/sketch-selection')).then(r => r.json());
    const layerName = sketchRes.layerName || '(未获取到图层名)';

    // Step 5: 构建 prompt
    const elParts = [`<${selectedElement.tag}>`];
    if (selectedElement.className) elParts.push(`.${selectedElement.className.split(' ').slice(0, 3).join('.')}`);
    if (selectedElement.id) elParts.push(`#${selectedElement.id}`);

    const lines = [
      '请对比以下页面元素与 Sketch 设计稿，找出视觉差异并修改代码使其匹配设计稿。',
      '',
      `页面元素: ${elParts.join(' ')}`,
    ];
    if (selectedElement.selector) lines.push(`CSS Selector: ${selectedElement.selector}`);
    if (selectedElement.sourceInfo?.fileName) {
      lines.push(`源码位置: ${selectedElement.sourceInfo.fileName}${selectedElement.sourceInfo.lineNumber ? ':' + selectedElement.sourceInfo.lineNumber : ''}`);
    }
    lines.push(`元素截图: ${screenshotPath}`);
    lines.push(`Sketch 当前选中图层: ${layerName}`);
    lines.push('');
    lines.push('请使用 Sketch MCP 工具获取设计稿的详细样式信息（颜色、字号、间距、圆角等），与元素截图对比后修改代码使页面与设计稿一致。');

    const prompt = lines.join('\n');

    // Step 6: 发送到终端（bracketed paste 包裹 + 回车提交）
    const wrapped = `\x1b[200~${prompt}\x1b[201~\r`;
    window.dispatchEvent(new CustomEvent('ccv-terminal-send', { detail: { text: wrapped } }));

  } catch (err) {
    console.warn('Auto compare failed:', err);
    message.error(t('visual.autoCompare.failed'));
  } finally {
    setIsComparing(false);
  }
}, [selectedElement, sketchMcpStatus]);
```

**关键设计决策**：
- 使用 `uploadFileAndGetPath` 的底层逻辑（FormData + fetch `/api/upload`）直接内联，避免循环依赖 import TerminalPanel
- Prompt 使用 bracketed paste (`\x1b[200~...\x1b[201~`) 包裹防止多行被逐行执行，与 UltraPlan 发送方式一致
- 末尾 `\r` 自动提交，实现无确认的一键式流程
- 包含 `sourceInfo` 中的源码文件路径，帮助 CC 快速定位需要修改的文件

#### 11.1.5 删除旧的 handleCompareSketch 函数
**文件**: `cc-viewer/src/components/VisualEditor/PagePreview.jsx`

移除第 114-130 行的 `handleCompareSketch` 函数。DiffOutlined 按钮现在由 `handleAutoCompare` 处理。

### 验收标准

- [ ] Sketch MCP 未连接时，DiffOutlined 按钮置灰（opacity 降低），hover tooltip 显示「请先连接 Sketch MCP」
- [ ] 无选中元素时，DiffOutlined 按钮置灰，hover tooltip 显示「请先选中一个页面元素」
- [ ] 选中元素 + Sketch MCP 已连接时，点击按钮触发自动对比流程
- [ ] 按钮点击后显示 LoadingOutlined 旋转图标，流程完成后恢复
- [ ] 截图正确裁剪到选中元素的 bounding box 区域
- [ ] 截图上传到 /tmp 并获得文件路径
- [ ] Sketch 选中图层名称正确获取并包含在 prompt 中
- [ ] Prompt 包含完整上下文：元素标签、CSS selector、源码位置（如有）、截图路径、Sketch 图层名
- [ ] Prompt 通过 `ccv-terminal-send` 事件成功发送到终端
- [ ] Prompt 使用 bracketed paste 包裹并自动提交（末尾 \r）
- [ ] 截图失败或 Sketch 获取失败时 toast 显示错误，不发送 prompt
- [ ] CameraOutlined 截图按钮 + ScreenshotCompare 弹窗功能不受影响
- [ ] `npm run build` 构建成功

---

## 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| html2canvas 在代理 iframe 中截图失败 | 无法获取元素截图 | 已有 handleScreenshot 验证此路径可行；catch 后 toast 提示 |
| 元素 rect 坐标与 html2canvas 输出偏移 | 裁剪区域不准 | rect 来自 getBoundingClientRect()，html2canvas 以 viewport 为基准，二者对齐；scale 参数统一为 2 |
| Sketch 无选中图层或 MCP 超时 | layerName 为空 | 兜底为「未获取到图层名」文案，CC 可自行通过 Sketch MCP 查询 |
| 大元素截图文件过大 | 上传慢或失败 | 使用 PNG 格式 + scale:2，实际文件通常 < 1MB；/api/upload 限制 100MB |
| 多行 prompt 终端显示混乱 | 命令执行异常 | bracketed paste 包裹，已有 UltraPlan 验证此模式可靠 |

## 执行顺序

1. **11.1.1** — 添加 i18n 条目（无依赖）
2. **11.1.2** — App.jsx 传递 props
3. **11.1.3** — 改造按钮 UI 和禁用状态
4. **11.1.4** — 实现 handleAutoCompare 核心逻辑
5. **11.1.5** — 清理旧 handleCompareSketch
6. `npm run build` 构建验证
