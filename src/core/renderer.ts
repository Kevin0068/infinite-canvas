import type { CanvasElement, CanvasState, ViewportState, Size, ImageElement, VideoElement, Rect } from '../types';
import { canvasToScreen } from '../utils/transform';

// 图片缓存
const imageCache = new Map<string, HTMLImageElement>();

/**
 * 加载图片到缓存
 */
export function loadImageToCache(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 检查元素是否在可视区域内
 */
export function isElementVisible(
  element: CanvasElement,
  viewport: ViewportState,
  canvasSize: Size
): boolean {
  const screenPos = canvasToScreen(element.position, viewport);
  const screenWidth = element.size.width * viewport.scale;
  const screenHeight = element.size.height * viewport.scale;
  
  // 检查是否与可视区域相交
  return (
    screenPos.x + screenWidth > 0 &&
    screenPos.x < canvasSize.width &&
    screenPos.y + screenHeight > 0 &&
    screenPos.y < canvasSize.height
  );
}

/**
 * 渲染单个图片元素
 */
function renderImageElement(
  ctx: CanvasRenderingContext2D,
  element: ImageElement,
  viewport: ViewportState
): void {
  const img = imageCache.get(element.src);
  if (!img) return;
  
  const screenPos = canvasToScreen(element.position, viewport);
  const screenWidth = element.size.width * viewport.scale;
  const screenHeight = element.size.height * viewport.scale;
  
  ctx.drawImage(img, screenPos.x, screenPos.y, screenWidth, screenHeight);
}

/**
 * 渲染单个视频元素（显示占位符）
 */
function renderVideoElement(
  ctx: CanvasRenderingContext2D,
  element: VideoElement,
  viewport: ViewportState
): void {
  const screenPos = canvasToScreen(element.position, viewport);
  const screenWidth = element.size.width * viewport.scale;
  const screenHeight = element.size.height * viewport.scale;
  
  // 绘制视频占位符背景
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(screenPos.x, screenPos.y, screenWidth, screenHeight);
  
  // 绘制播放图标
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const centerX = screenPos.x + screenWidth / 2;
  const centerY = screenPos.y + screenHeight / 2;
  const iconSize = Math.min(screenWidth, screenHeight) * 0.2;
  ctx.moveTo(centerX - iconSize / 2, centerY - iconSize / 2);
  ctx.lineTo(centerX + iconSize / 2, centerY);
  ctx.lineTo(centerX - iconSize / 2, centerY + iconSize / 2);
  ctx.closePath();
  ctx.fill();
}

/**
 * 渲染元素选择框
 */
function renderElementSelectionBox(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  viewport: ViewportState
): void {
  const screenPos = canvasToScreen(element.position, viewport);
  const screenWidth = element.size.width * viewport.scale;
  const screenHeight = element.size.height * viewport.scale;
  
  ctx.strokeStyle = '#4a90d9';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(screenPos.x - 2, screenPos.y - 2, screenWidth + 4, screenHeight + 4);
  ctx.setLineDash([]);
  
  // 绘制角点
  const cornerSize = 8;
  ctx.fillStyle = '#4a90d9';
  const corners = [
    { x: screenPos.x - cornerSize / 2, y: screenPos.y - cornerSize / 2 },
    { x: screenPos.x + screenWidth - cornerSize / 2, y: screenPos.y - cornerSize / 2 },
    { x: screenPos.x - cornerSize / 2, y: screenPos.y + screenHeight - cornerSize / 2 },
    { x: screenPos.x + screenWidth - cornerSize / 2, y: screenPos.y + screenHeight - cornerSize / 2 },
  ];
  corners.forEach(corner => {
    ctx.fillRect(corner.x, corner.y, cornerSize, cornerSize);
  });
}

/**
 * 渲染可视区域内的所有元素
 */
export function renderVisibleElements(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  viewport: ViewportState,
  canvasSize: Size
): void {
  // 按 zIndex 排序
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  
  for (const element of sortedElements) {
    if (!isElementVisible(element, viewport, canvasSize)) continue;
    
    if (element.type === 'image') {
      renderImageElement(ctx, element, viewport);
    } else if (element.type === 'video') {
      renderVideoElement(ctx, element, viewport);
    }
  }
}

/**
 * 渲染选择状态
 */
export function renderSelection(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  selectedIds: Set<string>,
  viewport: ViewportState
): void {
  for (const element of elements) {
    if (selectedIds.has(element.id)) {
      renderElementSelectionBox(ctx, element, viewport);
    }
  }
}

/**
 * 渲染整个画布
 */
export function render(
  ctx: CanvasRenderingContext2D,
  state: CanvasState,
  canvasSize: Size
): void {
  // 清除画布
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  
  // 绘制背景网格（可选）
  renderGrid(ctx, state.viewport, canvasSize);
  
  // 渲染元素
  renderVisibleElements(ctx, state.elements, state.viewport, canvasSize);
  
  // 渲染选择框
  renderSelection(ctx, state.elements, state.selectedIds, state.viewport);
}

/**
 * 渲染背景网格
 */
function renderGrid(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  canvasSize: Size
): void {
  const gridSize = 50 * viewport.scale;
  if (gridSize < 10) return; // 网格太小时不显示
  
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 0.5;
  
  const offsetX = viewport.offset.x % gridSize;
  const offsetY = viewport.offset.y % gridSize;
  
  ctx.beginPath();
  
  // 垂直线
  for (let x = offsetX; x < canvasSize.width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasSize.height);
  }
  
  // 水平线
  for (let y = offsetY; y < canvasSize.height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvasSize.width, y);
  }
  
  ctx.stroke();
}


/**
 * 渲染框选矩形
 */
export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  rect: Rect
): void {
  ctx.fillStyle = 'rgba(74, 144, 217, 0.1)';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  
  ctx.strokeStyle = '#4a90d9';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.setLineDash([]);
}
