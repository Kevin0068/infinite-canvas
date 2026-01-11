import type { CanvasElement, CanvasState, ViewportState, Size, ImageElement, VideoElement, TextElement, Rect } from '../types';
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
  
  // 检查是否与可视区域相交（考虑旋转后的边界扩大）
  const maxDim = Math.max(screenWidth, screenHeight) * 1.5;
  return (
    screenPos.x + maxDim > 0 &&
    screenPos.x - maxDim < canvasSize.width &&
    screenPos.y + maxDim > 0 &&
    screenPos.y - maxDim < canvasSize.height
  );
}

/**
 * 渲染单个图片元素（支持旋转和缩放）
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
  const rotation = element.rotation || 0;
  
  ctx.save();
  
  // 移动到元素中心点
  const centerX = screenPos.x + screenWidth / 2;
  const centerY = screenPos.y + screenHeight / 2;
  ctx.translate(centerX, centerY);
  
  // 旋转
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  
  // 绘制图片（从中心点偏移）
  ctx.drawImage(img, -screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight);
  
  ctx.restore();
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
  const rotation = element.rotation || 0;
  
  ctx.save();
  
  const centerX = screenPos.x + screenWidth / 2;
  const centerY = screenPos.y + screenHeight / 2;
  ctx.translate(centerX, centerY);
  
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  
  // 绘制视频占位符背景
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight);
  
  // 绘制播放图标
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const iconSize = Math.min(screenWidth, screenHeight) * 0.2;
  ctx.moveTo(-iconSize / 2, -iconSize / 2);
  ctx.lineTo(iconSize / 2, 0);
  ctx.lineTo(-iconSize / 2, iconSize / 2);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

/**
 * 渲染文字元素
 */
function renderTextElement(
  ctx: CanvasRenderingContext2D,
  element: TextElement,
  viewport: ViewportState
): void {
  const screenPos = canvasToScreen(element.position, viewport);
  const fontSize = element.fontSize * viewport.scale;
  const rotation = element.rotation || 0;
  
  ctx.save();
  
  // 设置字体
  let fontStyle = '';
  if (element.italic) fontStyle += 'italic ';
  if (element.bold) fontStyle += 'bold ';
  ctx.font = `${fontStyle}${fontSize}px ${element.fontFamily}`;
  
  // 测量文字尺寸
  const metrics = ctx.measureText(element.text);
  const textWidth = metrics.width;
  const textHeight = fontSize;
  
  const centerX = screenPos.x + textWidth / 2;
  const centerY = screenPos.y + textHeight / 2;
  
  ctx.translate(centerX, centerY);
  
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  
  // 绘制背景
  if (element.backgroundColor) {
    ctx.fillStyle = element.backgroundColor;
    ctx.fillRect(-textWidth / 2 - 4, -textHeight / 2 - 2, textWidth + 8, textHeight + 4);
  }
  
  // 绘制文字
  ctx.fillStyle = element.color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(element.text, 0, 0);
  
  ctx.restore();
}

/**
 * 渲染元素选择框（支持旋转）
 */
function renderElementSelectionBox(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  viewport: ViewportState
): void {
  const screenPos = canvasToScreen(element.position, viewport);
  const screenWidth = element.size.width * viewport.scale;
  const screenHeight = element.size.height * viewport.scale;
  const rotation = element.rotation || 0;
  
  ctx.save();
  
  const centerX = screenPos.x + screenWidth / 2;
  const centerY = screenPos.y + screenHeight / 2;
  ctx.translate(centerX, centerY);
  
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  
  ctx.strokeStyle = '#4a90d9';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(-screenWidth / 2 - 2, -screenHeight / 2 - 2, screenWidth + 4, screenHeight + 4);
  ctx.setLineDash([]);
  
  // 绘制角点（用于缩放）
  const cornerSize = 8;
  ctx.fillStyle = '#4a90d9';
  const corners = [
    { x: -screenWidth / 2 - cornerSize / 2, y: -screenHeight / 2 - cornerSize / 2 },
    { x: screenWidth / 2 - cornerSize / 2, y: -screenHeight / 2 - cornerSize / 2 },
    { x: -screenWidth / 2 - cornerSize / 2, y: screenHeight / 2 - cornerSize / 2 },
    { x: screenWidth / 2 - cornerSize / 2, y: screenHeight / 2 - cornerSize / 2 },
  ];
  corners.forEach(corner => {
    ctx.fillRect(corner.x, corner.y, cornerSize, cornerSize);
  });
  
  // 绘制旋转手柄
  ctx.beginPath();
  ctx.moveTo(0, -screenHeight / 2 - 2);
  ctx.lineTo(0, -screenHeight / 2 - 20);
  ctx.strokeStyle = '#4a90d9';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.stroke();
  
  // 旋转手柄圆点
  ctx.beginPath();
  ctx.arc(0, -screenHeight / 2 - 25, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#4a90d9';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.restore();
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
    } else if (element.type === 'text') {
      renderTextElement(ctx, element, viewport);
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
