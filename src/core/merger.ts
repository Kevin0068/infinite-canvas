import type { ImageElement, TextElement, CanvasElement, Rect, Point } from '../types';

/**
 * 计算多个元素的边界框
 * 使用原始分辨率计算
 */
export function calculateBoundingBox(elements: CanvasElement[]): Rect {
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
    
    // 根据元素类型计算边界
    let right: number;
    let bottom: number;
    
    if (element.type === 'text') {
      // 文字元素使用 size（基于字体大小估算）
      right = left + element.size.width;
      bottom = top + element.size.height;
    } else {
      // 图片/视频使用原始分辨率
      right = left + element.originalSize.width;
      bottom = top + element.originalSize.height;
    }

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
 * 合并多个元素（图片和文字）为一个新的图片元素
 */
export async function mergeElements(
  elements: CanvasElement[],
  generateId: () => string
): Promise<ImageElement> {
  if (elements.length === 0) {
    throw new Error('Cannot merge empty array of elements');
  }

  // 过滤掉视频元素（暂不支持）
  const supportedElements = elements.filter(el => el.type === 'image' || el.type === 'text');
  
  if (supportedElements.length === 0) {
    throw new Error('No supported elements to merge');
  }

  if (supportedElements.length === 1 && supportedElements[0].type === 'image') {
    return { ...supportedElements[0] as ImageElement, id: generateId() };
  }

  // 计算边界框
  const boundingBox = calculateBoundingBox(supportedElements);

  // 创建离屏 canvas
  const canvas = document.createElement('canvas');
  canvas.width = boundingBox.width;
  canvas.height = boundingBox.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 按 z-index 排序，确保正确的绘制顺序
  const sortedElements = [...supportedElements].sort((a, b) => a.zIndex - b.zIndex);

  // 绘制每个元素
  for (const element of sortedElements) {
    // 计算在合并画布上的位置（相对于边界框）
    const drawX = element.position.x - boundingBox.x;
    const drawY = element.position.y - boundingBox.y;
    
    ctx.save();
    
    // 处理旋转
    const rotation = element.rotation || 0;
    if (rotation !== 0) {
      let centerX: number;
      let centerY: number;
      
      if (element.type === 'text') {
        centerX = drawX + element.size.width / 2;
        centerY = drawY + element.size.height / 2;
      } else {
        centerX = drawX + element.originalSize.width / 2;
        centerY = drawY + element.originalSize.height / 2;
      }
      
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }
    
    if (element.type === 'image') {
      const img = await loadImage(element.src);
      ctx.drawImage(
        img,
        drawX,
        drawY,
        element.originalSize.width,
        element.originalSize.height
      );
    } else if (element.type === 'text') {
      renderTextToCanvas(ctx, element as TextElement, drawX, drawY);
    }
    
    ctx.restore();
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
    rotation: 0,
    scale: 1,
    src: dataUrl,
  };
}

/**
 * 渲染文字到 canvas
 */
function renderTextToCanvas(
  ctx: CanvasRenderingContext2D,
  element: TextElement,
  x: number,
  y: number
): void {
  // 设置字体
  let fontStyle = '';
  if (element.italic) fontStyle += 'italic ';
  if (element.bold) fontStyle += 'bold ';
  ctx.font = `${fontStyle}${element.fontSize}px ${element.fontFamily}`;
  
  // 测量文字尺寸
  const metrics = ctx.measureText(element.text);
  const textWidth = metrics.width;
  const textHeight = element.fontSize;
  
  // 绘制背景
  if (element.backgroundColor) {
    ctx.fillStyle = element.backgroundColor;
    ctx.fillRect(x - 4, y - 2, textWidth + 8, textHeight + 4);
  }
  
  // 绘制文字
  ctx.fillStyle = element.color;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(element.text, x, y);
}

/**
 * 合并多个图片元素为一个新的图片元素（保持向后兼容）
 */
export async function mergeImages(
  elements: ImageElement[],
  generateId: () => string
): Promise<ImageElement> {
  return mergeElements(elements, generateId);
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
