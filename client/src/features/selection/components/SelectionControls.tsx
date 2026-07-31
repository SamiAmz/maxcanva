import { useEffect, useMemo, useState } from 'react';
import type { CanvasContent } from '@maxcanva/shared';
import { ShapeStyleControls } from '@/features/canvas/components/ShapeStyleControls';
import { useEditorStore } from '@/features/editor/store/useEditorStore';
import { InteractionDialog } from '@/features/interactions/components/InteractionDialog';

type StyledShape = Extract<
  CanvasContent,
  { type: 'pencil' | 'rectangle' | 'circle' }
>;

export function SelectionControls() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const selectedIds = useEditorStore((state) => state.selectedContentIds);
  const selectedCount = useEditorStore(
    (state) => state.selectedContentIds.length,
  );
  const groups = useEditorStore((state) => state.groups);
  const contents = useEditorStore((state) => state.contents);
  const activeWindowId = useEditorStore((state) => state.activeWindowId);
  const interactions = useEditorStore((state) => state.interactions);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const groupSelected = useEditorStore((state) => state.groupSelected);
  const ungroupSelected = useEditorStore((state) => state.ungroupSelected);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const updateSelectedShapeStyle = useEditorStore(
    (state) => state.updateSelectedShapeStyle,
  );
  const reorderSelected = useEditorStore((state) => state.reorderSelected);
  const activeContents = useMemo(
    () => contents.filter((content) => content.windowId === activeWindowId),
    [activeWindowId, contents],
  );
  const canSendBackward = useMemo(
    () =>
      activeContents.some(
        (content, index) =>
          selectedIds.includes(content.id) &&
          index > 0 &&
          !selectedIds.includes(activeContents[index - 1].id),
      ),
    [activeContents, selectedIds],
  );
  const canBringForward = useMemo(
    () =>
      activeContents.some(
        (content, index) =>
          selectedIds.includes(content.id) &&
          index < activeContents.length - 1 &&
          !selectedIds.includes(activeContents[index + 1].id),
      ),
    [activeContents, selectedIds],
  );
  const selectedShapes = useMemo(
    () =>
      contents.filter(
        (content): content is StyledShape =>
          selectedIds.includes(content.id) &&
          (content.type === 'pencil' ||
            content.type === 'rectangle' ||
            content.type === 'circle'),
      ),
    [contents, selectedIds],
  );
  const primaryShape = selectedShapes[0];
  const showFill =
    selectedShapes.length > 0 &&
    selectedShapes.every(
      (content) => content.type === 'rectangle' || content.type === 'circle',
    );
  const selectedGroup = useMemo(
    () =>
      groups.find(
        (group) =>
          group.contentIds.length === selectedIds.length &&
          group.contentIds.every((id) => selectedIds.includes(id)),
      ),
    [groups, selectedIds],
  );
  const selectedGroups = useMemo(
    () =>
      groups.filter((group) =>
        group.contentIds.every((id) => selectedIds.includes(id)),
      ),
    [groups, selectedIds],
  );
  const canGroup = selectedCount >= 2 && !selectedGroup;
  const canUngroup = selectedGroups.length > 0;
  const hasInteraction = useMemo(
    () =>
      interactions.some(
        (interaction) =>
          selectedIds.length > 0 &&
          selectedIds.every((id) => interaction.contentIds.includes(id)),
      ),
    [interactions, selectedIds],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Les raccourcis de l'éditeur ne doivent pas agir dans un formulaire.
      if (dialogOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, select, textarea, button, [contenteditable="true"]')) return;

      if (event.key === 'Escape') {
        clearSelection();
      }

      if (
        selectedCount > 0 &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        event.preventDefault();
        deleteSelected();
      }

      if (
        selectedCount > 0 &&
        (event.ctrlKey || event.metaKey) &&
        (event.key === '[' || event.key === ']')
      ) {
        event.preventDefault();
        if (event.key === '[') {
          reorderSelected(
            event.shiftKey ? 'send-to-back' : 'send-backward',
          );
        } else {
          reorderSelected(
            event.shiftKey ? 'bring-to-front' : 'bring-forward',
          );
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    clearSelection,
    deleteSelected,
    dialogOpen,
    reorderSelected,
    selectedCount,
  ]);

  return (
    <section
      className={`selection-controls ${selectedCount === 0 ? 'is-empty' : ''}`}
      aria-label="Options de sélection"
    >
      {primaryShape && (
        <>
          <ShapeStyleControls
            color={primaryShape.color}
            fillColor={
              primaryShape.type === 'rectangle' ||
              primaryShape.type === 'circle'
                ? primaryShape.fillColor
                : 'transparent'
            }
            strokeWidth={primaryShape.strokeWidth}
            showFill={showFill}
            onColorChange={(color) => updateSelectedShapeStyle({ color })}
            onFillColorChange={(fillColor) =>
              updateSelectedShapeStyle({ fillColor })
            }
            onStrokeWidthChange={(strokeWidth) =>
              updateSelectedShapeStyle({ strokeWidth })
            }
          />
          <div className="control-divider" />
        </>
      )}
      <span className="selection-summary-icon" aria-hidden="true">↖</span>
      <span className="selection-summary">
        {selectedCount > 0
          ? selectedGroup
            ? `Groupe · ${selectedCount} éléments`
            : selectedGroups.length > 0
              ? `${selectedCount} éléments · ${selectedGroups.length} ${selectedGroups.length > 1 ? 'groupes' : 'groupe'}`
            : `${selectedCount} ${selectedCount > 1 ? 'éléments sélectionnés' : 'élément sélectionné'}`
          : 'Cliquez ou encadrez des contenus'}
      </span>
      {selectedCount > 0 && (
        <>
          <div className="control-divider" />
          <div className="layering-control">
            <span className="layering-label">Calques</span>
            <div className="layering-actions" aria-label="Ordre des calques">
              <button
                type="button"
                disabled={!canSendBackward}
                aria-label="Envoyer complètement à l’arrière"
                title="Tout à l’arrière (Ctrl/Cmd + Maj + [)"
                onClick={() => reorderSelected('send-to-back')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 5h14M12 9v10M8 15l4 4 4-4" />
                </svg>
              </button>
              <button
                type="button"
                disabled={!canSendBackward}
                aria-label="Reculer d’un niveau"
                title="Reculer (Ctrl/Cmd + [)"
                onClick={() => reorderSelected('send-backward')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M8 15l4 4 4-4" />
                </svg>
              </button>
              <button
                type="button"
                disabled={!canBringForward}
                aria-label="Avancer d’un niveau"
                title="Avancer (Ctrl/Cmd + ])"
                onClick={() => reorderSelected('bring-forward')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 19V5M8 9l4-4 4 4" />
                </svg>
              </button>
              <button
                type="button"
                disabled={!canBringForward}
                aria-label="Mettre complètement à l’avant"
                title="Tout à l’avant (Ctrl/Cmd + Maj + ])"
                onClick={() => reorderSelected('bring-to-front')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 19h14M12 15V5M8 9l4-4 4 4" />
                </svg>
              </button>
            </div>
          </div>
          <div className="control-divider" />
          {(canGroup || canUngroup) && (
            <div className="grouping-actions" aria-label="Actions de groupe">
              {canGroup && (
                <button
                  className="grouping-selection-button"
                  type="button"
                  aria-label="Grouper la sélection"
                  title="Réunir la sélection en un groupe"
                  onClick={groupSelected}
                >
                  <span aria-hidden="true">⊞</span>
                  <span className="button-label">Grouper</span>
                </button>
              )}
              {canUngroup && (
                <button
                  className="grouping-selection-button"
                  type="button"
                  aria-label="Dégrouper la sélection"
                  title="Séparer les groupes sélectionnés"
                  onClick={ungroupSelected}
                >
                  <span aria-hidden="true">⊟</span>
                  <span className="button-label">Dégrouper</span>
                </button>
              )}
            </div>
          )}
          <div className="selection-end-actions">
            <button
              className="link-selection-button"
              type="button"
              title={hasInteraction ? 'Modifier le lien' : 'Créer un lien'}
              onClick={() => setDialogOpen(true)}
            >
              <span className="selection-action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </span>
              {hasInteraction ? 'Modifier le lien' : 'Créer un lien'}
            </button>
            <button
              className="delete-selection-button"
              type="button"
              title="Effacer la sélection"
              onClick={deleteSelected}
            >
              <span className="selection-action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M3.5 10l6.5-6.5h7l3.5 3.5v7L14 20.5H7L3.5 17z" />
                  <path d="M9 9l6 6M15 9l-6 6" />
                </svg>
              </span>
              Effacer
            </button>
          </div>
        </>
      )}
      <InteractionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </section>
  );
}
