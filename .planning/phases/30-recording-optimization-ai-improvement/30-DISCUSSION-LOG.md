# Phase 30: 录制体验优化 + AI 生成改进 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 30-recording-optimization-ai-improvement
**Areas discussed:** 录制暂停/恢复 UI, 手动插入步骤的入口, AI step 精炼的交互方式

---

## 录制暂停/恢复 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 与停止并列 | 录制状态栏显示「⏸ 暂停」+「■ 停止」两个按钮，视觉分离 | ✓ |
| 暂停替换停止按钮 | 录制中「停止」变「暂停」，嵌套逻辑 | |

**User's choice:** 与停止并列

| Option | Description | Selected |
|--------|-------------|----------|
| 换色 + 文字提示 | 暂停时录制次卡换为黄色「⏸ 已暂停」 | ✓ |
| 动画异化 | 暂停时停止闪烁动画，其他不变 | |

**User's choice:** 换色 + 文字提示

---

## 手动插入步骤的入口

| Option | Description | Selected |
|--------|-------------|----------|
| 录制后在列表间插入 | StepsEditor 每行末尾增加插入图标 | ✓ |
| 录制过程中插入 | 录制中保持 StepsEditor 可用，复杂度高 | |

**User's choice:** 录制后在列表间插入

| Option | Description | Selected |
|--------|-------------|----------|
| 每行插入图标 | CopyOutlined 旁新增插入图标，点击在该行后插入 | ✓ |
| 悬入显示的分隔线 | 两行之间悬停显示 + 按钮，实现较复杂 | |

**User's choice:** 每行插入图标

---

## AI step 精炼的交互方式

| Option | Description | Selected |
|--------|-------------|----------|
| 逐行复选 | 每行 step 左侧添加 checkbox，选中后触发精炼 | ✓ |
| 点击选中 + 多选 | Ctrl/Cmd+点击多选，类文件选择交互 | |

**User's choice:** 逐行复选

| Option | Description | Selected |
|--------|-------------|----------|
| 与现有 AI 区域共享 | 选中 step(s) 后「AI 生成」变「精炼选中」 | ✓ |
| 选中后展开独立输入 | 选中后在列表上方显示独立精炼输入框 | |

**User's choice:** 与现有 AI 区域共享

| Option | Description | Selected |
|--------|-------------|----------|
| 直接替换 | 精炼结果直接替换选中 step(s)，无确认弹框 | ✓ |
| 预览后确认 | 先预览新 step(s)，用户确认后再替换 | |

**User's choice:** 直接替换

---

## Claude's Discretion

- AI 模型选择 UI 形式（下拉选择器，放在 AI 输入框旁）
- AI 生成错误重试（失败时显示错误 + 重试按钮）
- 录制暂停期间消息拦截逻辑的具体位置

## Deferred Ideas

- 录制过程中实时插入步骤
- AI 精炼结果预览确认框
- 多模型切换的实际后端逻辑
