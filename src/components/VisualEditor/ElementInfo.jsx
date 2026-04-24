import React from 'react';
import { Typography, Tag, message } from 'antd';
import { t } from '../../i18n';
import styles from './styles.module.css';

export default function ElementInfo({ element }) {
  if (!element) return null;

  return (
    <div className={styles.elementInfo}>
      <Typography.Title level={5}>{t('visual.selectedElement')}</Typography.Title>

      <div className={styles.elementTag}>
        <Tag color="orange">&lt;{element.tag}&gt;</Tag>
        {element.rect && (
          <span className={styles.elementSize}>
            {element.rect.width} × {element.rect.height}
          </span>
        )}
      </div>

      {element.id && (
        <div className={styles.elementRow}>
          <span className={styles.elementLabel}>ID</span>
          <code className={styles.elementValue}>#{element.id}</code>
        </div>
      )}

      {element.className && (
        <div className={styles.elementRow}>
          <span className={styles.elementLabel}>Class</span>
          <code className={styles.elementValue}>{element.className}</code>
        </div>
      )}

      <div className={styles.elementRow}>
        <span className={styles.elementLabel}>Selector</span>
        <code className={styles.elementValue}>{element.selector}</code>
      </div>

      {element.rect && (
        <div className={styles.elementRow}>
          <span className={styles.elementLabel}>Position</span>
          <span className={styles.elementValue}>({element.rect.x}, {element.rect.y})</span>
        </div>
      )}

      {element.text && (
        <div className={styles.elementRow}>
          <span className={styles.elementLabel}>Text</span>
          <span className={styles.elementValue}>{element.text}</span>
        </div>
      )}

      {element.computedStyle && (
        <div className={styles.elementStyles}>
          <span className={styles.elementLabel}>Style</span>
          <div className={styles.elementStyleGrid}>
            {Object.entries(element.computedStyle).map(([k, v]) => (
              <div key={k} className={styles.elementStyleItem}>
                <span className={styles.styleKey}>{k}</span>
                <span className={styles.styleValue}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {element.sourceInfo && (
        <div className={styles.sourceInfo}>
          <Typography.Title level={5}>{t('visual.sourceLocation')}</Typography.Title>
          {element.sourceInfo.componentName && (
            <div className={styles.elementRow}>
              <span className={styles.elementLabel}>Component</span>
              <Tag color="blue">{element.sourceInfo.componentName}</Tag>
            </div>
          )}
          {element.sourceInfo.fileName && (
            <div className={styles.sourceFile} onClick={() => {
              const text = `${element.sourceInfo.fileName}:${element.sourceInfo.lineNumber}`;
              navigator.clipboard.writeText(text);
              message.success(t('visual.copied'));
            }}>
              <span className={styles.sourceFileName}>
                {element.sourceInfo.fileName.split('/').pop()}
              </span>
              <span className={styles.sourceLineNumber}>
                :{element.sourceInfo.lineNumber}
              </span>
            </div>
          )}
          {element.sourceInfo.componentStack?.length > 1 && (
            <div className={styles.componentStack}>
              <span className={styles.elementLabel}>Stack</span>
              <span className={styles.elementValue}>
                {element.sourceInfo.componentStack.join(' → ')}
              </span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
