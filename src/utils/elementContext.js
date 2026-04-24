/**
 * 构建选中元素的上下文信息，用于自动注入到 AI 对话中
 * @param {Object} element - 选中的元素对象
 * @returns {string} 格式化的上下文文本
 */
export function buildElementContext(element) {
  if (!element) return '';

  const lines = ['请修改以下 React 组件中的元素:\n'];

  if (element.sourceInfo?.fileName) {
    lines.push('文件: ' + element.sourceInfo.fileName + ':' + element.sourceInfo.lineNumber);
  }

  if (element.sourceInfo?.componentName) {
    lines.push('组件: ' + element.sourceInfo.componentName);
  }

  const cls = element.className
    ? ' class="' + element.className.split(' ').slice(0, 3).join(' ') + '"'
    : '';
  lines.push('元素: <' + element.tag + cls + '>');

  if (element.selector) {
    lines.push('选择器: ' + element.selector);
  }

  lines.push('');
  return lines.join('\n');
}
