import { create } from 'zustand';
import type {
  InteractionType,
  PrototypeInteraction,
  PrototypeWindow,
  Stroke,
  Tool,
} from '../types/drawing';

const INITIAL_WINDOW: PrototypeWindow = {
  id: 'window-1',
  name: 'Fenêtre 1',
};

// Source de vérité partagée par l'éditeur, les miniatures et la simulation.
interface EditorState {
  activeTool: Tool;
  pencilColor: string;
  pencilWidth: number;
  windows: PrototypeWindow[];
  activeWindowId: string;
  strokes: Stroke[];
  interactions: PrototypeInteraction[];
  selectedStrokeIds: string[];
  setActiveTool: (tool: Tool) => void;
  setPencilColor: (color: string) => void;
  setPencilWidth: (width: number) => void;
  createWindow: () => void;
  selectWindow: (id: string) => void;
  selectStroke: (id: string, additive?: boolean) => void;
  setSelection: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  deleteSelected: () => void;
  moveStrokes: (ids: string[], x: number, y: number) => void;
  saveInteraction: (interaction: {
    sourceWindowId: string;
    targetWindowId?: string;
    url?: string;
    contentIds: string[];
    type: InteractionType;
  }) => void;
  removeInteractionsForContents: (contentIds: string[]) => void;
  addStroke: (stroke: Stroke) => void;
  updateStrokePoints: (id: string, points: number[]) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'pencil',
  pencilColor: '#1f2937',
  pencilWidth: 4,
  windows: [INITIAL_WINDOW],
  activeWindowId: INITIAL_WINDOW.id,
  strokes: [],
  interactions: [],
  selectedStrokeIds: [],
  setActiveTool: (activeTool) =>
    set((state) => ({
      activeTool,
      // Une sélection n'est pas visible ni modifiable avec le crayon.
      selectedStrokeIds:
        activeTool === 'pencil' ? [] : state.selectedStrokeIds,
    })),
  setPencilColor: (pencilColor) => set({ pencilColor }),
  setPencilWidth: (pencilWidth) => set({ pencilWidth }),
  createWindow: () =>
    set((state) => {
      const id = crypto.randomUUID();

      return {
        windows: [
          ...state.windows,
          { id, name: `Fenêtre ${state.windows.length + 1}` },
        ],
        activeWindowId: id,
        selectedStrokeIds: [],
      };
    }),
  selectWindow: (activeWindowId) =>
    set({ activeWindowId, selectedStrokeIds: [] }),
  selectStroke: (id, additive = false) =>
    set((state) => {
      if (additive) {
        return {
          selectedStrokeIds: state.selectedStrokeIds.includes(id)
            ? state.selectedStrokeIds.filter((strokeId) => strokeId !== id)
            : [...state.selectedStrokeIds, id],
        };
      }

      return {
        selectedStrokeIds: state.selectedStrokeIds.includes(id)
          ? state.selectedStrokeIds
          : [id],
      };
    }),
  setSelection: (ids, additive = false) =>
    set((state) => ({
      selectedStrokeIds: additive
        ? [...new Set([...state.selectedStrokeIds, ...ids])]
        : ids,
    })),
  clearSelection: () => set({ selectedStrokeIds: [] }),
  deleteSelected: () =>
    set((state) => {
      const selectedIds = new Set(state.selectedStrokeIds);

      return {
        strokes: state.strokes.filter((stroke) => !selectedIds.has(stroke.id)),
        // Évite de conserver des interactions qui référencent des traits supprimés.
        interactions: state.interactions
          .map((interaction) => ({
            ...interaction,
            contentIds: interaction.contentIds.filter(
              (contentId) => !selectedIds.has(contentId),
            ),
          }))
          .filter((interaction) => interaction.contentIds.length > 0),
        selectedStrokeIds: [],
      };
    }),
  moveStrokes: (ids, x, y) =>
    set((state) => ({
      strokes: state.strokes.map((stroke) =>
        ids.includes(stroke.id)
          ? {
              ...stroke,
              // Les indices pairs sont des x et les indices impairs des y.
              points: stroke.points.map((point, index) =>
                point + (index % 2 === 0 ? x : y),
              ),
            }
          : stroke,
      ),
    })),
  saveInteraction: (newInteraction) =>
    set((state) => {
      const selectedIds = new Set(newInteraction.contentIds);
      // Un trait ne peut appartenir qu'à une seule interaction à la fois.
      const remainingInteractions = state.interactions
        .map((interaction) => ({
          ...interaction,
          contentIds: interaction.contentIds.filter(
            (contentId) => !selectedIds.has(contentId),
          ),
        }))
        .filter((interaction) => interaction.contentIds.length > 0);

      return {
        interactions: [
          ...remainingInteractions,
          { ...newInteraction, id: crypto.randomUUID() },
        ],
      };
    }),
  removeInteractionsForContents: (contentIds) =>
    set((state) => {
      const idsToRemove = new Set(contentIds);

      return {
        interactions: state.interactions
          .map((interaction) => ({
            ...interaction,
            contentIds: interaction.contentIds.filter(
              (contentId) => !idsToRemove.has(contentId),
            ),
          }))
          .filter((interaction) => interaction.contentIds.length > 0),
      };
    }),
  addStroke: (stroke) =>
    set((state) => ({ strokes: [...state.strokes, stroke] })),
  updateStrokePoints: (id, points) =>
    set((state) => ({
      strokes: state.strokes.map((stroke) =>
        stroke.id === id ? { ...stroke, points } : stroke,
      ),
    })),
}));
