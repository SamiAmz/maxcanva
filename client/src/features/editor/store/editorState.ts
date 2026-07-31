import type {
  CanvasContent,
  ContentGroup,
  InteractionType,
  PrototypeInteraction,
  ProjectDocument,
  PrototypeWindow,
  Tool,
} from '@maxcanva/shared';
import type { ContentTransform } from '@/domain/project/contentGeometry';
import type { LayerAction } from '@/domain/project/projectOperations';

export interface ShapeStyleUpdate {
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
}

export interface EditorState {
  projectTitle: string;
  activeTool: Tool;
  drawingColor: string;
  drawingFillColor: string;
  drawingWidth: number;
  windows: PrototypeWindow[];
  activeWindowId: string;
  contents: CanvasContent[];
  groups: ContentGroup[];
  interactions: PrototypeInteraction[];
  selectedContentIds: string[];
  history: EditorSnapshot[];
  setProjectTitle: (title: string) => void;
  setActiveTool: (tool: Tool) => void;
  setDrawingColor: (color: string) => void;
  setDrawingFillColor: (color: string) => void;
  setDrawingWidth: (width: number) => void;
  createWindow: () => void;
  deleteWindow: (id: string) => void;
  renameWindow: (id: string, name: string) => void;
  selectWindow: (id: string) => void;
  selectContent: (id: string, additive?: boolean) => void;
  setSelection: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  deleteSelected: () => void;
  updateSelectedShapeStyle: (style: ShapeStyleUpdate) => void;
  reorderSelected: (action: LayerAction) => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  moveContents: (ids: string[], x: number, y: number) => void;
  transformContents: (transforms: ContentTransform[]) => void;
  saveInteraction: (interaction: {
    sourceWindowId: string;
    targetWindowId?: string;
    url?: string;
    contentIds: string[];
    type: InteractionType;
  }) => void;
  removeInteractionsForContents: (contentIds: string[]) => void;
  addContent: (content: CanvasContent) => void;
  updatePencilPoints: (id: string, points: number[]) => void;
  updateCheckboxLabel: (id: string, label: string) => void;
  undo: () => void;
  loadProjectDocument: (document: ProjectDocument) => void;
  createBlankProject: () => void;
}

export type EditorSnapshot = Pick<
  EditorState,
  | 'windows'
  | 'activeWindowId'
  | 'contents'
  | 'groups'
  | 'interactions'
>;
