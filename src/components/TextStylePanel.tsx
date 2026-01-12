import React from 'react';
import type { TextElement } from '../types';

interface TextStylePanelProps {
  element: TextElement;
  onChange: (updates: Partial<TextElement>) => void;
  onClose: () => void;
}

const fontFamilies = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Microsoft YaHei", sans-serif', label: '微软雅黑' },
  { value: '"SimHei", sans-serif', label: '黑体' },
  { value: '"SimSun", serif', label: '宋体' },
  { value: '"KaiTi", serif', label: '楷体' },
  { value: '"PingFang SC", sans-serif', label: '苹方' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times' },
  { value: '"Courier New", monospace', label: 'Courier' },
  { value: 'Impact, sans-serif', label: 'Impact' },
];

const presetColors = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#9900ff',
  '#666666', '#999999', '#cccccc', '#333333', '#4a90d9',
];

export const TextStylePanel: React.FC<TextStylePanelProps> = ({
  element,
  onChange,
  onClose,
}) => {
  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.panel}>
        <div style={styles.header}>
          <h3 style={styles.title}>✏️ 文字样式</h3>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.content}>
          {/* 字体选择 */}
          <div style={styles.section}>
            <label style={styles.label}>字体</label>
            <select
              value={element.fontFamily}
              onChange={(e) => onChange({ fontFamily: e.target.value })}
              style={styles.select}
            >
              {fontFamilies.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* 字号 */}
          <div style={styles.section}>
            <label style={styles.label}>字号: {element.fontSize}px</label>
            <input
              type="range"
              min="12"
              max="200"
              value={element.fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              style={styles.slider}
            />
          </div>

          {/* 文字颜色 */}
          <div style={styles.section}>
            <label style={styles.label}>文字颜色</label>
            <div style={styles.colorRow}>
              <input
                type="color"
                value={element.color}
                onChange={(e) => onChange({ color: e.target.value })}
                style={styles.colorPicker}
              />
              <div style={styles.presetColors}>
                {presetColors.map((color) => (
                  <button
                    key={color}
                    style={{
                      ...styles.colorBtn,
                      backgroundColor: color,
                      border: element.color === color ? '2px solid #4a90d9' : '1px solid #555',
                    }}
                    onClick={() => onChange({ color })}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 文字样式 */}
          <div style={styles.section}>
            <label style={styles.label}>样式</label>
            <div style={styles.styleButtons}>
              <button
                style={{
                  ...styles.styleBtn,
                  backgroundColor: element.bold ? '#4a90d9' : '#3d3d3d',
                  fontWeight: 'bold',
                }}
                onClick={() => onChange({ bold: !element.bold })}
              >
                B
              </button>
              <button
                style={{
                  ...styles.styleBtn,
                  backgroundColor: element.italic ? '#4a90d9' : '#3d3d3d',
                  fontStyle: 'italic',
                }}
                onClick={() => onChange({ italic: !element.italic })}
              >
                I
              </button>
              <button
                style={{
                  ...styles.styleBtn,
                  backgroundColor: element.underline ? '#4a90d9' : '#3d3d3d',
                  textDecoration: 'underline',
                }}
                onClick={() => onChange({ underline: !element.underline })}
              >
                U
              </button>
            </div>
          </div>

          {/* 预览 */}
          <div style={styles.section}>
            <label style={styles.label}>预览</label>
            <div style={styles.preview}>
              <span
                style={{
                  fontFamily: element.fontFamily,
                  fontSize: Math.min(element.fontSize, 32),
                  color: element.color,
                  fontWeight: element.bold ? 'bold' : 'normal',
                  fontStyle: element.italic ? 'italic' : 'normal',
                  textDecoration: element.underline ? 'underline' : 'none',
                }}
              >
                {element.text || '预览文字'}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.okBtn} onClick={onClose}>
            完成
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1500,
  },
  panel: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#2d2d2d',
    borderRadius: '12px',
    width: '340px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    zIndex: 1501,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #404040',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#888',
    cursor: 'pointer',
  },
  content: {
    padding: '16px 20px',
  },
  section: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#888',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#3d3d3d',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '6px',
    fontSize: '14px',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  colorRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  colorPicker: {
    width: '40px',
    height: '40px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  presetColors: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    flex: 1,
  },
  colorBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: 0,
  },
  styleButtons: {
    display: 'flex',
    gap: '8px',
  },
  styleBtn: {
    width: '40px',
    height: '40px',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
  },
  preview: {
    padding: '16px',
    backgroundColor: '#1a1a1a',
    borderRadius: '6px',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footer: {
    padding: '16px 20px',
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
