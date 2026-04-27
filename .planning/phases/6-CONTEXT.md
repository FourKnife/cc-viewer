# Phase 6 Context: 端到端测试 + 优化

## 决策摘要

| 决策点 | 决定 | 原因 |
|--------|------|------|
| 测试方式 | 手动端到端流程测试 | MVP 阶段优先验证核心流程 |
| 优化重点 | 错误处理 + UI 交互体验 | 用户最可感知的质量提升 |
| 文档范围 | README 基础使用说明 | 快速上手指南 |

---

## 测试清单

### 核心流程
1. 启动 cc-viewer → 切换到 Visual Editor 模式
2. 在 ProjectLauncher 中启动本地 React 项目
3. 页面在 iframe 中加载（通过代理）
4. 开启 inspector → 悬停高亮 → 点击选中
5. 左侧面板显示元素信息 + 源码位置
6. 输入修改意图 → 发送到 Claude Code
7. Claude 修改代码 → HMR 热更新 → iframe 刷新

### 边界场景
- 项目启动失败（端口占用、命令错误）
- 代理加载失败（目标服务未就绪）
- inspector 注入失败（CSP 限制）
- sourceInfo 不可用（非 React 项目）
- PTY 未连接（Claude Code 未启动）
- 大页面性能（DOM 元素很多）

---

## 依赖

- Phase 1-5 全部完成
