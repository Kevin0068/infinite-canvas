import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ImageElement, Rect } from '../types';

interface CropModalProps {
  image: ImageElement;
  onCrop: (croppedDataUrl: string, cropRect: Rect) => void;
  onCancel: () => void;
}

export const CropModal: React.FC<CropModalProps> = ({ image, onCrop, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const dragStartRef = useRef<{ x: number; y: number; rect: Rect } | null>(null);

  // 加载图片并初始化裁剪区域
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const maxWidth = container.clientWidth - 40;
      const maxHeight = container.clientHeight - 120;
      
      // 计算缩放比例以适应容器
      const scaleX = maxWidth / img.width;
      const scaleY = maxHeight / img.height;
      const newScale = Math.min(scaleX, scaleY, 1);
      
      const displayWidth = img.width * newScale;
      const displayHeight = img.height * newScale;
      
      setScale(newScale);
      setDisplaySize({ width: displayWidth, height: displayHeight });
      
      // 初始裁剪区域为图片中心 80%
      const initialWidth = displayWidth * 0.8;
      const initialHeight = displayHeight * 0.8;
      setCropRect({
        x: (displayWidth - initialWidth) / 2,
        y: (displayHeight - initialHeight) / 2,
        width: initialWidth,
        height: initialHeight,
      });
      
      setImageLoaded(true);
    };
    img.src = image.src;
  }, [image.src]);

  // 渲染画布
  useEffect(() => {
    if (!imageLoaded) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const img = new Image();
    img.onload = () => {
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制图片
      ctx.drawImage(img, 0, 0, displaySize.width, displaySize.height);
      
      // 绘制半透明遮罩
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 清除裁剪区域的遮罩，显示原图
      ctx.clearRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      ctx.drawImage(
        img,
        cropRect.x / scale, cropRect.y / scale,
        cropRect.width / scale, cropRect.height / scale,
        cropRect.x, cropRect.y,
        cropRect.width, cropRect.height
      );
      
      // 绘制裁剪框边框
      ctx.strokeStyle = '#4a90d9';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      
      // 绘制调整手柄
      const handleSize = 10;
      ctx.fillStyle = '#4a90d9';
      const handles = getHandlePositions(cropRect, handleSize);
      handles.forEach(handle => {
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      });
      
      // 绘制三分线
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      const thirdW = cropRect.width / 3;
      const thirdH = cropRect.height / 3;
      ctx.beginPath();
      ctx.moveTo(cropRect.x + thirdW, cropRect.y);
      ctx.lineTo(cropRect.x + thirdW, cropRect.y + cropRect.height);
      ctx.moveTo(cropRect.x + thirdW * 2, cropRect.y);
      ctx.lineTo(cropRect.x + thirdW * 2, cropRect.y + cropRect.height);
      ctx.moveTo(cropRect.x, cropRect.y + thirdH);
      ctx.lineTo(cropRect.x + cropRect.width, cropRect.y + thirdH);
      ctx.moveTo(cropRect.x, cropRect.y + thirdH * 2);
      ctx.lineTo(cropRect.x + cropRect.width, cropRect.y + thirdH * 2);
      ctx.stroke();
    };
    img.src = image.src;
  }, [imageLoaded, cropRect, displaySize, scale, image.src]);


  // 获取调整手柄位置
  const getHandlePositions = (rect: Rect, size: number) => {
    const half = size / 2;
    return [
      { name: 'nw', x: rect.x - half, y: rect.y - half },
      { name: 'n', x: rect.x + rect.width / 2 - half, y: rect.y - half },
      { name: 'ne', x: rect.x + rect.width - half, y: rect.y - half },
      { name: 'w', x: rect.x - half, y: rect.y + rect.height / 2 - half },
      { name: 'e', x: rect.x + rect.width - half, y: rect.y + rect.height / 2 - half },
      { name: 'sw', x: rect.x - half, y: rect.y + rect.height - half },
      { name: 's', x: rect.x + rect.width / 2 - half, y: rect.y + rect.height - half },
      { name: 'se', x: rect.x + rect.width - half, y: rect.y + rect.height - half },
    ];
  };

  // 检测点击位置
  const getClickTarget = (x: number, y: number): { type: 'move' | 'resize'; handle?: string } | null => {
    const handleSize = 10;
    const handles = getHandlePositions(cropRect, handleSize);
    
    // 检查是否点击了手柄
    for (const handle of handles) {
      if (x >= handle.x && x <= handle.x + handleSize &&
          y >= handle.y && y <= handle.y + handleSize) {
        return { type: 'resize', handle: handle.name };
      }
    }
    
    // 检查是否点击了裁剪区域内部
    if (x >= cropRect.x && x <= cropRect.x + cropRect.width &&
        y >= cropRect.y && y <= cropRect.y + cropRect.height) {
      return { type: 'move' };
    }
    
    return null;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const target = getClickTarget(x, y);
    if (target) {
      setIsDragging(true);
      setDragType(target.type);
      setResizeHandle(target.handle || null);
      dragStartRef.current = { x, y, rect: { ...cropRect } };
    }
  }, [cropRect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - dragStartRef.current.x;
    const dy = y - dragStartRef.current.y;
    const startRect = dragStartRef.current.rect;
    
    if (dragType === 'move') {
      // 移动裁剪框
      let newX = startRect.x + dx;
      let newY = startRect.y + dy;
      
      // 限制在图片范围内
      newX = Math.max(0, Math.min(newX, displaySize.width - startRect.width));
      newY = Math.max(0, Math.min(newY, displaySize.height - startRect.height));
      
      setCropRect({ ...startRect, x: newX, y: newY });
    } else if (dragType === 'resize' && resizeHandle) {
      // 调整裁剪框大小
      let newRect = { ...startRect };
      const minSize = 20;
      
      switch (resizeHandle) {
        case 'nw':
          newRect.x = Math.min(startRect.x + dx, startRect.x + startRect.width - minSize);
          newRect.y = Math.min(startRect.y + dy, startRect.y + startRect.height - minSize);
          newRect.width = startRect.width - (newRect.x - startRect.x);
          newRect.height = startRect.height - (newRect.y - startRect.y);
          break;
        case 'ne':
          newRect.y = Math.min(startRect.y + dy, startRect.y + startRect.height - minSize);
          newRect.width = Math.max(minSize, startRect.width + dx);
          newRect.height = startRect.height - (newRect.y - startRect.y);
          break;
        case 'sw':
          newRect.x = Math.min(startRect.x + dx, startRect.x + startRect.width - minSize);
          newRect.width = startRect.width - (newRect.x - startRect.x);
          newRect.height = Math.max(minSize, startRect.height + dy);
          break;
        case 'se':
          newRect.width = Math.max(minSize, startRect.width + dx);
          newRect.height = Math.max(minSize, startRect.height + dy);
          break;
        case 'n':
          newRect.y = Math.min(startRect.y + dy, startRect.y + startRect.height - minSize);
          newRect.height = startRect.height - (newRect.y - startRect.y);
          break;
        case 's':
          newRect.height = Math.max(minSize, startRect.height + dy);
          break;
        case 'w':
          newRect.x = Math.min(startRect.x + dx, startRect.x + startRect.width - minSize);
          newRect.width = startRect.width - (newRect.x - startRect.x);
          break;
        case 'e':
          newRect.width = Math.max(minSize, startRect.width + dx);
          break;
      }
      
      // 限制在图片范围内
      newRect.x = Math.max(0, newRect.x);
      newRect.y = Math.max(0, newRect.y);
      newRect.width = Math.min(newRect.width, displaySize.width - newRect.x);
      newRect.height = Math.min(newRect.height, displaySize.height - newRect.y);
      
      setCropRect(newRect);
    }
  }, [isDragging, dragType, resizeHandle, displaySize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
    setResizeHandle(null);
    dragStartRef.current = null;
  }, []);

  // 执行裁剪
  const handleCrop = useCallback(() => {
    const img = new Image();
    img.onload = () => {
      // 计算原始图片上的裁剪区域
      const originalCropRect: Rect = {
        x: cropRect.x / scale,
        y: cropRect.y / scale,
        width: cropRect.width / scale,
        height: cropRect.height / scale,
      };
      
      // 创建裁剪后的画布
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = originalCropRect.width;
      cropCanvas.height = originalCropRect.height;
      const ctx = cropCanvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          img,
          originalCropRect.x, originalCropRect.y,
          originalCropRect.width, originalCropRect.height,
          0, 0,
          originalCropRect.width, originalCropRect.height
        );
        
        const croppedDataUrl = cropCanvas.toDataURL('image/png');
        onCrop(croppedDataUrl, originalCropRect);
      }
    };
    img.src = image.src;
  }, [cropRect, scale, image.src, onCrop]);

  // 获取光标样式
  const getCursor = () => {
    if (!imageLoaded) return 'default';
    
    const canvas = canvasRef.current;
    if (!canvas) return 'default';
    
    if (isDragging) {
      if (dragType === 'move') return 'move';
      if (resizeHandle) {
        const cursors: Record<string, string> = {
          nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
          n: 'n-resize', s: 's-resize', w: 'w-resize', e: 'e-resize',
        };
        return cursors[resizeHandle] || 'default';
      }
    }
    
    return 'crosshair';
  };

  return (
    <div style={styles.overlay}>
      <div ref={containerRef} style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>裁剪图片</h3>
          <button style={styles.closeBtn} onClick={onCancel}>✕</button>
        </div>
        
        <div style={styles.canvasContainer}>
          {imageLoaded ? (
            <canvas
              ref={canvasRef}
              width={displaySize.width}
              height={displaySize.height}
              style={{ ...styles.canvas, cursor: getCursor() }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          ) : (
            <div style={styles.loading}>加载中...</div>
          )}
        </div>
        
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onCancel}>取消</button>
          <button style={styles.cropBtn} onClick={handleCrop}>确认裁剪</button>
        </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: '#2d2d2d',
    borderRadius: '8px',
    width: '80%',
    maxWidth: '900px',
    height: '80%',
    maxHeight: '700px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
    color: 'white',
    fontSize: '18px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
  },
  canvasContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflow: 'hidden',
  },
  canvas: {
    border: '1px solid #404040',
  },
  loading: {
    color: '#888',
    fontSize: '16px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #404040',
  },
  cancelBtn: {
    padding: '8px 20px',
    backgroundColor: '#404040',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  cropBtn: {
    padding: '8px 20px',
    backgroundColor: '#4a90d9',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};
