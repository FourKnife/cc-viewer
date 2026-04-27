---
phase: 11
plan: A
title: "Sketch 设计稿自动对比 + 命令发送"
description: "实现一键对比选中元素与 Sketch 设计稿，检测差异后自动构建调整命令并发送到 CC 终端"
estimated_effort: medium
dependencies: []
files_to_read:
  - cc-viewer/src/components/VisualEditor/PagePreview.jsx
  - cc-viewer/src/components/VisualEditor/ScreenshotCompare.jsx
  - cc-viewer/src/App.jsx
  - cc-viewer/src/i18n.js
  - cc-viewer/src/components/VisualEditor/styles.module.css
  - cc-viewer/src/components/VisualEditor/StatusBar.jsx
  - cc-viewer/server.js
files_to_modify:
  - cc-viewer/src/i18n.js
  - cc-viewer/src/App.jsx
  - cc-viewer/src/components/VisualEditor/PagePreview.jsx
  - cc-viewer/src/components/VisualEditor/styles.module.css
---

# Plan A: Sketch 设计稿自动对比 + 命令发送

## 目标

在可视化编辑模式中，选中页面元素后点击对比按钮，自动：
1. 裁剪 iframe 中选中元素区域的截图
2. 获取 Sketch 当前选中图层的截图
3. **使用 pixelmatch 检测差异，仅在差异超过阈值时继续**
4. 上传两张截图到服务器
5. 构建包含元素信息和截图路径的调整 Prompt
6. 通过 ccv-terminal-send 事件发送到右侧 CC 终端

## 设计决策

### 为何不修改 StatusBar.jsx

路线图中将 StatusBar 列为"对比入口"，但实际评估后决定将入口放在 PagePreview 工具栏的 DiffOutlined 按钮上，原因：
- 工具栏已有 CameraOutlined（截图）和 DiffOutlined（对比）按钮，用户心智模型一致
- StatusBar 空间有限（仅一行高度），不适合放操作按钮
- DiffOutlined 按钮目前绑定 handleCompareSketch（弹窗对比），改造为 handleAutoCompare（自动对比+发命令）更合理
- 保留 CameraOutlined 按钮用于手动截图和弹窗对比，两个入口功能互补

### API 契约说明

`/api/sketch-screenshot` 返回格式（server.js L1102-1163）：
- 成功: `{ name: string, image: "image/png;base64,...", width: number, height: number }`
- 失败: `{ error: "no_selection" | "parse_error" | "mcp_unavailable" }`

`sketchRes.image` 是 dataURL 格式，可直接用于 Canvas 绘制和 `fetch().blob()` 上传。

## 任务清单

### Task 1: 添加 i18n 条目

**文件**: `cc-viewer/src/i18n.js`

在 `visual.compare.retryAiAnalysis` 条目之后，添加以下 6 条新条目：

```javascript
"visual.autoCompare": {
  zh: "对比设计稿并自动调整",
  en: "Compare with design & auto-adjust"
},
"visual.autoCompare.running": {
  zh: "正在对比...",
  en: "Comparing..."
},
"visual.autoCompare.needSelection": {
  zh: "请先选中一个页面元素",
  en: "Select an element first"
},
"visual.autoCompare.needSketch": {
  zh: "Sketch MCP 未连接",
  en: "Sketch MCP not connected"
},
"visual.autoCompare.noDiff": {
  zh: "未检测到明显差异",
  en: "No significant differences detected"
},
"visual.autoCompare.sent": {
  zh: "已发送调整命令到终端",
  en: "Adjustment command sent to terminal"
},
```

### Task 2: 添加 CSS 样式

**文件**: `cc-viewer/src/components/VisualEditor/styles.module.css`

在现有 `.urlInspectActive` 样式块之后添加：

```css
.urlBtnDisabled {
  color: var(--text-disabled) !important;
  cursor: not-allowed !important;
  opacity: 0.5;
}
.urlBtnDisabled:hover {
  color: var(--text-disabled) !important;
}
```

### Task 3: App.jsx 传递新 Props

**文件**: `cc-viewer/src/App.jsx`

在 visual mode 区域（约 L465）的 `<PagePreview>` 组件上新增 2 个 props：

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

### Task 4: PagePreview 核心改造 — handleAutoCompare

**文件**: `cc-viewer/src/components/VisualEditor/PagePreview.jsx`

#### 4.1 更新 import 和 Props 签名

添加 `LoadingOutlined` 和 `message` 到 import：

```javascript
import { ReloadOutlined, LinkOutlined, ArrowRightOutlined, AimOutlined, PlayCircleOutlined, CameraOutlined, DiffOutlined, LoadingOutlined } from '@ant-design/icons';
import { Input, Typography, Tooltip, message } from 'antd';
```

更新 Props：

```jsx
export default function PagePreview({
  port, onElementHover, onElementSelect, onElementDeselect,
  selectedElement,     // 新增：当前选中的元素信息
  sketchMcpStatus      // 新增：Sketch MCP 连接状态
}) {
```

#### 4.2 新增 state

```javascript
const [autoComparing, setAutoComparing] = useState(false);
```

#### 4.3 实现 pixelmatch 差异检测辅助函数

复用 ScreenshotCompare 中的 pixelmatch 方案。辅助函数在 handleAutoCompare 内部定义：

```javascript
// 将 dataURL/Image 绘制到指定尺寸的 canvas 并返回 ImageData
function getImageData(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
```

#### 4.4 实现 handleAutoCompare 函数

在 `handleCompareSketch` 之后新增，核心流程：

```javascript
const handleAutoCompare = useCallback(async () => {
  if (!selectedElement?.rect || sketchMcpStatus !== 'connected') return;
  const frame = iframeRef.current;
  if (!frame?.contentDocument?.documentElement) return;

  setAutoComparing(true);
  try {
    // Step 1: 并行获取 iframe 全页截图 + Sketch 截图
    const [html2canvas, pixelmatch, sketchRes] = await Promise.all([
      import('html2canvas').then(m => m.default),
      import('pixelmatch').then(m => m.default),
      fetch(apiUrl('/api/sketch-screenshot')).then(r => r.json()),
    ]);

    if (sketchRes.error) {
      console.warn('Sketch screenshot error:', sketchRes.error);
      message.warning(t(`visual.compare.error.${sketchRes.error}`));
      return;
    }

    // Step 2: 全页截图
    const fullCanvas = await html2canvas(frame.contentDocument.documentElement, {
      useCORS: true, scale: 2, allowTaint: true,
      width: frame.clientWidth, height: frame.clientHeight,
    });

    // Step 3: 裁剪到选中元素区域
    const rect = selectedElement.rect;
    const scale = 2;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.round(rect.width * scale);
    cropCanvas.height = Math.round(rect.height * scale);
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(
      fullCanvas,
      Math.round(rect.x * scale), Math.round(rect.y * scale),
      Math.round(rect.width * scale), Math.round(rect.height * scale),
      0, 0,
      Math.round(rect.width * scale), Math.round(rect.height * scale)
    );
    const elementImage = cropCanvas.toDataURL('image/png');

    // Step 4: pixelmatch 差异检测
    // 将两张图片统一到相同尺寸进行对比
    const compareW = Math.max(cropCanvas.width, 100);
    const compareH = Math.max(cropCanvas.height, 100);

    const loadImg = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    const [elementImg, sketchImg] = await Promise.all([
      loadImg(elementImage),
      loadImg(sketchRes.image),
    ]);

    const getImageData = (img, w, h) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      return ctx.getImageData(0, 0, w, h);
    };

    const imgData1 = getImageData(elementImg, compareW, compareH);
    const imgData2 = getImageData(sketchImg, compareW, compareH);
    const diffPixels = pixelmatch(
      imgData1.data, imgData2.data, null,
      compareW, compareH,
      { threshold: 0.3 }
    );
    const diffPercent = (diffPixels / (compareW * compareH)) * 100;

    // Step 5: 差异阈值判断 — 低于 3% 视为无显著差异
    if (diffPercent < 3) {
      message.success(t('visual.autoCompare.noDiff'));
      return;
    }

    // Step 6: 上传两张图片
    const uploadImage = async (dataUrl, name) => {
      const blob = await fetch(dataUrl).then(r => r.blob());
      const fd = new FormData();
      fd.append('file', blob, name);
      const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body: fd });
      const json = await res.json();
      return json.path || json.url;
    };

    const [elementPath, sketchPath] = await Promise.all([
      uploadImage(elementImage, 'element-screenshot.png'),
      uploadImage(sketchRes.image, 'sketch-screenshot.png'),
    ]);

    // Step 7: 构建 Prompt
    const el = selectedElement;
    const parts = [];
    parts.push(`请对比以下两张截图，调整代码使页面元素与设计稿一致：`);
    parts.push(``);
    parts.push(`元素信息：<${el.tag}>${el.className ? ' class="' + el.className + '"' : ''}${el.id ? ' id="' + el.id + '"' : ''}`);
    if (el.sourceInfo?.fileName) {
      parts.push(`源码位置：${el.sourceInfo.fileName}:${el.sourceInfo.lineNumber}`);
    }
    parts.push(`差异程度：${diffPercent.toFixed(1)}%`);
    parts.push(``);
    parts.push(`当前页面元素截图：${elementPath}`);
    parts.push(`Sketch 设计稿截图：${sketchPath}`);
    parts.push(``);
    parts.push(`请分析两张图片的视觉差异（尺寸、间距、颜色、字体等），修改源码使页面元素匹配设计稿。`);

    const prompt = parts.join('\n');

    // Step 8: 发送到终端
    window.dispatchEvent(new CustomEvent('ccv-terminal-send', { detail: { text: prompt } }));
    message.success(t('visual.autoCompare.sent'));

  } catch (err) {
    console.warn('Auto compare failed:', err);
  } finally {
    setAutoComparing(false);
  }
}, [selectedElement, sketchMcpStatus]);
```

#### 4.5 替换 DiffOutlined 按钮

将现有 DiffOutlined 按钮（约 L167-169）替换为带状态管理的版本。

计算禁用状态：
```javascript
const autoCompareDisabled = !selectedElement || sketchMcpStatus !== 'connected';
```

替换 JSX：
```jsx
{autoComparing ? (
  <LoadingOutlined className={styles.urlRefresh} spin />
) : (
  <Tooltip title={
    !selectedElement ? t('visual.autoCompare.needSelection') :
    sketchMcpStatus !== 'connected' ? t('visual.autoCompare.needSketch') :
    t('visual.autoCompare')
  }>
    <DiffOutlined
      className={`${styles.urlRefresh} ${autoCompareDisabled ? styles.urlBtnDisabled : ''}`}
      onClick={autoCompareDisabled ? undefined : handleAutoCompare}
    />
  </Tooltip>
)}
```

### Task 5: 保留原截图对比入口

现有的 `handleCompareSketch` 函数和 `ScreenshotCompare` 弹窗保持不变但不再绑定到 UI 按钮。
- CameraOutlined 按钮继续使用 `handleScreenshot`（全页截图 + 弹窗对比）
- DiffOutlined 按钮改为新的 `handleAutoCompare`（元素级对比 + 差异检测 + 终端命令）
- `handleCompareSketch` 代码保留以备将来使用，不删除

## 验证标准

### 功能验证
- [ ] 未选中元素时，DiffOutlined 按钮显示为禁用态，Tooltip 提示"请先选中一个页面元素"
- [ ] Sketch MCP 未连接时，按钮禁用，Tooltip 提示"Sketch MCP 未连接"
- [ ] 选中元素 + Sketch 已连接时，点击按钮触发自动对比流程
- [ ] 对比过程中显示 LoadingOutlined 旋转图标
- [ ] CameraOutlined 按钮仍然可用（全页截图功能不受影响）

### 差异检测验证
- [ ] pixelmatch 正确加载并执行差异计算
- [ ] 两张图片被统一缩放到相同尺寸后比较
- [ ] 差异 < 3% 时显示"未检测到明显差异"，不发送命令
- [ ] 差异 >= 3% 时继续上传截图并构建 Prompt

### 截图裁剪验证
- [ ] html2canvas 全页截图成功
- [ ] Canvas 裁剪使用 selectedElement.rect 坐标和 scale=2 缩放
- [ ] 裁剪后的图片仅包含选中元素区域

### 上传与命令验证
- [ ] 两张截图通过 /api/upload 成功上传，返回文件路径
- [ ] 构建的 Prompt 包含：元素信息、源码位置、差异百分比、两张截图路径
- [ ] Prompt 通过 ccv-terminal-send 事件成功发送到右侧终端
- [ ] 终端能正确接收并显示多行 Prompt（bracketed paste）

### 边界情况
- [ ] Sketch 无选中图层时（sketch-screenshot 返回 error），显示对应错误提示，不崩溃
- [ ] 截图上传失败时 catch 错误，不阻塞 UI
- [ ] 连续快速点击不会重复触发（autoComparing 状态锁）
- [ ] selectedElement.rect 值为 0 或异常小时不崩溃

### 构建验证
- [ ] `npm run build` 成功，无编译错误
