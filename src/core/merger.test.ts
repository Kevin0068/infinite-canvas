import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateBoundingBox } from './merger';
import type { ImageElement } from '../types';

// 生成随机位置
const pointArb = fc.record({
  x: fc.integer({ min: -1000, max: 1000 }),
  y: fc.integer({ min: -1000, max: 1000 }),
});

// 生成随机尺寸（正数）
const sizeArb = fc.record({
  width: fc.integer({ min: 1, max: 500 }),
  height: fc.integer({ min: 1, max: 500 }),
});

// 生成简化的图片元素（用于边界框测试）
const simpleImageElementArb = fc.record({
  id: fc.uuid(),
  type: fc.constant('image' as const),
  position: pointArb,
  size: sizeArb,
  originalSize: sizeArb,
  zIndex: fc.integer({ min: 0, max: 100 }),
  src: fc.constant('data:image/png;base64,test'),
});

describe('Image Merge Properties', () => {
  /**
   * Feature: infinite-canvas, Property 6: Image Merge Resolution Preservation
   * Validates: Requirements 5.2, 5.3, 5.4, 5.5
   * 
   * For any set of selected images, when merged, the resulting image SHALL have
   * dimensions that exactly accommodate all source images at their original resolutions,
   * and each source image SHALL appear at its correct relative position within the merged result.
   */
  it('Property 6: Bounding box dimensions accommodate all images at original resolution', () => {
    fc.assert(
      fc.property(
        fc.array(simpleImageElementArb, { minLength: 1, maxLength: 10 }),
        (elements) => {
          const boundingBox = calculateBoundingBox(elements as ImageElement[]);
          
          // 验证每个元素都在边界框内
          for (const element of elements) {
            const elementRight = element.position.x + element.originalSize.width;
            const elementBottom = element.position.y + element.originalSize.height;
            
            // 元素左上角应该在边界框内或边界上
            expect(element.position.x).toBeGreaterThanOrEqual(boundingBox.x);
            expect(element.position.y).toBeGreaterThanOrEqual(boundingBox.y);
            
            // 元素右下角应该在边界框内或边界上
            expect(elementRight).toBeLessThanOrEqual(boundingBox.x + boundingBox.width);
            expect(elementBottom).toBeLessThanOrEqual(boundingBox.y + boundingBox.height);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6 (continued): Bounding box is minimal
   * The bounding box should be the smallest rectangle that contains all elements.
   */
  it('Property 6: Bounding box is minimal (tight fit)', () => {
    fc.assert(
      fc.property(
        fc.array(simpleImageElementArb, { minLength: 1, maxLength: 10 }),
        (elements) => {
          const boundingBox = calculateBoundingBox(elements as ImageElement[]);
          
          // 计算实际的最小/最大坐标
          let actualMinX = Infinity;
          let actualMinY = Infinity;
          let actualMaxX = -Infinity;
          let actualMaxY = -Infinity;
          
          for (const element of elements) {
            actualMinX = Math.min(actualMinX, element.position.x);
            actualMinY = Math.min(actualMinY, element.position.y);
            actualMaxX = Math.max(actualMaxX, element.position.x + element.originalSize.width);
            actualMaxY = Math.max(actualMaxY, element.position.y + element.originalSize.height);
          }
          
          // 边界框应该精确匹配
          expect(boundingBox.x).toBe(actualMinX);
          expect(boundingBox.y).toBe(actualMinY);
          expect(boundingBox.width).toBe(actualMaxX - actualMinX);
          expect(boundingBox.height).toBe(actualMaxY - actualMinY);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6 (continued): Relative positions are preserved
   * The relative positions between images should be maintained in the merged result.
   */
  it('Property 6: Relative positions between images are preserved', () => {
    fc.assert(
      fc.property(
        fc.array(simpleImageElementArb, { minLength: 2, maxLength: 5 }),
        (elements) => {
          const boundingBox = calculateBoundingBox(elements as ImageElement[]);
          
          // 计算每个元素相对于边界框的位置
          const relativePositions = elements.map(el => ({
            id: el.id,
            relX: el.position.x - boundingBox.x,
            relY: el.position.y - boundingBox.y,
          }));
          
          // 验证相对位置是非负的（在边界框内）
          for (const pos of relativePositions) {
            expect(pos.relX).toBeGreaterThanOrEqual(0);
            expect(pos.relY).toBeGreaterThanOrEqual(0);
          }
          
          // 验证任意两个元素之间的相对距离保持不变
          for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
              const originalDx = elements[j].position.x - elements[i].position.x;
              const originalDy = elements[j].position.y - elements[i].position.y;
              
              const relativeDx = relativePositions[j].relX - relativePositions[i].relX;
              const relativeDy = relativePositions[j].relY - relativePositions[i].relY;
              
              expect(relativeDx).toBe(originalDx);
              expect(relativeDy).toBe(originalDy);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6 (continued): Empty array handling
   */
  it('Property 6: Empty array returns zero-sized bounding box', () => {
    const boundingBox = calculateBoundingBox([]);
    expect(boundingBox.width).toBe(0);
    expect(boundingBox.height).toBe(0);
  });

  /**
   * Property 6 (continued): Single element bounding box equals element size
   */
  it('Property 6: Single element bounding box matches element dimensions', () => {
    fc.assert(
      fc.property(
        simpleImageElementArb,
        (element) => {
          const boundingBox = calculateBoundingBox([element as ImageElement]);
          
          expect(boundingBox.x).toBe(element.position.x);
          expect(boundingBox.y).toBe(element.position.y);
          expect(boundingBox.width).toBe(element.originalSize.width);
          expect(boundingBox.height).toBe(element.originalSize.height);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
