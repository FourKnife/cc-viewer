import React from 'react';
import { EditOutlined, ApiOutlined, RocketOutlined } from '@ant-design/icons';
import { t } from '../../i18n';
import styles from './SideMenu.module.css';

const items = [
  { key: 'ui-edit', icon: EditOutlined, label: () => t('visual.menuUIEdit') },
  { key: 'launcher', icon: RocketOutlined, label: () => t('visual.menuLauncher') },
  { key: 'pipeline', icon: ApiOutlined, label: () => t('visual.menuPipeline') },
];

export default function SideMenu({ activeKey, onSelect }) {
  return (
    <div className={styles.sideMenu}>
      {items.map((item) => (
        <div
          key={item.key}
          className={`${styles.menuItem}${activeKey === item.key ? ' ' + styles.menuItemActive : ''}`}
          onClick={() => onSelect(item.key)}
        >
          <item.icon className={styles.menuIcon} />
          <span className={styles.menuLabel}>{item.label()}</span>
        </div>
      ))}
    </div>
  );
}
