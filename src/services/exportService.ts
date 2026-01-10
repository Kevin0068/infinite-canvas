import type { ImageElement } from '../types';
import { calculateBoundingBox } from '../core/merger';

export type ExportFormat = 'png' | 'jpg';

export interface ExportOptions {
  format: ExportFormat;
  quality?: number; // 0-1, only for jpg
}

/**
 * 将图片元素导出为图片文件
 * 保持原始分辨率
 */
export async function exportImages(
  elements: ImageElement[],
  options: ExportOptions = { format: 'png' }
): Promise<Blob> {
  if (elements.length === 0) {
    throw new Error('没有可导出的图片');
  }

  // 计算边界框
  const boundingBox = calculateBoundingBox(elements);
  
  // 创建离屏 canvas
  const canvas = document.createElement('canvas');
  canvas.width = boundingBox.width;
  canvas.height = boundingBox.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('无法创建 canvas context');
  }

  // 如果是 jpg 格式，填充白色背景
  if (options.format === 'jpg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 按 z-index 排序
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  // 绘制每个图片
  for (const element of sortedElements) {
    const img = await loadImage(element.src);
    
    // 计算相对于边界框的位置
    const x = element.position.x - boundingBox.x;
    const y = element.position.y - boundingBox.y;
    
    // 使用原始分辨率绘制
    ctx.drawImage(
      img,
      x,
      y,
      element.originalSize.width,
      element.originalSize.height
    );
  }

  // 导出为 blob
  const mimeType = options.format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = options.format === 'jpg' ? (options.quality ?? 0.92) : undefined;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('导出失败'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * 下载 blob 文件
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出并下载图片
 */
export async function exportAndDownload(
  elements: ImageElement[],
  filename: string,
  options: ExportOptions = { format: 'png' }
): Promise<void> {
  const blob = await exportImages(elements, options);
  const ext = options.format === 'png' ? '.png' : '.jpg';
  const finalFilename = filename.endsWith(ext) ? filename : `${filename}${ext}`;
  downloadBlob(blob, finalFilename);
}

/**
 * 获取导出图片的尺寸（用于预览）
 */
export function getExportDimensions(elements: ImageElement[]): { width: number; height: number } {
  if (elements.length === 0) {
    return { width: 0, height: 0 };
  }
  const boundingBox = calculateBoundingBox(elements);
  return { width: boundingBox.width, height: boundingBox.height };
}

// 辅助函数：加载图片
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}
