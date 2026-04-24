# Phase 19: XML 结构化元素上下文 — 决策上下文

**生成时间**: 2026-04-24
**状态**: 决策完成，可直接进入 plan

---

## 已锁定决策

### D1: 截图路径移入 XML `<screenshot>` 标签

- **决定**: 截图路径从 TerminalPanel 的 shell 前缀（`'path.png' `）移入 `<selected-element>` 的 `<screenshot>` 子标签
- **影响**: `buildElementContext(element, screenshotPaths)` 新增 `screenshotPaths` 参数；TerminalPanel 不再单独拼 `imagePaths`

### D2: `<styles>` 仅包含视觉关键属性（精简集）

包含以下 6 类，其余忽略：
- `color`
- `background-color`（`element.computedStyles.backgroundColor`）
- `font-size`
- `font-weight`
- `border-radius`
- `padding`（合并 paddingTop/Right/Bottom/Left 为 shorthand，如 `8px 16px`）

### D3: 用户输入用 `\n用户要求: ` 分隔

最终 fullPrompt 格式：
```
<selected-element>
  <tag>button</tag>
  <screenshot>/tmp/elem-123.png</screenshot>
  <component>Button</component>
  <file>src/components/Button.jsx:42</file>
  <class>btn-primary large</class>
  <id></id>
  <selector>button.btn-primary</selector>
  <text>提交</text>
  <styles>
    <color>rgb(255,255,255)</color>
    <background-color>rgb(24,144,255)</background-color>
    <font-size>14px</font-size>
    <font-weight>500</font-weight>
    <border-radius>6px</border-radius>
    <padding>8px 16px</padding>
  </styles>
</selected-element>
用户要求: 把这个按钮改成红色
```

---

## 实现规格

### `src/utils/elementContext.js`

```javascript
export function buildElementContext(element, screenshotPaths = []) {
  // 输出多行 XML 字符串
  // <selected-element> 根标签
  // 子标签顺序：tag, screenshot(s), component, file, class, id, selector, text, styles
  // styles 包含：color, background-color, font-size, font-weight, border-radius, padding
  // padding shorthand: 若四边相同则 "8px"，上下相同+左右相同则 "8px 16px"，否则四值全写
  // 无值字段仍输出空标签（如 <id></id>）保持结构稳定
}
```

### `src/components/TerminalPanel.jsx`（`onData` handler，约 line 344-365）

**改前**：
```javascript
const context = buildElementContext(this.props.selectedElement);
const pending = this.props.pendingImages;
let imagePaths = '';
if (pending?.length > 0) {
  imagePaths = pending.map(img => `'${img.path.replace(...)}'`).join(' ') + ' ';
  this.props.onClearPendingImages?.();
}
const fullPrompt = imagePaths + context.replace(/\n+/g, ' ').trim() + ' 用户要求: ' + userInput;
```

**改后**：
```javascript
const pending = this.props.pendingImages;
const screenshotPaths = pending?.map(img => img.path) ?? [];
if (screenshotPaths.length > 0) this.props.onClearPendingImages?.();
const context = buildElementContext(this.props.selectedElement, screenshotPaths);
const fullPrompt = context + '\n用户要求: ' + userInput;
```

**注意**：不再对 context 做 `.replace(/\n+/g, ' ')` 压缩，保留多行 XML（bracketed paste 支持多行）。

### `server.js`

无需改动。`visual-input` handler 直接把 `msg.prompt` 通过 bracketed paste 写入 PTY，多行 XML 完全兼容。

---

## 不在本 Phase 范围内

- `<styles>` 中加入 width/height（已讨论，排除）
- `<children>` 子元素列表（留 M2+）
- 修改 `visual-input` WebSocket 协议

---

## 验收标准

1. 选中元素 + 有截图时，终端发送内容以 `<selected-element>` 开头，截图路径在 `<screenshot>` 内
2. 选中元素 + 无截图时，`<screenshot>` 标签为空或不出现（可选，建议不出现）
3. 用户输入跟在 `\n用户要求: ` 之后
4. `buildElementContext(null)` 返回空字符串（不变）
5. 测试全部通过
