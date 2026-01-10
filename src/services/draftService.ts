import type { CanvasState, CanvasElement, ViewportState } from '../types';

export const DRAFT_VERSION = '1.0';

export interface DraftMetadata {
  version: string;
  createdAt: string;
  updatedAt: string;
  elementCount: number;
}

export interface DraftFile {
  version: string;
  metadata: DraftMetadata;
  viewport: ViewportState;
  elements: CanvasElement[];
}

/**
 * 将画布状态序列化为草稿文件格式
 */
export function serializeDraft(state: CanvasState): DraftFile {
  const now = new Date().toISOString();
  return {
    version: DRAFT_VERSION,
    metadata: {
      version: DRAFT_VERSION,
      createdAt: now,
      updatedAt: now,
      elementCount: state.elements.length,
    },
    viewport: state.viewport,
    elements: state.elements,
  };
}

/**
 * 从草稿文件反序列化为画布状态
 */
export function deserializeDraft(draft: DraftFile): Partial<CanvasState> {
  return {
    elements: draft.elements,
    viewport: draft.viewport,
    selectedIds: new Set<string>(),
    isDragging: false,
    isPanning: false,
    hasUnsavedChanges: false,
  };
}

/**
 * 验证草稿文件格式
 */
export function validateDraft(data: unknown): data is DraftFile {
  if (typeof data !== 'object' || data === null) return false;
  
  const draft = data as Record<string, unknown>;
  
  if (typeof draft.version !== 'string') return false;
  if (typeof draft.metadata !== 'object' || draft.metadata === null) return false;
  if (typeof draft.viewport !== 'object' || draft.viewport === null) return false;
  if (!Array.isArray(draft.elements)) return false;
  
  const viewport = draft.viewport as Record<string, unknown>;
  if (typeof viewport.scale !== 'number') return false;
  if (typeof viewport.offset !== 'object' || viewport.offset === null) return false;
  
  const offset = viewport.offset as Record<string, unknown>;
  if (typeof offset.x !== 'number' || typeof offset.y !== 'number') return false;
  
  return true;
}

/**
 * 保存草稿到文件（触发下载）
 */
export function saveDraftToFile(state: CanvasState, filename: string = 'canvas-draft'): void {
  const draft = serializeDraft(state);
  const json = JSON.stringify(draft, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 从文件加载草稿
 */
export async function loadDraftFromFile(file: File): Promise<DraftFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!validateDraft(data)) {
          reject(new Error('无效的草稿文件格式'));
          return;
        }
        
        resolve(data);
      } catch (error) {
        reject(new Error('解析草稿文件失败'));
      }
    };
    
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}

/**
 * 保存草稿到 localStorage
 */
export function saveDraftToLocalStorage(state: CanvasState, key: string = 'canvas-draft'): void {
  const draft = serializeDraft(state);
  localStorage.setItem(key, JSON.stringify(draft));
}

/**
 * 从 localStorage 加载草稿
 */
export function loadDraftFromLocalStorage(key: string = 'canvas-draft'): DraftFile | null {
  const json = localStorage.getItem(key);
  if (!json) return null;
  
  try {
    const data = JSON.parse(json);
    if (!validateDraft(data)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * 检查是否有自动保存的草稿
 */
export function hasAutoSavedDraft(key: string = 'canvas-draft'): boolean {
  return localStorage.getItem(key) !== null;
}

/**
 * 清除自动保存的草稿
 */
export function clearAutoSavedDraft(key: string = 'canvas-draft'): void {
  localStorage.removeItem(key);
}
