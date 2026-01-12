import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { render, loadImageToCache, renderSelectionBox } from '../core/renderer';
import { calculateZoomOffset, clampScale } from '../utils/transform';
import { getElementAtPoint, getElementsInRect } from '../core/hitTest';
import type { Point, Rect, CanvasElement, ImageElement, TextElement, ViewportState, ImageFilters } from '../types';
import { ContextMenu } from './ContextMenu';
import { CropModal } from './CropModal';
import { InlineTextEditor } from './InlineTextEditor';
import { FilterPanel, defaultFilters } from './FilterPanel';
import { TextStylePanel } from './TextStylePanel';
import { canvasToScreen } from '../utils/transform';

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const ZOOM_FACTOR = 0.1;

// 交互模式
type InteractionMode = 'none' | 'drag' | 'resize' | 'rotate' | 'pan' | 'boxSelect';

// 剪贴板状态（模块级别）
let clipboard: CanvasElement[] = [];

export function getClipboard(): CanvasElement[] {
  return clipboard;
}

export function setClipboard(elements: CanvasElement[]): void {
  clipboard = elements;
}

// 检测鼠标是否在角点上（用于缩放）
function getCornerAtPoint(
  mousePos: Point,
  element: CanvasElement,
  viewport: ViewportState
): 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | null {
  const screenPos = canvasToScreen(element.position, viewport);
  const screenWidth = element.size.width * viewport.scale;
  const screenHeight = element.size.height * viewport.scale;
  const rotation = element.rotation || 0;
  const cornerSize = 12; // 点击区域

  // 计算中心点
  const centerX = screenPos.x + screenWidth / 2;
  const centerY = screenPos.y + screenHeight / 2;

  // 四个角点（相对于中心）
  const corners = {
    topLeft: { x: -screenWidth / 2, y: -screenHeight / 2 },
    topRight: { x: screenWidth / 2, y: -screenHeight / 2 },
    bottomLeft: { x: -screenWidth / 2, y: screenHeight / 2 },
    bottomRight: { x: screenWidth / 2, y: screenHeight / 2 },
  };

  // 将鼠标位置转换到元素坐标系（考虑旋转）
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  const relX = mousePos.x - centerX;
  const relY = mousePos.y - centerY;
  const localX = relX * cos - relY * sin;
  const localY = relX * sin + relY * cos;

  for (const [name, corner] of Object.entries(corners)) {
    const dx = localX - corner.x;
    const dy = localY - corner.y;
    if (Math.abs(dx) < cornerSize && Math.abs(dy) < cornerSize) {
      return name as 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
    }
  }
  return null;
}

// 检测鼠标是否在旋转手柄上
function isOnRotationHandle(
  mousePos: Point,
  element: CanvasElement,
  viewport: ViewportState
): boolean {
  const screenPos = canvasToScreen(element.position, viewport);
  const screenWidth = element.size.width * viewport.scale;
  const screenHeight = element.size.height * viewport.scale;
  const rotation = element.rotation || 0;
  const handleRadius = 10;

  const centerX = screenPos.x + screenWidth / 2;
  const centerY = screenPos.y + screenHeight / 2;

  // 旋转手柄位置（相对于中心，在顶部上方）
  const handleY = -screenHeight / 2 - 25;

  // 将鼠标位置转换到元素坐标系
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  const relX = mousePos.x - centerX;
  const relY = mousePos.y - centerY;
  const localX = relX * cos - relY * sin;
  const localY = relX * sin + relY * cos;

  const dx = localX - 0;
  const dy = localY - handleY;
  return Math.sqrt(dx * dx + dy * dy) < handleRadius;
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch, canUndo, canRedo } = useCanvas();
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  // 交互模式
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
  const interactionStartRef = useRef<Point | null>(null);
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 });
  
  // 拖动状态
  const dragElementStartPosRef = useRef<Map<string, Point>>(new Map());
  
  // 缩放状态
  const resizeCornerRef = useRef<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | null>(null);
  const resizeStartSizeRef = useRef<Map<string, { width: number; height: number }>>(new Map());
  const resizeStartPosRef = useRef<Map<string, Point>>(new Map());
  const resizeStartFontSizeRef = useRef<Map<string, number>>(new Map());
  
  // 旋转状态
  const rotateStartAngleRef = useRef<Map<string, number>>(new Map());
  const rotateStartMouseAngleRef = useRef<number>(0);

  // 框选状态
  const boxSelectStartRef = useRef<Point | null>(null);
  const [selectionBox, setSelectionBox] = useState<Rect | null>(null);
  
  // 空格键状态
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Alt 复制状态
  const isDuplicatingRef = useRef(false);
  const duplicatedIdsRef = useRef<Map<string, string>>(new Map());
  
  // 裁剪状态
  const [cropImage, setCropImage] = useState<ImageElement | null>(null);
  
  // 内联文字编辑状态
  const [editingText, setEditingText] = useState<TextElement | null>(null);
  const [editingTextScreenPos, setEditingTextScreenPos] = useState<Point>({ x: 0, y: 0 });
  const [isAddingText, setIsAddingText] = useState(false);
  const [newTextPosition, setNewTextPosition] = useState<Point>({ x: 0, y: 0 });
  const [newTextScreenPos, setNewTextScreenPos] = useState<Point>({ x: 0, y: 0 });
  
  // 右键菜单位置（用于插入文字）
  const contextMenuCanvasPosRef = useRef<Point>({ x: 0, y: 0 });
  
  // 滤镜面板状态
  const [filterImage, setFilterImage] = useState<ImageElement | null>(null);
  
  // 文字样式面板状态
  const [styleText, setStyleText] = useState<TextElement | null>(null);

  // 加载所有图片到缓存
  useEffect(() => {
    const loadImages = async () => {
      for (const element of state.elements) {
        if (element.type === 'image') {
          await loadImageToCache(element.src);
        }
      }
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
    // 如果正在编辑文字，不处理
    if (editingText || isAddingText) return;
    
    const mousePos = getMousePos(e);
    lastMousePosRef.current = mousePos;
    interactionStartRef.current = mousePos;
    
    // 中键或空格键平移
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      setInteractionMode('pan');
      dispatch({ type: 'SET_PANNING', payload: true });
      return;
    }
    
    // 左键点击
    if (e.button === 0) {
      // 首先检查是否点击了选中元素的控制点（旋转手柄或角点）
      // 这些控制点可能在元素边界之外
      for (const id of state.selectedIds) {
        const element = state.elements.find(el => el.id === id);
        if (!element) continue;
        
        // 检查旋转手柄
        if (isOnRotationHandle(mousePos, element, state.viewport)) {
          setInteractionMode('rotate');
          rotateStartAngleRef.current = new Map();
          
          // 计算初始鼠标角度
          const screenPos = canvasToScreen(element.position, state.viewport);
          const screenWidth = element.size.width * state.viewport.scale;
          const screenHeight = element.size.height * state.viewport.scale;
          const centerX = screenPos.x + screenWidth / 2;
          const centerY = screenPos.y + screenHeight / 2;
          rotateStartMouseAngleRef.current = Math.atan2(mousePos.y - centerY, mousePos.x - centerX);
          
          // 保存所有选中元素的初始角度
          state.elements.forEach(el => {
            if (state.selectedIds.has(el.id)) {
              rotateStartAngleRef.current.set(el.id, el.rotation || 0);
            }
          });
          return;
        }
        
        // 检查角点（缩放）
        const corner = getCornerAtPoint(mousePos, element, state.viewport);
        if (corner) {
          setInteractionMode('resize');
          resizeCornerRef.current = corner;
          resizeStartSizeRef.current = new Map();
          resizeStartPosRef.current = new Map();
          resizeStartFontSizeRef.current = new Map();
          
          state.elements.forEach(el => {
            if (state.selectedIds.has(el.id)) {
              resizeStartSizeRef.current.set(el.id, { ...el.size });
              resizeStartPosRef.current.set(el.id, { ...el.position });
              // 保存文本元素的初始字体大小
              if (el.type === 'text') {
                resizeStartFontSizeRef.current.set(el.id, (el as TextElement).fontSize);
              }
            }
          });
          return;
        }
      }
      
      // 然后检查是否点击了元素本身
      const clickedElement = getElementAtPoint(mousePos, state.elements, state.viewport);
      
      if (clickedElement) {
        // 点击了元素 - 处理选择
        if (e.shiftKey) {
          if (state.selectedIds.has(clickedElement.id)) {
            const newSelection = [...state.selectedIds].filter(id => id !== clickedElement.id);
            dispatch({ type: 'SET_SELECTION', payload: newSelection });
          } else {
            dispatch({ type: 'ADD_TO_SELECTION', payload: clickedElement.id });
          }
        } else if (!state.selectedIds.has(clickedElement.id)) {
          dispatch({ type: 'SET_SELECTION', payload: [clickedElement.id] });
        }

        // Alt + 拖动 = 复制
        if (e.altKey) {
          isDuplicatingRef.current = true;
          duplicatedIdsRef.current = new Map();
          
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
        setInteractionMode('drag');
        dragElementStartPosRef.current = new Map();
        
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
        setInteractionMode('boxSelect');
        boxSelectStartRef.current = mousePos;
        if (!e.shiftKey) {
          dispatch({ type: 'CLEAR_SELECTION' });
        }
      }
    }
  }, [state.viewport, state.elements, state.selectedIds, dispatch, getMousePos, isSpacePressed, editingText, isAddingText]);

  // 鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    const dx = mousePos.x - lastMousePosRef.current.x;
    const dy = mousePos.y - lastMousePosRef.current.y;
    
    if (interactionMode === 'pan') {
      dispatch({
        type: 'SET_VIEWPORT',
        payload: {
          offset: {
            x: state.viewport.offset.x + dx,
            y: state.viewport.offset.y + dy,
          },
        },
      });
    } else if (interactionMode === 'drag' && interactionStartRef.current) {
      const totalDx = (mousePos.x - interactionStartRef.current.x) / state.viewport.scale;
      const totalDy = (mousePos.y - interactionStartRef.current.y) / state.viewport.scale;
      
      if (isDuplicatingRef.current) {
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
        });
      } else {
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
    } else if (interactionMode === 'resize' && interactionStartRef.current && resizeCornerRef.current) {
      // 等比例缩放
      const startPos = interactionStartRef.current;
      const totalDx = (mousePos.x - startPos.x) / state.viewport.scale;
      const totalDy = (mousePos.y - startPos.y) / state.viewport.scale;
      
      resizeStartSizeRef.current.forEach((startSize, id) => {
        const startPosition = resizeStartPosRef.current.get(id);
        if (!startPosition) return;
        
        // 计算缩放比例（基于对角线方向的移动）
        let scaleFactor = 1;
        const corner = resizeCornerRef.current;
        
        if (corner === 'bottomRight') {
          const diag = Math.sqrt(startSize.width ** 2 + startSize.height ** 2);
          const delta = (totalDx + totalDy) / 2;
          scaleFactor = (diag + delta * Math.sqrt(2)) / diag;
        } else if (corner === 'topLeft') {
          const diag = Math.sqrt(startSize.width ** 2 + startSize.height ** 2);
          const delta = (-totalDx - totalDy) / 2;
          scaleFactor = (diag + delta * Math.sqrt(2)) / diag;
        } else if (corner === 'topRight') {
          const diag = Math.sqrt(startSize.width ** 2 + startSize.height ** 2);
          const delta = (totalDx - totalDy) / 2;
          scaleFactor = (diag + delta * Math.sqrt(2)) / diag;
        } else if (corner === 'bottomLeft') {
          const diag = Math.sqrt(startSize.width ** 2 + startSize.height ** 2);
          const delta = (-totalDx + totalDy) / 2;
          scaleFactor = (diag + delta * Math.sqrt(2)) / diag;
        }
        
        // 限制缩放范围
        scaleFactor = Math.max(0.1, Math.min(10, scaleFactor));
        
        const newWidth = startSize.width * scaleFactor;
        const newHeight = startSize.height * scaleFactor;
        
        // 计算新位置（保持对角固定）
        let newX = startPosition.x;
        let newY = startPosition.y;
        
        if (corner === 'topLeft') {
          newX = startPosition.x + startSize.width - newWidth;
          newY = startPosition.y + startSize.height - newHeight;
        } else if (corner === 'topRight') {
          newY = startPosition.y + startSize.height - newHeight;
        } else if (corner === 'bottomLeft') {
          newX = startPosition.x + startSize.width - newWidth;
        }
        
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            id,
            updates: {
              size: { width: newWidth, height: newHeight },
              position: { x: newX, y: newY },
              // 如果是文本元素，同时更新字体大小
              ...(resizeStartFontSizeRef.current.has(id) ? {
                fontSize: Math.round(resizeStartFontSizeRef.current.get(id)! * scaleFactor),
              } : {}),
            },
          },
        });
      });
    } else if (interactionMode === 'rotate') {
      // 自由旋转
      const selectedElements = state.elements.filter(el => state.selectedIds.has(el.id));
      if (selectedElements.length > 0) {
        const firstEl = selectedElements[0];
        const screenPos = canvasToScreen(firstEl.position, state.viewport);
        const screenWidth = firstEl.size.width * state.viewport.scale;
        const screenHeight = firstEl.size.height * state.viewport.scale;
        const centerX = screenPos.x + screenWidth / 2;
        const centerY = screenPos.y + screenHeight / 2;
        
        const currentAngle = Math.atan2(mousePos.y - centerY, mousePos.x - centerX);
        const deltaAngle = (currentAngle - rotateStartMouseAngleRef.current) * (180 / Math.PI);
        
        rotateStartAngleRef.current.forEach((startAngle, id) => {
          dispatch({
            type: 'UPDATE_ELEMENT',
            payload: {
              id,
              updates: {
                rotation: startAngle + deltaAngle,
              },
            },
          });
        });
      }
    } else if (interactionMode === 'boxSelect' && boxSelectStartRef.current) {
      const startPos = boxSelectStartRef.current;
      const box: Rect = {
        x: Math.min(startPos.x, mousePos.x),
        y: Math.min(startPos.y, mousePos.y),
        width: Math.abs(mousePos.x - startPos.x),
        height: Math.abs(mousePos.y - startPos.y),
      };
      setSelectionBox(box);
      
      const selectedElements = getElementsInRect(box, state.elements, state.viewport);
      const selectedIds = selectedElements.map(el => el.id);
      dispatch({ type: 'SET_SELECTION', payload: selectedIds });
    }
    
    lastMousePosRef.current = mousePos;
  }, [state.viewport, state.elements, state.selectedIds, interactionMode, dispatch, getMousePos]);

  // 鼠标释放
  const handleMouseUp = useCallback(() => {
    if (interactionMode === 'pan') {
      dispatch({ type: 'SET_PANNING', payload: false });
    }
    if (interactionMode === 'drag') {
      dragElementStartPosRef.current.clear();
      dispatch({ type: 'SET_DRAGGING', payload: false });
      isDuplicatingRef.current = false;
      duplicatedIdsRef.current.clear();
    }
    if (interactionMode === 'resize') {
      resizeStartSizeRef.current.clear();
      resizeStartPosRef.current.clear();
      resizeStartFontSizeRef.current.clear();
      resizeCornerRef.current = null;
    }
    if (interactionMode === 'rotate') {
      rotateStartAngleRef.current.clear();
    }
    if (interactionMode === 'boxSelect') {
      boxSelectStartRef.current = null;
      setSelectionBox(null);
    }
    
    setInteractionMode('none');
    interactionStartRef.current = null;
  }, [interactionMode, dispatch]);

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!e.ctrlKey) {
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
      // 如果正在编辑文字，不处理
      if (editingText || isAddingText) return;
      
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedIds.size > 0) {
          dispatch({ type: 'REMOVE_ELEMENTS', payload: [...state.selectedIds] });
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          dispatch({ type: 'UNDO' });
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) {
          dispatch({ type: 'REDO' });
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (state.selectedIds.size > 0) {
          const selectedElements = state.elements.filter(el => state.selectedIds.has(el.id));
          setClipboard(selectedElements.map(el => ({ ...el })));
        }
      }
      
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
  }, [state.selectedIds, state.elements, dispatch, canUndo, canRedo, editingText, isAddingText]);

  // 右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const mousePos = getMousePos(e);
    // 保存画布坐标用于插入文字
    contextMenuCanvasPosRef.current = {
      x: (mousePos.x - state.viewport.offset.x) / state.viewport.scale,
      y: (mousePos.y - state.viewport.offset.y) / state.viewport.scale,
    };
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [getMousePos, state.viewport]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // 裁剪功能
  const handleCropRequest = useCallback((image: ImageElement) => {
    setCropImage(image);
  }, []);

  const handleCropComplete = useCallback((croppedDataUrl: string, cropRect: Rect) => {
    if (!cropImage) return;
    
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
    
    loadImageToCache(croppedDataUrl);
    setCropImage(null);
  }, [cropImage, dispatch]);

  const handleCropCancel = useCallback(() => {
    setCropImage(null);
  }, []);

  // 插入文字（从右键菜单）
  const handleInsertText = useCallback(() => {
    const canvasPos = contextMenuCanvasPosRef.current;
    const screenPos = canvasToScreen(canvasPos, state.viewport);
    setNewTextPosition(canvasPos);
    setNewTextScreenPos(screenPos);
    setIsAddingText(true);
    setEditingText(null);
    closeContextMenu();
  }, [state.viewport, closeContextMenu]);

  // 双击编辑文字
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    const clickedElement = getElementAtPoint(mousePos, state.elements, state.viewport);
    
    if (clickedElement && clickedElement.type === 'text') {
      const textEl = clickedElement as TextElement;
      const screenPos = canvasToScreen(textEl.position, state.viewport);
      setEditingText(textEl);
      setEditingTextScreenPos(screenPos);
      setIsAddingText(false);
    }
  }, [getMousePos, state.elements, state.viewport]);

  // 保存文字
  const handleTextSave = useCallback((updates: Partial<TextElement>) => {
    if (isAddingText) {
      const maxZIndex = state.elements.length > 0 
        ? Math.max(...state.elements.map(el => el.zIndex)) 
        : 0;
      
      const newText: TextElement = {
        id: crypto.randomUUID(),
        type: 'text',
        position: newTextPosition,
        size: { width: 100, height: 30 },
        originalSize: { width: 100, height: 30 },
        zIndex: maxZIndex + 1,
        rotation: 0,
        scale: 1,
        text: updates.text || '',
        fontSize: updates.fontSize || 24,
        fontFamily: 'Arial, sans-serif',
        color: updates.color || '#ffffff',
        backgroundColor: updates.backgroundColor,
        bold: updates.bold || false,
        italic: updates.italic || false,
      };
      dispatch({ type: 'ADD_TEXT', payload: newText });
    } else if (editingText) {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: editingText.id,
          updates,
        },
      });
    }
    setEditingText(null);
    setIsAddingText(false);
  }, [isAddingText, editingText, newTextPosition, state.elements, dispatch]);

  const handleTextCancel = useCallback(() => {
    setEditingText(null);
    setIsAddingText(false);
  }, []);

  // 滤镜面板
  const handleShowFilter = useCallback((image: ImageElement) => {
    setFilterImage(image);
  }, []);

  const handleFilterChange = useCallback((filters: ImageFilters) => {
    if (filterImage) {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: filterImage.id,
          updates: { filters },
        },
      });
      setFilterImage({ ...filterImage, filters });
    }
  }, [filterImage, dispatch]);

  const handleFlipH = useCallback(() => {
    if (filterImage) {
      const newFlipH = !filterImage.flipH;
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: filterImage.id,
          updates: { flipH: newFlipH },
        },
      });
      setFilterImage({ ...filterImage, flipH: newFlipH });
    }
  }, [filterImage, dispatch]);

  const handleFlipV = useCallback(() => {
    if (filterImage) {
      const newFlipV = !filterImage.flipV;
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: filterImage.id,
          updates: { flipV: newFlipV },
        },
      });
      setFilterImage({ ...filterImage, flipV: newFlipV });
    }
  }, [filterImage, dispatch]);

  // 文字样式面板
  const handleShowTextStyle = useCallback((text: TextElement) => {
    setStyleText(text);
  }, []);

  const handleTextStyleChange = useCallback((updates: Partial<TextElement>) => {
    if (styleText) {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: styleText.id,
          updates,
        },
      });
      setStyleText({ ...styleText, ...updates });
    }
  }, [styleText, dispatch]);

  // 计算光标样式
  const getCursor = useCallback((e?: React.MouseEvent) => {
    if (isSpacePressed || interactionMode === 'pan') return 'grab';
    if (interactionMode === 'drag') return 'move';
    if (interactionMode === 'resize') return 'nwse-resize';
    if (interactionMode === 'rotate') return 'crosshair';
    
    // 悬停时检测
    if (e && state.selectedIds.size > 0) {
      const mousePos = getMousePos(e);
      for (const id of state.selectedIds) {
        const element = state.elements.find(el => el.id === id);
        if (element) {
          if (isOnRotationHandle(mousePos, element, state.viewport)) {
            return 'crosshair';
          }
          if (getCornerAtPoint(mousePos, element, state.viewport)) {
            return 'nwse-resize';
          }
        }
      }
    }
    
    return 'default';
  }, [isSpacePressed, interactionMode, state.selectedIds, state.elements, state.viewport, getMousePos]);

  const [cursor, setCursor] = useState('default');
  
  const handleMouseMoveForCursor = useCallback((e: React.MouseEvent) => {
    handleMouseMove(e);
    if (interactionMode === 'none') {
      setCursor(getCursor(e));
    }
  }, [handleMouseMove, interactionMode, getCursor]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        cursor: interactionMode !== 'none' ? getCursor() : cursor,
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveForCursor}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        style={{ display: 'block' }}
      />
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onClose={closeContextMenu}
          onCrop={handleCropRequest}
          onInsertText={handleInsertText}
          onShowFilter={handleShowFilter}
          onShowTextStyle={handleShowTextStyle}
        />
      )}
      {cropImage && (
        <CropModal
          image={cropImage}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
      {(editingText || isAddingText) && (
        <InlineTextEditor
          text={editingText}
          position={isAddingText ? newTextScreenPos : editingTextScreenPos}
          viewport={state.viewport}
          onSave={handleTextSave}
          onCancel={handleTextCancel}
          isNew={isAddingText}
        />
      )}
      {filterImage && (
        <FilterPanel
          filters={filterImage.filters || defaultFilters}
          onChange={handleFilterChange}
          onFlipH={handleFlipH}
          onFlipV={handleFlipV}
          flipH={filterImage.flipH || false}
          flipV={filterImage.flipV || false}
          onClose={() => setFilterImage(null)}
        />
      )}
      {styleText && (
        <TextStylePanel
          element={styleText}
          onChange={handleTextStyleChange}
          onClose={() => setStyleText(null)}
        />
      )}
    </div>
  );
}
