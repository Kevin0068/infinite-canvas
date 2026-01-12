import React from 'react';

interface ShortcutsModalProps {
  onClose: () => void;
}

const shortcuts = [
  { category: '基础操作', items: [
    { key: 'Ctrl + Z', desc: '撤销' },
    { key: 'Ctrl + Y', desc: '重做' },
    { key: 'Ctrl + C', desc: '复制' },
    { key: 'Ctrl + V', desc: '粘贴' },
    { key: 'Delete / Backspace', desc: '删除选中元素' },
    { key: 'Ctrl + A', desc: '全选' },
  ]},
  { category: '画布操作', items: [
    { key: '鼠标滚轮', desc: '缩放画布' },
    { key: '空格 + 拖动', desc: '平移画布' },
    { key: '鼠标中键拖动', desc: '平移画布' },
  ]},
  { category: '选择操作', items: [
    { key: '单击', desc: '选择元素' },
    { key: 'Shift + 单击', desc: '多选元素' },
    { key: '框选', desc: '框选多个元素' },
    { key: '双击文字', desc: '编辑文字' },
  ]},
  { category: '元素操作', items: [
    { key: '拖动角点', desc: '等比例缩放' },
    { key: '拖动顶部圆点', desc: '自由旋转' },
    { key: '右键菜单', desc: '更多操作' },
  ]},
  { category: '文件操作', items: [
    { key: 'Ctrl + S', desc: '保存草稿' },
    { key: 'Ctrl + O', desc: '打开草稿' },
    { key: 'Ctrl + E', desc: '导出图片' },
  ]},
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>⌨️ 快捷键</h2>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={styles.content}>
          {shortcuts.map((section) => (
            <div key={section.category} style={styles.section}>
              <h3 style={styles.sectionTitle}>{section.category}</h3>
              <div style={styles.shortcutList}>
                {section.items.map((item) => (
                  <div key={item.key} style={styles.shortcutItem}>
                    <span style={styles.key}>{item.key}</span>
                    <span style={styles.desc}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={styles.footer}>
          <button style={styles.okBtn} onClick={onClose}>知道了</button>
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
    width: '560px',
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
  },
  content: {
    padding: '16px 24px',
    overflowY: 'auto',
    flex: 1,
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#4a90d9',
  },
  shortcutList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  shortcutItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  key: {
    backgroundColor: '#3d3d3d',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#fff',
    fontFamily: 'monospace',
    minWidth: '120px',
  },
  desc: {
    fontSize: '13px',
    color: '#aaa',
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
    cursor: 'pointer',
  },
};
