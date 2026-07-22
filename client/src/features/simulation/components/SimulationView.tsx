import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Layer, Line, Rect, Stage } from 'react-konva';
import { useEditorStore } from '../../../store/useEditorStore';
import type { PrototypeInteraction, Stroke } from '../../../types/drawing';

const PAGE_WIDTH = 960;
const PAGE_HEIGHT = 640;
const PAGE_PADDING = 56;

interface SimulationViewProps {
  open: boolean;
  onClose: () => void;
}

function getInteractionBounds(
  interaction: PrototypeInteraction,
  strokes: Stroke[],
) {
  // La zone cliquable est la boîte qui englobe tous les traits liés.
  const linkedStrokes = strokes.filter((stroke) =>
    interaction.contentIds.includes(stroke.id),
  );
  if (linkedStrokes.length === 0) return null;

  const xs = linkedStrokes.flatMap((stroke) =>
    stroke.points.filter((_, index) => index % 2 === 0),
  );
  const ys = linkedStrokes.flatMap((stroke) =>
    stroke.points.filter((_, index) => index % 2 === 1),
  );
  const padding = 12;

  return {
    x: Math.min(...xs) - padding,
    y: Math.min(...ys) - padding,
    width: Math.max(...xs) - Math.min(...xs) + padding * 2,
    height: Math.max(...ys) - Math.min(...ys) + padding * 2,
  };
}

export function SimulationView({ open, onClose }: SimulationViewProps) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const windows = useEditorStore((state) => state.windows);
  const allStrokes = useEditorStore((state) => state.strokes);
  const allInteractions = useEditorStore((state) => state.interactions);

  const [currentWindowId, setCurrentWindowId] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [hoveredInteractionId, setHoveredInteractionId] = useState<string | null>(
    null,
  );
  const [scale, setScale] = useState(1);

  const currentWindow = windows.find((window) => window.id === currentWindowId);
  const strokes = useMemo(
    () => allStrokes.filter((stroke) => stroke.windowId === currentWindowId),
    [allStrokes, currentWindowId],
  );
  const interactions = useMemo(
    () =>
      allInteractions.filter(
        (interaction) => interaction.sourceWindowId === currentWindowId,
      ),
    [allInteractions, currentWindowId],
  );

  useEffect(() => {
    if (!open) return;

    // Une nouvelle simulation repart toujours de la première fenêtre.
    setCurrentWindowId(windows[0]?.id ?? '');
    setHistory([]);
    setHoveredInteractionId(null);

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open, windows]);

  useEffect(() => {
    if (!open) return;
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const updateScale = () => {
      const availableWidth = workspace.clientWidth - PAGE_PADDING * 2;
      const availableHeight = workspace.clientHeight - PAGE_PADDING * 2;
      setScale(
        Math.min(1, availableWidth / PAGE_WIDTH, availableHeight / PAGE_HEIGHT),
      );
    };

    // Même logique responsive que l'éditeur, sans modifier les données.
    const observer = new ResizeObserver(updateScale);
    observer.observe(workspace);
    updateScale();
    return () => observer.disconnect();
  }, [open]);

  if (!open) return null;

  const navigateTo = (targetWindowId: string) => {
    if (!windows.some((window) => window.id === targetWindowId)) return;
    setHistory((previous) => [...previous, currentWindowId]);
    setCurrentWindowId(targetWindowId);
    setHoveredInteractionId(null);
  };

  const activateInteraction = (interaction: PrototypeInteraction) => {
    // Les boutons naviguent dans le prototype; les liens ouvrent le Web.
    if (interaction.type === 'button' && interaction.targetWindowId) {
      navigateTo(interaction.targetWindowId);
      return;
    }

    if (interaction.type === 'link' && interaction.url) {
      window.open(interaction.url, '_blank', 'noopener,noreferrer');
    }
  };

  const goBack = () => {
    const previousWindowId = history.at(-1);
    if (!previousWindowId) return;
    setHistory((previous) => previous.slice(0, -1));
    setCurrentWindowId(previousWindowId);
    setHoveredInteractionId(null);
  };

  const setPointerCursor = (cursor: 'default' | 'pointer') => {
    const container = workspaceRef.current?.querySelector(
      '.konvajs-content',
    ) as HTMLElement | null;
    if (container) container.style.cursor = cursor;
  };

  // La simulation couvre tout l'éditeur sans dépendre de sa grille CSS.
  return createPortal(
    <div className="simulation-overlay" role="dialog" aria-modal="true">
      <header className="simulation-header">
        <div className="simulation-title">
          <span className="simulation-live-dot" aria-hidden="true" />
          <div>
            <strong>Simulation</strong>
            <small>{currentWindow?.name ?? 'Prototype'}</small>
          </div>
        </div>

        <div className="simulation-actions">
          <button
            className="simulation-back-button"
            type="button"
            disabled={history.length === 0}
            onClick={goBack}
          >
            ← Retour
          </button>
          <button
            className="close-simulation-button"
            type="button"
            onClick={onClose}
          >
            Quitter la simulation
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </header>

      <main className="simulation-workspace" ref={workspaceRef}>
        <div
          className="simulation-page"
          style={{ width: PAGE_WIDTH * scale, height: PAGE_HEIGHT * scale }}
        >
          {strokes.length === 0 && (
            <div className="simulation-empty-state">Cette fenêtre est vide</div>
          )}
          <Stage width={PAGE_WIDTH * scale} height={PAGE_HEIGHT * scale}>
            <Layer scaleX={scale} scaleY={scale}>
              <Rect width={PAGE_WIDTH} height={PAGE_HEIGHT} fill="#ffffff" />
              {strokes.map((stroke) => (
                <Line
                  key={stroke.id}
                  points={stroke.points}
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  opacity={stroke.opacity}
                  lineCap="round"
                  lineJoin="round"
                  tension={0.35}
                  listening={false}
                />
              ))}
              {interactions.map((interaction) => {
                const bounds = getInteractionBounds(interaction, strokes);
                if (!bounds) return null;
                const isHovered = interaction.id === hoveredInteractionId;

                return (
                  <Rect
                    key={interaction.id}
                    {...bounds}
                    fill={
                      isHovered
                        ? 'rgba(37, 99, 235, 0.14)'
                        : 'rgba(255, 255, 255, 0.001)'
                    }
                    stroke={isHovered ? '#2563eb' : 'transparent'}
                    strokeWidth={2 / scale}
                    cornerRadius={8}
                    onMouseEnter={() => {
                      setHoveredInteractionId(interaction.id);
                      setPointerCursor('pointer');
                    }}
                    onMouseLeave={() => {
                      setHoveredInteractionId(null);
                      setPointerCursor('default');
                    }}
                    onClick={() => activateInteraction(interaction)}
                    onTap={() => activateInteraction(interaction)}
                  />
                );
              })}
            </Layer>
          </Stage>
        </div>
      </main>
    </div>,
    document.body,
  );
}
