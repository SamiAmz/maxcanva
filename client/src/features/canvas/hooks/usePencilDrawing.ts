import { useRef } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore } from '@/features/editor/store/useEditorStore';

export function usePencilDrawing(scale: number) {
  // Ces références décrivent le geste en cours sans provoquer un rendu React.
  const activeStrokeId = useRef<string | null>(null);
  const pointsRef = useRef<number[]>([]);

  const activeTool = useEditorStore((state) => state.activeTool);
  const drawingColor = useEditorStore((state) => state.drawingColor);
  const drawingWidth = useEditorStore((state) => state.drawingWidth);
  const activeWindowId = useEditorStore((state) => state.activeWindowId);
  const addContent = useEditorStore((state) => state.addContent);
  const updatePencilPoints = useEditorStore(
    (state) => state.updatePencilPoints,
  );

  const getPoint = (event: KonvaEventObject<PointerEvent>) => {
    const stage = event.target.getStage();
    const position = stage?.getPointerPosition();

    if (!position) return null;

    return {
      // Le store conserve toujours les coordonnées logiques de la page.
      x: position.x / scale,
      y: position.y / scale,
    };
  };

  const startDrawing = (event: KonvaEventObject<PointerEvent>) => {
    if (activeTool !== 'pencil') return;

    event.evt.preventDefault();
    const point = getPoint(event);
    if (!point) return;

    const id = crypto.randomUUID();
    // Deux points presque identiques permettent aussi d'afficher un simple clic.
    const points = [point.x, point.y, point.x + 0.01, point.y + 0.01];

    activeStrokeId.current = id;
    pointsRef.current = points;
    addContent({
      id,
      windowId: activeWindowId,
      type: 'pencil',
      points,
      color: drawingColor,
      strokeWidth: drawingWidth,
      opacity: 1,
    });
  };

  const continueDrawing = (event: KonvaEventObject<PointerEvent>) => {
    if (!activeStrokeId.current) return;

    event.evt.preventDefault();
    const point = getPoint(event);
    if (!point) return;

    const previousX = pointsRef.current.at(-2) ?? point.x;
    const previousY = pointsRef.current.at(-1) ?? point.y;
    const distance = Math.hypot(point.x - previousX, point.y - previousY);

    // Ignore les micro-mouvements pour limiter la taille des tracés.
    if (distance < 0.8) return;

    pointsRef.current = [...pointsRef.current, point.x, point.y];
    updatePencilPoints(activeStrokeId.current, pointsRef.current);
  };

  const stopDrawing = () => {
    activeStrokeId.current = null;
    pointsRef.current = [];
  };

  return { startDrawing, continueDrawing, stopDrawing };
}
