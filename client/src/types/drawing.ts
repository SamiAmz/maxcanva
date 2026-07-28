export type DrawingTool = 'pencil' | 'rectangle' | 'circle' | 'text';
export type WidgetTool = 'checkbox' | 'text-input';
export type Tool = DrawingTool | WidgetTool | 'select';

export interface PrototypeWindow {
  id: string;
  name: string;
}

export interface ContentGroup {
  id: string;
  windowId: string;
  contentIds: string[];
}

interface BaseContent {
  id: string;
  windowId: string;
  type: DrawingTool | WidgetTool;
  color: string;
  opacity: number;
}

export interface PencilContent extends BaseContent {
  type: 'pencil';
  // Konva représente un tracé par une liste alternée: [x1, y1, x2, y2, ...].
  points: number[];
  strokeWidth: number;
}

export interface RectangleContent extends BaseContent {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth: number;
}

export interface CircleContent extends BaseContent {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  strokeWidth: number;
}

export interface TextContent extends BaseContent {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export interface CheckboxContent extends BaseContent {
  type: 'checkbox';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  checked: boolean;
}

export interface TextInputContent extends BaseContent {
  type: 'text-input';
  x: number;
  y: number;
  width: number;
  height: number;
  placeholder: string;
}

export type CanvasContent =
  | PencilContent
  | RectangleContent
  | CircleContent
  | TextContent
  | CheckboxContent
  | TextInputContent;

export type InteractionType = 'button' | 'link';

export interface PrototypeInteraction {
  id: string;
  sourceWindowId: string;
  // Un bouton utilise targetWindowId; un hyperlien utilise url.
  targetWindowId?: string;
  url?: string;
  // Plusieurs contenus peuvent former une seule zone interactive.
  contentIds: string[];
  type: InteractionType;
}
