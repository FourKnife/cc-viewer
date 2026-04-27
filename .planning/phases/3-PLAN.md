---
phase: 03-element-selector
plan: 01
type: execute
wave: 1
depends_on: [02-01]
files_modified:
  - cc-viewer/public/inspector-inject.js
  - cc-viewer/server.js
  - cc-viewer/src/components/VisualEditor/PagePreview.jsx
  - cc-viewer/src/components/VisualEditor/ElementInfo.jsx
  - cc-viewer/src/components/VisualEditor/styles.module.css
  - cc-viewer/src/App.jsx
  - cc-viewer/src/AppBase.jsx
  - cc-viewer/src/i18n.js
autonomous: true
requirements: [FR-003]
must_haves:
  truths:
    - "鼠标悬停时元素被高亮显示"
    - "点击元素后显示选中状态和元素信息"
    - "ESC 键取消选中"
    - "Alt+↑ 选择父元素"
    - "选中元素信息在左侧面板展示"
  artifacts:
    - path: "cc-viewer/public/inspector-inject.js"
      provides: "iframe 内 inspector 注入脚本"
    - path: "cc-viewer/src/components/VisualEditor/ElementInfo.jsx"
      provides: "元素信息展示面板"
  key_links:
    - from: "inspector-inject.js"
      to: "PagePreview.jsx"
      via: "postMessage"
    - from: "/api/proxy/:port"
      to: "iframe"
      via: "HTML 注入 script 标签"
---

<objective>
实现页面元素的悬停高亮和点击选择功能。

Purpose: 让用户可以在 iframe 预览中选中 DOM 元素，为后续 AI 修改提供目标
Output: 悬停高亮 + 点击选中 + 元素信息面板 + 快捷键
</objective>

<execution_context>
@.planning/phases/3-CONTEXT.md
@.planning/phases/2-CONTEXT.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: 创建 inspector-inject.js 注入脚本</name>
  <files>cc-viewer/public/inspector-inject.js</files>
  <action>
创建 `public/inspector-inject.js`，运行在 iframe 内部:

```javascript
(function() {
  if (window.__ccInspectorInitialized) return;
  window.__ccInspectorInitialized = true;

  let enabled = true;
  let selectedElement = null;
  let hoverOverlay = null;
  let selectOverlay = null;

  // 创建 overlay
  function createOverlay(color, id) {
    const div = document.createElement('div');
    div.id = id;
    div.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      display: none;
      border: 2px solid ${color};
      background: ${color}22;
      transition: all 0.1s ease;
    `;
    document.body.appendChild(div);
    return div;
  }

  function positionOverlay(overlay, el) {
    if (!el) { overlay.style.display = 'none'; return; }
    const rect = el.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';
  }

  function getElementInfo(el) {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);
    // 构建简易 CSS 选择器
    let selector = el.tagName.toLowerCase();
    if (el.id) selector += '#' + el.id;
    else if (el.className && typeof el.className === 'string')
      selector += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.');

    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      className: (typeof el.className === 'string') ? el.className : '',
      text: (el.innerText || '').slice(0, 100),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      selector,
      computedStyle: {
        display: computed.display,
        position: computed.position,
        fontSize: computed.fontSize,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      },
    };
  }

  function sendToParent(type, data) {
    window.parent.postMessage({ source: 'cc-visual-inspector', type, data }, '*');
  }

  // 事件处理
  function onMouseOver(e) {
    if (!enabled || e.target === hoverOverlay || e.target === selectOverlay) return;
    positionOverlay(hoverOverlay, e.target);
    sendToParent('hover', getElementInfo(e.target));
  }

  function onMouseOut() {
    if (!enabled) return;
    hoverOverlay.style.display = 'none';
  }

  function onClick(e) {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    selectedElement = e.target;
    positionOverlay(selectOverlay, selectedElement);
    hoverOverlay.style.display = 'none';
    sendToParent('select', getElementInfo(selectedElement));
  }

  function onKeyDown(e) {
    if (!enabled) return;
    if (e.key === 'Escape') {
      selectedElement = null;
      selectOverlay.style.display = 'none';
      sendToParent('deselect');
    }
    if (e.altKey && e.key === 'ArrowUp' && selectedElement && selectedElement.parentElement) {
      selectedElement = selectedElement.parentElement;
      positionOverlay(selectOverlay, selectedElement);
      sendToParent('select', getElementInfo(selectedElement));
    }
  }

  // 接收父窗口消息
  window.addEventListener('message', (e) => {
    if (e.data?.source !== 'cc-visual-parent') return;
    if (e.data.type === 'enable') { enabled = true; }
    if (e.data.type === 'disable') {
      enabled = false;
      hoverOverlay.style.display = 'none';
      selectOverlay.style.display = 'none';
    }
  });

  // 初始化
  hoverOverlay = createOverlay('#1668dc', '__cc_hover_overlay');
  selectOverlay = createOverlay('#ff6b35', '__cc_select_overlay');

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  sendToParent('ready');
})();
```
  </action>
  <verify>
    <automated>test -f cc-viewer/public/inspector-inject.js && node -c cc-viewer/public/inspector-inject.js && echo "Syntax OK"</automated>
  </verify>
  <done>
- inspector-inject.js 创建完成
- 支持 hover/click/escape/alt+up
- postMessage 通信协议实现
  </done>
</task>

<task type="auto">
  <name>Task 2: 修改代理路由注入 script 标签</name>
  <files>cc-viewer/server.js</files>
  <action>
修改 `/api/proxy/:port/*` 路由，在 HTML 响应中注入 inspector 脚本:

1. 检测响应 content-type 是否为 HTML
2. 如果是 HTML，在 `</body>` 或 `</html>` 前注入 `<script src="/inspector-inject.js"></script>`
3. 同时移除 CSP 头（防止阻止注入脚本）
4. 添加 `/inspector-inject.js` 静态文件路由

```javascript
// 修改现有 proxy 路由:
// 如果是 HTML 响应，注入 inspector 脚本
const contentType = respHeaders['content-type'] || '';
if (contentType.includes('text/html')) {
  // 移除 CSP 防止阻止注入
  delete respHeaders['content-security-policy'];
  delete respHeaders['content-security-policy-report-only'];
  let html = Buffer.from(buffer).toString('utf-8');
  const injectScript = '<script src="/inspector-inject.js"></script>';
  if (html.includes('</body>')) {
    html = html.replace('</body>', injectScript + '</body>');
  } else if (html.includes('</html>')) {
    html = html.replace('</html>', injectScript + '</html>');
  } else {
    html += injectScript;
  }
  delete respHeaders['content-length']; // 长度变了
  res.writeHead(proxyRes.status, respHeaders);
  res.end(html);
} else {
  res.writeHead(proxyRes.status, respHeaders);
  res.end(Buffer.from(buffer));
}
```

添加静态文件路由 (在 proxy 路由之前):
```javascript
// GET /inspector-inject.js
if (url === '/inspector-inject.js' && method === 'GET') {
  const filePath = join(__dirname, 'public', 'inspector-inject.js');
  if (existsSync(filePath)) {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
  return;
}
```
  </action>
  <verify>
    <automated>grep -q "inspector-inject" cc-viewer/server.js && echo "Injection route added"</automated>
  </verify>
  <done>
- 代理路由注入 script 标签
- CSP 头移除
- /inspector-inject.js 静态路由添加
  </done>
</task>

<task type="auto">
  <name>Task 3: PagePreview 切回代理模式 + postMessage 监听</name>
  <files>cc-viewer/src/components/VisualEditor/PagePreview.jsx</files>
  <action>
修改 PagePreview:
1. iframe src 改为通过代理加载: `/api/proxy/${port}${path}`
2. 添加 postMessage 监听，接收 inspector 事件
3. 将选中元素信息通过 callback 上报

```jsx
// 新增 props: onElementHover, onElementSelect, onElementDeselect
// useEffect 监听 message 事件
useEffect(() => {
  function handleMessage(e) {
    if (e.data?.source !== 'cc-visual-inspector') return;
    switch (e.data.type) {
      case 'hover': onElementHover?.(e.data.data); break;
      case 'select': onElementSelect?.(e.data.data); break;
      case 'deselect': onElementDeselect?.(); break;
      case 'ready': console.log('[Visual] Inspector ready'); break;
    }
  }
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, [onElementHover, onElementSelect, onElementDeselect]);
```
  </action>
  <verify>
    <automated>grep -q "cc-visual-inspector" cc-viewer/src/components/VisualEditor/PagePreview.jsx && echo "postMessage listener added"</automated>
  </verify>
  <done>
- iframe 通过代理加载
- postMessage 监听实现
- 元素事件回调上报
  </done>
</task>

<task type="auto">
  <name>Task 4: 创建 ElementInfo 面板</name>
  <files>cc-viewer/src/components/VisualEditor/ElementInfo.jsx, cc-viewer/src/components/VisualEditor/styles.module.css</files>
  <action>
创建 ElementInfo 组件，展示选中元素的信息:

```jsx
// ElementInfo.jsx
// 展示: tag, id, class, 尺寸, 关键样式
// 提供 "用 AI 修改" 按钮
export default function ElementInfo({ element, onAskAI }) {
  if (!element) return null;
  return (
    <div className={styles.elementInfo}>
      <Typography.Title level={5}>{t('visual.selectedElement')}</Typography.Title>
      <div className={styles.elementTag}>&lt;{element.tag}&gt;</div>
      {element.id && <div>ID: {element.id}</div>}
      {element.className && <div>Class: {element.className}</div>}
      <div>Size: {element.rect.width} × {element.rect.height}</div>
      <div>Position: ({element.rect.x}, {element.rect.y})</div>
      <div className={styles.elementSelector}>Selector: {element.selector}</div>
    </div>
  );
}
```
  </action>
  <verify>
    <automated>test -f cc-viewer/src/components/VisualEditor/ElementInfo.jsx && echo "ElementInfo created"</automated>
  </verify>
  <done>
- ElementInfo 组件创建
- 显示 tag/id/class/尺寸/位置/选择器
  </done>
</task>

<task type="auto">
  <name>Task 5: 集成到 App 状态和布局</name>
  <files>cc-viewer/src/App.jsx, cc-viewer/src/AppBase.jsx</files>
  <action>
1. AppBase.jsx 添加 `selectedElement` 和 `hoveredElement` state
2. App.jsx 传递 element 回调给 PagePreview
3. 在左侧 ProjectLauncher 下方显示 ElementInfo
  </action>
  <verify>
    <automated>grep -q "selectedElement" cc-viewer/src/AppBase.jsx && grep -q "ElementInfo" cc-viewer/src/App.jsx && echo "Integration done"</automated>
  </verify>
  <done>
- selectedElement 状态管理
- ElementInfo 面板集成到左侧
  </done>
</task>

<task type="auto">
  <name>Task 6: 添加 i18n 键 + 构建验证</name>
  <files>cc-viewer/src/i18n.js</files>
  <action>
1. 添加 visual.selectedElement, visual.inspectorEnabled 等 i18n 键
2. 运行 npm run build 验证
  </action>
  <verify>
    <automated>cd /Users/duanrong/yuyan/duanrong/cleffa/cc-viewer && npm run build 2>&1 | tail -3</automated>
  </verify>
  <done>
- i18n 键添加
- 构建成功
  </done>
</task>

</tasks>

<verification>
## Phase 3 完成检查

1. **Inspector 注入**
   - [ ] 代理加载 HTML 时自动注入 script
   - [ ] /inspector-inject.js 路由可访问

2. **悬停高亮**
   - [ ] 鼠标移到元素上时蓝色边框高亮
   - [ ] 鼠标离开时高亮消失

3. **点击选中**
   - [ ] 点击元素后橙色边框选中
   - [ ] 选中后左侧面板显示元素信息

4. **快捷键**
   - [ ] ESC 取消选中
   - [ ] Alt+↑ 选择父元素

5. **端到端**
   - [ ] 启动项目 → 加载页面 → 悬停高亮 → 点击选中 → 查看信息 → ESC 取消
</verification>

<success_criteria>
1. 代理 HTML 响应中包含 inspector-inject.js script 标签
2. iframe 内悬停元素有蓝色高亮
3. 点击元素后左侧面板显示 tag/class/尺寸信息
4. ESC 和 Alt+↑ 快捷键工作
5. npm run build 成功
</success_criteria>
