# Phase 3 Context: 元素选择器

## 决策摘要

| 决策点 | 决定 | 原因 |
|--------|------|------|
| 注入方式 | 代理注入 HTML | 通用性最好，不依赖构建工具 |
| 跨域通信 | postMessage | 标准 API，安全可控 |
| 高亮实现 | fixed 定位 overlay div | 性能好，不影响目标页面布局 |
| 选择器模式 | 开关切换 | 只在开启时拦截鼠标事件 |

---

## 技术方案

### 1. 代理注入 Inspector 脚本

**问题:** iframe 直接加载 `localhost:3001`（跨域），无法从父窗口操作 DOM

**方案:** Visual 模式下 iframe 通过代理加载，代理在 HTML 响应中注入 inspector 脚本

```
用户页面 → /api/proxy/3001/page.html → server 代理 → 注入 <script> → 返回给 iframe
```

注入位置: `</body>` 前插入 `<script src="/inspector-inject.js"></script>`

### 2. Inspector 注入脚本 (inspector-inject.js)

运行在 iframe 内部，负责:
- 鼠标悬停高亮（overlay div）
- 点击选中元素
- ESC 取消选中
- Alt+↑ 选择父元素
- 通过 postMessage 向父窗口发送元素信息

### 3. postMessage 协议

```javascript
// iframe → parent
{ source: 'cc-visual-inspector', type: 'ready' }
{ source: 'cc-visual-inspector', type: 'hover', data: elementInfo }
{ source: 'cc-visual-inspector', type: 'select', data: elementInfo }
{ source: 'cc-visual-inspector', type: 'deselect' }

// parent → iframe
{ source: 'cc-visual-parent', type: 'enable' }
{ source: 'cc-visual-parent', type: 'disable' }
```

### 4. ElementInfo 数据结构

```javascript
{
  tag: 'div',
  id: 'app',
  className: 'container mx-auto',
  text: '...',  // innerText 前 100 字符
  rect: { x, y, width, height },
  attributes: { 'data-testid': '...', role: '...' },
  computedStyle: { display, position, fontSize, color, backgroundColor },
  xpath: '/html/body/div[1]/main/section[2]',
  selector: 'div#app > main > section:nth-child(2)',
}
```

---

## 文件修改清单

### 新增文件

| 文件 | 功能 |
|------|------|
| `cc-viewer/public/inspector-inject.js` | iframe 内注入的 inspector 脚本 |
| `cc-viewer/src/components/VisualEditor/ElementInfo.jsx` | 选中元素信息面板 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `cc-viewer/server.js` | 代理路由注入 script 标签（仅 HTML 响应） |
| `cc-viewer/src/components/VisualEditor/PagePreview.jsx` | 切回代理加载 + 监听 postMessage |
| `cc-viewer/src/components/VisualEditor/styles.module.css` | ElementInfo 面板样式 |
| `cc-viewer/src/App.jsx` | 传递 selectedElement 状态 |
| `cc-viewer/src/i18n.js` | 添加 inspector 相关 i18n 键 |

---

## 依赖

- Phase 2 完成（项目启动器 + iframe 预览）
- `/api/proxy/:port/*` 代理路由已存在（Phase 2 已添加）

---

## 风险

| 风险 | 缓解措施 |
|------|----------|
| CSP 阻止脚本注入 | 代理时移除 CSP 头 |
| 目标页面有同名全局变量 | inspector 使用唯一前缀 `__ccInspector__` |
| HMR/热更新干扰 | inspector 脚本自行检测重复初始化 |
