import { create } from 'zustand';
import type {
  CanvasContent,
  ContentGroup,
  InteractionType,
  PrototypeInteraction,
  PrototypeWindow,
  Tool,
} from '../types/drawing';
import {
  moveContent,
  transformContent,
  type ContentTransform,
} from '../features/canvas/utils/contentGeometry';

const INITIAL_WINDOW: PrototypeWindow = {
  id: 'window-1',
  name: 'Fenêtre 1',
};

function expandSelection(ids: string[], groups: ContentGroup[]) {
  const expandedIds = new Set(ids);

  groups.forEach((group) => {
    if (group.contentIds.some((id) => expandedIds.has(id))) {
      group.contentIds.forEach((id) => expandedIds.add(id));
    }
  });
  return [...expandedIds];
}

// Source de vérité partagée par l'éditeur, les miniatures et la simulation.
interface EditorState {
  activeTool: Tool;
  drawingColor: string;
  drawingWidth: number;
  windows: PrototypeWindow[];
  activeWindowId: string;
  contents: CanvasContent[];
  groups: ContentGroup[];
  interactions: PrototypeInteraction[];
  selectedContentIds: string[];
  setActiveTool: (tool: Tool) => void;
  setDrawingColor: (color: string) => void;
  setDrawingWidth: (width: number) => void;
  createWindow: () => void;
  selectWindow: (id: string) => void;
  selectContent: (id: string, additive?: boolean) => void;
  setSelection: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  deleteSelected: () => void;
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
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'pencil',
  drawingColor: '#1f2937',
  drawingWidth: 4,
  windows: [INITIAL_WINDOW],
  activeWindowId: INITIAL_WINDOW.id,
  contents: [],
  groups: [],
  interactions: [],
  selectedContentIds: [],
  setActiveTool: (activeTool) =>
    set((state) => ({
      activeTool,
      selectedContentIds:
        activeTool === 'select' ? state.selectedContentIds : [],
    })),
  setDrawingColor: (drawingColor) => set({ drawingColor }),
  setDrawingWidth: (drawingWidth) => set({ drawingWidth }),
  createWindow: () =>
    set((state) => {
      const id = crypto.randomUUID();

      return {
        windows: [
          ...state.windows,
          { id, name: `Fenêtre ${state.windows.length + 1}` },
        ],
        activeWindowId: id,
        selectedContentIds: [],
      };
    }),
  selectWindow: (activeWindowId) =>
    set({ activeWindowId, selectedContentIds: [] }),
  selectContent: (id, additive = false) =>
    set((state) => {
      const group = state.groups.find((item) => item.contentIds.includes(id));
      const idsToToggle = group?.contentIds ?? [id];

      if (additive) {
        const allSelected = idsToToggle.every((contentId) =>
          state.selectedContentIds.includes(contentId),
        );
        return {
          selectedContentIds: allSelected
            ? state.selectedContentIds.filter(
                (contentId) => !idsToToggle.includes(contentId),
              )
            : [...new Set([...state.selectedContentIds, ...idsToToggle])],
        };
      }

      if (group) {
        const isOnlySelectedGroup =
          state.selectedContentIds.length === idsToToggle.length &&
          idsToToggle.every((contentId) =>
            state.selectedContentIds.includes(contentId),
          );
        return {
          selectedContentIds: isOnlySelectedGroup
            ? state.selectedContentIds
            : idsToToggle,
        };
      }

      return {
        selectedContentIds: state.selectedContentIds.includes(id)
          ? state.selectedContentIds
          : [id],
      };
    }),
  setSelection: (ids, additive = false) =>
    set((state) => {
      const nextIds = additive
        ? [...new Set([...state.selectedContentIds, ...ids])]
        : ids;
      return { selectedContentIds: expandSelection(nextIds, state.groups) };
    }),
  clearSelection: () => set({ selectedContentIds: [] }),
  deleteSelected: () =>
    set((state) => {
      const selectedIds = new Set(state.selectedContentIds);

      return {
        contents: state.contents.filter(
          (content) => !selectedIds.has(content.id),
        ),
        groups: state.groups
          .map((group) => ({
            ...group,
            contentIds: group.contentIds.filter(
              (contentId) => !selectedIds.has(contentId),
            ),
          }))
          .filter((group) => group.contentIds.length > 1),
        // Évite de conserver des interactions qui référencent du contenu supprimé.
        interactions: state.interactions
          .map((interaction) => ({
            ...interaction,
            contentIds: interaction.contentIds.filter(
              (contentId) => !selectedIds.has(contentId),
            ),
          }))
          .filter((interaction) => interaction.contentIds.length > 0),
        selectedContentIds: [],
      };
    }),
  groupSelected: () =>
    set((state) => {
      const contentIds = state.selectedContentIds.filter((id) =>
        state.contents.some(
          (content) =>
            content.id === id && content.windowId === state.activeWindowId,
        ),
      );
      if (contentIds.length < 2) return state;

      const selectedIds = new Set(contentIds);
      return {
        groups: [
          ...state.groups.filter(
            (group) =>
              !group.contentIds.some((id) => selectedIds.has(id)),
          ),
          {
            id: crypto.randomUUID(),
            windowId: state.activeWindowId,
            contentIds,
          },
        ],
      };
    }),
  ungroupSelected: () =>
    set((state) => {
      const selectedIds = new Set(state.selectedContentIds);
      return {
        groups: state.groups.filter(
          (group) =>
            !group.contentIds.some((id) => selectedIds.has(id)),
        ),
      };
    }),
  moveContents: (ids, x, y) =>
    set((state) => ({
      contents: state.contents.map((content) =>
        ids.includes(content.id) ? moveContent(content, x, y) : content,
      ),
    })),
  transformContents: (transforms) =>
    set((state) => {
      const transformsById = new Map(
        transforms.map((transform) => [transform.id, transform]),
      );

      return {
        contents: state.contents.map((content) => {
          const transform = transformsById.get(content.id);
          return transform ? transformContent(content, transform) : content;
        }),
      };
    }),
  saveInteraction: (newInteraction) =>
    set((state) => {
      const selectedIds = new Set(newInteraction.contentIds);
      // Un contenu ne peut appartenir qu'à une seule interaction à la fois.
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
  addContent: (content) =>
    set((state) => ({ contents: [...state.contents, content] })),
  updatePencilPoints: (id, points) =>
    set((state) => ({
      contents: state.contents.map((content) =>
        content.id === id && content.type === 'pencil'
          ? { ...content, points }
          : content,
      ),
    })),
  updateCheckboxLabel: (id, label) =>
    set((state) => ({
      contents: state.contents.map((content) =>
        content.id === id && content.type === 'checkbox'
          ? {
              ...content,
              label,
              width: label
                ? Math.min(320, Math.max(96, 38 + label.length * 8))
                : 28,
            }
          : content,
      ),
    })),
}));
