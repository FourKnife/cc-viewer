# Phase 30: 录制体验优化 + AI 生成改进 - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

完善录制交互（暂停/恢复、手动插入步骤）并提升 AI 生成灵活性（可配置模型、step 精炼、新 step 类型支持、错误重试）。
依赖 Phase 29 已完成的 StepsEditor（拖拽/复制/删除/8 种 step 类型）和 Phase 28 完成的底部 Tab 集成。

</domain>

<decisions>
## Implementation Decisions

### D-01: 录制暂停/恢复 — 按钮布局
- **D-01:** 暂停按钮与停止按钮并列显示于录制状态栏，二者始终可见，视觉上分离（不共用同一按钮位置）
- **D-02:** 录制状态指示区：正常录制时红色 "● 正在录制"；暂停时切换为黄色 "⏸ 已暂停"（文字 + 颜色双重区分）

### D-03: 手动插入步骤 — 时机与入口
- **D-03:** 仅在录制结束后支持插入，不支持录制过程中实时插入（降低复杂度）
- **D-04:** StepsEditor 每行末尾（CopyOutlined 旁）新增「插入」图标（`InsertRowBelowOutlined` 或类似图标），点击在该行之后插入新 step，与现有行内操作风格一致

### D-05: AI Step 精炼 — 交互流
- **D-05:** 每行 step 左侧增加复选框（checkbox），选中一行或多行后触发精炼模式
- **D-06:** 精炼入口复用现有 ScenarioForm 的 AI 生成区域：选中 step(s) 后，"AI 生成" 按钮变为 "精炼选中"，输入自然语言指令，结果直接替换选中的 step(s)（不弹确认框）
- **D-07:** 无选中 step 时按钮恢复为 "AI 生成"（全量生成模式），保持向后兼容

### D-08: AI 模型选择 UI（Claude's Discretion）
- 下拉选择器放在 AI 输入框旁边，当前只显示 `claude-haiku-4-5-20251001`；预留扩展接口但不实现多模型切换逻辑（requirements: 模型选择在 UI 可见即满足验收）

### D-09: AI 生成错误重试（Claude's Discretion）
- 生成失败时在 AI 区域显示错误文本 + "重试" 按钮，点击重新调用相同 prompt。不引入修改 prompt 的弹框，保持简洁。

### Claude's Discretion
- 录制暂停期间 `onRecordedStep` 消息的拦截逻辑（在 App.jsx 或 PagePreview inspector 层过滤）
- 模型选择的持久化策略（localStorage or in-memory）
- StepsEditor 复选框的样式（inline checkbox vs Ant Design Checkbox）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有录制相关代码
- `src/components/VisualEditor/ScenarioPanel.jsx` — 录制 UI 和 StepsEditor，Phase 30 的主要修改目标
- `src/App.jsx` — `isRecording`/`recordedSteps`/`handleStartRecording`/`handleStopRecording`/`handleRecordedStep` 状态和处理器
- `src/utils/scenarioStorage.js` — 场景持久化工具

### AI 生成服务
- `server.js` 约 2855 行：`/api/generate-scenario` endpoint，当前硬编码 `claude-haiku-4-5-20251001`

### 需求文档
- `.planning/milestones/v1.8-REQUIREMENTS.md` — R3（录制体验优化）和 R4（AI 生成改进）的完整验收标准

### 项目约束
- `CLAUDE.md` — Anti-AI-Slop 原则、i18n 要求（新增 UI 控件须同时更新 `src/i18n.js`）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StepsEditor`（ScenarioPanel.jsx:43）：已有拖拽、复制、删除、8 种 step 类型；Phase 30 在此基础上增加复选框和插入图标
- `ScenarioForm.handleAiGenerate`（ScenarioPanel.jsx:164）：AI 生成逻辑已有，Phase 30 在此基础上增加精炼模式

### Established Patterns
- 录制状态区（ScenarioPanel.jsx:307-318）：已有实时步骤预览，Phase 30 在此增加暂停/恢复控制
- Ant Design `Button` 组件用于所有操作按钮，`Space size={4}` 用于并列按钮组

### Integration Points
- `App.jsx` handleStartRecording/handleStopRecording → 需新增 `handlePauseRecording`/`handleResumeRecording`
- `PagePreview.jsx` inspector 脚本 → 暂停时过滤 `onRecordedStep` 消息

</code_context>

<specifics>
## Specific Ideas

- 暂停/恢复按钮颜色：暂停状态用黄色（`warning` 类型 Button），与 danger 红色的停止按钮视觉区分
- AI 精炼 prompt 示例："把这个 click 改成 hover"、"在这两步之间加一个 wait 500ms"
- 模型下拉当前只有一个选项时仍要渲染（显示模型名称，满足 R4 验收：模型选择在 UI 中可见）

</specifics>

<deferred>
## Deferred Ideas

- 录制过程中实时插入步骤（复杂度过高，推迟到后续版本）
- AI 精炼结果预览确认框（用户选择了直接替换模式，无需确认弹框）
- 多模型切换的实际后端逻辑（当前只有 haiku 可用，UI 预留即可）

</deferred>

---

*Phase: 30-recording-optimization-ai-improvement*
*Context gathered: 2026-04-28*
