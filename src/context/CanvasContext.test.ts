import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { canvasReducer, initialCanvasState } from './CanvasContext';
import type { CanvasState } from '../types';

// 生成随机 ImageElement
const imageElementArb = fc.record({
  id: fc.uuid(),
  type: fc.constant('image' as const),
  position: fc.record({ x: fc.integer(), y: fc.integer() }),
  size: fc.record({ width: fc.integer({ min: 1, max: 1000 }), height: fc.integer({ min: 1, max: 1000 }) }),
  originalSize: fc.record({ width: fc.integer({ min: 1, max: 1000 }), height: fc.integer({ min: 1, max: 1000 }) }),
  zIndex: fc.integer({ min: 0, max: 100 }),
  src: fc.string(),
});

// 生成包含多个元素的 CanvasState
const canvasStateWithElementsArb = fc.array(imageElementArb, { minLength: 1, maxLength: 10 }).map(elements => ({
  ...initialCanvasState,
  elements,
  selectedIds: new Set<string>(),
}));

describe('Selection Logic Properties', () => {
  /**
   * Feature: infinite-canvas, Property 7: Single Selection
   * Validates: Requirements 6.1
   * 
   * For any canvas state with multiple elements, clicking on one element
   * SHALL result in exactly that element being selected and all others being deselected.
   */
  it('Property 7: Single Selection - SET_SELECTION selects only the specified element', () => {
    fc.assert(
      fc.property(
        canvasStateWithElementsArb,
        fc.integer({ min: 0, max: 9 }),
        (state, elementIndex) => {
          if (state.elements.length === 0) return true;
          
          const targetIndex = elementIndex % state.elements.length;
          const targetId = state.elements[targetIndex].id;
          
          const newState = canvasReducer(state, {
            type: 'SET_SELECTION',
            payload: [targetId],
          });
          
          // 只有目标元素被选中
          expect(newState.selectedIds.size).toBe(1);
          expect(newState.selectedIds.has(targetId)).toBe(true);
          
          // 其他元素未被选中
          state.elements.forEach(el => {
            if (el.id !== targetId) {
              expect(newState.selectedIds.has(el.id)).toBe(false);
            }
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: infinite-canvas, Property 8: Multi-Selection Accumulation
   * Validates: Requirements 6.2
   * 
   * For any sequence of Shift+click operations on elements, each clicked element
   * SHALL be added to the selection set without removing previously selected elements.
   */
  it('Property 8: Multi-Selection Accumulation - ADD_TO_SELECTION accumulates selections', () => {
    fc.assert(
      fc.property(
        canvasStateWithElementsArb,
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 }),
        (initialState, clickIndices) => {
          if (initialState.elements.length === 0) return true;
          
          let state: CanvasState = initialState;
          const expectedSelected = new Set<string>();
          
          for (const index of clickIndices) {
            const targetIndex = index % state.elements.length;
            const targetId = state.elements[targetIndex].id;
            
            state = canvasReducer(state, {
              type: 'ADD_TO_SELECTION',
              payload: targetId,
            });
            
            expectedSelected.add(targetId);
          }
          
          // 所有点击过的元素都应该被选中
          expectedSelected.forEach(id => {
            expect(state.selectedIds.has(id)).toBe(true);
          });
          
          // 选中的数量应该等于去重后的点击数量
          expect(state.selectedIds.size).toBe(expectedSelected.size);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: infinite-canvas, Property 9: Clear Selection on Empty Click
   * Validates: Requirements 6.3
   * 
   * For any canvas state with selected elements, clicking on empty canvas space
   * SHALL result in an empty selection set.
   */
  it('Property 9: Clear Selection on Empty Click - CLEAR_SELECTION empties selection', () => {
    fc.assert(
      fc.property(
        canvasStateWithElementsArb,
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 }),
        (initialState, selectIndices) => {
          if (initialState.elements.length === 0) return true;
          
          // 先选中一些元素
          let state: CanvasState = initialState;
          for (const index of selectIndices) {
            const targetIndex = index % state.elements.length;
            const targetId = state.elements[targetIndex].id;
            state = canvasReducer(state, {
              type: 'ADD_TO_SELECTION',
              payload: targetId,
            });
          }
          
          // 确保有元素被选中
          expect(state.selectedIds.size).toBeGreaterThan(0);
          
          // 清除选择
          const clearedState = canvasReducer(state, { type: 'CLEAR_SELECTION' });
          
          // 选择应该为空
          expect(clearedState.selectedIds.size).toBe(0);
          
          // 元素本身不应该被删除
          expect(clearedState.elements.length).toBe(state.elements.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Element Drag Properties', () => {
  /**
   * Feature: infinite-canvas, Property 3: Element Drag Position Update
   * Validates: Requirements 3.1, 3.2, 3.3
   * 
   * For any canvas element (image or video) and any drag operation with delta (dx, dy),
   * the element's final position SHALL equal its initial position plus the drag delta.
   */
  it('Property 3: Element Drag Position Update - UPDATE_ELEMENT correctly updates position', () => {
    fc.assert(
      fc.property(
        imageElementArb,
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (element, dx, dy) => {
          const initialState: CanvasState = {
            ...initialCanvasState,
            elements: [element],
          };
          
          const initialPosition = { ...element.position };
          
          // 模拟拖动：更新元素位置
          const newState = canvasReducer(initialState, {
            type: 'UPDATE_ELEMENT',
            payload: {
              id: element.id,
              updates: {
                position: {
                  x: initialPosition.x + dx,
                  y: initialPosition.y + dy,
                },
              },
            },
          });
          
          const updatedElement = newState.elements.find(el => el.id === element.id);
          
          // 验证位置更新正确
          expect(updatedElement).toBeDefined();
          expect(updatedElement!.position.x).toBe(initialPosition.x + dx);
          expect(updatedElement!.position.y).toBe(initialPosition.y + dy);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3 (continued): Multiple elements drag together
   * When multiple elements are selected and dragged, all should move by the same delta.
   */
  it('Property 3: Multiple elements drag together with same delta', () => {
    fc.assert(
      fc.property(
        fc.array(imageElementArb, { minLength: 2, maxLength: 5 }),
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (elements, dx, dy) => {
          const initialState: CanvasState = {
            ...initialCanvasState,
            elements,
            selectedIds: new Set(elements.map(el => el.id)),
          };
          
          const initialPositions = new Map(
            elements.map(el => [el.id, { ...el.position }])
          );
          
          // 模拟拖动所有选中元素
          let state = initialState;
          for (const element of elements) {
            const initialPos = initialPositions.get(element.id)!;
            state = canvasReducer(state, {
              type: 'UPDATE_ELEMENT',
              payload: {
                id: element.id,
                updates: {
                  position: {
                    x: initialPos.x + dx,
                    y: initialPos.y + dy,
                  },
                },
              },
            });
          }
          
          // 验证所有元素都移动了相同的距离
          for (const element of elements) {
            const initialPos = initialPositions.get(element.id)!;
            const updatedElement = state.elements.find(el => el.id === element.id);
            
            expect(updatedElement).toBeDefined();
            expect(updatedElement!.position.x).toBe(initialPos.x + dx);
            expect(updatedElement!.position.y).toBe(initialPos.y + dy);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Delete Elements Properties', () => {
  /**
   * Feature: infinite-canvas, Property 10: Delete Removes Selected Elements
   * Validates: Requirements 7.1
   * 
   * For any canvas state with selected elements, triggering delete SHALL remove
   * exactly the selected elements from the canvas state, leaving all other elements unchanged.
   */
  it('Property 10: Delete Removes Selected Elements - REMOVE_ELEMENTS removes only selected', () => {
    fc.assert(
      fc.property(
        fc.array(imageElementArb, { minLength: 2, maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 }),
        (elements, selectIndices) => {
          // 确保元素 ID 唯一
          const uniqueElements = elements.map((el, i) => ({ ...el, id: `element-${i}` }));
          
          // 选择一些元素
          const selectedIds = new Set(
            selectIndices
              .filter(i => i < uniqueElements.length)
              .map(i => uniqueElements[i].id)
          );
          
          if (selectedIds.size === 0) return true;
          
          const initialState: CanvasState = {
            ...initialCanvasState,
            elements: uniqueElements,
            selectedIds,
          };
          
          const unselectedIds = new Set(
            uniqueElements.filter(el => !selectedIds.has(el.id)).map(el => el.id)
          );
          
          // 删除选中元素
          const newState = canvasReducer(initialState, {
            type: 'REMOVE_ELEMENTS',
            payload: [...selectedIds],
          });
          
          // 验证选中的元素被删除
          selectedIds.forEach(id => {
            expect(newState.elements.find(el => el.id === id)).toBeUndefined();
          });
          
          // 验证未选中的元素保持不变
          unselectedIds.forEach(id => {
            const originalElement = uniqueElements.find(el => el.id === id);
            const remainingElement = newState.elements.find(el => el.id === id);
            expect(remainingElement).toBeDefined();
            expect(remainingElement!.position).toEqual(originalElement!.position);
          });
          
          // 验证元素数量正确
          expect(newState.elements.length).toBe(uniqueElements.length - selectedIds.size);
          
          // 验证选择集合也被清理
          selectedIds.forEach(id => {
            expect(newState.selectedIds.has(id)).toBe(false);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10 (continued): Delete with empty selection does nothing
   */
  it('Property 10: Delete with empty selection preserves all elements', () => {
    fc.assert(
      fc.property(
        fc.array(imageElementArb, { minLength: 1, maxLength: 10 }),
        (elements) => {
          const uniqueElements = elements.map((el, i) => ({ ...el, id: `element-${i}` }));
          
          const initialState: CanvasState = {
            ...initialCanvasState,
            elements: uniqueElements,
            selectedIds: new Set(), // 空选择
          };
          
          // 尝试删除（空数组）
          const newState = canvasReducer(initialState, {
            type: 'REMOVE_ELEMENTS',
            payload: [],
          });
          
          // 所有元素应该保持不变
          expect(newState.elements.length).toBe(uniqueElements.length);
          uniqueElements.forEach(el => {
            expect(newState.elements.find(e => e.id === el.id)).toBeDefined();
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
