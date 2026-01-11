import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { CanvasState, CanvasElement, ViewportState, ImageElement, TextElement } from '../types';

// 历史记录最大长度
const MAX_HISTORY_LENGTH = 50;

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
  | { type: 'MARK_SAVED' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'ADD_TEXT'; payload: TextElement }
  | { type: 'ROTATE_ELEMENTS'; payload: { ids: string[]; angle: number } }
  | { type: 'SCALE_ELEMENTS'; payload: { ids: string[]; scale: number } };

// 带历史记录的状态
interface CanvasStateWithHistory {
  current: CanvasState;
  past: CanvasElement[][];
  future: CanvasElement[][];
}

// 初始状态
export const initialCanvasState: CanvasState = {
  elements: [],
  selectedIds: new Set(),
  viewport: { offset: { x: 0, y: 0 }, scale: 1 },
  isDragging: false,
  isPanning: false,
  hasUnsavedChanges: false,
};

const initialStateWithHistory: CanvasStateWithHistory = {
  current: initialCanvasState,
  past: [],
  future: [],
};

// 保存历史记录的辅助函数
function saveToHistory(state: CanvasStateWithHistory): CanvasStateWithHistory {
  const newPast = [...state.past, state.current.elements].slice(-MAX_HISTORY_LENGTH);
  return {
    ...state,
    past: newPast,
    future: [], // 新操作清空 future
  };
}

// Reducer
export function canvasReducer(state: CanvasStateWithHistory, action: CanvasAction): CanvasStateWithHistory {
  switch (action.type) {
    case 'ADD_ELEMENT': {
      const newState = saveToHistory(state);
      return {
        ...newState,
        current: {
          ...newState.current,
          elements: [...newState.current.elements, action.payload],
          hasUnsavedChanges: true,
        },
      };
    }

    case 'ADD_ELEMENTS': {
      const newState = saveToHistory(state);
      return {
        ...newState,
        current: {
          ...newState.current,
          elements: [...newState.current.elements, ...action.payload],
          selectedIds: new Set(action.payload.map(el => el.id)),
          hasUnsavedChanges: true,
        },
      };
    }

    case 'REMOVE_ELEMENTS': {
      const newState = saveToHistory(state);
      const idsToRemove = new Set(action.payload);
      return {
        ...newState,
        current: {
          ...newState.current,
          elements: newState.current.elements.filter((el) => !idsToRemove.has(el.id)),
          selectedIds: new Set([...newState.current.selectedIds].filter((id) => !idsToRemove.has(id))),
          hasUnsavedChanges: true,
        },
      };
    }

    case 'UPDATE_ELEMENT': {
      // 不保存拖动过程中的每一步到历史
      return {
        ...state,
        current: {
          ...state.current,
          elements: state.current.elements.map((el) => {
            if (el.id === action.payload.id) {
              return { ...el, ...action.payload.updates } as typeof el;
            }
            return el;
          }),
          hasUnsavedChanges: true,
        },
      };
    }

    case 'SET_SELECTION':
      return {
        ...state,
        current: {
          ...state.current,
          selectedIds: new Set(action.payload),
        },
      };

    case 'ADD_TO_SELECTION':
      return {
        ...state,
        current: {
          ...state.current,
          selectedIds: new Set([...state.current.selectedIds, action.payload]),
        },
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        current: {
          ...state.current,
          selectedIds: new Set(),
        },
      };

    case 'SET_VIEWPORT':
      return {
        ...state,
        current: {
          ...state.current,
          viewport: { ...state.current.viewport, ...action.payload },
        },
      };

    case 'SET_DRAGGING':
      // 拖动结束时保存历史
      if (!action.payload && state.current.isDragging) {
        const newState = saveToHistory(state);
        return {
          ...newState,
          current: {
            ...newState.current,
            isDragging: false,
          },
        };
      }
      return {
        ...state,
        current: {
          ...state.current,
          isDragging: action.payload,
        },
      };

    case 'SET_PANNING':
      return {
        ...state,
        current: {
          ...state.current,
          isPanning: action.payload,
        },
      };

    case 'MERGE_IMAGES': {
      const newState = saveToHistory(state);
      const selectedIds = newState.current.selectedIds;
      return {
        ...newState,
        current: {
          ...newState.current,
          elements: [
            ...newState.current.elements.filter((el) => !selectedIds.has(el.id)),
            action.payload,
          ],
          selectedIds: new Set([action.payload.id]),
          hasUnsavedChanges: true,
        },
      };
    }

    case 'LOAD_STATE':
      return {
        current: {
          ...state.current,
          ...action.payload,
          selectedIds: action.payload.selectedIds ?? new Set(),
          hasUnsavedChanges: false,
        },
        past: [],
        future: [],
      };

    case 'MARK_SAVED':
      return {
        ...state,
        current: {
          ...state.current,
          hasUnsavedChanges: false,
        },
      };

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        current: {
          ...state.current,
          elements: previous,
          hasUnsavedChanges: true,
        },
        past: newPast,
        future: [state.current.elements, ...state.future],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        current: {
          ...state.current,
          elements: next,
          hasUnsavedChanges: true,
        },
        past: [...state.past, state.current.elements],
        future: newFuture,
      };
    }

    case 'ADD_TEXT': {
      const newState = saveToHistory(state);
      return {
        ...newState,
        current: {
          ...newState.current,
          elements: [...newState.current.elements, action.payload],
          selectedIds: new Set([action.payload.id]),
          hasUnsavedChanges: true,
        },
      };
    }

    case 'ROTATE_ELEMENTS': {
      const newState = saveToHistory(state);
      const idsSet = new Set(action.payload.ids);
      return {
        ...newState,
        current: {
          ...newState.current,
          elements: newState.current.elements.map((el) => {
            if (idsSet.has(el.id)) {
              return { ...el, rotation: (el.rotation || 0) + action.payload.angle } as typeof el;
            }
            return el;
          }),
          hasUnsavedChanges: true,
        },
      };
    }

    case 'SCALE_ELEMENTS': {
      const newState = saveToHistory(state);
      const idsSet = new Set(action.payload.ids);
      return {
        ...newState,
        current: {
          ...newState.current,
          elements: newState.current.elements.map((el) => {
            if (idsSet.has(el.id)) {
              const newScale = (el.scale || 1) * action.payload.scale;
              return {
                ...el,
                scale: newScale,
                size: {
                  width: el.originalSize.width * newScale,
                  height: el.originalSize.height * newScale,
                },
              } as typeof el;
            }
            return el;
          }),
          hasUnsavedChanges: true,
        },
      };
    }

    default:
      return state;
  }
}

// Context 类型
interface CanvasContextType {
  state: CanvasState;
  dispatch: React.Dispatch<CanvasAction>;
  canUndo: boolean;
  canRedo: boolean;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

// Provider 组件
export function CanvasProvider({ children }: { children: ReactNode }) {
  const [stateWithHistory, dispatch] = useReducer(canvasReducer, initialStateWithHistory);

  const contextValue: CanvasContextType = {
    state: stateWithHistory.current,
    dispatch,
    canUndo: stateWithHistory.past.length > 0,
    canRedo: stateWithHistory.future.length > 0,
  };

  return (
    <CanvasContext.Provider value={contextValue}>
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
