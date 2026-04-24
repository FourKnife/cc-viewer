import React from 'react';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './BottomTabPanel.module.css';

const TABS = [
  { key: 'launcher', labelKey: 'visual.tabLauncher' },
  { key: 'element',  labelKey: 'visual.tabElement' },
];

export default function BottomTabPanel({
  activeTab,
  collapsed,
  onTabClick,
  onCollapse,
  children,   // { launcher: <node>, element: <node> }
}) {
  return (
    <div className={styles.panel}>
      {/* Tab 标签横条 — 始终可见 */}
      <div className={styles.tabBar}>
        {TABS.map(({ key, labelKey }) => (
          <div
            key={key}
            className={`${styles.tab}${activeTab === key ? ' ' + styles.tabActive : ''}`}
            onClick={() => onTabClick(key)}
          >
            {t(labelKey)}
          </div>
        ))}
        {/* 折叠/展开图标 — 右侧 */}
        <div className={styles.collapseBtn} onClick={onCollapse} title={collapsed ? t('visual.launcher.expand') : t('visual.launcher.collapse')}>
          {collapsed ? <UpOutlined /> : <DownOutlined />}
        </div>
      </div>

      {/* Tab 内容区 — 始终挂载，折叠时 display:none（避免状态丢失） */}
      <div className={styles.content} style={{ display: collapsed ? 'none' : undefined }}>
        {TABS.map(({ key }) => (
          <div
            key={key}
            style={{ display: activeTab === key ? 'flex' : 'none', height: '100%', flexDirection: 'column', overflow: 'auto', minHeight: 0 }}
          >
            {children[key]}
          </div>
        ))}
      </div>
    </div>
  );
}
