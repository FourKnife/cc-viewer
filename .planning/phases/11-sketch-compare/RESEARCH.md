# Phase 11 Research: Sketch 设计稿对比 + 自动调整

## 目标

选中元素后与 Sketch 设计稿对比，自动向右侧 CC 终端发命令调整代码。

## 现有基础设施

### Sketch MCP 集成
- **心跳检测**: AppBase.jsx L216-241，每15s HEAD `/http://localhost:31126/mcp`
- **状态**: `this.state.sketchMcpStatus: 'connected' | 'disconnected'`
- **选中图层**: `/api/sketch-selection` → `{ layerName: string | null }`
- **图层截图**: `/api/sketch-screenshot` → `{ name, image: base64, width, height }`

### 截图能力
- **html2canvas**: PagePreview.jsx L106-107, scale:2, useCORS, allowTaint
- **全页截图**: `handleScreenshot` (L102-112) 和 `handleCompareSketch` (L114-130) 已验证
- **上传**: POST `/api/upload` FormData 方式

### 终端命令发送
- **事件机制**: `ccv-terminal-send` CustomEvent, detail: { text }
- **监听**: TerminalPanel L142 `window.addEventListener('ccv-terminal-send')`
- **Bracketed Paste**: `\x1b[200~...\x1b[201~` 包裹多行文本

### 元素选中数据
- **数据来源**: inspector-inject.js → postMessage → PagePreview → App.jsx state
- **数据结构**: `{ tag, className, id, rect: {x,y,width,height}, selector, text, computedStyle, sourceInfo: {componentName, fileName, lineNumber} }`

## 需要新增的能力

| 能力 | 说明 |
|------|------|
| 元素级截图裁剪 | html2canvas 全页截图 → Canvas 裁剪到 selectedElement.rect |
| 一键对比按钮 | 改造 DiffOutlined 为 handleAutoCompare，含 loading/disabled 状态 |
| Prompt 构建 | 组合 selectedElement + Sketch 截图信息 + 元素截图 构建调整命令 |
| 禁用状态 | 根据 sketchMcpStatus + selectedElement 控制按钮 |

## 改动范围

| 文件 | 改动 |
|------|------|
| `src/i18n.js` | 新增 4 条 visual.autoCompare.* 条目 |
| `src/App.jsx` | PagePreview 新增 2 个 props |
| `src/components/VisualEditor/PagePreview.jsx` | handleAutoCompare + 按钮改造 |
| `src/components/VisualEditor/styles.module.css` | .urlBtnDisabled 样式 |

## 设计决策

1. **不使用 pixelmatch**: 让 CC 自行判断差异，更灵活且无需同尺寸图片
2. **图片上传而非内嵌**: base64 太长，上传后用文件路径引用
3. **不修改 ScreenshotCompare**: 保留现有对比弹窗功能，新增独立的自动流程
4. **按钮复用 DiffOutlined**: 改造现有对比按钮为自动对比入口
