import React, { useState } from 'react';
import type { ExportFormat } from '../services/exportService';

interface ExportModalProps {
  onExport: (options: ExportOptions) => void;
  onClose: () => void;
  selectedCount: number;
  totalCount: number;
}

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  scale: number;
  customWidth?: number;
  customHeight?: number;
  useCustomSize: boolean;
  exportSelected: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  onExport,
  onClose,
  selectedCount,
  totalCount,
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'png',
    quality: 0.92,
    scale: 1,
    customWidth: 1920,
    customHeight: 1080,
    useCustomSize: false,
    exportSelected: selectedCount > 0,
  });

  const handleExport = () => {
    onExport(options);
  };

  const scalePresets = [
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 3, label: '3x' },
  ];

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>📥 导出设置</h2>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          {/* 导出范围 */}
          {selectedCount > 0 && (
            <div style={styles.section}>
              <label style={styles.label}>导出范围</label>
              <div style={styles.radioGroup}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    checked={options.exportSelected}
                    onChange={() => setOptions({ ...options, exportSelected: true })}
                  />
                  选中的元素 ({selectedCount}个)
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    checked={!options.exportSelected}
                    onChange={() => setOptions({ ...options, exportSelected: false })}
                  />
                  所有元素 ({totalCount}个)
                </label>
              </div>
            </div>
          )}

          {/* 格式选择 */}
          <div style={styles.section}>
            <label style={styles.label}>格式</label>
            <div style={styles.formatButtons}>
              <button
                style={{
                  ...styles.formatBtn,
                  backgroundColor: options.format === 'png' ? '#4a90d9' : '#3d3d3d',
                }}
                onClick={() => setOptions({ ...options, format: 'png' })}
              >
                PNG
              </button>
              <button
                style={{
                  ...styles.formatBtn,
                  backgroundColor: options.format === 'jpg' ? '#4a90d9' : '#3d3d3d',
                }}
                onClick={() => setOptions({ ...options, format: 'jpg' })}
              >
                JPG
              </button>
            </div>
          </div>

          {/* JPG 质量 */}
          {options.format === 'jpg' && (
            <div style={styles.section}>
              <label style={styles.label}>
                质量: {Math.round(options.quality * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                value={options.quality}
                onChange={(e) => setOptions({ ...options, quality: Number(e.target.value) })}
                style={styles.slider}
              />
            </div>
          )}

          {/* 缩放比例 */}
          <div style={styles.section}>
            <label style={styles.label}>缩放比例</label>
            <div style={styles.scaleButtons}>
              {scalePresets.map((preset) => (
                <button
                  key={preset.value}
                  style={{
                    ...styles.scaleBtn,
                    backgroundColor: options.scale === preset.value && !options.useCustomSize 
                      ? '#4a90d9' : '#3d3d3d',
                  }}
                  onClick={() => setOptions({ ...options, scale: preset.value, useCustomSize: false })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义尺寸 */}
          <div style={styles.section}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={options.useCustomSize}
                onChange={(e) => setOptions({ ...options, useCustomSize: e.target.checked })}
              />
              自定义尺寸
            </label>
            {options.useCustomSize && (
              <div style={styles.sizeInputs}>
                <div style={styles.sizeInput}>
                  <label style={styles.smallLabel}>宽度</label>
                  <input
                    type="number"
                    value={options.customWidth}
                    onChange={(e) => setOptions({ ...options, customWidth: Number(e.target.value) })}
                    style={styles.numberInput}
                    min="1"
                    max="10000"
                  />
                </div>
                <span style={styles.sizeX}>×</span>
                <div style={styles.sizeInput}>
                  <label style={styles.smallLabel}>高度</label>
                  <input
                    type="number"
                    value={options.customHeight}
                    onChange={(e) => setOptions({ ...options, customHeight: Number(e.target.value) })}
                    style={styles.numberInput}
                    min="1"
                    max="10000"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button style={styles.exportBtn} onClick={handleExport}>
            导出
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
    width: '400px',
    maxWidth: '90vw',
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
    fontSize: '18px',
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
    padding: '20px 24px',
  },
  section: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontSize: '14px',
    color: '#aaa',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#ddd',
    cursor: 'pointer',
  },
  formatButtons: {
    display: 'flex',
    gap: '8px',
  },
  formatBtn: {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  scaleButtons: {
    display: 'flex',
    gap: '8px',
  },
  scaleBtn: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#ddd',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  sizeInputs: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
  },
  sizeInput: {
    flex: 1,
  },
  smallLabel: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
    color: '#888',
  },
  numberInput: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3d3d3d',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '6px',
    fontSize: '14px',
  },
  sizeX: {
    color: '#888',
    fontSize: '16px',
    paddingBottom: '10px',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #404040',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  cancelBtn: {
    padding: '10px 24px',
    backgroundColor: '#3d3d3d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  exportBtn: {
    padding: '10px 24px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
