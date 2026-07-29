import { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { Tool } from '../types/drawing';

interface EditorHeaderProps {
  onStartSimulation: () => void;
}

const TOOL_LABELS = {
  pencil: 'Crayon actif',
  select: 'Sélection active',
  rectangle: 'Rectangle actif',
  circle: 'Cercle actif',
  text: 'Texte actif',
  checkbox: 'Case à cocher active',
  'text-input': 'Champ de texte actif',
} satisfies Record<Tool, string>;

export function EditorHeader({ onStartSimulation }: EditorHeaderProps) {
  const activeWindow = useEditorStore((state) =>
    state.windows.find((window) => window.id === state.activeWindowId),
  );
  const activeTool = useEditorStore((state) => state.activeTool);
  const canUndo = useEditorStore((state) => state.history.length > 0);
  const undo = useEditorStore((state) => state.undo);

  useEffect(() => {
    const undoOnShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches(
          'input, textarea, select, [contenteditable="true"]',
        )
      ) {
        return;
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'z'
      ) {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', undoOnShortcut);
    return () => window.removeEventListener('keydown', undoOnShortcut);
  }, [undo]);

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

      <div className="header-actions">
        <button
          className="undo-button"
          type="button"
          disabled={!canUndo}
          aria-label="Annuler la dernière action"
          title="Annuler (Ctrl/Cmd + Z)"
          onClick={undo}
        >
          <span className="undo-icon" aria-hidden="true" />
        </button>
        <div className="tool-status" aria-label="Outil actuellement sélectionné">
          <span aria-hidden="true" />
          {TOOL_LABELS[activeTool]}
        </div>
        <button
          className="start-simulation-button"
          type="button"
          onClick={onStartSimulation}
        >
          <span aria-hidden="true">▶</span>
          Simuler
        </button>
      </div>
    </header>
  );
}
