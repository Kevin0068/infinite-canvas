import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ImageElement } from '../types';
import { getExportDimensions } from './exportService';
import { calculateBoundingBox } from '../core/merger';

/**
 * Feature: infinite-canvas, Property 11: Export Resolution Preservation
 * Validates: Requirements 8.2, 8.5
 * 
 * For any image or set of images exported as PNG, the output image dimensions 
 * SHALL match the bounding box of the source images at their original resolutions.
 */

// 生成有效的 ImageElement
const imageElementArb = fc.record({
  id: fc.uuid(),
  type: fc.constant('image' as const),
  position: fc.record({
    x: fc.integer({ min: -1000, max: 1000 }),
    y: fc.integer({ min: -1000, max: 1000 }),
  }),
  size: fc.record({
    width: fc.integer({ min: 10, max: 500 }),
    height: fc.integer({ min: 10, max: 500 }),
  }),
  originalSize: fc.record({
    width: fc.integer({ min: 10, max: 500 }),
    height: fc.integer({ min: 10, max: 500 }),
  }),
  zIndex: fc.integer({ min: 0, max: 100 }),
  rotation: fc.constant(0),
  scale: fc.constant(1),
  src: fc.constant('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
});

// 生成非空的 ImageElement 数组
const imageElementsArb = fc.array(imageElementArb, { minLength: 1, maxLength: 5 });

describe('Export Service - Property Tests', () => {
  /**
   * Property 11: Export Resolution Preservation
   * 导出尺寸应该等于所有图片的边界框尺寸
   */
  it('should preserve resolution: export dimensions match bounding box', () => {
    fc.assert(
      fc.property(imageElementsArb, (elements) => {
        const exportDimensions = getExportDimensions(elements);
        const boundingBox = calculateBoundingBox(elements);
        
        // 导出尺寸应该等于边界框尺寸
        expect(exportDimensions.width).toBe(boundingBox.width);
        expect(exportDimensions.height).toBe(boundingBox.height);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11 补充: 单个图片导出尺寸等于原始尺寸
   */
  it('should preserve single image original resolution', () => {
    fc.assert(
      fc.property(imageElementArb, (element) => {
        const exportDimensions = getExportDimensions([element]);
        
        // 单个图片的导出尺寸应该等于其原始尺寸
        expect(exportDimensions.width).toBe(element.originalSize.width);
        expect(exportDimensions.height).toBe(element.originalSize.height);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11 补充: 导出尺寸至少包含所有图片
   */
  it('should have export dimensions that contain all images', () => {
    fc.assert(
      fc.property(imageElementsArb, (elements) => {
        const exportDimensions = getExportDimensions(elements);
        const boundingBox = calculateBoundingBox(elements);
        
        // 验证每个图片都在边界框内
        for (const element of elements) {
          const relX = element.position.x - boundingBox.x;
          const relY = element.position.y - boundingBox.y;
          
          // 图片起始位置应该在边界框内
          expect(relX).toBeGreaterThanOrEqual(0);
          expect(relY).toBeGreaterThanOrEqual(0);
          
          // 图片结束位置应该在边界框内
          expect(relX + element.originalSize.width).toBeLessThanOrEqual(exportDimensions.width);
          expect(relY + element.originalSize.height).toBeLessThanOrEqual(exportDimensions.height);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Export Service - Unit Tests', () => {
  it('should return zero dimensions for empty array', () => {
    const dimensions = getExportDimensions([]);
    expect(dimensions.width).toBe(0);
    expect(dimensions.height).toBe(0);
  });

  it('should calculate correct dimensions for two non-overlapping images', () => {
    const elements: ImageElement[] = [
      {
        id: '1',
        type: 'image',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        originalSize: { width: 100, height: 100 },
        zIndex: 0,
        rotation: 0,
        scale: 1,
        src: 'test',
      },
      {
        id: '2',
        type: 'image',
        position: { x: 150, y: 0 },
        size: { width: 100, height: 100 },
        originalSize: { width: 100, height: 100 },
        zIndex: 1,
        rotation: 0,
        scale: 1,
        src: 'test',
      },
    ];

    const dimensions = getExportDimensions(elements);
    // 从 x=0 到 x=250, 从 y=0 到 y=100
    expect(dimensions.width).toBe(250);
    expect(dimensions.height).toBe(100);
  });
});
