import { useEffect, useMemo, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { InteractionDialog } from '../../interactions/components/InteractionDialog';

export function SelectionControls() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const selectedIds = useEditorStore((state) => state.selectedStrokeIds);
  const selectedCount = useEditorStore(
    (state) => state.selectedStrokeIds.length,
  );
  const interactions = useEditorStore((state) => state.interactions);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const clearSelection = useEditorStore((state) => state.clearSelection);
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
    <section className="selection-controls" aria-label="Options de sélection">
      <span className="selection-summary-icon" aria-hidden="true">↖</span>
      <span className="selection-summary">
        {selectedCount > 0
          ? `${selectedCount} ${selectedCount > 1 ? 'éléments sélectionnés' : 'élément sélectionné'}`
          : 'Cliquez ou encadrez des traits'}
      </span>
      <div className="control-divider" />
      <button
        className="link-selection-button"
        type="button"
        disabled={selectedCount === 0}
        onClick={() => setDialogOpen(true)}
      >
        <span aria-hidden="true">↗</span>
        {hasInteraction ? 'Modifier le lien' : 'Créer un lien'}
      </button>
      <button
        className="delete-selection-button"
        type="button"
        disabled={selectedCount === 0}
        onClick={deleteSelected}
      >
        <span aria-hidden="true">⌫</span>
        Effacer
      </button>
      <InteractionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </section>
  );
}
