# SSE 实时流式打字机效果 — 工作交接文档

> **给下一次会话的 Claude / 开发者**：本文档是一份**可直接接手**的工作手册，包含当前状态、未完成任务、验证流程、回退方案。
>
> 日期：2026-04-17（多轮迭代）
> cc-viewer 当前版本：1.6.160（已发布），本次工作未发布
> 路径：`/Users/sky/.npm-global/lib/node_modules/cc-viewer/`

---

## 📝 实施状态（v2 — 2026-04-17 后续迭代，覆盖 v1 基线）

本文件下方 v1 基线描述了最初"SSE 独立 channel + overlay"方案。后续经历用户实测反馈多轮迭代，**实际生效的方案有重要变化**，以此章节为准：

### 实际 12 个 modified 文件（非原 9 个）
interceptor.js / lib/interceptor-core.js / server.js / src/App.jsx / src/AppBase.jsx / src/Mobile.jsx / **src/components/ChatMessage.jsx** / src/components/ChatView.jsx / src/components/ChatView.module.css / **src/components/MarkdownBlock.jsx** / **src/components/MarkdownBlock.module.css** / src/i18n.js

### 关键设计差异（跟 v1 不同）

| 方面 | v1 基线 | v2 实际 |
|---|---|---|
| 光标 `▌` 位置 | Divider "正在生成 ▌" 标签里 | **内联在 MarkdownBlock 最后叶子元素末尾**（CSS `::after` 多选择器，覆盖段落/列表/代码块/引用/表格）|
| Last Response 显示 | 流式中保留上一轮（淡化方案 B） | **方案 C**：流式中 `filteredLastResponseItems=null` 让 overlay **占据** Last Response 位置，避免双区叠加导致纵向弹动 |
| "正在生成" 分隔 Divider | 保留 | **删除**（头像 + MainAgent 标签 + 末尾光标已足够语义）|
| thinking Collapse | 始终展开 | **controlled activeKey**：text 未开始展开（让用户看推理），text 开始后**带 ~250ms 动画折叠**，避免切正式 entry 的高度跳变 |
| streamingLatest 清除 | stream-progress listener 10s timeout + onerror 即时清 | **去掉 10s timeout + onerror 不清**；改由最终 entry 原子清除（正常）+ `_reconnectSSE`（连接真死时）|
| 主进程拿 live port | `process.env.CCVIEWER_PORT = String(port)` | **`setLivePort(port)` 模块级变量**，避免主进程 env 污染被 Bash 工具 / MCP / Electron tab-worker 继承 |
| /api/stream-chunk 鉴权 | 无 | 校验 `x-cc-viewer-internal: 1` header + 仅接 127.0.0.1，防同机伪造注入 |
| Loading spinner | 始终跟随 isStreaming | SSE overlay 活跃时额外隐藏（无 SSE 保留 fallback）|
| 吸底 | 仅 Virtuoso 分支 | **所有分支**双 rAF（桌面 / iOS / iPad 非 Virtuoso 也生效）|
| pendingBubble / streamingLiveItem 顺序 | streamingLive 在 pendingBubble 之前 | pendingBubble 在 streamingLive **之前**（用户发新 prompt 先显示，再出响应，时间顺序正确）|
| roleFilter 反选 assistant | streamingLiveItem 仍渲染 | 遵从过滤语义，skip streamingLiveItem |
| scrollToTimestamp 流式期间 | `_scrollTargetRef` 挂空 | 若 target 指向 Last Response 位置且 filteredLastResponseItems=null，ref 转挂 streamingLiveItem 兜底 |

### 生命周期示意（v2 权威）

```
user 发 prompt  → pendingBubble 出现（位置：Last Response 正下方）
              ↓
interceptor 拦截 API → skeleton POST → 前端 streamingLatest 首次 setState
              ↓
streamingLiveItem 出现（占 Last Response 位置，原 Last Response 隐藏）
thinking 阶段：Collapse 展开，光标 ▌ 在 thinking 末
text 阶段：thinking 带动画折叠，光标跳到 text 末
吸底跟进
              ↓
流结束：interceptor appendFileSync → log-watcher 推送最终 entry
前端 _flushPendingEntries 原子 setState：
  - requests/mainAgentSessions 更新（含 Last Response）
  - streamingLatest = null（同一 setState 原子清除 overlay）
  - pendingBubble 自然消失（pendingInput 被清）
视觉：overlay 直接换回成"上一轮" Last Response 位置的新完整内容，无跳变
```

### v2 新增需留意

- **interceptor-core.js** `createStreamAssembler` 是新 export，单元测试已补（test/stream-assembler.test.js）
- **server.js** `/api/stream-chunk` 鉴权：同机其他进程如需注入需要满足 loopback + `x-cc-viewer-internal` header
- **interceptor.js** `setLivePort(port)` — 由 server.js `listen` 回调调用，不再依赖 process.env

---

## 📜 v1 基线（历史参考，不再完全准确）

---

## 🚀 快速接手指南

### 最先做的 3 件事

1. **读一下当前 git 状态**
   ```bash
   cd /Users/sky/.npm-global/lib/node_modules/cc-viewer
   git status
   git diff --stat HEAD
   ```
   应该看到 9 个文件 modified（未 commit）：
   - interceptor.js, lib/interceptor-core.js, server.js
   - src/App.jsx, src/AppBase.jsx, src/Mobile.jsx
   - src/components/ChatView.jsx, src/components/ChatView.module.css, src/i18n.js

2. **确认当前分支和版本**
   ```bash
   git log --oneline -5
   cat package.json | grep version
   ```
   最后一个 commit 应是 `9b07556 feat: perm hook concurrency, clear context, git diff stats, bump 1.6.160`
   版本号仍是 `1.6.160`

3. **验证代码可构建和测试**
   ```bash
   npm run build  # 应成功
   npm run test 2>&1 | grep -E 'pass|fail'  # 应显示 850/850
   ```

---

## ⏳ 当前进度与未完成任务

### ✅ 已完成

- [x] 架构设计（独立 SSE event channel + streamingLatest state）
- [x] Backend: interceptor.js + interceptor-core.js + server.js
- [x] Frontend: AppBase.jsx + App.jsx + Mobile.jsx + ChatView.jsx + CSS + i18n
- [x] Review 团队审查（3 agent 并行，全部 pass）
- [x] Review 反馈修复（memory leak / stale chunk / cursor style）
- [x] Build + 850 tests 全绿

### ⏳ 用户**尚未验证**的事项

- [ ] **手动验证打字机效果**：用户需要重启 cc-viewer + 发长问题测试实际效果
- [ ] **决定是否 commit / push / npm publish**

### 🎯 下一步要做什么

**等待用户指令**。最常见的三种情况：

1. **用户确认测试通过 → commit/publish**
   ```bash
   # 用户同意后执行：
   # 1. 更新版本
   # 修改 package.json: "version": "1.6.160" → "1.6.161"
   # 修改 history.md 添加 changelog

   # 2. commit
   git add -A
   git commit -m "$(cat <<'EOF'
   feat: SSE live typewriter effect for latest assistant message, bump 1.6.161

   - interceptor.js: incremental SSE parsing + throttled HTTP POST to cc-viewer
   - server.js: new /api/stream-chunk endpoint, broadcasts via 'stream-progress' named event
   - AppBase.jsx: streamingLatest state + event listener + atomic clear
   - ChatView.jsx: Live overlay rendering with blinking cursor
   - Zero impact on existing paths: log-watcher/dedup/filter/merge unchanged
   - mainAgent only; teammate/sub-agent behavior unchanged
   EOF
   )"

   # 3. push
   git push origin main

   # 4. npm publish
   npm publish
   ```

2. **用户反馈仍有问题 → 进一步排查**
   参考下方"调试指南"

3. **用户决定不发布 → 保持不 commit**
   代码已在工作区，随时可继续

---

## 📖 项目背景（必读）

### 用户需求
> "最新的一条对话能用 SSE，这样我就能看到模型实际上在干活在输入，而不是卡住了。"
>
> 第二次澄清："我需要的效果是 SSE 要能给实现前端对话中最新消息的打字机效果。"

### 核心问题
- **PTY 模式**: `interceptor.js` 拦截 SSE 流，完全结束后才写 JSONL，用户感觉卡住
- **SDK 模式**: 已有 `lib/sdk-manager.js:204-296` 的实时 stream_event
- 目标：**PTY 模式达到类似 SDK 的实时打字机效果**

### 关键约束（绝不可破坏）

| 文件 / 路径 | 状态 |
|------------|------|
| `lib/log-watcher.js` | **不改** |
| `src/utils/helpers.js::isRelevantRequest` | **不改** |
| `src/utils/sessionMerge.js::mergeMainAgentSessions` | **不改** |
| `lib/delta-reconstructor.js::createIncrementalReconstructor` | **不改** |
| `lib/sdk-manager.js` | **不改**（作为参考实现） |
| 最终 JSONL `appendFileSync` 时机/内容/格式 | **完全不变** |
| 前端 dedup（`_requestIndexMap`） | **不改** |
| Teammate / sub-agent 行为 | **完全不变**（只对 mainAgent 启用） |
| `CCVIEWER_PORT` 未设置 | **零开销完全退化** |

---

## 🏗️ 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│ Claude CLI 进程（PTY mode）                                      │
│                                                                  │
│ interceptor.js SSE reader 循环                                   │
│   ├─ livePendingBuffer 累积跨 chunk 的 \n\n 边界                 │
│   ├─ liveAssembler.feed(event) 增量解析                          │
│   └─ 节流 flush: 100ms OR 16KB OR content_block_stop             │
│        ↓                                                         │
│       sendStreamChunk(chunkEntry, seq) [fire-and-forget]         │
│        ↓ HTTP POST                                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ cc-viewer server.js (同 Node 进程/同机 localhost)                │
│                                                                  │
│ /api/stream-chunk handler                                        │
│   ├─ _liveStreamLastSeq 乱序防护（按 timestamp|url key 记录 seq）│
│   ├─ 8MB body 上限                                               │
│   └─ sendEventToClients(clients, 'stream-progress', {...})       │
└──────────────────────┬──────────────────────────────────────────┘
                       │ SSE event: stream-progress
┌──────────────────────▼──────────────────────────────────────────┐
│ 浏览器 AppBase.jsx                                               │
│                                                                  │
│ eventSource.addEventListener('stream-progress', handler)         │
│   ├─ stale 防护: 若 requests 已有同 ts 完成 entry, 丢弃          │
│   ├─ 10s timeout 自动清除                                        │
│   └─ setState({ streamingLatest: {timestamp, content, ...} })    │
│        ↓                                                         │
│       ChatView receives streamingLatest prop                     │
│        ↓                                                         │
│       Live overlay: [Divider "正在生成 ▌"] + [ChatMessage]       │
│                                                                  │
│ // 最终 entry 到达时                                             │
│ eventSource.onmessage → handleEventMessage → _flushPendingEntries│
│   原子 setState({                                                │
│     requests: [...],                                             │
│     mainAgentSessions: [...],                                    │
│     streamingLatest: null,  ← 在同一 setState 清除 overlay       │
│   })                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 为什么用这个方案（而不是早期失败方案）

**早期尝试**（已弃用）：partial entries 走正常 `data:` SSE 帧，期望前端 dedup 自动替换

**失败原因**（深度分析）：
1. `isRelevantRequest()` 过滤 `inProgress:true` 条目（helpers.js:484）
2. `mergeMainAgentSessions` 原地 mutation `lastSession.response`，但 session 对象引用不变
3. ChatView.jsx:376-378 的 `sessionsActuallyChanged` 基于对象引用比较 → 缓存不失效
4. `_sessionItemCache` 不重新计算

**当前方案**完全绕开这些路径：
- 用 named event `stream-progress`（不进入 `data:` onmessage → `_flushPendingEntries` 的 dedup/merge 链）
- 独立 state `streamingLatest`（不走 `mainAgentSessions`）
- ChatView 通过新 prop 独立触发渲染

---

## 🔧 实际改动细节（按文件）

### Backend

#### `interceptor.js`

**新增 imports**（line ~9-14）:
```js
import http from 'node:http';
import { assembleStreamMessage, createStreamAssembler, ... } from './lib/interceptor-core.js';
```

**新增函数**（line ~272）:
```js
function sendStreamChunk(entry, chunkSeq, onDone) {
  const port = process.env.CCVIEWER_PORT;
  if (!port) return;
  // fire-and-forget HTTP POST，500ms timeout，错误静默
  // onDone(ok: boolean) - ok=false 表示 413（调用方应禁用当次流式）
}
```

**关键修改 1**: 跳过磁盘预写（line ~511）
```js
if (requestEntry) {
  const willLiveStream = !!process.env.CCVIEWER_PORT && requestEntry.mainAgent && !_isTeammate;
  if (!willLiveStream) {  // ← 新增条件
    try { appendFileSync(LOG_FILE, JSON.stringify(requestEntry) + '\n---\n'); } catch {}
  }
}
```

**关键修改 2**: ReadableStream `start(controller)` 内
- 初始化 `liveAssembler`, `livePendingBuffer`, 节流变量等
- 首次 POST skeleton（seq=0）
- chunk 循环内: 按 `\n\n` 切完整 events → `liveAssembler.feed(ev)` → 节流触发 `liveFlush()`
- `liveFlush()` 构造 chunkEntry（克隆 requestEntry + 覆盖 response.body 为 snapshot）并 POST
- 合并机制: `liveFlushInFlight` + `liveHasPendingSnapshot`，setTimeout 50ms 后自动发送 pending snapshot
- 413 → `liveStreamEnabled=false` 禁用当次流式

#### `lib/interceptor-core.js`

**新增**（文件末尾，在 `findRecentLog` 之前）:
```js
export function createStreamAssembler() {
  let message = null;
  const contentBlocks = [];
  let currentBlockIndex = -1;
  return {
    feed(event) { /* 处理 message_start/content_block_*/thinking_delta/signature_delta 等 */ },
    snapshot() { /* 返回深拷贝 + partial tool_use 暴露 _inputJsonPartial */ },
    hasMessage() { return message !== null; }
  };
}
```

设计要点：
- `input_json_delta` **不**在收到时 `JSON.parse`（直到 `content_block_stop`）
- Partial tool_use snapshot 时 `input=undefined`，`_inputJsonPartial=raw string`
- 其他处理与原 `assembleStreamMessage` 行为严格一致

#### `server.js`

**新增模块级状态**（line ~123）:
```js
const _liveStreamLastSeq = new Map(); // Map<`${timestamp}|${url}`, lastSeq>
```

**新增 endpoint**（line ~2009，紧接 `/api/perm-hook` 之后）:
```js
if (url === '/api/stream-chunk' && method === 'POST') {
  // 读 body (max 8MB)
  // 解析 entry, 检查 _chunkSeq 乱序
  // sendEventToClients(clients, 'stream-progress', {
  //   timestamp, url, content: entry.response?.body?.content || [], model
  // });
  // Map size > 200 时 FIFO 驱逐最老 100
}
```

### Frontend

#### `src/AppBase.jsx`

**state 初始化**（line ~79）:
```js
streamingLatest: null, // { timestamp, url, content, model } — Live typewriter overlay
```

**EventSource 监听器**（line ~545，在 `onmessage` 之后）:
```js
this.eventSource.addEventListener('stream-progress', (event) => {
  this._resetSSETimeout();
  try {
    const data = JSON.parse(event.data);
    // stale 防护
    const existingFinal = this.state.requests.find(r =>
      r && r.timestamp === data.timestamp && !r.inProgress
    );
    if (existingFinal) return;
    // 10s timeout
    if (this._streamingTimeoutId) clearTimeout(this._streamingTimeoutId);
    this._streamingTimeoutId = setTimeout(() => {
      this.setState({ streamingLatest: null });
    }, 10000);
    this.setState({ streamingLatest: { timestamp, url, content, model, updatedAt } });
  } catch {}
});
```

**原子清除**（`_flushPendingEntries`，line ~970）:
```js
// 在 for (const rawEntry of batch) 循环内
if (!entry.inProgress && isMainAgent(entry) && prev.streamingLatest
    && prev.streamingLatest.timestamp === entry.timestamp) {
  shouldClearStreaming = true;
}

// setState 返回值中:
return {
  requests, cacheExpireAt, cacheType, mainAgentSessions,
  ...(shouldClearStreaming && { streamingLatest: null }),
};
```

**onerror 清除**（line ~843）:
```js
this.eventSource.onerror = () => {
  console.error('SSE连接错误');
  if (this.state.streamingLatest) this.setState({ streamingLatest: null });
};
```

**unmount 清理**（line ~384）:
```js
if (this._streamingTimeoutId) clearTimeout(this._streamingTimeoutId);
```

#### `src/components/ChatView.jsx`

**shouldComponentUpdate**（line ~293）:
```js
nextProps.streamingLatest !== this.props.streamingLatest ||
```

**componentDidUpdate Virtuoso sticky**（line ~350）:
```js
if (useVirtuoso && prevProps.streamingLatest !== this.props.streamingLatest && this.state.stickyBottom) {
  // 重新吸底
}
```

**构造 streamingLiveItem**（line ~2783，在 `filteredLastResponseItems` 之后）:
```js
let streamingLiveItem = null;
if (this.props.streamingLatest) {
  const sl = this.props.streamingLatest;
  const liveBlocks = (sl.content || []).filter(b => b.type === 'text' || b.type === 'thinking');
  const hasVisibleContent = liveBlocks.some(b => { /* text.trim() 或 thinking.trim() 非空 */ });
  if (hasVisibleContent) {
    streamingLiveItem = (
      <React.Fragment key="streaming-live-overlay">
        <Divider className={styles.lastResponseDivider}>
          <Text type="secondary" className={styles.lastResponseLabel}>
            {t('ui.streamingLive')}
            <span className={styles.streamingCursor}>▌</span>
          </Text>
        </Divider>
        <ChatMessage key="streaming-live-msg" role="assistant" content={liveBlocks} ... />
      </React.Fragment>
    );
  }
}
```

**两处渲染注入**（line ~2859 和 line ~2932）:
```jsx
{filteredLastResponseItems}{streamingLiveItem}{pendingBubble}
```

#### `src/App.jsx` / `src/Mobile.jsx`

都是在 `<ChatView>` 里加一个 prop:
```jsx
<ChatView ... streamingLatest={this.state.streamingLatest} ... />
```

#### `src/components/ChatView.module.css`

```css
@keyframes cursorBlink { 0%,50%{opacity:1} 51%,100%{opacity:0} }
.streamingCursor {
  display: inline-block;
  margin-left: 4px;
  animation: cursorBlink 1s step-end infinite;
  color: var(--ant-primary-color, #1890ff);
}
```

#### `src/i18n.js`

新增 `ui.streamingLive` 18 语言翻译（line ~1520 附近）

---

## 🧪 验证指南

### 自动化验证（每次改动后跑）

```bash
cd /Users/sky/.npm-global/lib/node_modules/cc-viewer
npm run build          # 应成功
npm run test           # 应显示 850 pass, 0 fail
```

### 手动验证（用户必做）

1. **重启 cc-viewer**：
   ```bash
   # 方式 1: 如果是全局命令
   pkill -f cc-viewer && ccv <项目路径>

   # 方式 2: 如果正在前台运行，Ctrl+C 然后重启
   ```

2. **触发长输出**：在 Claude CLI 或 Web UI 发送：
   ```
   请写一段 800 字关于 AI 的文章
   ```

3. **观察 Web UI 对话视图**：
   - ✅ 应看到 "正在生成 ▌" 分隔条出现（光标闪烁）
   - ✅ 分隔条下方文字实时递增（打字机效果，每 100ms 左右更新一次）
   - ✅ 流结束后 overlay 消失，Last Response 正常显示完整内容
   - ✅ **无闪烁、无重复、无回退**

4. **DevTools 验证**（可选）：
   - F12 → Network → 过滤 `events`
   - 应看到 `event: stream-progress` 帧
   - 每个 data 的 content 数组中 text 字段逐步变长

### 退化验证（保证不破坏原有功能）

1. 关闭 cc-viewer，只用纯 Claude CLI
2. 应完全恢复原有一次性显示行为
3. 无错误日志，无异常

---

## 🐛 调试指南（如果不工作）

### 如果完全看不到打字机效果

1. **确认 cc-viewer 进程是新代码**
   ```bash
   ps aux | grep cc-viewer
   # kill 掉旧进程重启
   ```

2. **检查 server.js 是否收到 POST**
   在 server.js `/api/stream-chunk` handler 顶部临时加：
   ```js
   console.log('[DEBUG] stream-chunk received:', entry.timestamp);
   ```

3. **检查前端是否收到 stream-progress event**
   DevTools Console:
   ```js
   // 不需要改代码，在控制台执行：
   // 如果能看到 "正在生成" 字样就说明前端收到并渲染
   document.querySelector('.lastResponseDivider')
   ```

4. **检查 AppBase state**
   React DevTools → 找到 AppBase → state.streamingLatest 应有内容

### 如果有闪烁/重复显示

- 检查 `_flushPendingEntries` 的原子清除逻辑是否触发
- 确认 timestamp 匹配（interceptor 和 log-watcher 用同一个 timestamp）

### 如果最终 entry 到达后 overlay 不消失

- 检查 `shouldClearStreaming` 逻辑
- 验证 `entry.timestamp === prev.streamingLatest.timestamp`
- 10s auto-timeout 兜底应最终清除

---

## ↩️ 回退方案

如果发现严重问题，可以分级回退：

### 级别 1: 禁用单个请求的流式（软禁用）
只需让 interceptor 返回 false: 在 `willLiveStream` 检查处加一个环境变量
```js
const willLiveStream = !!process.env.CCVIEWER_PORT
  && requestEntry.mainAgent
  && !_isTeammate
  && !process.env.CCV_DISABLE_LIVE_STREAM;  // ← 新增 kill-switch
```

### 级别 2: 回退所有改动
```bash
git diff HEAD  # 确认未 commit
git restore .  # 丢弃工作区改动
```

### 级别 3: 如已 commit/发布
```bash
# 查看最后一个稳定版本
git log --oneline -5
# 创建 revert commit
git revert <hash-of-streaming-feature>
# 或硬回退（危险，需用户确认）
# git reset --hard 9b07556
```

---

## 📋 Review 记录

### 第一轮 Review（数据流 / UI / 回归）
**3 个并行 agent 审查，全部 pass**

#### rev-flow 发现
- ✅ 全链路正确
- ⚠️ `_streamingTimeoutId` unmount 内存泄漏 → **已修复**
- ⚠️ `_liveStreamLastSeq` FIFO eviction 边缘情况（概率极低，可接受）
- ℹ️ skeleton POST body=null 处理正确

#### rev-ui 发现
- ✅ 位置 / 光标 / i18n / Virtuoso 都正确
- ⚠️ cursor `font-weight: bold` 过重 → **已修复**（改为 normal）
- ℹ️ 无闪烁切换

#### rev-regress 发现
- ✅ 所有不可破坏约束均保持
- ⚠️ 乱序 stream-progress 可能复活已清除 overlay → **已修复**（listener 入口检查 requests）
- ℹ️ 并发 mainAgent 只显示最新（设计如此）

---

## 📦 待决事项

### 如果用户说"可以发布"

```bash
# 1. 版本号
# package.json: "version": "1.6.160" → "1.6.161"

# 2. history.md 添加：
## 1.6.161 (2026-04-17)
- Feat: SSE live typewriter effect for latest assistant message in PTY mode —
  incremental SSE parsing + throttled HTTP POST via new /api/stream-chunk endpoint
  + dedicated 'stream-progress' SSE event channel + streamingLatest state + overlay
  rendering with blinking cursor. mainAgent only; teammate behavior unchanged.
- Fix: partial SSE chunks no longer get filtered out by inProgress dedup logic
  (use dedicated channel instead of piggybacking on requests list).

# 3. commit + push + publish（参考快速接手指南 #3）
```

### 如果用户反馈有问题

根据反馈定位：
- 看不到效果 → 调试指南 step 1-4
- 有闪烁 → 原子清除逻辑
- 性能问题 → 节流参数调整（100ms/16KB）

---

## 🗂️ 相关文件总览

### 新增 / 修改的文件（本次）
```
interceptor.js                       +129 -4
lib/interceptor-core.js              +95   0
server.js                            +49   0
src/App.jsx                          +1   -1
src/AppBase.jsx                      +46  -1
src/Mobile.jsx                       +1    0
src/components/ChatView.jsx          +50  -1
src/components/ChatView.module.css   +12   0
src/i18n.js                          +8    0
docs/SSE_STREAMING_IMPLEMENTATION.md  (本文档，新建)
```

### 关键参考文件（未修改，作为参考）
```
lib/sdk-manager.js:204-296          # SDK mode 实时流式参考实现
lib/delta-reconstructor.js          # delta 重建逻辑（idempotent for inProgress）
src/utils/sessionMerge.js           # 理解为什么不能走这条路
src/utils/helpers.js:476-495        # isRelevantRequest 过滤器
```

### 外部资源
- Plan 文件：`/Users/sky/.claude/plans/polymorphic-herding-emerson.md`（早期失败路径分析也在里面）

---

## 🔑 关键术语对照

| 术语 | 含义 |
|------|------|
| **PTY mode** | Claude CLI 作为 PTY 子进程运行，interceptor.js 注入到该进程拦截 fetch |
| **SDK mode** | cc-viewer 以 @anthropic-ai/sdk 库形式调用 Claude API（同进程） |
| **mainAgent** | 主对话 API 请求（非 sub-agent / teammate） |
| **teammate** | `TeamCreate` 派生的独立 Claude 进程 |
| **inProgress** | 请求在途标记，`interceptor.js:511` 预写时使用 |
| **Last Response** | ChatView 底部单独渲染的最新一次响应区域 |
| **Live overlay** | 本次新增：流式过程中的实时内容展示 |
| **stream-progress** | 本次新增的 SSE named event 名 |
| **streamingLatest** | 本次新增的前端 state 字段 |

---

## ✅ Checklist（下次会话前检查）

- [ ] `git status` 无异常
- [ ] `npm run build` 通过
- [ ] `npm run test` 850/850
- [ ] 读完"快速接手指南"
- [ ] 了解"当前进度与未完成任务"
- [ ] 问用户：是要继续验证还是 commit / publish？

---

**End of document.** 如果不确定，先运行 `git diff HEAD` 看代码状态，再决定下一步。
