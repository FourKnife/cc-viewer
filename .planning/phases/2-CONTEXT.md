# Phase 2 Context: 项目启动器 + 页面嵌入

## 决策摘要

| 决策点 | 决定 | 原因 |
|--------|------|------|
| 进程管理 | 新建 project-manager.js | 与 pty-manager 分离，避免冲突 |
| iframe 跨域 | HTTP 代理 + 同源 | 简单可靠，复用 server.js |
| Tab 入口 | 新增 viewMode='visual' | 与现有 raw/chat 模式并行 |
| 状态管理 | React state + WebSocket | 复用现有通信机制 |

---

## 技术方案

### 1. 项目进程管理 (lib/project-manager.js)

**核心功能:**
- 启动任意 npm 命令 (如 `npm run dev`)
- 检测启动完成 (通过 stdout 匹配 ready 信号)
- 端口发现 (自动解析 localhost:port)
- 进程生命周期管理

**API 设计:**
```javascript
// lib/project-manager.js
export async function startProject(projectPath, command, options = {}) {
  // Returns { pid, port, status }
}

export function stopProject(pid) {
  // Kills process
}

export function getProjectStatus() {
  // Returns current project state
}
```

### 2. 端口代理 (解决 iframe 跨域)

**问题:** iframe 加载 `localhost:3000` (React 项目) 与 `localhost:7008` (cc-viewer) 跨域

**方案:** cc-viewer 代理项目端口
```
用户请求: http://localhost:7008/api/proxy/3000/index.html
cc-viewer: 转发到 http://localhost:3000/index.html
```

**server.js 新增路由:**
```javascript
// GET /api/proxy/:port/*
// 代理请求到 localhost:port
```

### 3. 前端组件

**新增组件:**
```
src/components/
├── VisualEditor/
│   ├── index.jsx          # Tab 容器
│   ├── ProjectLauncher.jsx # 项目配置和启动
│   ├── PagePreview.jsx     # iframe 页面预览
│   └── styles.module.css
```

**状态流:**
```
用户输入项目路径 → 点击启动 → 后端启动进程 → 
WebSocket 推送状态 → 前端更新 → iframe 加载代理 URL
```

---

## 文件修改清单

### 新增文件

| 文件 | 功能 |
|------|------|
| `lib/project-manager.js` | 项目进程管理模块 |
| `src/components/VisualEditor/index.jsx` | Visual Editor Tab 容器 |
| `src/components/VisualEditor/ProjectLauncher.jsx` | 项目启动器 UI |
| `src/components/VisualEditor/PagePreview.jsx` | iframe 页面预览 |
| `src/components/VisualEditor/styles.module.css` | 样式 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `server.js` | 添加 /api/project/* 路由 + /api/proxy/:port/* 代理 |
| `src/App.jsx` | 添加 viewMode='visual' 条件渲染 |
| `src/AppBase.jsx` | 添加 project 状态管理 |
| `src/components/AppHeader.jsx` | 添加 Visual Editor 切换按钮 |
| `src/i18n.js` | 添加 i18n 键 |
| `i18n.js` | 添加服务端 i18n 键 |

---

## API 设计

### POST /api/project/start

**请求:**
```json
{
  "projectPath": "/path/to/react-project",
  "command": "npm run dev",
  "readyPattern": "ready|VITE|localhost"
}
```

**响应:**
```json
{
  "success": true,
  "pid": 12345,
  "port": 3000,
  "status": "running"
}
```

### POST /api/project/stop

**请求:**
```json
{
  "pid": 12345
}
```

### GET /api/project/status

**响应:**
```json
{
  "running": true,
  "pid": 12345,
  "port": 3000,
  "projectPath": "/path/to/react-project",
  "uptime": 120
}
```

### GET /api/proxy/:port/*

代理请求到 `localhost:port`，自动处理请求/响应转发。

---

## 依赖

- Phase 1 完成 (开发环境可用, feature 分支已创建)
- 无新 npm 依赖 (使用 Node.js 内置模块)

---

## 风险

| 风险 | 缓解措施 |
|------|----------|
| 进程启动超时 | 可配置超时 + 错误提示 |
| 端口发现失败 | 允许手动输入端口 |
| WebSocket 消息漏发 | 首次连接时拉取完整状态 |

---

## 验收标准

1. 可以通过 UI 输入项目路径和启动命令
2. 点击启动后能看到项目启动日志
3. 项目启动完成后 iframe 自动加载页面
4. 可以停止项目
5. 页面刷新后能恢复之前的项目状态
