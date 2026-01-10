import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { CanvasState, ImageElement, VideoElement, ViewportState } from '../types';
import { serializeDraft, deserializeDraft, validateDraft } from './draftService';
import type { DraftFile } from './draftService';

/**
 * Feature: infinite-canvas, Property 12: Draft Round-Trip Consistency
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 * 
 * For any valid canvas state, saving to a draft file and then loading that draft 
 * SHALL restore an equivalent canvas state (same elements with same positions, 
 * sizes, and viewport settings).
 */

// 生成有效的 Point
const pointArb = fc.record({
  x: fc.integer({ min: -10000, max: 10000 }),
  y: fc.integer({ min: -10000, max: 10000 }),
});

// 生成有效的 Size
const sizeArb = fc.record({
  width: fc.integer({ min: 1, max: 5000 }),
  height: fc.integer({ min: 1, max: 5000 }),
});

// 生成有效的 ViewportState
const viewportArb: fc.Arbitrary<ViewportState> = fc.record({
  offset: pointArb,
  scale: fc.double({ min: 0.1, max: 10, noNaN: true }),
});

// 生成有效的 ImageElement
const imageElementArb: fc.Arbitrary<ImageElement> = fc.record({
  id: fc.uuid(),
  type: fc.constant('image' as const),
  position: pointArb,
  size: sizeArb,
  originalSize: sizeArb,
  zIndex: fc.integer({ min: 0, max: 1000 }),
  src: fc.string({ minLength: 1, maxLength: 100 }),
});

// 生成有效的 VideoElement
const videoElementArb: fc.Arbitrary<VideoElement> = fc.record({
  id: fc.uuid(),
  type: fc.constant('video' as const),
  position: pointArb,
  size: sizeArb,
  originalSize: sizeArb,
  zIndex: fc.integer({ min: 0, max: 1000 }),
  src: fc.string({ minLength: 1, maxLength: 100 }),
  isPlaying: fc.boolean(),
  currentTime: fc.double({ min: 0, max: 3600, noNaN: true }),
});

// 生成混合的元素数组
const elementsArb = fc.array(
  fc.oneof(imageElementArb, videoElementArb),
  { minLength: 0, maxLength: 10 }
);

// 生成有效的 CanvasState
const canvasStateArb: fc.Arbitrary<CanvasState> = fc.record({
  elements: elementsArb,
  selectedIds: fc.constant(new Set<string>()),
  viewport: viewportArb,
  isDragging: fc.boolean(),
  isPanning: fc.boolean(),
  hasUnsavedChanges: fc.boolean(),
});

describe('Draft Service - Property Tests', () => {
  /**
   * Property 12: Draft Round-Trip Consistency
   * 序列化然后反序列化应该保持元素和视口状态一致
   */
  it('should preserve elements through round-trip serialization', () => {
    fc.assert(
      fc.property(canvasStateArb, (state) => {
        const draft = serializeDraft(state);
        const restored = deserializeDraft(draft);
        
        // 元素数量应该相同
        expect(restored.elements?.length).toBe(state.elements.length);
        
        // 每个元素的属性应该相同
        for (let i = 0; i < state.elements.length; i++) {
          const original = state.elements[i];
          const restoredEl = restored.elements?.[i];
          
          expect(restoredEl?.id).toBe(original.id);
          expect(restoredEl?.type).toBe(original.type);
          expect(restoredEl?.position.x).toBe(original.position.x);
          expect(restoredEl?.position.y).toBe(original.position.y);
          expect(restoredEl?.size.width).toBe(original.size.width);
          expect(restoredEl?.size.height).toBe(original.size.height);
          expect(restoredEl?.originalSize.width).toBe(original.originalSize.width);
          expect(restoredEl?.originalSize.height).toBe(original.originalSize.height);
          expect(restoredEl?.zIndex).toBe(original.zIndex);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12 补充: 视口状态应该保持一致
   */
  it('should preserve viewport through round-trip serialization', () => {
    fc.assert(
      fc.property(canvasStateArb, (state) => {
        const draft = serializeDraft(state);
        const restored = deserializeDraft(draft);
        
        // 视口偏移应该相同
        expect(restored.viewport?.offset.x).toBe(state.viewport.offset.x);
        expect(restored.viewport?.offset.y).toBe(state.viewport.offset.y);
        
        // 缩放比例应该相同
        expect(restored.viewport?.scale).toBe(state.viewport.scale);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12 补充: 序列化结果应该是有效的草稿格式
   */
  it('should produce valid draft format', () => {
    fc.assert(
      fc.property(canvasStateArb, (state) => {
        const draft = serializeDraft(state);
        
        // 验证草稿格式
        expect(validateDraft(draft)).toBe(true);
        expect(draft.version).toBe('1.0');
        expect(draft.metadata.elementCount).toBe(state.elements.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12 补充: JSON 序列化往返应该保持一致
   */
  it('should preserve state through JSON round-trip', () => {
    fc.assert(
      fc.property(canvasStateArb, (state) => {
        const draft = serializeDraft(state);
        const json = JSON.stringify(draft);
        const parsed = JSON.parse(json) as DraftFile;
        const restored = deserializeDraft(parsed);
        
        // 元素数量应该相同
        expect(restored.elements?.length).toBe(state.elements.length);
        
        // 视口应该相同
        expect(restored.viewport?.offset.x).toBe(state.viewport.offset.x);
        expect(restored.viewport?.offset.y).toBe(state.viewport.offset.y);
        expect(restored.viewport?.scale).toBe(state.viewport.scale);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Draft Service - Unit Tests', () => {
  it('should validate correct draft format', () => {
    const validDraft: DraftFile = {
      version: '1.0',
      metadata: {
        version: '1.0',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        elementCount: 0,
      },
      viewport: {
        offset: { x: 0, y: 0 },
        scale: 1,
      },
      elements: [],
    };
    
    expect(validateDraft(validDraft)).toBe(true);
  });

  it('should reject invalid draft format', () => {
    expect(validateDraft(null)).toBe(false);
    expect(validateDraft({})).toBe(false);
    expect(validateDraft({ version: '1.0' })).toBe(false);
    expect(validateDraft({ version: '1.0', metadata: {}, viewport: {}, elements: [] })).toBe(false);
  });

  it('should reset transient state on deserialize', () => {
    const draft: DraftFile = {
      version: '1.0',
      metadata: {
        version: '1.0',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        elementCount: 0,
      },
      viewport: {
        offset: { x: 100, y: 200 },
        scale: 2,
      },
      elements: [],
    };
    
    const restored = deserializeDraft(draft);
    
    // 瞬态状态应该被重置
    expect(restored.isDragging).toBe(false);
    expect(restored.isPanning).toBe(false);
    expect(restored.hasUnsavedChanges).toBe(false);
    expect(restored.selectedIds?.size).toBe(0);
  });
});
