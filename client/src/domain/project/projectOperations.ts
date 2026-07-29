import type { CanvasContent, ContentGroup, PrototypeWindow } from '@maxcanva/shared';

export type LayerAction =
  | 'send-to-back'
  | 'send-backward'
  | 'bring-forward'
  | 'bring-to-front';

export function expandSelection(ids: string[], groups: ContentGroup[]) {
  const expandedIds = new Set(ids);

  groups.forEach((group) => {
    if (group.contentIds.some((id) => expandedIds.has(id))) {
      group.contentIds.forEach((id) => expandedIds.add(id));
    }
  });

  return [...expandedIds];
}

export function getNextWindowNumber(windows: PrototypeWindow[]) {
  const highestNumber = windows.reduce((highest, window) => {
    const match = /^Fenêtre (\d+)$/.exec(window.name);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return Math.max(highestNumber, windows.length) + 1;
}

export function reorderContents(
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
