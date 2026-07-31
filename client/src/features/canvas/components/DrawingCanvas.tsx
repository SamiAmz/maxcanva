import { useEffect, useMemo, useRef, useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape as KonvaShape } from 'konva/lib/Shape';
import type { Transformer as KonvaTransformer } from 'konva/lib/shapes/Transformer';
import { Circle, Layer, Line, Rect, Stage, Transformer } from 'react-konva';
import { PROTOTYPE_PAGE_HEIGHT, PROTOTYPE_PAGE_WIDTH } from '@maxcanva/shared';
import { useEditorStore } from '@/features/editor/store/useEditorStore';
import { usePencilDrawing } from '../hooks/usePencilDrawing';
import { InteractionOverlay } from '@/features/interactions/components/InteractionOverlay';
import { CanvasContentShape } from './CanvasContentShape';
import {
  getCombinedBounds,
  getContentBounds,
} from '@/domain/project/contentGeometry';
import {
  getAlignmentSnap,
  type AlignmentGuide,
} from '../utils/alignmentGuides';

const LANDSCAPE_PAGE_WIDTH = PROTOTYPE_PAGE_WIDTH;
const LANDSCAPE_PAGE_HEIGHT = PROTOTYPE_PAGE_HEIGHT;
const PORTRAIT_PAGE_WIDTH = PROTOTYPE_PAGE_HEIGHT;
const PORTRAIT_PAGE_HEIGHT = PROTOTYPE_PAGE_WIDTH;
const MAX_DISPLAY_SCALE = 1.2;

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
}

interface ShapeDraft {
  type: 'rectangle' | 'circle';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface TextEditor {
  x: number;
  y: number;
  value: string;
}

interface CheckboxLabelEditor extends TextEditor {
  contentId: string;
  initialValue: string;
}

interface DragTransaction {
  ownerId: string;
  contentIds: string[];
  positions: Map<string, { x: number; y: number }>;
  pointerStart: { x: number; y: number };
  lastDelta: { x: number; y: number };
}

// Surface principale: elle distribue les gestes à l'outil actuellement actif.
export function DrawingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentNodesRef = useRef(new Map<string, KonvaShape>());
  const dragTransactionRef = useRef<DragTransaction | null>(null);
  const dragPointerStartRef = useRef<{
    contentId: string;
    x: number;
    y: number;
  } | null>(null);
  const resizePositionsRef = useRef(
    new Map<string, { x: number; y: number }>(),
  );
  const transformerRef = useRef<KonvaTransformer>(null);
  const previousHistoryLengthRef = useRef(0);
  const [scale, setScale] = useState(1);
  const [portraitViewport, setPortraitViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches,
  );
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [shapeDraft, setShapeDraft] = useState<ShapeDraft | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditor | null>(null);
  const [checkboxLabelEditor, setCheckboxLabelEditor] =
    useState<CheckboxLabelEditor | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  const activeTool = useEditorStore((state) => state.activeTool);
  const activeWindowId = useEditorStore((state) => state.activeWindowId);
  const allContents = useEditorStore((state) => state.contents);
  const windows = useEditorStore((state) => state.windows);
  const interactions = useEditorStore((state) => state.interactions);
  const historyLength = useEditorStore((state) => state.history.length);
  const selectedContentIds = useEditorStore(
    (state) => state.selectedContentIds,
  );
  const drawingColor = useEditorStore((state) => state.drawingColor);
  const drawingFillColor = useEditorStore((state) => state.drawingFillColor);
  const drawingWidth = useEditorStore((state) => state.drawingWidth);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const selectContent = useEditorStore((state) => state.selectContent);
  const setSelection = useEditorStore((state) => state.setSelection);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const moveContents = useEditorStore((state) => state.moveContents);
  const transformContents = useEditorStore((state) => state.transformContents);
  const addContent = useEditorStore((state) => state.addContent);
  const updateCheckboxLabel = useEditorStore(
    (state) => state.updateCheckboxLabel,
  );

  const contents = useMemo(
    () =>
      allContents.filter((content) => content.windowId === activeWindowId),
    [activeWindowId, allContents],
  );
  const { startDrawing, continueDrawing, stopDrawing } = usePencilDrawing(scale);
  const selectedContents = useMemo(
    () =>
      contents.filter((content) => selectedContentIds.includes(content.id)),
    [contents, selectedContentIds],
  );
  const keepResizeRatio = selectedContents.some(
    (content) => content.type === 'text',
  );
  const pageWidth = portraitViewport
    ? PORTRAIT_PAGE_WIDTH
    : LANDSCAPE_PAGE_WIDTH;
  const pageHeight = portraitViewport
    ? PORTRAIT_PAGE_HEIGHT
    : LANDSCAPE_PAGE_HEIGHT;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)');
    const updateOrientation = () => setPortraitViewport(media.matches);
    media.addEventListener('change', updateOrientation);
    updateOrientation();
    return () => media.removeEventListener('change', updateOrientation);
  }, []);

  const getPoint = (event: KonvaEventObject<PointerEvent>) => {
    const position = event.target.getStage()?.getPointerPosition();
    if (!position) return null;
    // L'affichage est responsive, mais les données restent en coordonnées logiques.
    return { x: position.x / scale, y: position.y / scale };
  };

  const hasModifier = (event: KonvaEventObject<PointerEvent>) =>
    event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey;

  const handlePointerDown = (event: KonvaEventObject<PointerEvent>) => {
    if (activeTool === 'pencil') {
      startDrawing(event);
      return;
    }

    if (event.target.name() !== 'canvas-background') return;

    event.evt.preventDefault();
    const point = getPoint(event);
    if (!point) return;

    if (activeTool === 'rectangle' || activeTool === 'circle') {
      setShapeDraft({
        type: activeTool,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
      });
      return;
    }

    if (activeTool === 'text') {
      setTextEditor({ x: point.x, y: point.y, value: '' });
      return;
    }

    if (activeTool === 'checkbox' || activeTool === 'text-input') {
      const id = crypto.randomUUID();
      const isCheckbox = activeTool === 'checkbox';
      const width = isCheckbox ? 28 : 240;
      const height = isCheckbox ? 28 : 44;
      const x = Math.min(point.x, pageWidth - width);
      const y = Math.min(point.y, pageHeight - height);

      addContent(
        isCheckbox
          ? {
              id,
              windowId: activeWindowId,
              type: 'checkbox',
              x,
              y,
              width,
              height,
              label: '',
              checked: false,
              color: '#374151',
              opacity: 1,
            }
          : {
              id,
              windowId: activeWindowId,
              type: 'text-input',
              x,
              y,
              width,
              height,
              placeholder: 'Saisir du texte',
              color: '#374151',
              opacity: 1,
            },
      );
      setSelection([id]);
      if (isCheckbox) {
        setCheckboxLabelEditor({
          contentId: id,
          x: Math.min(x + width + 8, pageWidth - 300),
          y,
          value: '',
          initialValue: '',
        });
      } else {
        setActiveTool('select');
      }
      return;
    }

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

    const point = getPoint(event);
    if (!point) return;

    if (shapeDraft) {
      event.evt.preventDefault();
      setShapeDraft((draft) =>
        draft
          ? { ...draft, currentX: point.x, currentY: point.y }
          : null,
      );
      return;
    }

    if (!selectionBox) return;
    event.evt.preventDefault();
    setSelectionBox((box) =>
      box ? { ...box, currentX: point.x, currentY: point.y } : null,
    );
  };

  const finishShape = () => {
    if (!shapeDraft) return false;

    const deltaX = shapeDraft.currentX - shapeDraft.startX;
    const deltaY = shapeDraft.currentY - shapeDraft.startY;

    if (shapeDraft.type === 'rectangle') {
      const width = Math.abs(deltaX);
      const height = Math.abs(deltaY);
      if (width > 4 && height > 4) {
        addContent({
          id: crypto.randomUUID(),
          windowId: activeWindowId,
          type: 'rectangle',
          x: Math.min(shapeDraft.startX, shapeDraft.currentX),
          y: Math.min(shapeDraft.startY, shapeDraft.currentY),
          width,
          height,
          color: drawingColor,
          fillColor: drawingFillColor,
          strokeWidth: drawingWidth,
          opacity: 1,
        });
      }
    } else {
      const radius = Math.hypot(deltaX, deltaY);
      if (radius > 4) {
        addContent({
          id: crypto.randomUUID(),
          windowId: activeWindowId,
          type: 'circle',
          x: shapeDraft.startX,
          y: shapeDraft.startY,
          radiusX: radius,
          radiusY: radius,
          color: drawingColor,
          fillColor: drawingFillColor,
          strokeWidth: drawingWidth,
          opacity: 1,
        });
      }
    }

    setShapeDraft(null);
    return true;
  };

  const finishInteraction = () => {
    if (activeTool === 'pencil') {
      stopDrawing();
      return;
    }

    if (finishShape() || !selectionBox) return;

    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const right = Math.max(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const bottom = Math.max(selectionBox.startY, selectionBox.currentY);

    // Un petit clic désélectionne; un vrai rectangle cherche les contenus croisés.
    if (right - left > 3 || bottom - top > 3) {
      const ids = contents
        .filter((content) => {
          const bounds = getContentBounds(content);
          return !(
            bounds.x + bounds.width < left ||
            bounds.x > right ||
            bounds.y + bounds.height < top ||
            bounds.y > bottom
          );
        })
        .map((content) => content.id);

      setSelection(ids, selectionBox.additive);
    }

    setSelectionBox(null);
  };

  const handleContentPointerDown = (
    event: KonvaEventObject<PointerEvent>,
    contentId: string,
  ) => {
    if (activeTool !== 'select') return;
    event.cancelBubble = true;
    const pointer = event.target.getStage()?.getPointerPosition();
    dragPointerStartRef.current = pointer
      ? { contentId, x: pointer.x / scale, y: pointer.y / scale }
      : null;
    selectContent(contentId, hasModifier(event));
  };

  const saveMovedContents = (
    _event: KonvaEventObject<DragEvent>,
    contentId: string,
  ) => {
    const transaction = dragTransactionRef.current;
    // Konva déclenche aussi dragend sur les autres nœuds d'une sélection
    // multiple. Seul le nœud saisi par l'utilisateur doit enregistrer le geste.
    if (!transaction || transaction.ownerId !== contentId) return;

    if (!transaction.positions.has(contentId)) {
      dragTransactionRef.current = null;
      setAlignmentGuides([]);
      return;
    }

    const { x: deltaX, y: deltaY } = transaction.lastDelta;

    transaction.positions.forEach((position, id) => {
      contentNodesRef.current.get(id)?.position(position);
    });
    dragTransactionRef.current = null;
    dragPointerStartRef.current = null;
    setAlignmentGuides([]);

    if (Number.isFinite(deltaX) && Number.isFinite(deltaY)) {
      moveContents(transaction.contentIds, deltaX, deltaY);
    }
  };

  const alignMovedContents = (
    event: KonvaEventObject<DragEvent>,
    contentId: string,
  ) => {
    const transaction = dragTransactionRef.current;
    if (!transaction || transaction.ownerId !== contentId) return;

    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    const rawDeltaX = pointer.x / scale - transaction.pointerStart.x;
    const rawDeltaY = pointer.y / scale - transaction.pointerStart.y;
    const movingContents = contents.filter((content) =>
      transaction.contentIds.includes(content.id),
    );
    const movingBounds = getCombinedBounds(movingContents);
    if (!movingBounds) return;
    const boundedDeltaX = Math.min(
      pageWidth - movingBounds.x - movingBounds.width,
      Math.max(-movingBounds.x, rawDeltaX),
    );
    const boundedDeltaY = Math.min(
      pageHeight - movingBounds.y - movingBounds.height,
      Math.max(-movingBounds.y, rawDeltaY),
    );

    const otherBounds = contents
      .filter((content) => !transaction.contentIds.includes(content.id))
      .map(getContentBounds);
    const snapped = event.evt.altKey
      ? {
          deltaX: boundedDeltaX,
          deltaY: boundedDeltaY,
          guides: [],
        }
      : getAlignmentSnap(
          movingBounds,
          otherBounds,
          boundedDeltaX,
          boundedDeltaY,
          6 / scale,
          pageWidth,
          pageHeight,
        );

    transaction.lastDelta = { x: snapped.deltaX, y: snapped.deltaY };
    transaction.positions.forEach((position, id) => {
      contentNodesRef.current.get(id)?.position({
        x: position.x + snapped.deltaX,
        y: position.y + snapped.deltaY,
      });
    });
    setAlignmentGuides(snapped.guides);
  };

  const saveResizedContents = () => {
    const transformer = transformerRef.current;
    const nodes = transformer?.nodes() ?? [];
    const transforms = nodes
      .map((node) => ({
        id: node.id(),
        x: node.x(),
        y: node.y(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
      }))
      .filter(
        ({ x, y, scaleX, scaleY }) =>
          Number.isFinite(x) &&
          Number.isFinite(y) &&
          Number.isFinite(scaleX) &&
          Number.isFinite(scaleY),
      );

    // Détacher d'abord le cadre évite qu'il recalcule sa géométrie pendant
    // la normalisation successive des nœuds sélectionnés.
    transformer?.nodes([]);
    nodes.forEach((node) => {
      const initialPosition = resizePositionsRef.current.get(node.id());
      if (initialPosition) node.position(initialPosition);
      node.scale({ x: 1, y: 1 });
    });
    resizePositionsRef.current.clear();
    transformContents(transforms);
  };

  const submitText = () => {
    const text = textEditor?.value.trim();
    if (!textEditor || !text) {
      setTextEditor(null);
      return;
    }

    addContent({
      id: crypto.randomUUID(),
      windowId: activeWindowId,
      type: 'text',
      x: textEditor.x,
      y: textEditor.y,
      text,
      fontSize: 28,
      color: drawingColor,
      opacity: 1,
    });
    setTextEditor(null);
  };

  const finishCheckboxLabel = (label = '') => {
    if (!checkboxLabelEditor) return;
    updateCheckboxLabel(checkboxLabelEditor.contentId, label.trim());
    setCheckboxLabelEditor(null);
    setAlignmentGuides([]);
    setActiveTool('select');
    setSelection([checkboxLabelEditor.contentId]);
  };

  const cancelCheckboxLabel = () => {
    if (!checkboxLabelEditor) return;
    const contentId = checkboxLabelEditor.contentId;
    setCheckboxLabelEditor(null);
    setActiveTool('select');
    setSelection([contentId]);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const styles = window.getComputedStyle(container);
      const horizontalPadding =
        Number.parseFloat(styles.paddingLeft) +
        Number.parseFloat(styles.paddingRight);
      const verticalPadding =
        Number.parseFloat(styles.paddingTop) +
        Number.parseFloat(styles.paddingBottom);
      const availableWidth = container.clientWidth - horizontalPadding;
      const availableHeight = container.clientHeight - verticalPadding;
      setScale(
        Math.min(
          MAX_DISPLAY_SCALE,
          availableWidth / pageWidth,
          availableHeight / pageHeight,
        ),
      );
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    updateScale();
    return () => observer.disconnect();
  }, [pageHeight, pageWidth]);

  useEffect(() => {
    setSelectionBox(null);
    setShapeDraft(null);
    setTextEditor(null);
    setCheckboxLabelEditor(null);
    dragTransactionRef.current = null;
    dragPointerStartRef.current = null;
    resizePositionsRef.current.clear();
  }, [activeTool, activeWindowId]);

  useEffect(() => {
    if (historyLength < previousHistoryLengthRef.current) {
      setSelectionBox(null);
      setShapeDraft(null);
      setTextEditor(null);
      setCheckboxLabelEditor(null);
      setAlignmentGuides([]);
      dragTransactionRef.current = null;
      dragPointerStartRef.current = null;
      resizePositionsRef.current.clear();
    }
    previousHistoryLengthRef.current = historyLength;
  }, [historyLength]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const nodes =
      activeTool === 'select'
        ? selectedContentIds
            .map((id) => contentNodesRef.current.get(id))
            .filter((node): node is KonvaShape => Boolean(node))
        : [];

    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [activeTool, contents, selectedContentIds]);

  const rectanglePreview =
    shapeDraft?.type === 'rectangle'
      ? {
          x: Math.min(shapeDraft.startX, shapeDraft.currentX),
          y: Math.min(shapeDraft.startY, shapeDraft.currentY),
          width: Math.abs(shapeDraft.currentX - shapeDraft.startX),
          height: Math.abs(shapeDraft.currentY - shapeDraft.startY),
        }
      : null;
  const circlePreview =
    shapeDraft?.type === 'circle'
      ? Math.hypot(
          shapeDraft.currentX - shapeDraft.startX,
          shapeDraft.currentY - shapeDraft.startY,
        )
      : null;

  return (
    <main
      className={`canvas-workspace tool-${activeTool}`}
      ref={containerRef}
    >
      <div
        className="drawing-page"
        style={{
          width: pageWidth * scale,
          height: pageHeight * scale,
        }}
      >
        {contents.length === 0 && (
          <div className="canvas-hint" aria-hidden="true">
            <span className="canvas-hint-spark">✦</span>
            <span>À vous de dessiner !</span>
          </div>
        )}

        <Stage
          key={activeWindowId}
          width={pageWidth * scale}
          height={pageHeight * scale}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishInteraction}
          onPointerLeave={finishInteraction}
        >
          <Layer scaleX={scale} scaleY={scale}>
            <Rect
              width={pageWidth}
              height={pageHeight}
              fill="#ffffff"
              name="canvas-background"
              listening
            />
            {contents.map((content) => (
              <CanvasContentShape
                key={content.id}
                nodeRef={(node) => {
                  if (node) contentNodesRef.current.set(content.id, node);
                  else contentNodesRef.current.delete(content.id);
                }}
                content={content}
                interactive={activeTool === 'select'}
                draggable={activeTool === 'select'}
                onPointerDown={(event) =>
                  handleContentPointerDown(event, content.id)
                }
                onDoubleClick={(event) => {
                  if (activeTool !== 'select' || content.type !== 'checkbox') {
                    return;
                  }
                  event.cancelBubble = true;
                  setCheckboxLabelEditor({
                    contentId: content.id,
                    x: Math.min(
                      content.x + content.width + 8,
                      pageWidth - 300,
                    ),
                    y: content.y,
                    value: content.label,
                    initialValue: content.label,
                  });
                  setSelection([content.id]);
                }}
                onDragStart={(event) => {
                  if (dragTransactionRef.current) return;

                  const currentSelection =
                    useEditorStore.getState().selectedContentIds;
                  const contentIds = currentSelection.includes(content.id)
                    ? currentSelection
                    : [content.id];
                  const positions = new Map<
                    string,
                    { x: number; y: number }
                  >();

                  contentIds.forEach((id) => {
                    const node = contentNodesRef.current.get(id);
                    if (node) positions.set(id, node.position());
                  });
                  const pointer = event.target
                    .getStage()
                    ?.getPointerPosition();
                  const pointerDown = dragPointerStartRef.current;
                  transformerRef.current?.nodes([]);
                  dragTransactionRef.current = {
                    ownerId: content.id,
                    contentIds,
                    positions,
                    pointerStart:
                      pointerDown?.contentId === content.id
                        ? { x: pointerDown.x, y: pointerDown.y }
                        : pointer
                          ? { x: pointer.x / scale, y: pointer.y / scale }
                      : { x: 0, y: 0 },
                    lastDelta: { x: 0, y: 0 },
                  };
                }}
                onDragMove={(event) =>
                  alignMovedContents(event, content.id)
                }
                onDragEnd={(event) =>
                  saveMovedContents(event, content.id)
                }
              />
            ))}

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
                    contents={contents}
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

            {rectanglePreview && (
              <Rect
                {...rectanglePreview}
                fill={
                  drawingFillColor === 'transparent'
                    ? undefined
                    : drawingFillColor
                }
                stroke={drawingColor}
                strokeWidth={drawingWidth}
                cornerRadius={12}
                dash={[8, 5]}
                listening={false}
              />
            )}
            {shapeDraft?.type === 'circle' && circlePreview !== null && (
              <Circle
                x={shapeDraft.startX}
                y={shapeDraft.startY}
                radius={circlePreview}
                fill={
                  drawingFillColor === 'transparent'
                    ? undefined
                    : drawingFillColor
                }
                stroke={drawingColor}
                strokeWidth={drawingWidth}
                dash={[8, 5]}
                listening={false}
              />
            )}
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
            {alignmentGuides.map((guide) => (
              <Line
                key={`${guide.orientation}-${guide.position}`}
                points={
                  guide.orientation === 'vertical'
                    ? [guide.position, guide.start, guide.position, guide.end]
                    : [guide.start, guide.position, guide.end, guide.position]
                }
                stroke="#8b5cf6"
                strokeWidth={1.25 / scale}
                dash={[5 / scale, 4 / scale]}
                opacity={0.8}
                listening={false}
              />
            ))}
            {activeTool === 'select' && selectedContentIds.length > 0 && (
              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                flipEnabled={false}
                keepRatio={keepResizeRatio}
                enabledAnchors={
                  keepResizeRatio
                    ? [
                        'top-left',
                        'top-right',
                        'bottom-left',
                        'bottom-right',
                      ]
                    : [
                        'top-left',
                        'top-center',
                        'top-right',
                        'middle-left',
                        'middle-right',
                        'bottom-left',
                        'bottom-center',
                        'bottom-right',
                      ]
                }
                borderStroke="#5b5bd6"
                borderStrokeWidth={1.5 / scale}
                anchorFill="#ffffff"
                anchorStroke="#5b5bd6"
                anchorStrokeWidth={1.5 / scale}
                anchorSize={11 / scale}
                anchorCornerRadius={3 / scale}
                padding={5 / scale}
                ignoreStroke
                boundBoxFunc={(oldBox, newBox) =>
                  Math.abs(newBox.width) < 16 ||
                  Math.abs(newBox.height) < 16
                    ? oldBox
                    : newBox
                }
                onTransformStart={() => {
                  resizePositionsRef.current.clear();
                  transformerRef.current?.nodes().forEach((node) => {
                    resizePositionsRef.current.set(node.id(), node.position());
                  });
                }}
                onTransformEnd={saveResizedContents}
              />
            )}
          </Layer>
        </Stage>

        {textEditor && (
          <form
            className="canvas-text-editor"
            style={{
              left: Math.min(textEditor.x * scale, pageWidth * scale - 260),
              top: Math.min(textEditor.y * scale, pageHeight * scale - 38),
            }}
            onSubmit={(event) => {
              event.preventDefault();
              submitText();
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <input
              autoFocus
              value={textEditor.value}
              placeholder="Écrivez votre texte…"
              aria-label="Texte à ajouter"
              onChange={(event) =>
                setTextEditor((editor) =>
                  editor ? { ...editor, value: event.target.value } : null,
                )
              }
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setTextEditor(null);
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submitText();
                }
              }}
            />
          </form>
        )}
        {checkboxLabelEditor && (
          <form
            className="canvas-checkbox-label-editor"
            style={{
              left: checkboxLabelEditor.x * scale,
              top: Math.min(
                checkboxLabelEditor.y * scale,
                pageHeight * scale - 48,
              ),
            }}
            onSubmit={(event) => {
              event.preventDefault();
              finishCheckboxLabel(checkboxLabelEditor.value);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <input
              autoFocus
              value={checkboxLabelEditor.value}
              placeholder="Libellé facultatif"
              aria-label="Libellé facultatif de la case"
              onChange={(event) =>
                setCheckboxLabelEditor((editor) =>
                  editor ? { ...editor, value: event.target.value } : null,
                )
              }
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelCheckboxLabel();
                }
              }}
            />
            <button
              className="checkbox-label-skip"
              type="button"
              onClick={() => finishCheckboxLabel()}
            >
              {checkboxLabelEditor.initialValue ? 'Sans texte' : 'Passer'}
            </button>
            <button type="submit" aria-label="Valider le libellé">✓</button>
          </form>
        )}
      </div>
    </main>
  );
}
