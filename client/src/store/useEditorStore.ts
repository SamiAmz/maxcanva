import { create } from 'zustand';
import type { PrototypeWindow, Stroke, Tool } from '../types/drawing';

const INITIAL_WINDOW: PrototypeWindow = {
  id: 'window-1',
  name: 'Fenêtre 1',
};

interface EditorState {
  activeTool: Tool;
  pencilColor: string;
  pencilWidth: number;
  windows: PrototypeWindow[];
  activeWindowId: string;
  strokes: Stroke[];
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
  selectedStrokeIds: [],
  setActiveTool: (activeTool) =>
    set((state) => ({
      activeTool,
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
    set((state) => ({
      strokes: state.strokes.filter(
        (stroke) => !state.selectedStrokeIds.includes(stroke.id),
      ),
      selectedStrokeIds: [],
    })),
  moveStrokes: (ids, x, y) =>
    set((state) => ({
      strokes: state.strokes.map((stroke) =>
        ids.includes(stroke.id)
          ? {
              ...stroke,
              points: stroke.points.map((point, index) =>
                point + (index % 2 === 0 ? x : y),
              ),
            }
          : stroke,
      ),
    })),
  addStroke: (stroke) =>
    set((state) => ({ strokes: [...state.strokes, stroke] })),
  updateStrokePoints: (id, points) =>
    set((state) => ({
      strokes: state.strokes.map((stroke) =>
        stroke.id === id ? { ...stroke, points } : stroke,
      ),
    })),
}));
