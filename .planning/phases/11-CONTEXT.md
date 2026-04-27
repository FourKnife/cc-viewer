# Phase 11: Sketch 设计稿对比 + 自动调整命令 - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

选中页面元素后，通过工具栏按钮触发与 Sketch 设计稿的对比，自动构建包含元素信息、截图和 Sketch 图层信息的 prompt，通过 tmux send-keys 发送到右侧 TerminalPanel 的 Claude Code 会话，由 CC 自行判断差异并修改代码。

</domain>

<decisions>
## Implementation Decisions

### 触发方式与时机
- **D-01:** 手动触发 — 复用工具栏现有的 DiffOutlined 对比按钮，选中元素后点击触发
- **D-02:** 对比范围为仅选中元素的 bounding box 区域（非整页）
- **D-03:** 点击对比按钮后，直接通过 tmux send-keys 向右侧终端发送 prompt，让 CC 自行完成对比和代码修改，无中间确认步骤

### 调整命令的构建与发送
- **D-04:** Prompt 内容包含：选中元素的 tag/class/源码位置 + 元素区域截图（保存为临时文件，路径引用）+ Sketch MCP 选中图层信息（通过 MCP API 获取，非截图）+ 「对比并按设计稿修改」指令
- **D-05:** 截图保存为 /tmp 下的 PNG 临时文件，prompt 中用文件路径引用，CC 直接读取
- **D-06:** 通过 `ccv-terminal-send` 自定义事件（Phase 10 已建立的机制）将 prompt 注入终端

### 差异判断与阈值
- **D-07:** 前端不做差异预判，不使用 pixelmatch。直接将截图和 Sketch 信息发给 CC，由 CC 自行判断是否需要修改

### 降级与错误处理
- **D-08:** Sketch MCP 未连接时，对比按钮置灰不可点击，tooltip 显示「请先连接 Sketch MCP」。StatusBar 已有连接状态指示
- **D-09:** 元素截图或 Sketch 图层获取失败时，toast 提示错误信息，不发送 prompt。用户可重试

### Claude's Discretion
- Prompt 的具体措辞和格式
- 临时文件的命名规则和清理策略
- 元素区域截图的具体裁剪实现方式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 核心组件
- `cc-viewer/src/components/VisualEditor/PagePreview.jsx` — 现有 handleCompareSketch 逻辑、iframe 截图、Sketch 截图获取
- `cc-viewer/src/components/VisualEditor/ScreenshotCompare.jsx` — 现有截图对比组件（pixelmatch），本 phase 不复用对比 UI 但可参考截图获取逻辑
- `cc-viewer/src/components/VisualEditor/StatusBar.jsx` — Sketch MCP 连接状态展示
- `cc-viewer/src/App.jsx` — visual 模式布局、ccv-terminal-send 事件分发、元素 Tag 栏
- `cc-viewer/src/components/TerminalPanel.jsx` — tmux send-keys 终端交互

### 服务端 API
- `cc-viewer/server.js` L1072 `/api/sketch-selection` — Sketch MCP 选中图层代理
- `cc-viewer/server.js` L1102 `/api/sketch-screenshot` — Sketch 图层截图导出

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `handleCompareSketch` (PagePreview.jsx) — 已实现同时获取 iframe 截图 + Sketch 截图的逻辑，可重构为元素区域截图
- `ccv-terminal-send` 自定义事件 (App.jsx) — Phase 10 建立的终端注入机制，直接复用
- `/api/sketch-selection` — 获取 Sketch 当前选中图层信息的代理 API
- `/api/sketch-screenshot` — 获取 Sketch 图层截图的代理 API
- `html2canvas` — 已作为依赖安装，用于 iframe 截图

### Established Patterns
- 元素选中信息通过 postMessage 从 iframe inspector 传递到父页面
- Sketch MCP 连接状态通过 SSE 事件广播，StatusBar 消费
- 截图操作使用 html2canvas 库

### Integration Points
- PagePreview 工具栏的 DiffOutlined 按钮 — 需改造为元素级对比触发
- App.jsx 中的 `selectedElement` 状态 — 提供选中元素的 tag/class 等信息
- 服务端需新增保存截图到临时文件的 API（或前端通过 canvas.toBlob 直接写入）

</code_context>

<specifics>
## Specific Ideas

- 整个流程是「一键式」的：点按钮 → 自动截图 + 获取 Sketch 信息 → 构建 prompt → 发送到终端 → CC 自动执行
- Sketch 图层信息通过 MCP API 获取（非截图），更适合 CC 理解和对比
- CC 收到 prompt 后自主完成：对比 → 判断差异 → 修改代码，全流程自动

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-sketch-compare-auto-adjust*
*Context gathered: 2026-04-23*
