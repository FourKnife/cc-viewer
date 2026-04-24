# Phase 21: 日志 ANSI 过滤 + Available Pages 快捷导航 — 决策上下文

**生成时间**: 2026-04-24
**状态**: 决策完成，可直接进入 plan

---

## 已锁定决策

### D1: `stripAnsi` 工具函数

- **文件**: `src/utils/stripAnsi.js`
- **导出**: `export function stripAnsi(text)`
- **行为**:
  - 过滤所有 ANSI/VT100 控制序列（CSI、OSC、ESC 序列等）
  - 对 `null`/`undefined` 输入返回 `''`
  - 对普通文本不做任何修改
  - CSI 序列：`\x1b\[...m`（颜色）、`\x1b\[nA/B/K/G`（光标/清屏）等
  - OSC 序列：`\x1b\]...\x07` 或 `\x1b\]...\x1b\\`
  - 其他 ESC 序列：`\x1b[0-9A-Za-z]` 单字符序列
  - Spinner 进度行（如 `⠸ Compiling... \r`）被过滤后应保留文字内容而非整行消失
- **正则核心**: `/\x1B(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1B]*(\x07|\x1B\\)|[0-9A-Za-z])/g`

### D2: `parseAvailablePages` 工具函数

- **文件**: `src/utils/parseAvailablePages.js`
- **导出**: `export function parseAvailablePages(text)`
- **行为**:
  - 从文本中解析 `Available Pages:` 块
  - 返回 `[{ name, url }]` 数组
  - 匹配格式：`- <name>:   <url>`（name 和 url 之间用冒号和空格分隔）
  - 对无匹配输入返回 `[]`
  - 解析后按出现顺序保留
- **示例输入**:
  ```
  Available Pages:
  - demo:    http://localhost:3002/demo.html
  - transferInCKK:  http://localhost:3002/transferInCKK.html
  ```
- **示例输出**: `[{name:'demo', url:'http://localhost:3002/demo.html'}, {name:'transferInCKK', url:'http://localhost:3002/transferInCKK.html'}]`

### D3: ProjectLauncher 改动

- **新增 props**: `availablePages`（数组）、`onPreviewUrlChange(url)`、`onSelectMenu(key)`
- **ANSI 过滤**: 渲染日志时调用 `stripAnsi(output)`，而非直接渲染原始 `output`
- **Available Pages 展示**: 在日志区域上方（或下方）渲染页面快捷按钮列表
  - 每个按钮显示页面名称
  - 点击按钮 → 调用 `onPreviewUrlChange(page.url)` + `onSelectMenu('ui-edit')`
  - 列表持久化（切换 mode 再切回后依然存在 — 由 App state 保证）
- **移除**: `output` prop 不再直接渲染，而是 `stripAnsi(output)`

### D4: App.jsx 改动

- **新增 state**: `availablePages: []`
- **新增效果**: 在 `projectOutput` 更新时，调用 `parseAvailablePages(projectOutput)` 解析并更新 `availablePages`
  - 最佳位置：在 ProjectLauncher 的 `handleStart` 成功后（或在 App 层面监听 projectOutput 变化时）
  - 由于 `projectOutput` 由 AppBase 管理（`handleProjectOutput`），在 AppBase 层面监听更可靠
  - 但为了最小化改动，可以在 ProjectLauncher 中 useEffect 监听 output 变化并通知父组件
  - **锁定决策**: 在 App.jsx 的 `componentDidUpdate` 中，当 `projectOutput` 变化时调用 `parseAvailablePages`，更新 `availablePages` state
- **传递 props**: 将 `availablePages`、`handlePreviewUrlChange`、切换 menu 的 callback 传给 ProjectLauncher

### D5: i18n

- 新增 `visual.launcher.pages` — zh: "可用页面", en: "Available Pages", ja: "利用可能なページ"

---

## 不在本 Phase 范围内

- CSS 美化页面按钮（使用 antd Button 默认样式即可，后续再优化）
- 日志分页或虚拟滚动
- Available Pages 的自动嗅探（WebSocket 推送）— 仅解析已有文本

---

## 关键文件

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/utils/stripAnsi.js` | 新建 | ANSI 过滤工具函数 |
| `test/stripAnsi.test.js` | 新建 | stripAnsi 单元测试 |
| `src/utils/parseAvailablePages.js` | 新建 | Available Pages 解析工具函数 |
| `test/parseAvailablePages.test.js` | 新建 | parseAvailablePages 单元测试 |
| `src/components/VisualEditor/ProjectLauncher.jsx` | 修改 | ANSI 过滤 + 页面按钮展示 |
| `src/App.jsx` | 修改 | availablePages state + 解析 + 传 props |
| `src/i18n.js` | 修改 | 新增 `visual.launcher.pages` |

---

## 验收标准

1. 日志中不再出现 `[32m`、`[2K` 等 ANSI 字符
2. Spinner 进度行被过滤后不残留空行
3. 正常文字内容完整保留
4. 项目启动后，ProjectLauncher 区域出现解析到的页面列表
5. 每个页面显示名称，点击后 URL 更新 + 切换到 UI 编辑模式
6. 页面列表持久化（切换到 ui-edit 再切回 launcher，列表依然存在）
7. `stripAnsi` 和 `parseAvailablePages` 单元测试通过
8. 全部现有测试通过
9. 构建通过
