import { SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES } from '../types';
import type { ImageElement, VideoElement } from '../types';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export interface ValidationResult {
  valid: boolean;
  error?: string;
  fileType?: 'image' | 'video';
}

/**
 * 验证文件类型和大小
 */
export function validateFile(file: File): ValidationResult {
  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }
  
  // 检查文件类型
  if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return { valid: true, fileType: 'image' };
  }
  
  if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
    return { valid: true, fileType: 'video' };
  }
  
  return { 
    valid: false, 
    error: `不支持的文件类型: ${file.type || '未知'}。支持的格式: PNG, JPG, GIF, WebP, MP4, WebM, MOV` 
  };
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 加载图片文件并创建 ImageElement
 */
export function loadImage(file: File, position = { x: 0, y: 0 }, zIndex = 0): Promise<ImageElement> {
  return new Promise((resolve, reject) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      reject(new Error(validation.error));
      return;
    }
    
    if (validation.fileType !== 'image') {
      reject(new Error('文件不是图片类型'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      
      img.onload = () => {
        const element: ImageElement = {
          id: generateId(),
          type: 'image',
          src,
          position,
          size: { width: img.naturalWidth, height: img.naturalHeight },
          originalSize: { width: img.naturalWidth, height: img.naturalHeight },
          zIndex,
          rotation: 0,
          scale: 1,
          originalFile: file,
        };
        resolve(element);
      };
      
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      
      img.src = src;
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * 加载视频文件并创建 VideoElement
 */
export function loadVideo(file: File, position = { x: 0, y: 0 }, zIndex = 0): Promise<VideoElement> {
  return new Promise((resolve, reject) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      reject(new Error(validation.error));
      return;
    }
    
    if (validation.fileType !== 'video') {
      reject(new Error('文件不是视频类型'));
      return;
    }
    
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    
    video.onloadedmetadata = () => {
      const element: VideoElement = {
        id: generateId(),
        type: 'video',
        src: url,
        position,
        size: { width: video.videoWidth, height: video.videoHeight },
        originalSize: { width: video.videoWidth, height: video.videoHeight },
        zIndex,
        rotation: 0,
        scale: 1,
        originalFile: file,
        isPlaying: false,
        currentTime: 0,
      };
      resolve(element);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('视频加载失败'));
    };
    
    video.src = url;
  });
}

/**
 * 加载文件（自动判断类型）
 */
export async function loadFile(
  file: File, 
  position = { x: 0, y: 0 }, 
  zIndex = 0
): Promise<ImageElement | VideoElement> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  if (validation.fileType === 'image') {
    return loadImage(file, position, zIndex);
  } else {
    return loadVideo(file, position, zIndex);
  }
}
