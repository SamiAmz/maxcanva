import { useEditorStore } from '../store/useEditorStore';

export function EditorHeader() {
  const activeWindow = useEditorStore((state) =>
    state.windows.find((window) => window.id === state.activeWindowId),
  );
  const activeTool = useEditorStore((state) => state.activeTool);

  return (
    <header className="editor-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">M</span>
        <span>MaxCanva</span>
      </div>

      <div className="document-title">
        <span>Sans titre</span>
        <span className="title-separator">/</span>
        <strong>{activeWindow?.name ?? 'Fenêtre'}</strong>
      </div>

      <div className="tool-status" aria-label="Outil actuellement sélectionné">
        <span aria-hidden="true" />
        {activeTool === 'pencil' ? 'Crayon actif' : 'Sélection active'}
      </div>
    </header>
  );
}
