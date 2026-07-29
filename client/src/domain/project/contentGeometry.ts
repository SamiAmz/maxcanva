import type { CanvasContent } from '@maxcanva/shared';

export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getContentBounds(content: CanvasContent): ContentBounds {
  if (content.type === 'pencil') {
    const xs = content.points.filter((_, index) => index % 2 === 0);
    const ys = content.points.filter((_, index) => index % 2 === 1);
    const padding = content.strokeWidth / 2;

    return {
      x: Math.min(...xs) - padding,
      y: Math.min(...ys) - padding,
      width: Math.max(...xs) - Math.min(...xs) + padding * 2,
      height: Math.max(...ys) - Math.min(...ys) + padding * 2,
    };
  }

  if (content.type === 'rectangle') {
    return {
      x: content.x - content.strokeWidth / 2,
      y: content.y - content.strokeWidth / 2,
      width: content.width + content.strokeWidth,
      height: content.height + content.strokeWidth,
    };
  }

  if (content.type === 'circle') {
    const padding = content.strokeWidth / 2;
    return {
      x: content.x - content.radiusX - padding,
      y: content.y - content.radiusY - padding,
      width: content.radiusX * 2 + padding * 2,
      height: content.radiusY * 2 + padding * 2,
    };
  }

  if (content.type === 'checkbox' || content.type === 'text-input') {
    return {
      x: content.x,
      y: content.y,
      width: content.width,
      height: content.height,
    };
  }

  // Konva calcule précisément le texte au rendu; cette approximation suffit
  // pour la sélection et les zones interactives.
  return {
    x: content.x,
    y: content.y,
    width: Math.max(content.fontSize, content.text.length * content.fontSize * 0.58),
    height: content.fontSize * 1.25,
  };
}

export function getCombinedBounds(contents: CanvasContent[]) {
  if (contents.length === 0) return null;

  const bounds = contents.map(getContentBounds);
  const left = Math.min(...bounds.map((box) => box.x));
  const top = Math.min(...bounds.map((box) => box.y));
  const right = Math.max(...bounds.map((box) => box.x + box.width));
  const bottom = Math.max(...bounds.map((box) => box.y + box.height));

  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function moveContent(
  content: CanvasContent,
  deltaX: number,
  deltaY: number,
): CanvasContent {
  if (content.type === 'pencil') {
    return {
      ...content,
      points: content.points.map((point, index) =>
        point + (index % 2 === 0 ? deltaX : deltaY),
      ),
    };
  }

  return {
    ...content,
    x: content.x + deltaX,
    y: content.y + deltaY,
  };
}

export interface ContentTransform {
  id: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export function transformContent(
  content: CanvasContent,
  transform: ContentTransform,
): CanvasContent {
  const scaleX = Math.max(0.05, Math.abs(transform.scaleX));
  const scaleY = Math.max(0.05, Math.abs(transform.scaleY));
  const mapX = (x: number) => transform.x + x * scaleX;
  const mapY = (y: number) => transform.y + y * scaleY;

  if (content.type === 'pencil') {
    return {
      ...content,
      points: content.points.map((point, index) =>
        index % 2 === 0 ? mapX(point) : mapY(point),
      ),
    };
  }

  if (content.type === 'rectangle') {
    return {
      ...content,
      x: transform.x,
      y: transform.y,
      width: Math.max(4, content.width * scaleX),
      height: Math.max(4, content.height * scaleY),
    };
  }

  if (content.type === 'circle') {
    return {
      ...content,
      x: transform.x,
      y: transform.y,
      radiusX: Math.max(4, content.radiusX * scaleX),
      radiusY: Math.max(4, content.radiusY * scaleY),
    };
  }

  if (content.type === 'checkbox' || content.type === 'text-input') {
    return {
      ...content,
      x: transform.x,
      y: transform.y,
      width: Math.max(
        content.type === 'checkbox' ? 28 : 120,
        content.width * scaleX,
      ),
      height: Math.max(
        content.type === 'checkbox' ? 24 : 32,
        content.height * scaleY,
      ),
    };
  }

  const uniformScale = Math.min(scaleX, scaleY);
  return {
    ...content,
    x: transform.x,
    y: transform.y,
    fontSize: Math.max(8, content.fontSize * uniformScale),
  };
}
