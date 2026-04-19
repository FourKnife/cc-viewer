import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Modal, Dropdown, message } from 'antd';
import { t } from '../i18n';
import { apiUrl } from '../utils/apiUrl';
import { getFileIcon } from '../utils/fileIcons';
import { fetchAllRepos } from '../utils/gitApi';
import styles from './GitChanges.module.css';

const STATUS_COLORS = {
  'M': '#e2c08d',
  'A': '#73c991',
  'D': '#f14c4c',
  'R': '#73c991',
  'C': '#73c991',
  'U': '#e2c08d',
  '?': '#73c991',
  '??': '#73c991',
};

const STATUS_LABELS = {
  '??': 'U',
};

// 将扁平的文件变更列表构建为目录树
function buildTree(changes) {
  const root = { dirs: {}, files: [] };
  for (const change of changes) {
    const parts = change.file.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node.dirs[parts[i]]) node.dirs[parts[i]] = { dirs: {}, files: [] };
      node = node.dirs[parts[i]];
    }
    node.files.push({ name: parts[parts.length - 1], status: change.status, fullPath: change.file });
  }
  return root;
}

function TreeDir({ name, node, depth, repoPath, onFileClick, onOpenFile, onRestore, selectedFile, selectedRepo }) {
  const dirNames = Object.keys(node.dirs).sort();
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      {name && (
        <div className={styles.dirItem} style={{ paddingLeft: 8 + depth * 16 }}>
          <span className={styles.dirArrow}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.rotated90}>
              <polyline points="9 6 15 12 9 18"/>
            </svg>
          </span>
          <span className={styles.icon}>{getFileIcon('', 'directory')}</span>
          <span className={styles.dirName}>{name}</span>
        </div>
      )}
      {dirNames.map(dir => (
        <TreeDir key={dir} name={dir} node={node.dirs[dir]} depth={name ? depth + 1 : depth} repoPath={repoPath} onFileClick={onFileClick} onOpenFile={onOpenFile} onRestore={onRestore} selectedFile={selectedFile} selectedRepo={selectedRepo} />
      ))}
      {files.map(file => (
        <Dropdown key={file.fullPath} menu={{ items: [
          { key: 'reveal', label: t('ui.contextMenu.revealInExplorer') },
          { key: 'copyPath', label: t('ui.contextMenu.copyPath') },
          { key: 'copyRelPath', label: t('ui.contextMenu.copyRelativePath') },
        ], onClick: ({ key }) => {
          const resolvedPath = repoPath && repoPath !== '.' ? `${repoPath}/${file.fullPath}` : file.fullPath;
          if (key === 'reveal') {
            fetch(apiUrl('/api/reveal-file'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: resolvedPath }) }).catch(() => {});
          } else if (key === 'copyPath') {
            fetch(apiUrl('/api/resolve-path'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: resolvedPath }) })
              .then(r => r.json()).then(data => { if (data.fullPath) navigator.clipboard.writeText(data.fullPath).then(() => message.success(t('ui.copied'))).catch(() => {}); }).catch(() => {});
          } else if (key === 'copyRelPath') {
            navigator.clipboard.writeText(resolvedPath).then(() => message.success(t('ui.copied'))).catch(() => {});
          }
        }}} trigger={['contextMenu']}>
          <div
            className={`${styles.changeItem} ${selectedFile === file.fullPath && selectedRepo === repoPath ? styles.changeItemSelected : ''}`}
            style={{ paddingLeft: 8 + (name ? depth + 1 : depth) * 16 }}
            onClick={() => onFileClick && onFileClick(repoPath, file.fullPath)}
          >
            <span className={styles.icon}>{getFileIcon(file.name)}</span>
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.actions}>
              <span title={t('ui.gitChanges.openFile')} onClick={e => { e.stopPropagation(); onOpenFile && onOpenFile(repoPath, file.fullPath); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </span>
              <span title={t('ui.gitChanges.restoreFile')} onClick={e => { e.stopPropagation(); onRestore && onRestore(repoPath, file.fullPath, file.name); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </span>
            </span>
            <span className={styles.status} style={{ color: STATUS_COLORS[file.status] || '#888' }}>
              {STATUS_LABELS[file.status] || file.status}
            </span>
          </div>
        </Dropdown>
      ))}
    </>
  );
}

export default function GitChanges({ style, onClose, onFileClick, onOpenFile, refreshTrigger }) {
  const [repos, setRepos] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [collapsedRepos, setCollapsedRepos] = useState(new Set());
  const mounted = useRef(true);

  const refreshAllRepos = useCallback(() => {
    fetchAllRepos()
      .then(results => { if (mounted.current) setRepos(results); })
      .catch(() => {});
  }, []);

  const handleRestore = useCallback((repoPath, filePath, fileName) => {
    Modal.confirm({
      title: t('ui.gitChanges.restoreConfirm', { name: fileName }),
      okType: 'danger',
      okText: t('ui.gitChanges.restoreFile'),
      onOk: () => fetch(apiUrl('/api/git-restore'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, repo: repoPath }),
      }).then(r => {
        if (r.ok) refreshAllRepos();
      }),
    });
  }, [refreshAllRepos]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    fetchAllRepos()
      .then(results => {
        if (mounted.current) {
          setRepos(results);
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

  // 工具触发的增量刷新
  useEffect(() => {
    if (refreshTrigger > 0) refreshAllRepos();
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSingleRepo = !repos || repos.length <= 1;

  // Aggregate insertions/deletions across all repos
  const totalInsertions = repos ? repos.reduce((sum, r) => sum + (r.insertions || 0), 0) : 0;
  const totalDeletions = repos ? repos.reduce((sum, r) => sum + (r.deletions || 0), 0) : 0;

  return (
    <div className={styles.gitChanges} style={style}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          {t('ui.gitChanges')}
          {(totalInsertions > 0 || totalDeletions > 0) && (
            <>
              {' '}<span className={`${styles.statBadge} ${styles.statInsert}`}>+{totalInsertions}</span>
              {' '}<span className={`${styles.statBadge} ${styles.statDelete}`}>-{totalDeletions}</span>
            </>
          )}
        </span>
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
        {!loading && !error && (!repos || repos.length === 0) && (
          <div className={styles.empty}>No changes</div>
        )}
        {!loading && !error && repos && repos.map(repo => {
          const collapsed = collapsedRepos.has(repo.path);
          return isSingleRepo ? (
            <TreeDir key={repo.path} name="" node={buildTree(repo.changes)} depth={0} repoPath={repo.path} onFileClick={(rp, fp) => {
              setSelectedFile(fp); setSelectedRepo(rp);
              onFileClick && onFileClick(rp, fp);
            }} onOpenFile={onOpenFile} onRestore={handleRestore} selectedFile={selectedFile} selectedRepo={selectedRepo} />
          ) : (
            <React.Fragment key={repo.path}>
              <div
                className={styles.repoHeader}
                onClick={() => setCollapsedRepos(prev => {
                  const next = new Set(prev);
                  collapsed ? next.delete(repo.path) : next.add(repo.path);
                  return next;
                })}
              >
                <span className={`${styles.repoArrow} ${collapsed ? '' : styles.repoArrowExpanded}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 6 15 12 9 18"/>
                  </svg>
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                  <path d="M18 9a9 9 0 0 1-9 9"/>
                </svg>
                <span className={styles.repoName}>{repo.name}</span>
                {(repo.insertions > 0 || repo.deletions > 0) && (
                  <>
                    <span className={`${styles.statBadge} ${styles.statInsert}`}>+{repo.insertions}</span>
                    <span className={`${styles.statBadge} ${styles.statDelete}`}>-{repo.deletions}</span>
                  </>
                )}
                <span className={styles.repoBadge}>{repo.changes.length}</span>
              </div>
              {!collapsed && (
                <TreeDir name="" node={buildTree(repo.changes)} depth={1} repoPath={repo.path} onFileClick={(rp, fp) => {
                  setSelectedFile(fp); setSelectedRepo(rp);
                  onFileClick && onFileClick(rp, fp);
                }} onOpenFile={onOpenFile} onRestore={handleRestore} selectedFile={selectedFile} selectedRepo={selectedRepo} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
