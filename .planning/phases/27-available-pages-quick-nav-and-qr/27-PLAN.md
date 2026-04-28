# Phase 27: Available Pages QR 码生成 — PLAN

**Phase:** 27-available-pages-quick-nav-and-qr
**Status:** Ready for execution
**Planned:** 2026-04-27

---

## Goal

在项目启动器的页面列表中，为每个页面新增 QR 码生成按钮。点击 QR 按钮 → 向运行中进程 stdin 发送 `sim <pageName>\n` → QR 码内容自然出现在日志滚动区。

---

## Step 1 — lib/project-manager.js：新增 writeStdin 方法

**File:** `lib/project-manager.js`

在 `stop()` 方法（结束于 ~167 行）与 `getStatus()` 方法之间插入：

```js
  /**
   * 向运行中的子进程 stdin 写入内容
   */
  writeStdin(text) {
    if (this.process && this.process.stdin && !this.process.stdin.destroyed) {
      try {
        this.process.stdin.write(text);
      } catch (_) {
        // stdin 已关闭，静默忽略
      }
    }
  }
```

---

## Step 2 — server.js：新增 POST /api/project/stdin 端点

**File:** `server.js`

在 `GET /api/project/status` 处理块（~2715–2719 行）**之后**插入：

```js
  // POST /api/project/stdin
  if (url === '/api/project/stdin' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body);
        if (typeof text === 'string') {
          projectManager.writeStdin(text);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (_) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }
```

---

## Step 3 — ProjectLauncher.jsx：新增 onQrClick prop 与 QR 按钮

**File:** `src/components/VisualEditor/ProjectLauncher.jsx`

### 3a — import 区（第 2–3 行）

1. 在 `antd` import 中添加 `Tooltip`
2. 在 `@ant-design/icons` import 中添加 `QrcodeOutlined`

```js
import { Input, Button, Space, Typography, Alert, Tooltip } from 'antd';
import { PlayCircleOutlined, StopOutlined, FolderOpenOutlined, QrcodeOutlined } from '@ant-design/icons';
```

### 3b — 组件参数（第 8–17 行）

在 props 解构中添加 `onQrClick`：

```js
export default function ProjectLauncher({
  status,
  output,
  onStart,
  onStop,
  defaultPath,
  availablePages = [],
  onPreviewUrlChange,
  onSelectMenu,
  onQrClick,
}) {
```

### 3c — availablePages 渲染区（第 125–133 行）

将现有的单 Button 替换为「页面名按钮 + QR 按钮」组合：

```jsx
{availablePages.map((page) => (
  <span key={page.url} style={{ display: 'inline-flex', gap: 2 }}>
    <Button
      size="small"
      type="default"
      onClick={() => handlePageClick(page)}
    >
      {page.name}
    </Button>
    <Tooltip title={t('visual.launcher.qrTooltip')}>
      <Button
        size="small"
        type="text"
        icon={<QrcodeOutlined />}
        disabled={!isRunning}
        onClick={() => onQrClick?.(page.name)}
      />
    </Tooltip>
  </span>
))}
```

---

## Step 4 — App.jsx：新增 handleQrClick 并传 prop

**File:** `src/App.jsx`

### 4a — 新增 handleQrClick 方法

在现有 handler 方法区域（`handleStartProject` / `handleStopProject` 附近）添加：

```js
handleQrClick = async (pageName) => {
  try {
    await fetch('/api/project/stdin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `sim ${pageName}\n` }),
    });
  } catch (_) {
    // 静默忽略网络错误
  }
};
```

### 4b — ProjectLauncher props（~641 行）

在 `ProjectLauncher` 的 props 列表中添加 `onQrClick`：

```jsx
<ProjectLauncher
  status={this.state.projectStatus}
  output={this.state.projectOutput}
  onStart={this.handleStartProject}
  onStop={this.handleStopProject}
  defaultPath={this.state.projectDir}
  availablePages={this.state.availablePages}
  onPreviewUrlChange={this.handlePreviewUrlChange}
  onSelectMenu={(key) => this.setState({ visualMenuKey: key })}
  onQrClick={this.handleQrClick}
/>
```

---

## Step 5 — src/i18n.js：新增 visual.launcher.qrTooltip

**File:** `src/i18n.js`

在 `visual.launcher.pages` 条目**之后**插入：

```js
"visual.launcher.qrTooltip": { "zh": "生成二维码", "en": "Generate QR", "ja": "QRコード生成" },
```

---

## Step 6 — 构建与测试验证

依次运行，均须无错误：

```bash
npm run build
npm run test
```

---

## Acceptance Criteria

1. **QR 按钮存在**：Available Pages 每个页面旁有 QR 图标按钮
2. **运行中可点击**：项目状态为 `running` 时 QR 按钮可点击；非 running 时 disabled
3. **stdin 发送正确**：点击 QR 按钮后，日志区会出现 `sim <pageName>` 触发的 QR 码输出
4. **页面跳转保留**：点击页面名按钮仍正常跳转到 ui-edit + 填入 URL（原有逻辑不变）
5. **构建通过**：`npm run build` 无错误
6. **测试通过**：`npm run test` 无失败用例

---

## Files Changed

| File | Action |
|------|--------|
| `lib/project-manager.js` | 新增 `writeStdin(text)` 方法 |
| `server.js` | 新增 `POST /api/project/stdin` 端点 |
| `src/components/VisualEditor/ProjectLauncher.jsx` | 新增 `onQrClick` prop + QR 按钮 |
| `src/App.jsx` | 新增 `handleQrClick` + 传 prop |
| `src/i18n.js` | 新增 `visual.launcher.qrTooltip` |

---

## Out of Scope

- 解析 ASCII QR 码渲染为图片（延后）
- sim 之外的 stdin 命令快捷入口（延后）
