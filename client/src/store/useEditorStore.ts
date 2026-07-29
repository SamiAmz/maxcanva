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
  history: EditorSnapshot[];
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
  undo: () => void;
}

type EditorSnapshot = Pick<
  EditorState,
  | 'windows'
  | 'activeWindowId'
  | 'contents'
  | 'groups'
  | 'interactions'
>;

const HISTORY_LIMIT = 50;

function remember(
  state: EditorState,
  changes: Partial<EditorState>,
): Partial<EditorState> {
  const snapshot: EditorSnapshot = {
    windows: state.windows,
    activeWindowId: state.activeWindowId,
    contents: state.contents,
    groups: state.groups,
    interactions: state.interactions,
  };

  return {
    ...changes,
    history: [...state.history, snapshot].slice(-HISTORY_LIMIT),
  };
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
  history: [],
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

      return remember(state, {
        windows: [
          ...state.windows,
          { id, name: `Fenêtre ${state.windows.length + 1}` },
        ],
        activeWindowId: id,
        selectedContentIds: [],
      });
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
      if (selectedIds.size === 0) return state;

      return remember(state, {
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
      });
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
      return remember(state, {
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
      });
    }),
  ungroupSelected: () =>
    set((state) => {
      const selectedIds = new Set(state.selectedContentIds);
      const groups = state.groups.filter(
        (group) =>
          !group.contentIds.some((id) => selectedIds.has(id)),
      );
      if (groups.length === state.groups.length) return state;

      return remember(state, {
        groups,
      });
    }),
  moveContents: (ids, x, y) =>
    set((state) => {
      if (ids.length === 0 || (x === 0 && y === 0)) return state;
      return remember(state, {
        contents: state.contents.map((content) =>
          ids.includes(content.id) ? moveContent(content, x, y) : content,
        ),
      });
    }),
  transformContents: (transforms) =>
    set((state) => {
      if (transforms.length === 0) return state;
      const transformsById = new Map(
        transforms.map((transform) => [transform.id, transform]),
      );

      return remember(state, {
        contents: state.contents.map((content) => {
          const transform = transformsById.get(content.id);
          return transform ? transformContent(content, transform) : content;
        }),
      });
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

      return remember(state, {
        interactions: [
          ...remainingInteractions,
          { ...newInteraction, id: crypto.randomUUID() },
        ],
      });
    }),
  removeInteractionsForContents: (contentIds) =>
    set((state) => {
      const idsToRemove = new Set(contentIds);
      const hasInteraction = state.interactions.some((interaction) =>
        interaction.contentIds.some((contentId) =>
          idsToRemove.has(contentId),
        ),
      );
      if (!hasInteraction) return state;

      const interactions = state.interactions
        .map((interaction) => ({
          ...interaction,
          contentIds: interaction.contentIds.filter(
            (contentId) => !idsToRemove.has(contentId),
          ),
        }))
        .filter((interaction) => interaction.contentIds.length > 0);

      return remember(state, { interactions });
    }),
  addContent: (content) =>
    set((state) =>
      remember(state, { contents: [...state.contents, content] }),
    ),
  updatePencilPoints: (id, points) =>
    set((state) => ({
      contents: state.contents.map((content) =>
        content.id === id && content.type === 'pencil'
          ? { ...content, points }
          : content,
      ),
    })),
  updateCheckboxLabel: (id, label) =>
    set((state) => {
      const current = state.contents.find((content) => content.id === id);
      if (
        !current ||
        current.type !== 'checkbox' ||
        current.label === label
      ) {
        return state;
      }

      return remember(state, {
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
      });
    }),
  undo: () =>
    set((state) => {
      const previous = state.history.at(-1);
      if (!previous) return state;

      return {
        ...previous,
        history: state.history.slice(0, -1),
        selectedContentIds: [],
      };
    }),
}));
