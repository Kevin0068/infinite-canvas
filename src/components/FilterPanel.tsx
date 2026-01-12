import React from 'react';
import type { ImageFilters } from '../types';

interface FilterPanelProps {
  filters: ImageFilters;
  onChange: (filters: ImageFilters) => void;
  onFlipH: () => void;
  onFlipV: () => void;
  flipH: boolean;
  flipV: boolean;
  onClose: () => void;
}

const defaultFilters: ImageFilters = {
  brightness: 100,
  contrast: 100,
  grayscale: 0,
  blur: 0,
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onFlipH,
  onFlipV,
  flipH,
  flipV,
  onClose,
}) => {
  const handleChange = (key: keyof ImageFilters, value: number) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange(defaultFilters);
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.panel}>
        <div style={styles.header}>
          <h3 style={styles.title}>🎨 图片调整</h3>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.content}>
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>翻转</h4>
            <div style={styles.flipButtons}>
              <button 
                style={{ ...styles.flipBtn, backgroundColor: flipH ? '#4a90d9' : '#3d3d3d' }}
                onClick={onFlipH}
              >
                ↔️ 水平翻转
              </button>
              <button 
                style={{ ...styles.flipBtn, backgroundColor: flipV ? '#4a90d9' : '#3d3d3d' }}
                onClick={onFlipV}
              >
                ↕️ 垂直翻转
              </button>
            </div>
          </div>

          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>滤镜</h4>
            
            <div style={styles.sliderGroup}>
              <label style={styles.label}>
                亮度: {filters.brightness}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={filters.brightness}
                onChange={(e) => handleChange('brightness', Number(e.target.value))}
                style={styles.slider}
              />
            </div>

            <div style={styles.sliderGroup}>
              <label style={styles.label}>
                对比度: {filters.contrast}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={filters.contrast}
                onChange={(e) => handleChange('contrast', Number(e.target.value))}
                style={styles.slider}
              />
            </div>

            <div style={styles.sliderGroup}>
              <label style={styles.label}>
                灰度: {filters.grayscale}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.grayscale}
                onChange={(e) => handleChange('grayscale', Number(e.target.value))}
                style={styles.slider}
              />
            </div>

            <div style={styles.sliderGroup}>
              <label style={styles.label}>
                模糊: {filters.blur}px
              </label>
              <input
                type="range"
                min="0"
                max="20"
                value={filters.blur}
                onChange={(e) => handleChange('blur', Number(e.target.value))}
                style={styles.slider}
              />
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.resetBtn} onClick={handleReset}>
            重置
          </button>
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
    width: '320px',
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
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    fontWeight: 500,
    color: '#888',
  },
  flipButtons: {
    display: 'flex',
    gap: '8px',
  },
  flipBtn: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  sliderGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#ccc',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #404040',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  resetBtn: {
    padding: '8px 20px',
    backgroundColor: '#3d3d3d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  okBtn: {
    padding: '8px 20px',
    backgroundColor: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
};

export { defaultFilters };
