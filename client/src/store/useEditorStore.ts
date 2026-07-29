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

function getNextWindowNumber(windows: PrototypeWindow[]) {
  const highestNumber = windows.reduce((highest, window) => {
    const match = /^Fenêtre (\d+)$/.exec(window.name);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return Math.max(highestNumber, windows.length) + 1;
}

type LayerAction =
  | 'send-to-back'
  | 'send-backward'
  | 'bring-forward'
  | 'bring-to-front';

function reorderContents(
  contents: CanvasContent[],
  activeWindowId: string,
  selectedContentIds: string[],
  action: LayerAction,
) {
  const selectedIds = new Set(selectedContentIds);
  const windowContents = contents.filter(
    (content) => content.windowId === activeWindowId,
  );
  const isSelected = (content: CanvasContent) => selectedIds.has(content.id);
  let reordered = [...windowContents];

  if (action === 'send-to-back') {
    reordered = [
      ...windowContents.filter(isSelected),
      ...windowContents.filter((content) => !isSelected(content)),
    ];
  } else if (action === 'bring-to-front') {
    reordered = [
      ...windowContents.filter((content) => !isSelected(content)),
      ...windowContents.filter(isSelected),
    ];
  } else if (action === 'send-backward') {
    for (let index = 1; index < reordered.length; index += 1) {
      if (isSelected(reordered[index]) && !isSelected(reordered[index - 1])) {
        [reordered[index - 1], reordered[index]] = [
          reordered[index],
          reordered[index - 1],
        ];
      }
    }
  } else {
    for (let index = reordered.length - 2; index >= 0; index -= 1) {
      if (isSelected(reordered[index]) && !isSelected(reordered[index + 1])) {
        [reordered[index], reordered[index + 1]] = [
          reordered[index + 1],
          reordered[index],
        ];
      }
    }
  }

  let windowIndex = 0;
  return contents.map((content) =>
    content.windowId === activeWindowId
      ? reordered[windowIndex++]
      : content,
  );
}

// Source de vérité partagée par l'éditeur, les miniatures et la simulation.
interface EditorState {
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
  updateSelectedShapeStyle: (style: {
    color?: string;
    fillColor?: string;
    strokeWidth?: number;
  }) => void;
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
  projectTitle: 'Sans titre',
  activeTool: 'pencil',
  drawingColor: '#343a40',
  drawingFillColor: 'transparent',
  drawingWidth: 4,
  windows: [INITIAL_WINDOW],
  activeWindowId: INITIAL_WINDOW.id,
  contents: [],
  groups: [],
  interactions: [],
  selectedContentIds: [],
  history: [],
  setProjectTitle: (projectTitle) => set({ projectTitle }),
  setActiveTool: (activeTool) =>
    set((state) => ({
      activeTool,
      selectedContentIds:
        activeTool === 'select' ? state.selectedContentIds : [],
    })),
  setDrawingColor: (drawingColor) => set({ drawingColor }),
  setDrawingFillColor: (drawingFillColor) => set({ drawingFillColor }),
  setDrawingWidth: (drawingWidth) => set({ drawingWidth }),
  createWindow: () =>
    set((state) => {
      const id = crypto.randomUUID();
      const windowNumber = getNextWindowNumber(state.windows);

      return remember(state, {
        windows: [
          ...state.windows,
          { id, name: `Fenêtre ${windowNumber}` },
        ],
        activeWindowId: id,
        selectedContentIds: [],
      });
    }),
  deleteWindow: (id) =>
    set((state) => {
      if (state.windows.length <= 1) return state;
      const deletedIndex = state.windows.findIndex((window) => window.id === id);
      if (deletedIndex < 0) return state;

      const windows = state.windows
        .filter((window) => window.id !== id)
        .map((window, index) => ({
          ...window,
          name: /^Fenêtre \d+$/.test(window.name)
            ? `Fenêtre ${index + 1}`
            : window.name,
        }));
      const fallbackWindow =
        windows[Math.min(deletedIndex, windows.length - 1)];
      const deletedContentIds = new Set(
        state.contents
          .filter((content) => content.windowId === id)
          .map((content) => content.id),
      );

      return remember(state, {
        windows,
        activeWindowId:
          state.activeWindowId === id
            ? fallbackWindow.id
            : state.activeWindowId,
        contents: state.contents.filter((content) => content.windowId !== id),
        groups: state.groups.filter((group) => group.windowId !== id),
        interactions: state.interactions
          .filter(
            (interaction) =>
              interaction.sourceWindowId !== id &&
              interaction.targetWindowId !== id,
          )
          .map((interaction) => ({
            ...interaction,
            contentIds: interaction.contentIds.filter(
              (contentId) => !deletedContentIds.has(contentId),
            ),
          }))
          .filter((interaction) => interaction.contentIds.length > 0),
        selectedContentIds: [],
      });
    }),
  renameWindow: (id, name) =>
    set((state) => {
      const normalizedName = name.trim();
      const window = state.windows.find((candidate) => candidate.id === id);
      if (!window || !normalizedName || window.name === normalizedName) {
        return state;
      }

      return remember(state, {
        windows: state.windows.map((candidate) =>
          candidate.id === id
            ? { ...candidate, name: normalizedName }
            : candidate,
        ),
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
  updateSelectedShapeStyle: (style) =>
    set((state) => {
      const selectedIds = new Set(state.selectedContentIds);
      if (selectedIds.size === 0) return state;

      return remember(state, {
        contents: state.contents.map((content) => {
          if (!selectedIds.has(content.id)) return content;

          if (content.type === 'rectangle' || content.type === 'circle') {
            return {
              ...content,
              ...(style.color !== undefined ? { color: style.color } : {}),
              ...(style.fillColor !== undefined
                ? { fillColor: style.fillColor }
                : {}),
              ...(style.strokeWidth !== undefined
                ? { strokeWidth: style.strokeWidth }
                : {}),
            };
          }

          if (content.type === 'pencil') {
            return {
              ...content,
              ...(style.color !== undefined ? { color: style.color } : {}),
              ...(style.strokeWidth !== undefined
                ? { strokeWidth: style.strokeWidth }
                : {}),
            };
          }

          return content;
        }),
      });
    }),
  reorderSelected: (action) =>
    set((state) => {
      if (state.selectedContentIds.length === 0) return state;
      const contents = reorderContents(
        state.contents,
        state.activeWindowId,
        state.selectedContentIds,
        action,
      );
      const changed = contents.some(
        (content, index) => content.id !== state.contents[index]?.id,
      );
      return changed ? remember(state, { contents }) : state;
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
