import { useEffect } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';

export function SelectionControls() {
  const selectedCount = useEditorStore(
    (state) => state.selectedStrokeIds.length,
  );
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, [contenteditable="true"]')) return;

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
  }, [clearSelection, deleteSelected, selectedCount]);

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
        className="delete-selection-button"
        type="button"
        disabled={selectedCount === 0}
        onClick={deleteSelected}
      >
        <span aria-hidden="true">⌫</span>
        Effacer
      </button>
    </section>
  );
}
