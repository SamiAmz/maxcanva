import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Layer, Rect, Stage } from 'react-konva';
import type {
  CanvasContent,
  PrototypeInteraction,
} from '@maxcanva/shared';
import { PROTOTYPE_PAGE_HEIGHT, PROTOTYPE_PAGE_WIDTH } from '@maxcanva/shared';
import { getCombinedBounds } from '@/domain/project/contentGeometry';
import { CanvasContentShape } from '@/features/canvas/components/CanvasContentShape';
import { useEditorStore } from '@/features/editor/store/useEditorStore';

const PAGE_WIDTH = PROTOTYPE_PAGE_WIDTH;
const PAGE_HEIGHT = PROTOTYPE_PAGE_HEIGHT;
const PAGE_PADDING = 56;

interface SimulationViewProps {
  open: boolean;
  onClose: () => void;
}

function getInteractionBounds(
  interaction: PrototypeInteraction,
  contents: CanvasContent[],
) {
  // La zone cliquable est la boîte qui englobe tous les contenus liés.
  const linkedContents = contents.filter((content) =>
    interaction.contentIds.includes(content.id),
  );
  const bounds = getCombinedBounds(linkedContents);
  if (!bounds) return null;
  const padding = 12;

  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function SimulationView({ open, onClose }: SimulationViewProps) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const windows = useEditorStore((state) => state.windows);
  const allContents = useEditorStore((state) => state.contents);
  const allInteractions = useEditorStore((state) => state.interactions);

  const [currentWindowId, setCurrentWindowId] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [hoveredInteractionId, setHoveredInteractionId] = useState<string | null>(
    null,
  );
  const [scale, setScale] = useState(1);

  const currentWindow = windows.find((window) => window.id === currentWindowId);
  const contents = useMemo(
    () =>
      allContents.filter((content) => content.windowId === currentWindowId),
    [allContents, currentWindowId],
  );
  const interactions = useMemo(
    () =>
      allInteractions.filter(
        (interaction) => interaction.sourceWindowId === currentWindowId,
      ),
    [allInteractions, currentWindowId],
  );
  const canvasContents = useMemo(
    () =>
      contents.filter(
        (content) =>
          content.type !== 'checkbox' && content.type !== 'text-input',
      ),
    [contents],
  );
  const widgetContents = useMemo(
    () =>
      contents.filter(
        (content) =>
          content.type === 'checkbox' || content.type === 'text-input',
      ),
    [contents],
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
        Math.min(1.1, availableWidth / PAGE_WIDTH, availableHeight / PAGE_HEIGHT),
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
            aria-label="Revenir à la fenêtre précédente"
            title="Retour"
            disabled={history.length === 0}
            onClick={goBack}
          >
            ← Retour
          </button>
          <button
            className="close-simulation-button"
            type="button"
            aria-label="Quitter la simulation"
            title="Quitter la simulation"
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
          {contents.length === 0 && (
            <div className="simulation-empty-state">Cette fenêtre est vide</div>
          )}
          <Stage width={PAGE_WIDTH * scale} height={PAGE_HEIGHT * scale}>
            <Layer scaleX={scale} scaleY={scale}>
              <Rect width={PAGE_WIDTH} height={PAGE_HEIGHT} fill="#ffffff" />
              {canvasContents.map((content) => (
                <CanvasContentShape key={content.id} content={content} />
              ))}
              {interactions.map((interaction) => {
                const bounds = getInteractionBounds(interaction, contents);
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
          {widgetContents.map((content) =>
            content.type === 'checkbox' ? (
              <label
                key={content.id}
                className="simulation-checkbox-widget"
                style={{
                  left: content.x * scale,
                  top: content.y * scale,
                  width: content.width * scale,
                  height: content.height * scale,
                  gap: 9 * scale,
                  fontSize: Math.max(10, 16 * scale),
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked={content.checked}
                  style={{
                    width: Math.max(14, 20 * scale),
                    height: Math.max(14, 20 * scale),
                  }}
                />
                {content.label && <span>{content.label}</span>}
              </label>
            ) : (
              <input
                key={content.id}
                className="simulation-text-input-widget"
                type="text"
                placeholder={content.placeholder}
                aria-label={content.placeholder}
                style={{
                  left: content.x * scale,
                  top: content.y * scale,
                  width: content.width * scale,
                  height: content.height * scale,
                  paddingInline: Math.max(8, 13 * scale),
                  borderRadius: Math.max(5, 8 * scale),
                  fontSize: Math.max(11, 15 * scale),
                }}
              />
            ),
          )}
        </div>
      </main>
    </div>,
    document.body,
  );
}
