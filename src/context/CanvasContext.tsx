import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { CanvasState, CanvasElement, ViewportState, ImageElement } from '../types';

// Action 类型
export type CanvasAction =
  | { type: 'ADD_ELEMENT'; payload: CanvasElement }
  | { type: 'ADD_ELEMENTS'; payload: CanvasElement[] }
  | { type: 'REMOVE_ELEMENTS'; payload: string[] }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'SET_SELECTION'; payload: string[] }
  | { type: 'ADD_TO_SELECTION'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_VIEWPORT'; payload: Partial<ViewportState> }
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'SET_PANNING'; payload: boolean }
  | { type: 'MERGE_IMAGES'; payload: ImageElement }
  | { type: 'LOAD_STATE'; payload: Partial<CanvasState> }
  | { type: 'MARK_SAVED' };

// 初始状态
export const initialCanvasState: CanvasState = {
  elements: [],
  selectedIds: new Set(),
  viewport: { offset: { x: 0, y: 0 }, scale: 1 },
  isDragging: false,
  isPanning: false,
  hasUnsavedChanges: false,
};

// Reducer
export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'ADD_ELEMENT':
      return {
        ...state,
        elements: [...state.elements, action.payload],
        hasUnsavedChanges: true,
      };

    case 'ADD_ELEMENTS':
      return {
        ...state,
        elements: [...state.elements, ...action.payload],
        selectedIds: new Set(action.payload.map(el => el.id)),
        hasUnsavedChanges: true,
      };

    case 'REMOVE_ELEMENTS': {
      const idsToRemove = new Set(action.payload);
      return {
        ...state,
        elements: state.elements.filter((el) => !idsToRemove.has(el.id)),
        selectedIds: new Set([...state.selectedIds].filter((id) => !idsToRemove.has(id))),
        hasUnsavedChanges: true,
      };
    }

    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map((el) => {
          if (el.id === action.payload.id) {
            return { ...el, ...action.payload.updates } as typeof el;
          }
          return el;
        }),
        hasUnsavedChanges: true,
      };

    case 'SET_SELECTION':
      return {
        ...state,
        selectedIds: new Set(action.payload),
      };

    case 'ADD_TO_SELECTION':
      return {
        ...state,
        selectedIds: new Set([...state.selectedIds, action.payload]),
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedIds: new Set(),
      };

    case 'SET_VIEWPORT':
      return {
        ...state,
        viewport: { ...state.viewport, ...action.payload },
      };

    case 'SET_DRAGGING':
      return {
        ...state,
        isDragging: action.payload,
      };

    case 'SET_PANNING':
      return {
        ...state,
        isPanning: action.payload,
      };

    case 'MERGE_IMAGES': {
      const selectedIds = state.selectedIds;
      return {
        ...state,
        elements: [
          ...state.elements.filter((el) => !selectedIds.has(el.id)),
          action.payload,
        ],
        selectedIds: new Set([action.payload.id]),
        hasUnsavedChanges: true,
      };
    }

    case 'LOAD_STATE':
      return {
        ...state,
        ...action.payload,
        selectedIds: action.payload.selectedIds ?? new Set(),
        hasUnsavedChanges: false,
      };

    case 'MARK_SAVED':
      return {
        ...state,
        hasUnsavedChanges: false,
      };

    default:
      return state;
  }
}

// Context 类型
interface CanvasContextType {
  state: CanvasState;
  dispatch: React.Dispatch<CanvasAction>;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

// Provider 组件
export function CanvasProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(canvasReducer, initialCanvasState);

  return (
    <CanvasContext.Provider value={{ state, dispatch }}>
      {children}
    </CanvasContext.Provider>
  );
}

// Hook
export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}
