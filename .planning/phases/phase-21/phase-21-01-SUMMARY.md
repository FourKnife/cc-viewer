# Phase 21 Summary — 日志 ANSI 过滤 + Available Pages 快捷导航

**执行时间**: 2026-04-24
**状态**: ✅ 完成

---

## 新增文件

### `src/utils/stripAnsi.js`
- 将 ANSI/VT100 控制序列（CSI、OSC、ESC 序列等）从字符串中过滤
- 对 `null`/`undefined` 返回 `''`，对普通文本不做修改
- 正则核心：`/\x1B(?:\[[0-9;?]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\)|[ -/]*[@-~]|[0-9A-Za-z])/g`

### `test/stripAnsi.test.js`
- 10 个测试用例：null/undefined 处理、纯文本保留、CSI 颜色/光标序列、OSC 序列、混合 ANSI、换行符保留、空字符串、纯 ANSI 序列

### `src/utils/parseAvailablePages.js`
- 从文本中解析 `Available Pages:` 块
- 返回 `[{ name, url }]` 数组
- 支持带缩进、额外空格的真实日志格式

### `test/parseAvailablePages.test.js`
- 8 个测试用例：null/undefined 处理、无匹配、单页面、多页面、额外空格、上下文文本、无页面条目、真实日志格式

## 修改文件

### `src/components/VisualEditor/ProjectLauncher.jsx`
- 引入 `stripAnsi` import
- 新增 props: `availablePages`, `onPreviewUrlChange`, `onSelectMenu`
- 日志渲染改为 `stripAnsi(output)` 而非原始 `output`
- 添加 Available Pages 按钮列表（在开始/停止按钮下方、日志面板上方）
- 点击页面按钮 → `onPreviewUrlChange(page.url)` + `onSelectMenu('ui-edit')`

### `src/App.jsx`
- 引入 `parseAvailablePages` import
- 新增 state: `availablePages: []`
- `componentDidUpdate` 中监听 `projectOutput` 变化，自动解析 Available Pages（避免不必要的 re-render）
- ProjectLauncher 新增 props: `availablePages`, `onPreviewUrlChange`, `onSelectMenu`

### `src/i18n.js`
- 新增 key: `visual.launcher.pages` — zh: "可用页面", en: "Available Pages", ja: "利用可能なページ"

## 验证结果

| 检查项 | 结果 |
|--------|------|
| stripAnsi 单元测试 | ✅ 10/10 通过 |
| parseAvailablePages 单元测试 | ✅ 8/8 通过 |
| 完整测试套件 | ✅ 1224/1224 通过，0 失败 |
| 生产构建 | ✅ exit 0 |

## 发现的边界情况

- `\x1b[?25l` / `\x1b[?25h` 等私有模式设置序列包含 `?` 作为参数字符，初始 regex `\[[0-9;]*[A-Za-z]` 未覆盖，需扩展为 `\[[0-9;?]*[A-Za-z]`
