import { useEditorStore } from '../store/useEditorStore';

export function ToolRail() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  return (
    <aside className="tool-rail" aria-label="Outils de dessin">
      <button
        className={`tool-button ${activeTool === 'pencil' ? 'is-active' : ''}`}
        type="button"
        aria-label="Outil crayon"
        aria-pressed={activeTool === 'pencil'}
        title="Crayon"
        onClick={() => setActiveTool('pencil')}
      >
        <span className="tool-icon" aria-hidden="true">✎</span>
        <span className="tool-name">Crayon</span>
      </button>
      <button
        className={`tool-button ${activeTool === 'select' ? 'is-active' : ''}`}
        type="button"
        aria-label="Outil de sélection"
        aria-pressed={activeTool === 'select'}
        title="Sélection"
        onClick={() => setActiveTool('select')}
      >
        <span className="tool-icon selection-icon" aria-hidden="true">↖</span>
        <span className="tool-name">Sélection</span>
      </button>
    </aside>
  );
}
