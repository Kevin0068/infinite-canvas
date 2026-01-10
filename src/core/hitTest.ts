import type { CanvasElement, Point, ViewportState, Rect } from '../types';
import { screenToCanvas } from '../utils/transform';

/**
 * 检查点是否在元素边界内
 */
export function isPointInElement(point: Point, element: CanvasElement): boolean {
  return (
    point.x >= element.position.x &&
    point.x <= element.position.x + element.size.width &&
    point.y >= element.position.y &&
    point.y <= element.position.y + element.size.height
  );
}

/**
 * 获取指定屏幕坐标位置的元素（考虑 z-index，返回最上层）
 */
export function getElementAtPoint(
  screenPoint: Point,
  elements: CanvasElement[],
  viewport: ViewportState
): CanvasElement | null {
  // 转换为画布坐标
  const canvasPoint = screenToCanvas(screenPoint, viewport);
  
  // 按 z-index 降序排列，优先检测上层元素
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  
  for (const element of sortedElements) {
    if (isPointInElement(canvasPoint, element)) {
      return element;
    }
  }
  
  return null;
}

/**
 * 获取指定画布坐标位置的元素
 */
export function getElementAtCanvasPoint(
  canvasPoint: Point,
  elements: CanvasElement[]
): CanvasElement | null {
  // 按 z-index 降序排列
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  
  for (const element of sortedElements) {
    if (isPointInElement(canvasPoint, element)) {
      return element;
    }
  }
  
  return null;
}

/**
 * 获取矩形区域内的所有元素（屏幕坐标）
 */
export function getElementsInRect(
  screenRect: Rect,
  elements: CanvasElement[],
  viewport: ViewportState
): CanvasElement[] {
  // 将屏幕矩形转换为画布坐标
  const topLeft = screenToCanvas({ x: screenRect.x, y: screenRect.y }, viewport);
  const bottomRight = screenToCanvas(
    { x: screenRect.x + screenRect.width, y: screenRect.y + screenRect.height },
    viewport
  );
  
  const canvasRect: Rect = {
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
    height: Math.abs(bottomRight.y - topLeft.y),
  };
  
  return elements.filter(element => {
    // 检查元素是否与矩形相交
    const elementRight = element.position.x + element.size.width;
    const elementBottom = element.position.y + element.size.height;
    const rectRight = canvasRect.x + canvasRect.width;
    const rectBottom = canvasRect.y + canvasRect.height;
    
    return !(
      element.position.x > rectRight ||
      elementRight < canvasRect.x ||
      element.position.y > rectBottom ||
      elementBottom < canvasRect.y
    );
  });
}
