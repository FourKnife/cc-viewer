# Sketch 预览图并排面板设计

> 在可视化编辑器的 UI 渲染视图中，新增一个可选开的 Sketch 截图预览面板，并与 iframe 并排显示，方便对比代码实现效果与 Sketch 设计稿。

## 背景

- Sketch 设计稿的标准宽度为 750px
- 可视化编辑器中 iframe 的容器 (`.mobileFrame`) 固定宽度为 430px（可随窗口 resize 变化）
- 已有 `/api/sketch-screenshot` 接口，返回选中图层的 base64 图片及设计尺寸 `width/height`
- 已有 `SketchSvgIcon` 组件可用

## 设计方案

### 触发方式

在 URL 工具栏的截图按钮 (`CameraOutlined`) 右侧新增一个 Sketch 图标按钮，点击切换 Sketch 预览面板的打开/关闭。按钮在激活状态下高亮显示。

### 布局

- **关闭时**：保持现有布局不变，iframe 居中
- **打开时**：`.iframeArea` 内使用 flex 布局，左侧为 `mobileFrame`，右侧为 Sketch 预览面板
- 预览面板宽度与 `mobileFrame` 宽度保持一致（视觉对称）
- 两面板之间使用 `gap: 16px` 分隔

### 缩放计算

```
scaleFactor = mobileFrame_actual_width / 750
displayWidth = sketchLayer_width × scaleFactor
displayHeight = sketchLayer_height × scaleFactor
```

- `mobileFrame` 的实际渲染宽度通过 `ResizeObserver` 实时监测
- 缩放因子动态跟随 iframe 容器宽度变化

### 自动刷新

- 面板打开时，启动 2s 间隔轮询 `/api/sketch-screenshot`
- 面板关闭时清理定时器
- 面板打开时立即执行一次初始抓取

### 状态处理

| 场景 | 处理 |
|------|------|
| Sketch MCP 未连接 | 按钮置灰，tooltip 提示 |
| Sketch 中未选中图层 | 面板显示"等待选中图层" |
| 轮询出错 | console.warn 日志，保留上次有效图片 |
| 窗口 resize | ResizeObserver 自动更新缩放比例 |

## 文件变更

| 文件 | 改动 | 行数估算 |
|------|------|---------|
| `PagePreview.jsx` | 新增 state/ref/effect，URL 栏按钮，条件渲染预览面板 | ~60 行 |
| `styles.module.css` | 预览面板容器、图片、标签等样式 | ~40 行 |
| `src/i18n.js` | 新增 `visual.sketchPreview`、`visual.sketchPreviewEmpty` 翻译 | ~L10 |

## 不变的部分

- `App.jsx`：无需改动
- `ElementInfo.jsx`：无需改动
- `StatusBar.jsx`：无需改动
- `ScreenshotCompare.jsx`：无需改动
- 服务端 `server.js`：无需改动（现有 `/api/sketch-screenshot` 已满足需求）
