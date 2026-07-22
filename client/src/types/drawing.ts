export type Tool = 'pencil' | 'select';

export interface PrototypeWindow {
  id: string;
  name: string;
}

export interface Stroke {
  id: string;
  windowId: string;
  tool: Tool;
  points: number[];
  color: string;
  width: number;
  opacity: number;
}
