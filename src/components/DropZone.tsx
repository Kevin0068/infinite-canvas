import React, { useCallback, useState } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { loadFile } from '../services/fileService';

interface DropZoneProps {
  children: React.ReactNode;
}

export const DropZone: React.FC<DropZoneProps> = ({ children }) => {
  const { dispatch, state } = useCanvas();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // 获取放置位置（相对于画布）
    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;

    // 转换为画布坐标
    const canvasX = (dropX - state.viewport.offset.x) / state.viewport.scale;
    const canvasY = (dropY - state.viewport.offset.y) / state.viewport.scale;

    // 计算最大 zIndex
    const maxZIndex = state.elements.length > 0 
      ? Math.max(...state.elements.map(el => el.zIndex)) 
      : 0;

    // 加载所有文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const element = await loadFile(
          file,
          { x: canvasX + i * 20, y: canvasY + i * 20 }, // 错开位置
          maxZIndex + i + 1
        );
        dispatch({ type: 'ADD_ELEMENT', payload: element });
      } catch (error) {
        console.error('文件加载失败:', error);
        // TODO: 显示错误提示
      }
    }
  }, [dispatch, state.viewport, state.elements]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        outline: isDragOver ? '3px dashed #4a90d9' : 'none',
        backgroundColor: isDragOver ? 'rgba(74, 144, 217, 0.1)' : 'transparent',
      }}
    >
      {children}
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px 40px',
            backgroundColor: 'rgba(74, 144, 217, 0.9)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            pointerEvents: 'none',
          }}
        >
          释放以添加文件
        </div>
      )}
    </div>
  );
};
