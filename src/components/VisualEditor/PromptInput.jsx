import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './styles.module.css';

function buildPrompt(element, userInput) {
  var lines = ['请修改以下 React 组件中的元素:\n'];

  if (element.sourceInfo?.fileName) {
    lines.push('文件: ' + element.sourceInfo.fileName + ':' + element.sourceInfo.lineNumber);
  }
  if (element.sourceInfo?.componentName) {
    lines.push('组件: ' + element.sourceInfo.componentName);
  }
  var cls = element.className ? ' class="' + element.className.split(' ').slice(0, 3).join(' ') + '"' : '';
  lines.push('元素: <' + element.tag + cls + '>');
  if (element.selector) {
    lines.push('选择器: ' + element.selector);
  }
  lines.push('');
  lines.push('用户要求: ' + userInput);

  return lines.join('\n');
}

export default function PromptInput({ element, onSend, disabled }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (element && inputRef.current) {
      inputRef.current.focus();
    }
  }, [element]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !element) return;

    const prompt = buildPrompt(element, text);
    setSending(true);
    onSend?.(prompt);
    setInput('');
    setTimeout(() => setSending(false), 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (disabled) {
    return (
      <div className={styles.promptEmpty}>
        <Typography.Text type="secondary">{t('visual.noClaude')}</Typography.Text>
      </div>
    );
  }

  if (!element) {
    return (
      <div className={styles.promptEmpty}>
        <Typography.Text type="secondary">{t('visual.selectToModify')}</Typography.Text>
      </div>
    );
  }

  return (
    <div className={styles.promptContainer}>
      <div className={styles.promptHeader}>
        <Typography.Text strong>{t('visual.aiModify')}</Typography.Text>
      </div>
      <div className={styles.promptInputRow}>
        <Input.TextArea
          ref={inputRef}
          className={styles.promptTextArea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('visual.promptPlaceholder')}
          autoSize={{ minRows: 2, maxRows: 5 }}
          disabled={disabled || sending}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!input.trim() || disabled || sending}
          loading={sending}
          className={styles.promptSendBtn}
        />
      </div>
    </div>
  );
}
