# Phase 999.2: Available Pages 快速导航 + 二维码生成 - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

为可视化编辑器项目启动器的 Available Pages 区域新增 **QR 码生成** 功能：
1. 每个页面旁显示两个操作按钮：[页面名] 和 [QR]
2. 点击 [页面名] → 现有逻辑不变（跳转 UI 编辑 + 填入 URL）
3. 点击 [QR] → 向运行中进程的 stdin 发送 `sim <pageName>\n` 命令 → QR 码内容出现在日志区

**注意：** Available Pages 快速导航（点页面名跳转）已在 M1.5 实现，本阶段不重做，仅新增 QR 按钮。

</domain>

<decisions>
## Implementation Decisions

### D-01: QR 生成方式
通过 stdin 命令触发：向运行中的项目进程发送 `sim <pageName>\n`，进程会在 stdout 输出 QR 码内容。需要：
- `projectManager` 新增 `writeStdin(text)` 方法（调用 `this.process.stdin.write(text)`）
- server.js 新增 `POST /api/project/stdin` 端点，body: `{ text: "sim pageName\n" }`
- 前端调用此端点后，QR 码会自然出现在已有的日志滚动区

### D-02: QR 码展示方式
**展示在日志区** — 点击 QR 按钮后，直接发 stdin 命令；QR 码（ASCII 形式）会出现在日志滚动区，用户在日志里扫码即可。不需要额外解析或弹窗。

### D-03: 页面列表 UI 布局
每个 Available Page 行显示两个按钮：
```
[demo] [QR]   [transferInCKK] [QR]   ...
```
- [页面名] 按钮（已有）：`size="small" type="default"` — 点击跳转 UI 编辑
- [QR] 按钮（新增）：`size="small" type="text" icon={<QrcodeOutlined />}` — 点击发 stdin

### D-04: QR 按钮页面名参数
发送 `sim <pageName>\n` 时，`pageName` 取 `page.name`（即 Available Pages 列表里的名称，如 `demo`、`transferInCKK`），不使用完整 URL。这与用户在命令行手动输入 `sim transferInCKK` 的行为一致。

### D-05: stdin 写入时机
仅在项目状态为 `running` 时才允许发送 stdin（按钮 disabled when not running）。如果进程 stdin 不可写（已关闭），静默忽略。

### Claude's Discretion
- QR 按钮的具体 icon：使用 Ant Design 的 `QrcodeOutlined`
- QR 按钮 hover tooltip：可加简单 Tooltip 提示 "生成二维码"
- 日志区是否自动滚动到底部（展示 QR）：已有自动滚动逻辑，保持不变

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有 Available Pages 实现
- `src/components/VisualEditor/ProjectLauncher.jsx` — 已有 `availablePages` prop、`handlePageClick`、QR 按钮需在此添加
- `src/App.jsx` §19, §44, §112–116, §627 — `availablePages` state + `parseAvailablePages` 调用 + 传给 ProjectLauncher 的 props

### 进程管理
- `lib/project-manager.js` — `projectManager` 单例，需新增 `writeStdin(text)` 方法；`this.process` 是 spawn 出来的子进程，`this.process.stdin` 可写入
- `server.js` §2687–2724 — 现有 `/api/project/start|stop|status` 路由，新端点 `POST /api/project/stdin` 在此区域新增

### 样式参考
- `src/components/VisualEditor/styles.module.css` — launcher 区域样式

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProjectLauncher.availablePages`：已渲染为 Button 列表，只需在每个 Button 旁增加 QR Button
- `projectManager.process.stdin`：`spawn` 默认 stdin 是 pipe，可直接 `.write()`
- 日志自动滚动：`logRef.current.scrollTop = logRef.current.scrollHeight` 已在 `useEffect` 里，stdin 触发的输出会自动滚到 QR 码位置

### Established Patterns
- server.js API 风格：同步 JSON 端点，`res.end(JSON.stringify(...))`
- 前端 API 调用：`fetch('/api/project/stdin', { method: 'POST', body: JSON.stringify({ text }) })`
- Ant Design Icons 已在 ProjectLauncher 使用（`PlayCircleOutlined` 等）

### Integration Points
- `ProjectLauncher.jsx`：新增 QR Button + `onSendStdin` prop（或直接接收 `onQrClick(pageName)` 回调）
- `App.jsx`：新增 `handleQrClick(pageName)` → `fetch('/api/project/stdin', { text: \`sim ${pageName}\n\` })`
- `lib/project-manager.js`：新增 `writeStdin(text)` 方法
- `server.js`：新增 `POST /api/project/stdin` 路由

</code_context>

<specifics>
## Specific Ideas

- 发送命令格式：`sim <pageName>\n`（换行符必须，才能让进程识别为完整命令行输入）
- 页面名取 `page.name`，与用户手动在终端输入的完全一致

</specifics>

<deferred>
## Deferred Ideas

- 解析 ASCII QR 码并渲染为可扫描图片 — 复杂度高，用户确认直接看日志区即可，延后
- sim 之外的 stdin 命令快捷入口（web、help 等）— 本阶段只做 QR，其余 stdin 命令不暴露 UI

</deferred>

---

*Phase: 999.2-available-pages-quick-nav-and-qr*
*Context gathered: 2026-04-27*
