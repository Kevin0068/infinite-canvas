import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { render, loadImageToCache, renderSelectionBox } from '../core/renderer';
import { calculateZoomOffset, clampScale } from '../utils/transform';
import { getElementAtPoint, getElementsInRect } from '../core/hitTest';
import type { Point, Rect, CanvasElement, ImageElement } from '../types';
import { ContextMenu } from './ContextMenu';
import { CropModal } from './CropModal';

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const ZOOM_FACTOR = 0.1;

// 剪贴板状态（模块级别）
let clipboard: CanvasElement[] = [];

export function getClipboard(): CanvasElement[] {
  return clipboard;
}

export function setClipboard(elements: CanvasElement[]): void {
  clipboard = elements;
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useCanvas();
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  // 拖动状态
  const dragStartRef = useRef<Point | null>(null);
  const dragElementStartPosRef = useRef<Map<string, Point>>(new Map());
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 });
  
  // 框选状态
  const isBoxSelectingRef = useRef(false);
  const boxSelectStartRef = useRef<Point | null>(null);
  const [selectionBox, setSelectionBox] = useState<Rect | null>(null);
  
  // 空格键状态
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Alt 复制状态
  const isDuplicatingRef = useRef(false);
  const duplicatedIdsRef = useRef<Map<string, string>>(new Map());
  
  // 裁剪状态
  const [cropImage, setCropImage] = useState<ImageElement | null>(null);

  // 加载所有图片到缓存
  useEffect(() => {
    const loadImages = async () => {
      for (const element of state.elements) {
        if (element.type === 'image') {
          await loadImageToCache(element.src);
        }
      }
      // 重新渲染
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        render(ctx, state, canvasSize);
      }
    };
    loadImages();
  }, [state.elements]);

  // 渲染
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    render(ctx, state, canvasSize);
    
    // 渲染框选框
    if (selectionBox) {
      renderSelectionBox(ctx, selectionBox);
    }
  }, [state, canvasSize, selectionBox]);

  // 调整画布大小
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 获取鼠标在 canvas 上的位置
  const getMousePos = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // 鼠标按下
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    lastMousePosRef.current = mousePos;
    
    // 中键或空格键平移
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      isPanningRef.current = true;
      dispatch({ type: 'SET_PANNING', payload: true });
      return;
    }
    
    // 左键点击
    if (e.button === 0) {
      const clickedElement = getElementAtPoint(mousePos, state.elements, state.viewport);
      
      if (clickedElement) {
        // 点击了元素
        if (e.shiftKey) {
          // Shift 多选：切换选中状态
          if (state.selectedIds.has(clickedElement.id)) {
            // 已选中则取消选中
            const newSelection = [...state.selectedIds].filter(id => id !== clickedElement.id);
            dispatch({ type: 'SET_SELECTION', payload: newSelection });
          } else {
            // 未选中则添加到选择
            dispatch({ type: 'ADD_TO_SELECTION', payload: clickedElement.id });
          }
        } else if (!state.selectedIds.has(clickedElement.id)) {
          // 普通点击未选中的元素：单选
          dispatch({ type: 'SET_SELECTION', payload: [clickedElement.id] });
        }
        // 如果点击已选中的元素（无 Shift），保持当前选择不变，直接开始拖动
        
        // Alt + 拖动 = 复制
        if (e.altKey) {
          isDuplicatingRef.current = true;
          duplicatedIdsRef.current = new Map();
          
          // 复制选中的元素
          const idsToMove = state.selectedIds.has(clickedElement.id) 
            ? state.selectedIds 
            : new Set([clickedElement.id]);
          
          const newElements: CanvasElement[] = [];
          state.elements.forEach(el => {
            if (idsToMove.has(el.id)) {
              const newId = crypto.randomUUID();
              duplicatedIdsRef.current.set(el.id, newId);
              newElements.push({
                ...el,
                id: newId,
                position: { ...el.position },
              });
            }
          });
          
          if (newElements.length > 0) {
            dispatch({ type: 'ADD_ELEMENTS', payload: newElements });
          }
        }
        
        // 开始拖动
        dragStartRef.current = mousePos;
        dragElementStartPosRef.current = new Map();
        
        // 拖动所有选中的元素（包括刚点击的）
        const idsToMove = state.selectedIds.has(clickedElement.id) 
          ? state.selectedIds 
          : new Set([clickedElement.id]);
        
        state.elements.forEach(el => {
          if (idsToMove.has(el.id)) {
            dragElementStartPosRef.current.set(el.id, { ...el.position });
          }
        });
        dispatch({ type: 'SET_DRAGGING', payload: true });
      } else {
        // 点击空白区域，开始框选
        isBoxSelectingRef.current = true;
        boxSelectStartRef.current = mousePos;
        if (!e.shiftKey) {
          dispatch({ type: 'CLEAR_SELECTION' });
        }
      }
    }
  }, [state.viewport, state.elements, state.selectedIds, dispatch, getMousePos, isSpacePressed]);


  // 鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    const dx = mousePos.x - lastMousePosRef.current.x;
    const dy = mousePos.y - lastMousePosRef.current.y;
    
    if (isPanningRef.current) {
      // 平移画布
      dispatch({
        type: 'SET_VIEWPORT',
        payload: {
          offset: {
            x: state.viewport.offset.x + dx,
            y: state.viewport.offset.y + dy,
          },
        },
      });
    } else if (state.isDragging && dragStartRef.current) {
      // 拖动元素
      const totalDx = (mousePos.x - dragStartRef.current.x) / state.viewport.scale;
      const totalDy = (mousePos.y - dragStartRef.current.y) / state.viewport.scale;
      
      if (isDuplicatingRef.current) {
        // 拖动复制的元素
        duplicatedIdsRef.current.forEach((newId, _originalId) => {
          const originalStartPos = [...dragElementStartPosRef.current.values()][0];
          if (originalStartPos) {
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                id: newId,
                updates: {
                  position: {
                    x: originalStartPos.x + totalDx,
                    y: originalStartPos.y + totalDy,
                  },
                },
              },
            });
          }
        });
        
        // 同时更新所有复制的元素位置
        let index = 0;
        const startPosArray = [...dragElementStartPosRef.current.entries()];
        duplicatedIdsRef.current.forEach((newId, originalId) => {
          const entry = startPosArray.find(([id]) => id === originalId);
          if (entry) {
            const [, startPos] = entry;
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                id: newId,
                updates: {
                  position: {
                    x: startPos.x + totalDx,
                    y: startPos.y + totalDy,
                  },
                },
              },
            });
          }
          index++;
        });
      } else {
        // 正常拖动
        dragElementStartPosRef.current.forEach((startPos, id) => {
          dispatch({
            type: 'UPDATE_ELEMENT',
            payload: {
              id,
              updates: {
                position: {
                  x: startPos.x + totalDx,
                  y: startPos.y + totalDy,
                },
              },
            },
          });
        });
      }
    } else if (isBoxSelectingRef.current && boxSelectStartRef.current) {
      // 框选
      const startPos = boxSelectStartRef.current;
      const box: Rect = {
        x: Math.min(startPos.x, mousePos.x),
        y: Math.min(startPos.y, mousePos.y),
        width: Math.abs(mousePos.x - startPos.x),
        height: Math.abs(mousePos.y - startPos.y),
      };
      setSelectionBox(box);
      
      // 实时更新选中的元素
      const selectedElements = getElementsInRect(box, state.elements, state.viewport);
      const selectedIds = selectedElements.map(el => el.id);
      dispatch({ type: 'SET_SELECTION', payload: selectedIds });
    }
    
    lastMousePosRef.current = mousePos;
  }, [state.viewport, state.isDragging, state.elements, dispatch, getMousePos]);

  // 鼠标释放
  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      dispatch({ type: 'SET_PANNING', payload: false });
    }
    if (state.isDragging) {
      dragStartRef.current = null;
      dragElementStartPosRef.current.clear();
      dispatch({ type: 'SET_DRAGGING', payload: false });
      
      // 重置复制状态
      isDuplicatingRef.current = false;
      duplicatedIdsRef.current.clear();
    }
    if (isBoxSelectingRef.current) {
      isBoxSelectingRef.current = false;
      boxSelectStartRef.current = null;
      setSelectionBox(null);
    }
  }, [state.isDragging, dispatch]);

  // 滚轮缩放 - 只有按住 Ctrl 才缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // 只有按住 Ctrl 才缩放
    if (!e.ctrlKey) {
      // 普通滚轮 = 平移
      dispatch({
        type: 'SET_VIEWPORT',
        payload: {
          offset: {
            x: state.viewport.offset.x - e.deltaX,
            y: state.viewport.offset.y - e.deltaY,
          },
        },
      });
      return;
    }
    
    const mousePos = getMousePos(e);
    
    const delta = e.deltaY > 0 ? -ZOOM_FACTOR : ZOOM_FACTOR;
    const newScale = clampScale(state.viewport.scale * (1 + delta), MIN_SCALE, MAX_SCALE);
    
    if (newScale !== state.viewport.scale) {
      const newOffset = calculateZoomOffset(state.viewport, newScale, mousePos);
      dispatch({
        type: 'SET_VIEWPORT',
        payload: { scale: newScale, offset: newOffset },
      });
    }
  }, [state.viewport, dispatch, getMousePos]);

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 空格键
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      
      // 删除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedIds.size > 0) {
          dispatch({ type: 'REMOVE_ELEMENTS', payload: [...state.selectedIds] });
        }
      }
      
      // Ctrl+C 复制
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (state.selectedIds.size > 0) {
          const selectedElements = state.elements.filter(el => state.selectedIds.has(el.id));
          setClipboard(selectedElements.map(el => ({ ...el })));
        }
      }
      
      // Ctrl+V 粘贴
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const clipboardData = getClipboard();
        if (clipboardData.length > 0) {
          const newElements = clipboardData.map(el => ({
            ...el,
            id: crypto.randomUUID(),
            position: {
              x: el.position.x + 20,
              y: el.position.y + 20,
            },
          }));
          dispatch({ type: 'ADD_ELEMENTS', payload: newElements });
          // 更新剪贴板位置，方便连续粘贴
          setClipboard(newElements.map(el => ({ ...el })));
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.selectedIds, state.elements, dispatch]);

  // 右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // 裁剪功能
  const handleCropRequest = useCallback((image: ImageElement) => {
    setCropImage(image);
  }, []);

  const handleCropComplete = useCallback((croppedDataUrl: string, cropRect: Rect) => {
    if (!cropImage) return;
    
    // 更新图片元素
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        id: cropImage.id,
        updates: {
          src: croppedDataUrl,
          size: { width: cropRect.width, height: cropRect.height },
          originalSize: { width: cropRect.width, height: cropRect.height },
        },
      },
    });
    
    // 重新加载裁剪后的图片到缓存
    loadImageToCache(croppedDataUrl);
    
    setCropImage(null);
  }, [cropImage, dispatch]);

  const handleCropCancel = useCallback(() => {
    setCropImage(null);
  }, []);

  // 计算光标样式
  const getCursor = () => {
    if (isSpacePressed || isPanningRef.current) return 'grab';
    if (state.isDragging) return 'move';
    return 'default';
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        cursor: getCursor(),
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{ display: 'block' }}
      />
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onClose={closeContextMenu}
          onCrop={handleCropRequest}
        />
      )}
      {cropImage && (
        <CropModal
          image={cropImage}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
