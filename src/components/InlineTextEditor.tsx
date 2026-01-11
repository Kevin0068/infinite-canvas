import React, { useState, useEffect, useRef } from 'react';
import type { TextElement, Point, ViewportState } from '../types';

interface InlineTextEditorProps {
  text: TextElement | null;
  position: Point; // 屏幕坐标
  viewport: ViewportState;
  onSave: (updates: Partial<TextElement>) => void;
  onCancel: () => void;
  isNew?: boolean;
}

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  text,
  position,
  viewport,
  onSave,
  onCancel,
  isNew,
}) => {
  const [content, setContent] = useState(text?.text || '');
  const [fontSize, setFontSize] = useState(text?.fontSize || 24);
  const [color, setColor] = useState(text?.color || '#ffffff');
  const [backgroundColor, setBackgroundColor] = useState(text?.backgroundColor || '');
  const [bold, setBold] = useState(text?.bold || false);
  const [italic, setItalic] = useState(text?.italic || false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    if (!content.trim() && isNew) {
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
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
    e.stopPropagation();
  };

  // 计算编辑器位置
  const editorStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y - 50, // 工具栏在文字上方
    zIndex: 2000,
  };

  const inputStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    fontSize: fontSize * viewport.scale,
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
    color: color,
    backgroundColor: backgroundColor || 'transparent',
    border: '2px solid #4a90d9',
    borderRadius: '2px',
    padding: '4px 8px',
    outline: 'none',
    minWidth: '100px',
    fontFamily: 'Arial, sans-serif',
    zIndex: 2001,
  };

  return (
    <>
      {/* 点击外部关闭 */}
      <div 
        style={styles.overlay} 
        onClick={handleSave}
      />
      
      {/* 工具栏 */}
      <div style={editorStyle} onClick={e => e.stopPropagation()}>
        <div style={styles.toolbar}>
          <input
            type="number"
            value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            min={8}
            max={200}
            style={styles.numberInput}
            title="字号"
          />
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            style={styles.colorInput}
            title="文字颜色"
          />
          <input
            type="color"
            value={backgroundColor || '#000000'}
            onChange={e => setBackgroundColor(e.target.value)}
            style={styles.colorInput}
            title="背景颜色"
          />
          <button
            onClick={() => setBackgroundColor('')}
            style={styles.clearBtn}
            title="清除背景"
          >
            ✕
          </button>
          <button
            onClick={() => setBold(!bold)}
            style={{ ...styles.toggleBtn, fontWeight: 'bold', backgroundColor: bold ? '#4a90d9' : '#555' }}
            title="粗体"
          >
            B
          </button>
          <button
            onClick={() => setItalic(!italic)}
            style={{ ...styles.toggleBtn, fontStyle: 'italic', backgroundColor: italic ? '#4a90d9' : '#555' }}
            title="斜体"
          >
            I
          </button>
          <button onClick={handleSave} style={styles.saveBtn}>
            ✓
          </button>
        </div>
      </div>
      
      {/* 文字输入框 */}
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入文字..."
        style={inputStyle}
        onClick={e => e.stopPropagation()}
      />
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
    zIndex: 1999,
  },
  toolbar: {
    display: 'flex',
    gap: '4px',
    padding: '6px 8px',
    backgroundColor: '#2d2d2d',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    alignItems: 'center',
  },
  numberInput: {
    width: '50px',
    padding: '4px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #404040',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
  },
  colorInput: {
    width: '28px',
    height: '28px',
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
  toggleBtn: {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  saveBtn: {
    padding: '4px 12px',
    backgroundColor: '#4a90d9',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
};
