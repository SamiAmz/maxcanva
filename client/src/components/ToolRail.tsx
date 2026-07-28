import { Fragment } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { Tool } from '../types/drawing';

const TOOLS: Array<{ id: Tool; icon: string; label: string }> = [
  { id: 'select', icon: '↖', label: 'Sélection' },
  { id: 'pencil', icon: '✎', label: 'Crayon' },
  { id: 'rectangle', icon: '□', label: 'Rectangle' },
  { id: 'circle', icon: '○', label: 'Cercle' },
  { id: 'text', icon: 'T', label: 'Texte' },
  { id: 'checkbox', icon: '☑', label: 'Case' },
  { id: 'text-input', icon: '▭', label: 'Champ' },
];

export function ToolRail() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  return (
    <aside className="tool-rail" aria-label="Outils de création">
      {TOOLS.map((tool) => (
        <Fragment key={tool.id}>
          {tool.id === 'checkbox' && (
            <span className="tool-rail-divider" role="separator" />
          )}
          <button
            className={`tool-button ${activeTool === tool.id ? 'is-active' : ''}`}
            type="button"
            aria-label={`Outil ${tool.label.toLowerCase()}`}
            aria-pressed={activeTool === tool.id}
            title={tool.label}
            onClick={() => setActiveTool(tool.id)}
          >
            <span
              className={`tool-icon tool-${tool.id}-icon`}
              aria-hidden="true"
            >
              {tool.icon}
            </span>
            <span className="tool-name">{tool.label}</span>
          </button>
        </Fragment>
      ))}
    </aside>
  );
}
