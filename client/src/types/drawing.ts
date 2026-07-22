export type Tool = 'pencil' | 'select';

export interface PrototypeWindow {
  id: string;
  name: string;
}

export interface Stroke {
  id: string;
  windowId: string;
  tool: Tool;
  // Konva représente un tracé par une liste alternée: [x1, y1, x2, y2, ...].
  points: number[];
  color: string;
  width: number;
  opacity: number;
}

export type InteractionType = 'button' | 'link';

export interface PrototypeInteraction {
  id: string;
  sourceWindowId: string;
  // Un bouton utilise targetWindowId; un hyperlien utilise url.
  targetWindowId?: string;
  url?: string;
  // Plusieurs traits peuvent former une seule zone interactive.
  contentIds: string[];
  type: InteractionType;
}
