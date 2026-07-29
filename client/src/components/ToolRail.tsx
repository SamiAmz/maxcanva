import { Fragment, type ReactNode, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { Tool } from '../types/drawing';

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  focusable: false,
};

const TOOLS: Array<{ id: Tool; icon: ReactNode; label: string; shortcut: number }> = [
  {
    id: 'select',
    label: 'Sélection',
    shortcut: 1,
    icon: (
      <svg {...iconProps}>
        <path d="m5 4 12 8-5.2 1.2L9 18.5 5 4Z" />
      </svg>
    ),
  },
  {
    id: 'pencil',
    label: 'Crayon',
    shortcut: 2,
    icon: (
      <svg {...iconProps}>
        <path d="m4 20 3.8-.8L19 8a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z" />
        <path d="m14.5 6.5 3 3" />
      </svg>
    ),
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    shortcut: 3,
    icon: <svg {...iconProps}><rect x="5" y="5" width="14" height="14" rx="1.5" /></svg>,
  },
  {
    id: 'circle',
    label: 'Cercle',
    shortcut: 4,
    icon: <svg {...iconProps}><circle cx="12" cy="12" r="7" /></svg>,
  },
  {
    id: 'text',
    label: 'Texte',
    shortcut: 5,
    icon: <svg {...iconProps}><path d="M7 5h10M12 5v14M9 19h6" /></svg>,
  },
  {
    id: 'checkbox',
    label: 'Case',
    shortcut: 6,
    icon: (
      <svg {...iconProps}>
        <rect x="5" y="5" width="14" height="14" rx="2" />
        <path d="m8.5 12 2.3 2.4 4.8-5.2" />
      </svg>
    ),
  },
  {
    id: 'text-input',
    label: 'Champ',
    shortcut: 7,
    icon: (
      <svg {...iconProps}>
        <rect x="3.5" y="7" width="17" height="10" rx="2" />
        <path d="M7 12h6" />
      </svg>
    ),
  },
];

export function ToolRail() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  useEffect(() => {
    const selectToolFromKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target?.matches('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }

      const tool = TOOLS.find(
        (candidate) => candidate.shortcut === Number(event.key),
      );
      if (!tool) return;
      event.preventDefault();
      setActiveTool(tool.id);
    };

    window.addEventListener('keydown', selectToolFromKeyboard);
    return () => window.removeEventListener('keydown', selectToolFromKeyboard);
  }, [setActiveTool]);

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
            <span className="tool-shortcut" aria-hidden="true">
              {tool.shortcut}
            </span>
            <span className="tool-name">{tool.label}</span>
          </button>
        </Fragment>
      ))}
    </aside>
  );
}
