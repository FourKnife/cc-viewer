import React from 'react';
import { t } from '../../i18n';
import styles from './styles.module.css';

export default function StatusBar({ sketchMcpStatus, selectedElement, sketchSelectedLayer }) {
  return (
    <div className={styles.statusBar}>
      <div className={styles.statusBarLeft}>
        <span className={styles.statusDot + ' ' + (sketchMcpStatus === 'connected' ? styles.statusDotConnected : styles.statusDotDisconnected)} />
        <span className={styles.statusLabel}>
          Sketch MCP {sketchMcpStatus === 'connected' ? t('visual.statusConnected') : t('visual.statusDisconnected')}
        </span>
        {sketchSelectedLayer && (
          <>
            <span className={styles.statusSep}>|</span>
            <span className={styles.statusElement}>{sketchSelectedLayer}</span>
          </>
        )}
      </div>
      <div className={styles.statusBarRight}>
        {selectedElement && (
          <>
            <span className={styles.statusSep}>|</span>
            <span className={styles.statusElement}>
              &lt;{selectedElement.tag}&gt;
              {selectedElement.className && (
                <span className={styles.statusClass}>
                  {' '}.{selectedElement.className.split(' ').slice(0, 2).join(' .')}
                </span>
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
