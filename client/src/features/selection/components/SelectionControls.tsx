import { useEffect, useMemo, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { InteractionDialog } from '../../interactions/components/InteractionDialog';

export function SelectionControls() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const selectedIds = useEditorStore((state) => state.selectedContentIds);
  const selectedCount = useEditorStore(
    (state) => state.selectedContentIds.length,
  );
  const groups = useEditorStore((state) => state.groups);
  const interactions = useEditorStore((state) => state.interactions);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const groupSelected = useEditorStore((state) => state.groupSelected);
  const ungroupSelected = useEditorStore((state) => state.ungroupSelected);
  const clearSelection = useEditorStore((state) => state.clearSelection);
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, deleteSelected, dialogOpen, selectedCount]);

  return (
    <section
      className={`selection-controls ${selectedCount === 0 ? 'is-empty' : ''}`}
      aria-label="Options de sélection"
    >
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
          <button
            className="link-selection-button"
            type="button"
            onClick={() => setDialogOpen(true)}
          >
            <span aria-hidden="true">↗</span>
            {hasInteraction ? 'Modifier le lien' : 'Créer un lien'}
          </button>
          <button
            className="delete-selection-button"
            type="button"
            onClick={deleteSelected}
          >
            <span aria-hidden="true">⌫</span>
            Effacer
          </button>
        </>
      )}
      <InteractionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </section>
  );
}
