# Phase 12 Context: 结构化设计稿对比

## 目标

将 Phase 11 的截图像素对比 (pixelmatch) 替换为 DOM vs Sketch JSON 结构化属性对比，实现精确的样式差异检测和自动修复命令生成。

## 用户诉求

> 现在与 sketch 对比是通过截图对比验证，这不是我想要的。我的原始诉求是想将 DOM 与 Sketch 的 JSON 进行结构化对比，这样能最大程度的还原。

## 参考方法论: ui-design-verification skill

skill 核心流程:
1. 通过 Sketch MCP `run_code` 提取图层属性 JSON（文字: fontSize/fontWeight/color/alignment, 形状: fills/borders/shadows, 布局: frame 位置尺寸）
2. 通过 Chrome/DOM 获取 computed styles
3. 构建属性级对比表（property → designValue vs codeValue → match/mismatch）
4. 自动修复 CSS 差异

### 关键 Sketch 属性提取模式

**文字图层:**
```javascript
{ fontSize, fontWeight, color (textColor), alignment, lineHeight, letterSpacing (kerning) }
```

**形状图层:**
```javascript
{ fills: [{ color, gradient, fillType, enabled }], borders: [{ color, thickness, enabled }], shadows: [{ color, x, y, blur, spread }], borderRadius }
```

**布局信息:**
```javascript
{ frame: { x, y, width, height } }
```

### 单位转换规则
- Sketch 750px 设计稿 → 375px 视口: fontSize / 2
- 颜色归一化: #ffffffff → #fff, rgba(255,255,255,1) → #fff
- Sketch fontWeight: 3→300, 4→400, 5→500, 6→600, 7→700
- fillType 检查: Gradient 时用 gradient.stops 而非 fill.color

## 现有基础设施

### inspector-inject.js 已有的 DOM 数据
```javascript
computedStyle: {
  display, position, fontSize, color, backgroundColor
}
```
**不足**: 缺少 fontWeight, fontFamily, lineHeight, padding, margin, borderRadius, border, textAlign, letterSpacing, boxShadow 等关键属性。

### 服务端 Sketch MCP 通道
- `/api/sketch-screenshot`: 通过 MCP `run_code` 导出图层 PNG (已有)
- MCP 端点: `http://127.0.0.1:31126/mcp`, method: `tools/call`, name: `run_code`
- 心跳检测: AppBase.jsx, 15s 间隔

### 终端命令发送
- `ccv-terminal-send` CustomEvent → TerminalPanel 监听
- Bracketed Paste 包裹多行文本

### 元素选中数据流
inspector-inject.js → postMessage → PagePreview → App.jsx state → selectedElement

## 改动范围评估

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `public/inspector-inject.js` | 扩展 | 丰富 computedStyle 属性集 |
| `server.js` | 新增 API | `/api/sketch-layer-styles` 提取图层 JSON |
| `src/components/VisualEditor/PagePreview.jsx` | 重写核心函数 | handleAutoCompare 改为结构化对比 |
| `src/i18n.js` | 新增条目 | 结构化对比相关文案 |
| `src/components/VisualEditor/styles.module.css` | 可能微调 | 差异提示样式 |

## 设计决策

1. **保留截图对比作为补充**: ScreenshotCompare 和 CameraOutlined 按钮不变，结构化对比是 DiffOutlined 的新行为
2. **不移除 pixelmatch 依赖**: ScreenshotCompare 弹窗仍使用它
3. **Sketch 图层属性提取在服务端**: 避免前端直接调 MCP，保持架构一致
4. **对比结果以文本表格形式发送**: Claude Code 终端最适合处理结构化文本，不需要 UI 展示对比表
