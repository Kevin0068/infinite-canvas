import React, { useState } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { mergeImages } from '../core/merger';
import { exportAndDownload } from '../services/exportService';
import { getClipboard, setClipboard } from './Canvas';
import type { ImageElement } from '../types';
import type { ExportFormat } from '../services/exportService';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCrop?: (image: ImageElement) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onCrop }) => {
  const { state, dispatch } = useCanvas();
  const [isExporting, setIsExporting] = useState(false);

  const selectedImages = state.elements.filter(
    (el): el is ImageElement => el.type === 'image' && state.selectedIds.has(el.id)
  );
  const allImages = state.elements.filter(
    (el): el is ImageElement => el.type === 'image'
  );
  const canMerge = selectedImages.length >= 2;
  const hasSelection = state.selectedIds.size > 0;
  const canExport = selectedImages.length > 0 || allImages.length > 0;
  const clipboardData = getClipboard();
  const canPaste = clipboardData.length > 0;
  const canCrop = selectedImages.length === 1;

  const handleMerge = async () => {
    if (!canMerge) return;
    try {
      const mergedImage = await mergeImages(selectedImages, () => crypto.randomUUID());
      dispatch({ type: 'MERGE_IMAGES', payload: mergedImage });
    } catch (error) {
      console.error('合并失败:', error);
    }
    onClose();
  };

  const handleCrop = () => {
    if (canCrop && onCrop) {
      onCrop(selectedImages[0]);
    }
    onClose();
  };

  const handleDelete = () => {
    if (hasSelection) {
      dispatch({ type: 'REMOVE_ELEMENTS', payload: Array.from(state.selectedIds) });
    }
    onClose();
  };

  const handleSelectAll = () => {
    const allIds = state.elements.map(el => el.id);
    dispatch({ type: 'SET_SELECTION', payload: allIds });
    onClose();
  };

  const handleCopy = () => {
    if (hasSelection) {
      const selectedElements = state.elements.filter(el => state.selectedIds.has(el.id));
      setClipboard(selectedElements.map(el => ({ ...el })));
    }
    onClose();
  };

  const handlePaste = () => {
    if (canPaste) {
      const newElements = clipboardData.map(el => ({
        ...el,
        id: crypto.randomUUID(),
        position: {
          x: el.position.x + 20,
          y: el.position.y + 20,
        },
      }));
      dispatch({ type: 'ADD_ELEMENTS', payload: newElements });
      // 更新剪贴板位置
      setClipboard(newElements.map(el => ({ ...el })));
    }
    onClose();
  };

  const handleExport = async (format: ExportFormat) => {
    if (!canExport || isExporting) return;
    
    const imagesToExport = selectedImages.length > 0 ? selectedImages : allImages;
    setIsExporting(true);
    
    try {
      const filename = `canvas-export-${Date.now()}`;
      await exportAndDownload(imagesToExport, filename, { format });
    } catch (error) {
      console.error('导出失败:', error);
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={{ ...styles.menu, left: x, top: y }}>
        <button
          style={{ ...styles.menuItem, opacity: canMerge ? 1 : 0.5 }}
          onClick={handleMerge}
          disabled={!canMerge}
        >
          🔗 合并图片
        </button>
        <button
          style={{ ...styles.menuItem, opacity: canCrop ? 1 : 0.5 }}
          onClick={handleCrop}
          disabled={!canCrop}
        >
          ✂️ 裁剪图片
        </button>
        <button
          style={{ ...styles.menuItem, opacity: hasSelection ? 1 : 0.5 }}
          onClick={handleDelete}
          disabled={!hasSelection}
        >
          🗑️ 删除
        </button>
        <div style={styles.divider} />
        <button
          style={{ ...styles.menuItem, opacity: canExport ? 1 : 0.5 }}
          onClick={() => handleExport('png')}
          disabled={!canExport || isExporting}
        >
          📥 导出为 PNG
        </button>
        <button
          style={{ ...styles.menuItem, opacity: canExport ? 1 : 0.5 }}
          onClick={() => handleExport('jpg')}
          disabled={!canExport || isExporting}
        >
          📥 导出为 JPG
        </button>
        <div style={styles.divider} />
        <button style={styles.menuItem} onClick={handleSelectAll}>
          ⬜ 全选
        </button>
        <button
          style={{ ...styles.menuItem, opacity: hasSelection ? 1 : 0.5 }}
          onClick={handleCopy}
          disabled={!hasSelection}
        >
          📋 复制
        </button>
        <button
          style={{ ...styles.menuItem, opacity: canPaste ? 1 : 0.5 }}
          onClick={handlePaste}
          disabled={!canPaste}
        >
          📄 粘贴
        </button>
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
    zIndex: 999,
  },
  menu: {
    position: 'fixed',
    backgroundColor: '#2d2d2d',
    border: '1px solid #404040',
    borderRadius: '6px',
    padding: '4px 0',
    minWidth: '150px',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  menuItem: {
    display: 'block',
    width: '100%',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#404040',
    margin: '4px 0',
  },
};
