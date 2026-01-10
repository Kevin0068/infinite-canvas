import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { screenToCanvas, canvasToScreen, calculateZoomOffset } from './transform';
import type { Point, ViewportState } from '../types';

// 自定义生成器
const pointArb = fc.record({
  x: fc.double({ min: -10000, max: 10000, noNaN: true }),
  y: fc.double({ min: -10000, max: 10000, noNaN: true }),
});

const viewportArb = fc.record({
  offset: pointArb,
  scale: fc.double({ min: 0.1, max: 10, noNaN: true }),
});

describe('Transform Utils', () => {
  /**
   * Feature: infinite-canvas, Property 4: Viewport Transform Invariant
   * 视口变换不变性：画布坐标转屏幕坐标再转回画布坐标应该得到原始值
   * Validates: Requirements 4.3
   */
  it('Property 4: screenToCanvas and canvasToScreen are inverse operations', () => {
    fc.assert(
      fc.property(pointArb, viewportArb, (canvasPoint: Point, viewport: ViewportState) => {
        const screenPoint = canvasToScreen(canvasPoint, viewport);
        const backToCanvas = screenToCanvas(screenPoint, viewport);
        
        // 由于浮点数精度问题，使用近似相等
        expect(backToCanvas.x).toBeCloseTo(canvasPoint.x, 5);
        expect(backToCanvas.y).toBeCloseTo(canvasPoint.y, 5);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: infinite-canvas, Property 4: Viewport Transform Invariant
   * 屏幕坐标转画布坐标再转回屏幕坐标应该得到原始值
   * Validates: Requirements 4.3
   */
  it('Property 4: canvasToScreen and screenToCanvas are inverse operations', () => {
    fc.assert(
      fc.property(pointArb, viewportArb, (screenPoint: Point, viewport: ViewportState) => {
        const canvasPoint = screenToCanvas(screenPoint, viewport);
        const backToScreen = canvasToScreen(canvasPoint, viewport);
        
        expect(backToScreen.x).toBeCloseTo(screenPoint.x, 5);
        expect(backToScreen.y).toBeCloseTo(screenPoint.y, 5);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: infinite-canvas, Property 4: Viewport Transform Invariant
   * 缩放时，缩放中心点在画布坐标系中的位置不变
   * Validates: Requirements 4.3
   */
  it('Property 4: zoom preserves the canvas position of zoom center', () => {
    fc.assert(
      fc.property(
        viewportArb,
        pointArb,
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        (viewport: ViewportState, zoomCenter: Point, newScale: number) => {
          // 缩放前的画布坐标
          const canvasPointBefore = screenToCanvas(zoomCenter, viewport);
          
          // 计算新的偏移
          const newOffset = calculateZoomOffset(viewport, newScale, zoomCenter);
          const newViewport: ViewportState = { offset: newOffset, scale: newScale };
          
          // 缩放后，同一屏幕点对应的画布坐标应该相同
          const canvasPointAfter = screenToCanvas(zoomCenter, newViewport);
          
          expect(canvasPointAfter.x).toBeCloseTo(canvasPointBefore.x, 5);
          expect(canvasPointAfter.y).toBeCloseTo(canvasPointBefore.y, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
