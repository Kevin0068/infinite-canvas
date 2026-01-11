// 基础位置和尺寸类型
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 媒体元素基础类型
export interface BaseElement {
  id: string;
  type: 'image' | 'video' | 'text';
  position: Point;
  size: Size;
  originalSize: Size;
  zIndex: number;
  rotation: number; // 旋转角度（度）
  scale: number; // 缩放比例
}

// 图片元素
export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  originalFile?: File;
}

// 视频元素
export interface VideoElement extends BaseElement {
  type: 'video';
  src: string;
  originalFile?: File;
  isPlaying: boolean;
  currentTime: number;
}

// 文字元素
export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  bold: boolean;
  italic: boolean;
}

export type CanvasElement = ImageElement | VideoElement | TextElement;

// 视口状态
export interface ViewportState {
  offset: Point;
  scale: number;
}

// 画布状态
export interface CanvasState {
  elements: CanvasElement[];
  selectedIds: Set<string>;
  viewport: ViewportState;
  isDragging: boolean;
  isPanning: boolean;
  hasUnsavedChanges: boolean;
}

// 草稿文件格式
export interface DraftMetadata {
  version: string;
  createdAt: string;
  updatedAt: string;
  elementCount: number;
}

export interface SerializedElement {
  id: string;
  type: 'image' | 'video';
  position: Point;
  size: Size;
  originalSize: Size;
  zIndex: number;
  data: string;
  isPlaying?: boolean;
  currentTime?: number;
}

export interface DraftFile {
  version: '1.0';
  metadata: DraftMetadata;
  viewport: ViewportState;
  elements: SerializedElement[];
}

// 支持的文件类型
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];
