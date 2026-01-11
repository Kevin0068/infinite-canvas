import React, { useState, useEffect, useRef } from 'react';
import type { TextElement } from '../types';

interface TextEditModalProps {
  text?: TextElement;
  onSave: (text: Partial<TextElement>) => void;
  onCancel: () => void;
  isNew?: boolean;
}

export const TextEditModal: React.FC<TextEditModalProps> = ({ text, onSave, onCancel, isNew }) => {
  const [content, setContent] = useState(text?.text || '');
  const [fontSize, setFontSize] = useState(text?.fontSize || 24);
  const [color, setColor] = useState(text?.color || '#ffffff');
  const [backgroundColor, setBackgroundColor] = useState(text?.backgroundColor || '');
  const [bold, setBold] = useState(text?.bold || false);
  const [italic, setItalic] = useState(text?.italic || false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    if (!content.trim()) {
      onCancel();
      return;
    }
    onSave({
      text: content,
      fontSize,
      color,
      backgroundColor: backgroundColor || undefined,
      bold,
      italic,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={styles.title}>{isNew ? '添加文字' : '编辑文字'}</h3>
        
        <textarea
          ref={inputRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入文字内容..."
          style={styles.textarea}
        />
        
        <div style={styles.row}>
          <label style={styles.label}>
            字号:
            <input
              type="number"
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              min={8}
              max={200}
              style={styles.numberInput}
            />
          </label>
          
          <label style={styles.label}>
            颜色:
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={styles.colorInput}
            />
          </label>
          
          <label style={styles.label}>
            背景:
            <input
              type="color"
              value={backgroundColor || '#000000'}
              onChange={e => setBackgroundColor(e.target.value)}
              style={styles.colorInput}
            />
            <button
              onClick={() => setBackgroundColor('')}
              style={styles.clearBtn}
              title="清除背景"
            >
              ✕
            </button>
          </label>
        </div>
        
        <div style={styles.row}>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={bold}
              onChange={e => setBold(e.target.checked)}
            />
            <span style={{ fontWeight: 'bold' }}>粗体</span>
          </label>
          
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={italic}
              onChange={e => setItalic(e.target.checked)}
            />
            <span style={{ fontStyle: 'italic' }}>斜体</span>
          </label>
        </div>
        
        <div style={styles.preview}>
          <span style={{
            fontSize: Math.min(fontSize, 48),
            color,
            backgroundColor: backgroundColor || 'transparent',
            fontWeight: bold ? 'bold' : 'normal',
            fontStyle: italic ? 'italic' : 'normal',
            padding: '4px 8px',
          }}>
            {content || '预览文字'}
          </span>
        </div>
        
        <div style={styles.buttons}>
          <button onClick={onCancel} style={styles.cancelBtn}>取消</button>
          <button onClick={handleSave} style={styles.saveBtn}>
            {isNew ? '添加' : '保存'}
          </button>
        </div>
        
        <p style={styles.hint}>Ctrl+Enter 保存 | Esc 取消</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: '#2d2d2d',
    borderRadius: '8px',
    padding: '20px',
    minWidth: '400px',
    maxWidth: '90vw',
  },
  title: {
    margin: '0 0 16px 0',
    color: '#fff',
    fontSize: '18px',
  },
  textarea: {
    width: '100%',
    height: '100px',
    padding: '12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #404040',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '16px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  row: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#ccc',
    fontSize: '14px',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#ccc',
    fontSize: '14px',
    cursor: 'pointer',
  },
  numberInput: {
    width: '60px',
    padding: '4px 8px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #404040',
    borderRadius: '4px',
    color: '#fff',
  },
  colorInput: {
    width: '32px',
    height: '32px',
    padding: 0,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  clearBtn: {
    padding: '4px 8px',
    backgroundColor: '#555',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
  },
  preview: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#1a1a1a',
    borderRadius: '4px',
    textAlign: 'center',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
  cancelBtn: {
    padding: '8px 20px',
    backgroundColor: '#555',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  saveBtn: {
    padding: '8px 20px',
    backgroundColor: '#4a90d9',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  hint: {
    marginTop: '12px',
    color: '#666',
    fontSize: '12px',
    textAlign: 'center',
  },
};
