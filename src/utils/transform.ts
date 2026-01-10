import type { Point, ViewportState } from '../types';

/**
 * 将屏幕坐标转换为画布坐标
 * 屏幕坐标是相对于 canvas 元素的位置
 * 画布坐标是无限画布中的实际位置
 */
export function screenToCanvas(screenPoint: Point, viewport: ViewportState): Point {
  return {
    x: (screenPoint.x - viewport.offset.x) / viewport.scale,
    y: (screenPoint.y - viewport.offset.y) / viewport.scale,
  };
}

/**
 * 将画布坐标转换为屏幕坐标
 */
export function canvasToScreen(canvasPoint: Point, viewport: ViewportState): Point {
  return {
    x: canvasPoint.x * viewport.scale + viewport.offset.x,
    y: canvasPoint.y * viewport.scale + viewport.offset.y,
  };
}

/**
 * 计算缩放后的新视口偏移，保持缩放中心点不变
 * @param currentViewport 当前视口状态
 * @param newScale 新的缩放比例
 * @param zoomCenter 缩放中心点（屏幕坐标）
 */
export function calculateZoomOffset(
  currentViewport: ViewportState,
  newScale: number,
  zoomCenter: Point
): Point {
  // 缩放前的画布坐标
  const canvasPoint = screenToCanvas(zoomCenter, currentViewport);
  
  // 缩放后，该画布点应该仍然在同一屏幕位置
  // newScreenX = canvasPoint.x * newScale + newOffsetX = zoomCenter.x
  // newOffsetX = zoomCenter.x - canvasPoint.x * newScale
  return {
    x: zoomCenter.x - canvasPoint.x * newScale,
    y: zoomCenter.y - canvasPoint.y * newScale,
  };
}

/**
 * 限制缩放比例在合理范围内
 */
export function clampScale(scale: number, min: number = 0.1, max: number = 10): number {
  return Math.max(min, Math.min(max, scale));
}
