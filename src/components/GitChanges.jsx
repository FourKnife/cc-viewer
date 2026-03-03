import React, { useState, useEffect, useRef } from 'react';
import { t } from '../i18n';
import styles from './GitChanges.module.css';

const STATUS_COLORS = {
  'M': '#e2c08d',
  'A': '#73c991',
  'D': '#f14c4c',
  'R': '#73c991',
  'C': '#73c991',
  'U': '#e2c08d',
  '?': '#73c991',
};

function getFileIcon(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const EXT_COLORS = {
    js: '#e8d44d', jsx: '#61dafb', ts: '#3178c6', tsx: '#3178c6',
    json: '#999', md: '#519aba', css: '#a86fd9', scss: '#cd6799',
    html: '#e34c26', py: '#3572a5', go: '#00add8', rs: '#dea584',
  };
  const color = EXT_COLORS[ext] || '#888';
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

export default function GitChanges({ onClose, onFileClick }) {
  const [changes, setChanges] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    fetch('/api/git-status')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (mounted.current) {
          setChanges(data.changes || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted.current) {
          setError('Failed to load git status');
          setLoading(false);
        }
      });
    return () => { mounted.current = false; };
  }, []);

  return (
    <div className={styles.gitChanges}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>{t('ui.gitChanges')}</span>
        <button className={styles.collapseBtn} onClick={onClose} title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="11 17 6 12 11 7"/>
            <polyline points="18 17 13 12 18 7"/>
          </svg>
        </button>
      </div>
      <div className={styles.changesContainer}>
        {loading && <div className={styles.loading}>Loading...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!loading && !error && changes && changes.length === 0 && (
          <div className={styles.empty}>No changes</div>
        )}
        {!loading && !error && changes && changes.length > 0 && changes.map((change, idx) => (
          <div
            key={idx}
            className={styles.changeItem}
            onClick={() => onFileClick && onFileClick(change.file)}
          >
            <span className={styles.status} style={{ color: STATUS_COLORS[change.status] || '#888' }}>
              {change.status}
            </span>
            <span className={styles.icon}>{getFileIcon(change.file)}</span>
            <span className={styles.fileName}>{change.file}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
