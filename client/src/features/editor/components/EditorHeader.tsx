import { useEffect } from 'react';
import type { Tool } from '@maxcanva/shared';
import { useEditorStore } from '@/features/editor/store/useEditorStore';

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
  const projectTitle = useEditorStore((state) => state.projectTitle);
  const setProjectTitle = useEditorStore((state) => state.setProjectTitle);
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
      <div className="document-title">
        <input
          className="project-title-input"
          value={projectTitle}
          aria-label="Titre du projet"
          spellCheck={false}
          onChange={(event) => setProjectTitle(event.target.value)}
          onBlur={() => {
            if (!projectTitle.trim()) setProjectTitle('Sans titre');
          }}
        />
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
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 7 8 5-8 5V7Z" />
          </svg>
          <span className="simulation-button-label">Simuler</span>
        </button>
      </div>
    </header>
  );
}
