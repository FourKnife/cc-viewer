import React, { useState, useMemo } from 'react';
import { Typography } from 'antd';
import * as Diff from 'diff';
import { t } from '../i18n';
import styles from './DiffView.module.css';

const { Text } = Typography;

function computeDiffLines(oldStr, newStr, startLine) {
  const changes = Diff.diffLines(oldStr, newStr);
  const lines = [];
  let oldLineNum = startLine;
  let newLineNum = startLine;

  for (const part of changes) {
    const partLines = part.value.replace(/\n$/, '').split('\n');
    // handle empty diff part (e.g. trailing newline only)
    if (part.value === '') continue;

    for (const text of partLines) {
      if (part.added) {
        lines.push({ type: 'add', oldNum: null, newNum: newLineNum++, text });
      } else if (part.removed) {
        lines.push({ type: 'del', oldNum: oldLineNum++, newNum: null, text });
      } else {
        lines.push({ type: 'context', oldNum: oldLineNum++, newNum: newLineNum++, text });
      }
    }
  }
  return lines;
}

function DiffView({ file_path, old_string, new_string, startLine = 1 }) {
  const [collapsed, setCollapsed] = useState(false);

  const diffLines = useMemo(
    () => computeDiffLines(old_string, new_string, startLine),
    [old_string, new_string, startLine]
  );

  const added = diffLines.filter(l => l.type === 'add').length;
  const removed = diffLines.filter(l => l.type === 'del').length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Text className={styles.filePath}>
          Edit: {file_path}
        </Text>
        <span className={styles.headerRight}>
          <Text className={styles.diffSummary}>
            {t('ui.diffSummary', { added, removed })}
          </Text>
          <Text
            className={styles.toggle}
            onClick={() => setCollapsed(c => !c)}
          >
            {collapsed ? t('ui.expand') : t('ui.collapse')}
          </Text>
        </span>
      </div>
      {!collapsed && (
        <div className={styles.tableWrap}>
          <table className={styles.diffTable}>
            <tbody>
              {diffLines.map((dl, i) => {
                const rowClass =
                  dl.type === 'del' ? styles.rowDel
                  : dl.type === 'add' ? styles.rowAdd
                  : styles.rowContext;
                const prefix = dl.type === 'del' ? '-' : dl.type === 'add' ? '+' : ' ';
                return (
                  <tr key={i} className={rowClass}>
                    <td className={styles.lineNumOld}>
                      {dl.oldNum ?? ''}
                    </td>
                    <td className={styles.lineNumNew}>
                      {dl.newNum ?? ''}
                    </td>
                    <td className={styles.prefix}>{prefix}</td>
                    <td className={styles.lineContent}>{dl.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DiffView;
