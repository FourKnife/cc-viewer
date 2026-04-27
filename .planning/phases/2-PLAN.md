---
phase: 02-project-launcher
plan: 01
type: execute
wave: 1
depends_on: [01-01]
files_modified:
  - cc-viewer/lib/project-manager.js
  - cc-viewer/server.js
  - cc-viewer/src/App.jsx
  - cc-viewer/src/AppBase.jsx
  - cc-viewer/src/components/AppHeader.jsx
  - cc-viewer/src/components/VisualEditor/index.jsx
  - cc-viewer/src/components/VisualEditor/ProjectLauncher.jsx
  - cc-viewer/src/components/VisualEditor/PagePreview.jsx
  - cc-viewer/src/i18n.js
  - cc-viewer/i18n.js
autonomous: true
requirements: [FR-001, FR-002]
must_haves:
  truths:
    - "Visual Editor Tab 可以在 UI 中切换显示"
    - "可以输入项目路径和启动命令"
    - "点击启动后项目进程正常运行"
    - "iframe 能通过代理加载项目页面"
    - "可以停止正在运行的项目"
  artifacts:
    - path: "cc-viewer/lib/project-manager.js"
      provides: "项目进程管理模块"
    - path: "cc-viewer/src/components/VisualEditor/"
      provides: "Visual Editor 组件目录"
  key_links:
    - from: "ProjectLauncher"
      to: "/api/project/start"
      via: "fetch POST"
    - from: "/api/proxy/:port"
      to: "localhost:port"
      via: "HTTP proxy"
---

<objective>
实现项目启动器和页面嵌入功能，用户可以启动本地 React 项目并在 iframe 中预览。

Purpose: 为 Visual Editor 建立基础框架，实现项目启动和页面展示
Output: 新的 Visual Editor Tab + 项目启动/停止/预览能力
</objective>

<execution_context>
@.planning/phases/2-CONTEXT.md
@.planning/research/1-RESEARCH.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: 创建 lib/project-manager.js 模块</name>
  <files>cc-viewer/lib/project-manager.js</files>
  <action>
创建项目进程管理模块:

```javascript
// lib/project-manager.js
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

class ProjectManager extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.projectPath = null;
    this.port = null;
    this.status = 'stopped'; // stopped | starting | running | error
    this.outputBuffer = '';
  }

  async start(projectPath, command = 'npm run dev', options = {}) {
    if (this.process) await this.stop();
    
    this.projectPath = projectPath;
    this.status = 'starting';
    this.outputBuffer = '';
    this.emit('status', this.getStatus());

    const [cmd, ...args] = command.split(' ');
    this.process = spawn(cmd, args, {
      cwd: projectPath,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    const readyPattern = options.readyPattern || /ready|VITE|localhost:(\d+)|Local:\s+http/i;
    const timeout = options.timeout || 60000;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.status = 'error';
        this.emit('status', this.getStatus());
        reject(new Error('Project start timeout'));
      }, timeout);

      const onData = (data) => {
        const text = data.toString();
        this.outputBuffer += text;
        this.emit('output', text);

        // 检测端口
        const portMatch = text.match(/localhost:(\d+)|127\.0\.0\.1:(\d+)|Local:\s+http:\/\/[^:]+:(\d+)/);
        if (portMatch) {
          this.port = parseInt(portMatch[1] || portMatch[2] || portMatch[3]);
        }

        // 检测就绪
        if (readyPattern.test(text) && this.port) {
          clearTimeout(timer);
          this.status = 'running';
          this.emit('status', this.getStatus());
          resolve(this.getStatus());
        }
      };

      this.process.stdout.on('data', onData);
      this.process.stderr.on('data', onData);

      this.process.on('error', (err) => {
        clearTimeout(timer);
        this.status = 'error';
        this.emit('status', this.getStatus());
        reject(err);
      });

      this.process.on('exit', (code) => {
        clearTimeout(timer);
        this.status = 'stopped';
        this.process = null;
        this.emit('status', this.getStatus());
        this.emit('exit', code);
      });
    });
  }

  async stop() {
    if (this.process) {
      this.process.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 500));
      if (this.process) this.process.kill('SIGKILL');
      this.process = null;
    }
    this.status = 'stopped';
    this.port = null;
    this.emit('status', this.getStatus());
  }

  getStatus() {
    return {
      running: this.status === 'running',
      status: this.status,
      pid: this.process?.pid || null,
      port: this.port,
      projectPath: this.projectPath,
    };
  }

  getOutputBuffer() {
    return this.outputBuffer;
  }
}

export const projectManager = new ProjectManager();
export default projectManager;
```
  </action>
  <verify>
    <automated>test -f cc-viewer/lib/project-manager.js && node -c cc-viewer/lib/project-manager.js && echo "Syntax OK"</automated>
  </verify>
  <done>
- project-manager.js 创建完成
- 导出 projectManager 单例
- 支持 start/stop/getStatus
  </done>
</task>

<task type="auto">
  <name>Task 2: 添加 server.js 项目管理路由</name>
  <files>cc-viewer/server.js</files>
  <action>
在 server.js 中添加项目管理 API 和端口代理:

1. 在文件顶部 import project-manager:
```javascript
import { projectManager } from './lib/project-manager.js';
```

2. 在 handleRequest 函数中添加路由 (约 L250 附近):

```javascript
// === 项目管理 API ===

// POST /api/project/start
if (url === '/api/project/start' && method === 'POST') {
  let body = '';
  req.on('data', chunk => { body += chunk; if (body.length > MAX_POST_BODY) req.destroy(); });
  req.on('end', async () => {
    try {
      const { projectPath, command, readyPattern } = JSON.parse(body);
      if (!projectPath) throw new Error('projectPath required');
      const result = await projectManager.start(projectPath, command, { readyPattern });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
  return;
}

// POST /api/project/stop
if (url === '/api/project/stop' && method === 'POST') {
  projectManager.stop();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true }));
  return;
}

// GET /api/project/status
if (url === '/api/project/status' && method === 'GET') {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(projectManager.getStatus()));
  return;
}

// GET /api/proxy/:port/* - 代理到项目端口
const proxyMatch = url.match(/^\/api\/proxy\/(\d+)(\/.*)?$/);
if (proxyMatch) {
  const targetPort = proxyMatch[1];
  const targetPath = proxyMatch[2] || '/';
  const targetUrl = `http://127.0.0.1:${targetPort}${targetPath}`;
  
  try {
    const proxyRes = await fetch(targetUrl, {
      method,
      headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
    });
    res.writeHead(proxyRes.status, Object.fromEntries(proxyRes.headers));
    const buffer = await proxyRes.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
  }
  return;
}
```

3. 在 WebSocket 连接时广播项目状态:
```javascript
projectManager.on('status', (status) => {
  sendToClients({ type: 'project_status', ...status });
});
projectManager.on('output', (text) => {
  sendToClients({ type: 'project_output',  text });
});
```
  </action>
  <verify>
    <automated>grep -q "projectManager" cc-viewer/server.js && grep -q "/api/project/start" cc-viewer/server.js && echo "Routes added"</automated>
  </verify>
  <done>
- /api/project/start 路由添加
- /api/project/stop 路由添加
- /api/project/status 路由添加
- /api/proxy/:port/* 代理添加
- WebSocket 状态广播添加
  </done>
</task>

<task type="auto">
  <name>Task 3: 创建 VisualEditor 组件</name>
  <files>cc-viewer/src/components/VisualEditor/</files>
  <action>
1. 创建目录: `mkdir -p cc-viewer/src/components/VisualEditor`

2. 创建 index.jsx (Tab 容器):
```jsx
import React from 'react';
import { Layout } from 'antd';
import ProjectLauncher from './ProjectLauncher';
import PagePreview from './PagePreview';
import styles from './styles.module.css';

export default function VisualEditor({ projectStatus, onStartProject, onStopProject }) {
  return (
    <Layout className={styles.container}>
      <Layout.Sider width={320} className={styles.sider}>
        <ProjectLauncher 
          status={projectStatus}
          onStart={onStartProject}
          onStop={onStopProject}
        />
      </Layout.Sider>
      <Layout.Content className={styles.content}>
        <PagePreview port={projectStatus?.port} />
      </Layout.Content>
    </Layout>
  );
}
```

3. 创建 ProjectLauncher.jsx:
```jsx
import React, { useState } from 'react';
import { Input, Button, Space, Typography, Alert } from 'antd';
import { PlayCircleOutlined, StopOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './styles.module.css';

export default function ProjectLauncher({ status, onStart, onStop }) {
  const [projectPath, setProjectPath] = useState('');
  const [command, setCommand] = useState('npm run dev');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStart = async () => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      await onStart(projectPath, command);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isRunning = status?.status === 'running';
  const isStarting = status?.status === 'starting';

  return (
    <div className={styles.launcher}>
      <Typography.Title level={5}>{t('visual.projectLauncher')}</Typography.Title>
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Typography.Text type="secondary">{t('visual.projectPath')}</Typography.Text>
          <Input
            placeholder="/path/to/react-project"
            value={projectPath}
            onChange={e => setProjectPath(e.target.value)}
            disabled={isRunning || isStarting}
            prefix={<FolderOpenOutlined />}
          />
        </div>
        
        <div>
          <Typography.Text type="secondary">{t('visual.startCommand')}</Typography.Text>
          <Input
            placeholder="npm run dev"
            value={command}
            onChange={e => setCommand(e.target.value)}
            disabled={isRunning || isStarting}
          />
        </div>

        {error && <Alert type="error" message={error} showIcon />}
        
        {isRunning && (
          <Alert 
            type="success" 
            message={t('visual.running', { port: status.port })} 
            showIcon 
          />
        )}

        <Space>
          {!isRunning ? (
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
              loading={loading || isStarting}
              disabled={!projectPath}
            >
              {isStarting ? t('visual.starting') : t('visual.start')}
            </Button>
          ) : (
            <Button 
              danger 
              icon={<StopOutlined />}
              onClick={onStop}
            >
              {t('visual.stop')}
            </Button>
          )}
        </Space>
      </Space>
    </div>
  );
}
```

4. 创建 PagePreview.jsx:
```jsx
import React from 'react';
import { Empty } from 'antd';
import { t } from '../../i18n';
import styles from './styles.module.css';

export default function PagePreview({ port }) {
  if (!port) {
    return (
      <div className={styles.emptyPreview}>
        <Empty description={t('visual.noProject')} />
      </div>
    );
  }

  const proxyUrl = `/api/proxy/${port}/`;

  return (
    <iframe
      src={proxyUrl}
      className={styles.iframe}
      title="Project Preview"
    />
  );
}
```

5. 创建 styles.module.css:
```css
.container {
  height: 100%;
  background: var(--bg-secondary);
}
.sider {
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  padding: 16px;
  overflow-y: auto;
}
.content {
  padding: 0;
  background: var(--bg-secondary);
}
.launcher {
  padding: 8px;
}
.emptyPreview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.iframe {
  width: 100%;
  height: 100%;
  border: none;
}
```
  </action>
  <verify>
    <automated>test -d cc-viewer/src/components/VisualEditor && ls cc-viewer/src/components/VisualEditor/</automated>
  </verify>
  <done>
- VisualEditor 目录创建
- index.jsx 创建
- ProjectLauncher.jsx 创建
- PagePreview.jsx 创建
- styles.module.css 创建
  </done>
</task>

<task type="auto">
  <name>Task 4: 集成到 App.jsx 和 AppHeader</name>
  <files>cc-viewer/src/App.jsx, cc-viewer/src/AppBase.jsx, cc-viewer/src/components/AppHeader.jsx</files>
  <action>
1. 在 AppBase.jsx 添加 project 状态:
```javascript
// state 中添加
projectStatus: null,

// componentDidMount 中监听项目状态
this.eventSource.addEventListener('project_status', (e) => {
  this.setState({ projectStatus: JSON.parse(e.data) });
});
```

2. 在 AppBase.jsx 添加项目控制方法:
```javascript
handleStartProject = async (projectPath, command) => {
  const res = await fetch(apiUrl('/api/project/start'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath, command }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to start');
  }
  return res.json();
};

handleStopProject = async () => {
  await fetch(apiUrl('/api/project/stop'), { method: 'POST' });
};
```

3. 在 App.jsx render 中添加 viewMode='visual':
```jsx
// 在 chatViewWrapper 后添加
{viewMode === 'visual' && (
  <VisualEditor
    projectStatus={this.state.projectStatus}
    onStartProject={this.handleStartProject}
    onStopProject={this.handleStopProject}
  />
)}
```

4. 在 App.jsx 顶部 import:
```javascript
import VisualEditor from './components/VisualEditor';
```

5. 在 AppHeader.jsx 添加切换按钮 (与 raw/chat 切换类似)
  </action>
  <verify>
    <automated>grep -q "VisualEditor" cc-viewer/src/App.jsx && grep -q "projectStatus" cc-viewer/src/AppBase.jsx && echo "Integration done"</automated>
  </verify>
  <done>
- AppBase.jsx 项目状态添加
- App.jsx VisualEditor 渲染添加
- AppHeader 切换按钮添加
  </done>
</task>

<task type="auto">
  <name>Task 5: 添加 i18n 键</name>
  <files>cc-viewer/src/i18n.js, cc-viewer/i18n.js</files>
  <action>
在 src/i18n.js 添加前端 i18n 键:

```javascript
// 在 zh 对象中添加
visual: {
  projectLauncher: '项目启动器',
  projectPath: '项目路径',
  startCommand: '启动命令',
  start: '启动',
  starting: '启动中...',
  stop: '停止',
  running: '运行中 (端口 {port})',
  noProject: '请先启动一个项目',
  tab: '可视化编辑',
},

// 在 en 对象中添加
visual: {
  projectLauncher: 'Project Launcher',
  projectPath: 'Project Path',
  startCommand: 'Start Command',
  start: 'Start',
  starting: 'Starting...',
  stop: 'Stop',
  running: 'Running (port {port})',
  noProject: 'Please start a project first',
  tab: 'Visual Editor',
},
```
  </action>
  <verify>
    <automated>grep -q "visual:" cc-viewer/src/i18n.js && echo "i18n keys added"</automated>
  </verify>
  <done>
- 前端 i18n 键添加 (zh/en)
  </done>
</task>

<task type="auto">
  <name>Task 6: 构建验证</name>
  <files>cc-viewer/</files>
  <action>
1. 运行构建: `cd cc-viewer && npm run build`
2. 检查构建输出无错误
3. 启动服务器测试: `npm start`
4. 浏览器访问验证 Visual Editor Tab 存在
  </action>
  <verify>
    <automated>cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
- npm run build 成功
- 无编译错误
- Visual Editor Tab 可切换
  </done>
</task>

</tasks>

<verification>
## Phase 2 完成检查

1. **后端模块**
   - [ ] lib/project-manager.js 存在且语法正确
   - [ ] /api/project/start 路由工作
   - [ ] /api/project/stop 路由工作
   - [ ] /api/proxy/:port 代理工作

2. **前端组件**
   - [ ] VisualEditor Tab 可切换显示
   - [ ] ProjectLauncher 可输入项目路径
   - [ ] PagePreview 可显示 iframe

3. **端到端测试**
   - [ ] 输入测试项目路径
   - [ ] 点击启动，看到状态变化
   - [ ] 项目启动后 iframe 显示页面
   - [ ] 点击停止，项目停止
</verification>

<success_criteria>
1. `ls cc-viewer/lib/project-manager.js` 文件存在
2. `curl http://localhost:7008/api/project/status` 返回 JSON
3. Visual Editor Tab 在 UI 中可切换
4. 启动测试项目后 iframe 能显示页面
</success_criteria>

<output>
After completion, create `.planning/phases/02-project-launcher/02-01-SUMMARY.md`
</output>
