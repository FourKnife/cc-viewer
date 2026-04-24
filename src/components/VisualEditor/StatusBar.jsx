import React from 'react';
import { t } from '../../i18n';
import styles from './styles.module.css';

function getDotClass(status) {
  if (status === 'connected') return styles.statusDotConnected;
  if (status === 'unauthenticated') return styles.statusDotUnauthenticated;
  return styles.statusDotDisconnected;
}

function getStatusLabel(status) {
  if (status === 'connected') return t('visual.statusConnected');
  if (status === 'unauthenticated') return t('visual.statusUnauthenticated');
  return t('visual.statusDisconnected');
}

export default function StatusBar({ sketchMcpStatus, selectedElement, sketchSelectedLayer, onAuthenticate }) {
  return (
    <div className={styles.statusBar}>
      <div className={styles.statusBarLeft}>
        <span className={styles.statusDot + ' ' + getDotClass(sketchMcpStatus)} />
        <span className={styles.statusLabel}>
          Sketch MCP {getStatusLabel(sketchMcpStatus)}
        </span>
        {sketchMcpStatus === 'unauthenticated' && (
          <button className={styles.authButton} onClick={onAuthenticate}>
            {t('visual.authButton')}
          </button>
        )}
        {sketchMcpStatus === 'connected' && sketchSelectedLayer && (
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
