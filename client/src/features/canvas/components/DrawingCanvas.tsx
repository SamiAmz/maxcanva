import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Layer, Line, Rect, Stage } from 'react-konva';
import { useEditorStore } from '../../../store/useEditorStore';
import { usePencilDrawing } from '../hooks/usePencilDrawing';
import { InteractionOverlay } from '../../interactions/components/InteractionOverlay';

const PAGE_WIDTH = 960;
const PAGE_HEIGHT = 640;
const PAGE_PADDING = 48;

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
}

// Surface principale: elle distribue les gestes au crayon ou à la sélection.
export function DrawingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const activeTool = useEditorStore((state) => state.activeTool);
  const activeWindowId = useEditorStore((state) => state.activeWindowId);
  const allStrokes = useEditorStore((state) => state.strokes);
  const windows = useEditorStore((state) => state.windows);
  const interactions = useEditorStore((state) => state.interactions);
  const selectedStrokeIds = useEditorStore((state) => state.selectedStrokeIds);
  const selectStroke = useEditorStore((state) => state.selectStroke);
  const setSelection = useEditorStore((state) => state.setSelection);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const moveStrokes = useEditorStore((state) => state.moveStrokes);
  const strokes = useMemo(
    () =>
      allStrokes.filter((stroke) => stroke.windowId === activeWindowId),
    [activeWindowId, allStrokes],
  );
  const { startDrawing, continueDrawing, stopDrawing } = usePencilDrawing(scale);

  const getPoint = (event: KonvaEventObject<PointerEvent>) => {
    const position = event.target.getStage()?.getPointerPosition();
    if (!position) return null;
    // L'affichage peut être réduit, mais les données restent en 960x640.
    return { x: position.x / scale, y: position.y / scale };
  };

  const hasModifier = (event: KonvaEventObject<PointerEvent>) =>
    event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey;

  const handlePointerDown = (event: KonvaEventObject<PointerEvent>) => {
    // Le même Stage Konva sert aux deux modes d'interaction.
    if (activeTool === 'pencil') {
      startDrawing(event);
      return;
    }

    if (event.target.name() !== 'canvas-background') return;

    event.evt.preventDefault();
    const point = getPoint(event);
    if (!point) return;

    const additive = hasModifier(event);
    if (!additive) clearSelection();
    setSelectionBox({
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
      additive,
    });
  };

  const handlePointerMove = (event: KonvaEventObject<PointerEvent>) => {
    if (activeTool === 'pencil') {
      continueDrawing(event);
      return;
    }

    if (!selectionBox) return;
    event.evt.preventDefault();
    const point = getPoint(event);
    if (!point) return;
    setSelectionBox((box) =>
      box ? { ...box, currentX: point.x, currentY: point.y } : null,
    );
  };

  const finishInteraction = () => {
    if (activeTool === 'pencil') {
      stopDrawing();
      return;
    }

    if (!selectionBox) return;

    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const right = Math.max(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const bottom = Math.max(selectionBox.startY, selectionBox.currentY);

    // Un petit clic désélectionne; un vrai rectangle cherche les traits croisés.
    if (right - left > 3 || bottom - top > 3) {
      const ids = strokes
        .filter((stroke) => {
          const xs = stroke.points.filter((_, index) => index % 2 === 0);
          const ys = stroke.points.filter((_, index) => index % 2 === 1);
          const padding = stroke.width / 2;
          const strokeLeft = Math.min(...xs) - padding;
          const strokeRight = Math.max(...xs) + padding;
          const strokeTop = Math.min(...ys) - padding;
          const strokeBottom = Math.max(...ys) + padding;

          return !(
            strokeRight < left ||
            strokeLeft > right ||
            strokeBottom < top ||
            strokeTop > bottom
          );
        })
        .map((stroke) => stroke.id);

      setSelection(ids, selectionBox.additive);
    }

    setSelectionBox(null);
  };

  const handleStrokePointerDown = (
    event: KonvaEventObject<PointerEvent>,
    strokeId: string,
  ) => {
    if (activeTool !== 'select') return;
    event.cancelBubble = true;
    selectStroke(strokeId, hasModifier(event));
  };

  const saveMovedStrokes = (
    event: KonvaEventObject<DragEvent>,
    strokeId: string,
  ) => {
    const x = event.target.x();
    const y = event.target.y();
    if (x === 0 && y === 0) return;

    // Konva déplace visuellement le nœud; au relâchement on reporte ce delta
    // dans les points du store, puis on remet le nœud à l'origine.
    const currentSelection = useEditorStore.getState().selectedStrokeIds;
    event.target.position({ x: 0, y: 0 });
    moveStrokes(
      currentSelection.includes(strokeId) ? currentSelection : [strokeId],
      x,
      y,
    );
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const availableWidth = container.clientWidth - PAGE_PADDING * 2;
      const availableHeight = container.clientHeight - PAGE_PADDING * 2;
      setScale(
        Math.min(1, availableWidth / PAGE_WIDTH, availableHeight / PAGE_HEIGHT),
      );
    };

    // La page conserve son ratio et se réduit automatiquement avec l'espace.
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    updateScale();

    return () => observer.disconnect();
  }, []);

  return (
    <main
      className={`canvas-workspace ${activeTool === 'select' ? 'is-selecting' : ''}`}
      ref={containerRef}
    >
      <div
        className="drawing-page"
        style={{
          width: PAGE_WIDTH * scale,
          height: PAGE_HEIGHT * scale,
        }}
      >
        {strokes.length === 0 && (
          <div className="canvas-hint" aria-hidden="true">
            <span className="canvas-hint-icon">✎</span>
            <span>Dessinez quelque chose</span>
          </div>
        )}

        <Stage
          key={activeWindowId}
          width={PAGE_WIDTH * scale}
          height={PAGE_HEIGHT * scale}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishInteraction}
          onPointerLeave={finishInteraction}
        >
          <Layer scaleX={scale} scaleY={scale}>
            <Rect
              width={PAGE_WIDTH}
              height={PAGE_HEIGHT}
              fill="#ffffff"
              name="canvas-background"
              listening
            />
            {strokes.map((stroke) => {
              const isSelected = selectedStrokeIds.includes(stroke.id);

              return (
                <Fragment key={stroke.id}>
                  {isSelected && (
                    <Line
                      points={stroke.points}
                      stroke="#5b5bd6"
                      strokeWidth={stroke.width + 10}
                      opacity={0.2}
                      lineCap="round"
                      lineJoin="round"
                      tension={0.35}
                      listening={false}
                    />
                  )}
                  <Line
                    points={stroke.points}
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    opacity={stroke.opacity}
                    lineCap="round"
                    lineJoin="round"
                    tension={0.35}
                    listening={activeTool === 'select'}
                    // Une zone de clic plus large facilite la sélection des traits fins.
                    hitStrokeWidth={Math.max(18, stroke.width + 8)}
                    draggable={activeTool === 'select'}
                    onPointerDown={(event) =>
                      handleStrokePointerDown(event, stroke.id)
                    }
                    onDragEnd={(event) => saveMovedStrokes(event, stroke.id)}
                  />
                </Fragment>
              );
            })}
            {/* Les destinations sont visibles uniquement pendant l'édition. */}
            {activeTool === 'select' &&
              interactions
                .filter(
                  (interaction) =>
                    interaction.sourceWindowId === activeWindowId,
                )
                .map((interaction) => (
                  <InteractionOverlay
                    key={interaction.id}
                    interaction={interaction}
                    strokes={strokes}
                    targetLabel={
                      interaction.type === 'button'
                        ? windows.find(
                            (window) =>
                              window.id === interaction.targetWindowId,
                          )?.name ?? 'Fenêtre'
                        : (() => {
                            try {
                              return new URL(interaction.url ?? '').hostname;
                            } catch {
                              return 'Site web';
                            }
                          })()
                    }
                    scale={scale}
                  />
                ))}
            {selectionBox && (
              <Rect
                x={Math.min(selectionBox.startX, selectionBox.currentX)}
                y={Math.min(selectionBox.startY, selectionBox.currentY)}
                width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                fill="rgba(91, 91, 214, 0.10)"
                stroke="#5b5bd6"
                strokeWidth={1.5 / scale}
                dash={[7 / scale, 5 / scale]}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </main>
  );
}
