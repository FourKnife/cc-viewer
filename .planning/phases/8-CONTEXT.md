# Phase 8 Context: 截图对比 POC + UI 质量优化

## 决策摘要

| 决策点 | 决定 | 原因 |
|--------|------|------|
| 截图对比触发方式 | 通过 ChatView 指令触发 | 自然语言驱动，与现有交互一致 |
| 对比结果用途 | Agent 自动修正循环 | 用户期望 Agent 自行分析差异→改代码→再对比→直到一致 |
| 循环控制 | 全自动循环（设最大轮次） | 无需每轮人工确认，Agent 自主迭代 |
| iframe 截图方案 | Chrome MCP (chrome_screenshot) | 已有工具可用，直接调用 |
| Sketch 图层获取 | Sketch MCP 导出 | 自动化，无需手动上传 |
| 对比算法 | 像素级 diff | 简单快速，适合快速迭代 |
| POC 产出形式 | 直接集成到产品 | 不做独立脚本，直接可用 |
| UI 优化范围 | 全部组件（sidebar、preview、chat、全局框架） | 用户全选 |
| UI 优化标准 | Anti-AI Slop 严格标准 | 每个元素都要 "earn its place" |

---

## 截图对比功能设计

### 交互流程
1. 用户在 ChatView 中输入类似"对比设计稿"的指令
2. Agent 通过 Chrome MCP 截取当前 iframe 页面
3. Agent 通过 Sketch MCP 导出当前选中图层/画板为 PNG
4. 像素级 diff 计算差异
5. Agent 分析差异点，自动修改代码
6. 重新截图→对比→修改，循环直到差异足够小或达到最大轮次（建议 5 轮）
7. 过程中在 ChatView 展示每轮进度

### 技术要点
- Chrome MCP: `chrome_screenshot` 截取 iframe 对应的 tab/页面
- Sketch MCP: 导出选中图层为 PNG（需确认 Sketch MCP 支持的导出 API）
- 像素级 diff: 可用 pixelmatch 或类似轻量库
- 自动修正: Agent 根据 diff 结果 + 源码映射定位需修改的 CSS/组件

### Claude's Discretion
- 具体的 diff 阈值（多少像素差异算"一致"）
- 每轮修正的策略（优先改大差异还是逐区域修）
- 最大循环轮次的具体值

## UI 质量优化

### 范围
全部 Visual Editor 组件：
- Visual Sidebar（ProjectLauncher + ElementInfo）
- PagePreview 预览区
- ChatView 聊天区
- 全局框架（AppHeader + StatusBar + 布局间距）

### 标准: Anti-AI Slop
- 每个 UI 元素必须 "earn its place"
- 去除装饰性、通用化元素
- 优化视觉层次和信息密度
- 打磨间距、字体、颜色一致性
- 交互反馈明确、不含糊

### Claude's Discretion
- 具体哪些元素需要删除/简化
- 间距和颜色的具体数值调整
- 优化的优先级排序

## 关键文件

| 文件 | 作用 | Phase 8 变更 |
|------|------|-------------|
| `ChatView.jsx` | 对话视图 | 新增截图对比指令识别 |
| `App.jsx` | 主布局 | UI 打磨 |
| `AppBase.jsx` | 基础逻辑 | 截图对比流程集成 |
| `ElementInfo.jsx` | 元素信息 | UI 打磨 |
| `ProjectLauncher.jsx` | 项目启动 | UI 打磨 |
| `PagePreview.jsx` | 页面预览 | UI 打磨 |
| `StatusBar.jsx` | 状态栏 | UI 打磨 |
| `styles.module.css` | 样式 | 全面优化 |
| `App.module.css` | 布局样式 | 间距/层次优化 |

## 依赖

- Phase 7 完成（StatusBar 已集成、Tag 交互已实现）
- Chrome MCP server 可用（chrome_screenshot）
- Sketch MCP server 可用（图层导出）
- pixelmatch 或类似 diff 库

## Deferred Ideas

（本次讨论无延期项）
