export const PROJECT_DOCUMENT_VERSION = 1 as const;
export const PROTOTYPE_PAGE_WIDTH = 1100;
export const PROTOTYPE_PAGE_HEIGHT = 640;

export type DrawingTool = 'pencil' | 'rectangle' | 'circle' | 'text';
export type WidgetTool = 'checkbox' | 'text-input';
export type Tool = DrawingTool | WidgetTool | 'line' | 'select';

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
  points: number[];
  strokeWidth: number;
}

export interface RectangleContent extends BaseContent {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeWidth: number;
}

export interface CircleContent extends BaseContent {
  type: 'circle';
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  fillColor: string;
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
  targetWindowId?: string;
  url?: string;
  contentIds: string[];
  type: InteractionType;
}

/**
 * Format persistant et transportable d'un prototype.
 * Toute évolution incompatible devra introduire une nouvelle version et une migration.
 */
export interface ProjectDocument {
  schemaVersion: typeof PROJECT_DOCUMENT_VERSION;
  title: string;
  windows: PrototypeWindow[];
  contents: CanvasContent[];
  groups: ContentGroup[];
  interactions: PrototypeInteraction[];
}
