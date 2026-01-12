import React from 'react';
import { changelog, type ChangelogEntry } from '../data/changelog';

interface ChangelogModalProps {
  currentVersion: string;
  previousVersion?: string;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  currentVersion,
  previousVersion,
  onClose,
}) => {
  // 获取要显示的更新日志
  const getEntriesToShow = (): ChangelogEntry[] => {
    if (!previousVersion) {
      // 如果没有之前的版本，只显示当前版本
      const current = changelog.find(e => e.version === currentVersion);
      return current ? [current] : [];
    }
    
    // 找到两个版本的索引
    const currentIndex = changelog.findIndex(e => e.version === currentVersion);
    const previousIndex = changelog.findIndex(e => e.version === previousVersion);
    
    if (currentIndex === -1) {
      return [];
    }
    
    if (previousIndex === -1) {
      // 如果找不到之前的版本，只显示当前版本
      const current = changelog.find(e => e.version === currentVersion);
      return current ? [current] : [];
    }
    
    // 返回从当前版本到之前版本之间的所有更新（不包括之前版本）
    return changelog.slice(currentIndex, previousIndex);
  };

  const entries = getEntriesToShow();

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>🎉 更新成功！</h2>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.content}>
          <p style={styles.subtitle}>
            已更新到版本 {currentVersion}
            {previousVersion && previousVersion !== currentVersion && (
              <span style={styles.fromVersion}>（从 {previousVersion} 更新）</span>
            )}
          </p>
          
          {entries.length > 0 ? (
            entries.map((entry) => (
              <div key={entry.version} style={styles.versionBlock}>
                <div style={styles.versionHeader}>
                  <span style={styles.versionNumber}>v{entry.version}</span>
                  <span style={styles.versionDate}>{entry.date}</span>
                </div>
                <ul style={styles.changeList}>
                  {entry.changes.map((change, index) => (
                    <li key={index} style={styles.changeItem}>{change}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p style={styles.noChanges}>暂无更新日志</p>
          )}
        </div>
        
        <div style={styles.footer}>
          <button style={styles.okBtn} onClick={onClose}>
            知道了
          </button>
        </div>
      </div>
    </>
  );
};


const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 2000,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#2d2d2d',
    borderRadius: '12px',
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    zIndex: 2001,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #404040',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#fff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#888',
    cursor: 'pointer',
    padding: '0 4px',
  },
  content: {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1,
  },
  subtitle: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#aaa',
  },
  fromVersion: {
    marginLeft: '8px',
    color: '#666',
  },
  versionBlock: {
    marginBottom: '20px',
  },
  versionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  versionNumber: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#4a90d9',
  },
  versionDate: {
    fontSize: '12px',
    color: '#666',
  },
  changeList: {
    margin: 0,
    paddingLeft: '20px',
  },
  changeItem: {
    fontSize: '14px',
    color: '#ddd',
    lineHeight: 1.8,
  },
  noChanges: {
    color: '#666',
    textAlign: 'center',
    padding: '20px',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #404040',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  okBtn: {
    padding: '10px 32px',
    backgroundColor: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
