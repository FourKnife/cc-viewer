# Phase 1: cc-viewer 分析与环境搭建 - Research

**Researched:** 2026-04-20
**Domain:** cc-viewer codebase architecture analysis
**Confidence:** HIGH

## Summary

cc-viewer 是一个功能完整的 Claude Code 可视化工具，采用 Node.js + React 架构。后端使用原生 Node.js HTTP 服务器 + WebSocket，前端使用 React + Ant Design + xterm.js。代码库约 137K+ 行，功能丰富但模块化清晰。

**核心模块分析完成**:
- `proxy.js`: Claude API 代理，拦截请求并转发
- `pty-manager.js`: 伪终端进程管理，支持 spawn/write/resize/kill
- `server.js`: REST API + SSE + WebSocket 服务（~3100 行）
- `src/App.jsx` + `AppBase.jsx`: React UI 入口和状态管理

**Primary recommendation:** 直接复用 cc-viewer 的进程管理、API 服务、文件操作能力，通过添加新路由和新 Tab 实现 Visual Editor 功能。

---

## 1. proxy.js - Claude API 代理机制

### 架构概述

```
Claude CLI → proxy.js (localhost:随机端口) → Anthropic API (或自定义 baseURL)
```

### 核心功能

| 功能 | 实现方式 | 位置 |
|------|----------|------|
| 端口分配 | 随机端口 `server.listen(0)` | L147 |
| 请求转发 | Node.js 原生 `fetch` | L88 |
| 配置读取 | 多级 settings.json 优先级 | L32-51 |
| 拦截器集成 | `setupInterceptor()` | L10 |

### 配置文件优先级

```javascript
// 从高到低:
1. ${cwd}/.claude/settings.local.json
2. ${cwd}/.claude/settings.json  
3. ~/.claude/settings.json
4. 环境变量 ANTHROPIC_BASE_URL
5. 默认 https://api.anthropic.com
```

### 关键代码模式

```javascript
// L53-156: 启动代理服务器
export function startProxy() {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const originalBaseUrl = getOriginalBaseUrl();
      // 添加追踪 header
      fetchOptions.headers['x-cc-viewer-trace'] = 'true';
      // 转发请求
      const response = await fetch(fullUrl, fetchOptions);
      // 流式响应处理
      const nodeStream = Readable.fromWeb(response.body);
      pipeline(nodeStream, res, (err) => { ... });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}
```

### 扩展点

- **无需修改**: 代理机制完全独立，Cleffa 可直接复用
- **可选扩展**: 添加请求/响应拦截 hook 用于 Visual Editor 上下文注入

---

## 2. pty-manager.js - 进程管理机制

### 架构概述

```
server.js (WebSocket) ↔ pty-manager.js ↔ node-pty ↔ 子进程 (claude/shell)
```

### 核心 API

| 函数 | 功能 | 参数 |
|------|------|------|
| `spawnClaude()` | 启动 Claude CLI | proxyPort, cwd, extraArgs, claudePath |
| `spawnShell()` | 启动交互式 shell | 无 (使用 lastWorkspacePath) |
| `writeToPty()` | 写入 PTY | data (string) |
| `writeToPtySequential()` | 顺序写入多个 chunk | chunks[], onComplete, opts |
| `resizePty()` | 调整终端尺寸 | cols, rows |
| `killPty()` | 终止进程 | 无 |
| `onPtyData()` | 注册输出监听 | callback |
| `onPtyExit()` | 注册退出监听 | callback |
| `getPtyState()` | 获取进程状态 | 无 |
| `getOutputBuffer()` | 获取历史输出 | 无 |

### 关键实现细节

```javascript
// L127-262: spawnClaude 核心逻辑
export async function spawnClaude(proxyPort, cwd, extraArgs = [], claudePath = null, isNpmVersion = false, serverPort = null) {
  const pty = await getPty();
  
  // 环境变量注入
  env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${proxyPort}`;
  env.CCV_PROXY_MODE = '1';
  
  // 编辑器环境变量（用于 $EDITOR 拦截）
  if (serverPort) {
    env.EDITOR = `${nodePath} ${editorScript}`;
    env.CCV_EDITOR_PORT = String(serverPort);
  }
  
  // spawn 进程
  ptyProcess = pty.spawn(command, args, {
    name: 'xterm-256color',
    cols: lastPtyCols,
    rows: lastPtyRows,
    cwd: currentWorkspacePath,
    env,
  });
  
  // 输出处理 + 缓冲
  ptyProcess.onData((data) => {
    outputBuffer += data;
    // 批量 flush 优化
    batchBuffer += data;
    if (!batchScheduled) {
      batchScheduled = true;
      setImmediate(flushBatch);
    }
  });
}
```

### 扩展点 - 启动任意命令

**当前限制**: `spawnClaude()` 专门用于启动 Claude CLI

**扩展方案**: 创建通用的 `spawnCommand()` 函数

```javascript
// 建议新增: lib/project-manager.js
export async function spawnProjectCommand(command, args, cwd, env = {}) {
  const pty = await getPty();
  return pty.spawn(command, args, {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd,
    env: { ...process.env, ...env },
  });
}
```

---

## 3. server.js - REST/WS 服务结构

### 架构概述

```
server.js (~3100 行)
├── HTTP Server (handleRequest)
│   ├── REST API (/api/*)
│   ├── SSE (/events)
│   └── 静态文件服务 (/dist/*)
├── WebSocket Server (/ws/terminal)
│   └── PTY 双向通信
└── 辅助模块
    ├── log-watcher.js (日志监听)
    ├── stats-worker.js (统计计算)
    └── plugin-loader.js (插件系统)
```

### API 路由分类

| 类别 | 路由 | 方法 | 功能 |
|------|------|------|------|
| **工作区** | `/api/workspaces` | GET | 获取工作区列表 |
| | `/api/workspaces/launch` | POST | 启动工作区 |
| | `/api/workspaces/stop` | POST | 停止工作区 |
| **文件操作** | `/api/files` | GET | 目录浏览 |
| | `/api/file-content` | GET/POST | 文件读写 |
| | `/api/create-file` | POST | 创建文件 |
| | `/api/create-dir` | POST | 创建目录 |
| | `/api/rename-file` | POST | 重命名 |
| | `/api/move-file` | POST | 移动文件 |
| | `/api/delete-file` | POST | 删除文件 |
| **日志** | `/api/requests` | GET | 获取日志条目 |
| | `/api/local-logs` | GET | 本地日志列表 |
| | `/events` | SSE | 实时日志流 |
| **配置** | `/api/preferences` | GET/POST | 用户偏好 |
| | `/api/claude-settings` | GET/POST | Claude 设置 |
| **其他** | `/api/upload` | POST | 文件上传 |
| | `/api/git-diff` | GET | Git 差异 |
| | `/api/user-profile` | GET | 用户信息 |

### WebSocket 终端协议

```javascript
// 消息类型
{ type: 'input', data: string }          // 客户端 → PTY
{ type: 'input-sequential', chunks: [] } // 顺序输入
{ type: 'data', data: string }           // PTY → 客户端
{ type: 'state', running: bool, ... }    // 状态同步
{ type: 'exit', exitCode: number }       // 退出通知
{ type: 'resize', cols, rows }           // 尺寸调整
{ type: 'ask-hook-answer', answers: [] } // 交互问答
{ type: 'perm-hook-answer', decision }   // 权限审批
```

### 添加新路由示例

```javascript
// 在 handleRequest 函数中添加（约 L252 开始）

// 项目启动 API
if (url === '/api/project/start' && method === 'POST') {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { projectPath, command } = JSON.parse(body);
      // 启动项目逻辑
      const result = await startProject(projectPath, command);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
  return;
}
```

### 文件操作 API 详解 (lib/file-api.js)

```javascript
// 路径安全校验
export function isPathContained(targetPath, root) {
  const resolvedRoot = realpathSync(resolve(root));
  const real = realpathSync(resolve(targetPath));
  return real === resolvedRoot || real.startsWith(resolvedRoot + '/');
}

// 文件读取 (5MB 限制)
export function readFileContent(cwd, reqPath, isEditorSession) { ... }

// 文件写入
export function writeFileContent(cwd, reqPath, content, isEditorSession) { ... }
```

---

## 4. 前端架构 (src/)

### 组件层次

```
src/
├── App.jsx              # PC 端入口
├── Mobile.jsx           # 移动端入口
├── AppBase.jsx          # 共享状态管理基类 (~1900 行)
├── main.jsx             # React 挂载点
├── components/
│   ├── ChatView.jsx     # 对话视图 (~4300 行)
│   ├── TerminalPanel.jsx # 终端面板
│   ├── DetailPanel.jsx  # 详情面板
│   ├── FileExplorer.jsx # 文件浏览器
│   ├── FileContentView.jsx # 文件内容查看
│   ├── DiffView.jsx     # Diff 展示
│   ├── GitChanges.jsx   # Git 变更
│   └── ...              # 70+ 组件
└── utils/
    ├── apiUrl.js        # API 地址
    ├── helpers.js       # 工具函数
    └── ...
```

### Tab 切换机制 (App.jsx)

```javascript
// state.viewMode: 'raw' | 'chat'
// state.currentTab: 'context' | 'kv-cache-text' | ...

handleToggleViewMode = () => {
  this.setState(prev => ({
    viewMode: prev.viewMode === 'raw' ? 'chat' : 'raw',
  }));
};

// 渲染逻辑
{viewMode === 'raw' && (
  <div className={styles.mainContainer}>
    <RequestList ... />
    <DetailPanel currentTab={currentTab} onTabChange={this.handleTabChange} />
  </div>
)}
{viewMode === 'chat' && (
  <ChatView ... />
)}
```

### 添加新 Tab 示例

```javascript
// 1. 在 state 中添加新 viewMode
// state.viewMode: 'raw' | 'chat' | 'visual'

// 2. 在 AppHeader.jsx 添加切换按钮

// 3. 在 App.jsx render 中添加条件渲染
{viewMode === 'visual' && (
  <VisualEditor 
    cliMode={this.state.cliMode}
    terminalVisible={this.state.terminalVisible}
    ...
  />
)}
```

### SSE 数据流

```javascript
// AppBase.jsx componentDidMount()
this.eventSource = new EventSource(apiUrl('/events'));

this.eventSource.addEventListener('load_chunk', (e) => {
  const entries = JSON.parse(e.data);
  this._pendingEntries.push(...entries);
  this._scheduleFlush();
});

this.eventSource.addEventListener('new_entry', (e) => {
  const entry = JSON.parse(e.data);
  this._pendingEntries.push(entry);
  this._scheduleFlush();
});
```

---

## 5. 构建和启动方式

### 开发模式

```bash
cd cc-viewer
npm install
npm run dev      # Vite 开发服务器 (前端热更新)
npm run start    # Node.js 服务器 (后端)
```

### 生产构建

```bash
npm run build    # 构建前端到 dist/
npm run start    # 启动服务器
```

### CLI 启动流程 (cli.js)

```javascript
// cli.js 主要功能:
// 1. Shell hook 注入/移除
// 2. 启动 proxy
// 3. 启动 viewer server
// 4. 启动 PTY (claude CLI)

// ccv run -- claude [args]
// 启动完整的代理 + viewer + PTY 环境
```

### 目录结构

```
cc-viewer/
├── cli.js              # CLI 入口
├── server.js           # HTTP/WS 服务器
├── proxy.js            # API 代理
├── pty-manager.js      # PTY 管理
├── interceptor.js      # 请求拦截器
├── findcc.js           # Claude 路径查找
├── i18n.js             # 国际化 (服务端)
├── lib/                # 服务端模块
│   ├── file-api.js
│   ├── log-watcher.js
│   ├── git-diff.js
│   └── ...
├── src/                # React 前端
│   ├── App.jsx
│   ├── components/
│   └── ...
├── dist/               # 构建输出
├── test/               # 测试文件
└── concepts/           # 文档
```

---

## 6. Cleffa 改造计划

### 复用能力

| 能力 | 模块 | 复用方式 |
|------|------|----------|
| Claude API 代理 | proxy.js | 直接复用 |
| 进程管理 | pty-manager.js | 扩展支持任意命令 |
| REST API 框架 | server.js | 添加新路由 |
| 文件读写 | lib/file-api.js | 直接复用 |
| WebSocket | server.js | 复用或新增通道 |
| 对话界面 | ChatView.jsx | 复用或适配 |
| Diff 展示 | DiffView.jsx | 直接复用 |
| 终端面板 | TerminalPanel.jsx | 直接复用 |
| 文件浏览器 | FileExplorer.jsx | 直接复用 |

### 新增模块计划

| 模块 | 位置 | 功能 |
|------|------|------|
| project-manager.js | lib/ | 项目启动/停止/状态管理 |
| source-mapper.js | lib/ | DOM→源码映射 |
| inspector-inject.js | public/ | 页面元素选择器注入脚本 |
| VisualEditor.jsx | src/components/ | Visual Editor 主容器 |
| ProjectLauncher.jsx | src/components/ | 项目启动器 UI |
| PagePreview.jsx | src/components/ | iframe 页面预览 |
| ElementInspector.jsx | src/components/ | 元素检查器 |

### 新增 API 路由

```
POST /api/project/start     # 启动项目
POST /api/project/stop      # 停止项目
GET  /api/project/status    # 项目状态
GET  /api/proxy/:port/*     # 项目端口代理 (解决 iframe 跨域)
POST /api/source-map        # 获取 source map 映射
```

---

## 7. 技术风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 代码量大 (~137K 行) | 理解成本高 | 聚焦核心模块，渐进式改造 |
| server.js 单文件过大 | 维护困难 | 新功能放到独立模块 |
| iframe 跨域 | 元素选择失效 | 使用 /api/proxy/:port 代理 |
| React DevTools 协议 | 获取组件名可能失败 | 提供降级方案 |

---

## 8. 下一步行动

### Phase 1 剩余任务

- [x] Fork cc-viewer 仓库
- [x] Clone 并安装依赖
- [ ] 运行验证基础功能 (`npm run dev` + `npm start`)
- [x] 分析 proxy.js 代理机制
- [x] 分析 pty-manager.js 进程管理
- [x] 分析 server.js API 结构
- [x] 分析 App.jsx UI 路由
- [ ] 创建 `feature/visual-editor` 分支

### 验证命令

```bash
cd cc-viewer
npm run dev      # 终端1: 前端开发服务器
npm run start    # 终端2: 后端服务器
# 浏览器访问 http://localhost:7008
```

---

## Sources

### Primary (HIGH confidence)
- `/Users/duanrong/yuyan/duanrong/cleffa/cc-viewer/proxy.js` - 完整分析
- `/Users/duanrong/yuyan/duanrong/cleffa/cc-viewer/pty-manager.js` - 完整分析
- `/Users/duanrong/yuyan/duanrong/cleffa/cc-viewer/server.js` - 部分分析 (L1-3120)
- `/Users/duanrong/yuyan/duanrong/cleffa/cc-viewer/src/App.jsx` - 完整分析
- `/Users/duanrong/yuyan/duanrong/cleffa/cc-viewer/src/AppBase.jsx` - 部分分析
- `/Users/duanrong/yuyan/duanrong/cleffa/cc-viewer/lib/file-api.js` - 完整分析
- `/Users/duanrong/yuyan/duanrong/cleffa/cc-viewer/package.json` - 依赖分析

### Secondary (MEDIUM confidence)
- `/Users/duanrong/yuyan/duanrong/cleffa/cc-viewer/cli.js` - 部分分析
- `/Users/duanrong/yuyan/duanrong/cleffa/cc-viewer/interceptor.js` - 部分分析

---

## Metadata

**Confidence breakdown:**
- 核心模块分析: HIGH - 直接阅读源码
- API 路由结构: HIGH - 完整扫描 server.js
- 扩展方案: MEDIUM - 基于代码理解的推断
- 风险评估: MEDIUM - 需要实际验证

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (代码库相对稳定)
