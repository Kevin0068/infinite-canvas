import type { ImageElement, Rect, Point } from '../types';

/**
 * 计算多个图片元素的边界框
 * 使用原始分辨率计算
 */
export function calculateBoundingBox(elements: ImageElement[]): Rect {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    const left = element.position.x;
    const top = element.position.y;
    // 使用原始分辨率计算边界
    const right = left + element.originalSize.width;
    const bottom = top + element.originalSize.height;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * 合并多个图片元素为一个新的图片元素
 * 保持原始分辨率
 */
export async function mergeImages(
  elements: ImageElement[],
  generateId: () => string
): Promise<ImageElement> {
  if (elements.length === 0) {
    throw new Error('Cannot merge empty array of images');
  }

  if (elements.length === 1) {
    return { ...elements[0], id: generateId() };
  }

  // 计算边界框
  const boundingBox = calculateBoundingBox(elements);

  // 创建离屏 canvas
  const canvas = document.createElement('canvas');
  canvas.width = boundingBox.width;
  canvas.height = boundingBox.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 按 z-index 排序，确保正确的绘制顺序
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  // 加载并绘制每个图片
  for (const element of sortedElements) {
    const img = await loadImage(element.src);
    
    // 计算在合并画布上的位置（相对于边界框）
    const drawX = element.position.x - boundingBox.x;
    const drawY = element.position.y - boundingBox.y;
    
    // 使用原始分辨率绘制
    ctx.drawImage(
      img,
      drawX,
      drawY,
      element.originalSize.width,
      element.originalSize.height
    );
  }

  // 导出为 data URL
  const dataUrl = canvas.toDataURL('image/png');

  // 计算新元素的位置（边界框的左上角）
  const newPosition: Point = {
    x: boundingBox.x,
    y: boundingBox.y,
  };

  // 计算最大 z-index
  const maxZIndex = Math.max(...elements.map(el => el.zIndex));

  return {
    id: generateId(),
    type: 'image',
    position: newPosition,
    size: { width: boundingBox.width, height: boundingBox.height },
    originalSize: { width: boundingBox.width, height: boundingBox.height },
    zIndex: maxZIndex + 1,
    src: dataUrl,
  };
}

/**
 * 加载图片
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * 纯函数版本的边界框计算（用于测试）
 * 不依赖 DOM
 */
export function calculateMergedDimensions(
  elements: Array<{ position: Point; originalSize: { width: number; height: number } }>
): { width: number; height: number; offset: Point } {
  if (elements.length === 0) {
    return { width: 0, height: 0, offset: { x: 0, y: 0 } };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    const left = element.position.x;
    const top = element.position.y;
    const right = left + element.originalSize.width;
    const bottom = top + element.originalSize.height;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
    offset: { x: minX, y: minY },
  };
}
