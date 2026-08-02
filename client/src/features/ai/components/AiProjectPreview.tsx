import { useEffect, useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import { Layer, Rect, Stage } from 'react-konva';
import { PROTOTYPE_PAGE_HEIGHT, PROTOTYPE_PAGE_WIDTH, type ProjectDocument } from '@maxcanva/shared';
import { CanvasContentShape } from '@/features/canvas/components/CanvasContentShape';

interface AiProjectPreviewProps {
  document: ProjectDocument;
  preferredWindowId: string;
  onScreenshot: (dataUrl: string) => void;
}

export function AiProjectPreview({ document, preferredWindowId, onScreenshot }: AiProjectPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [width, setWidth] = useState(560);
  const activeWindowId = document.windows.some(({ id }) => id === preferredWindowId)
    ? preferredWindowId
    : document.windows[0]?.id;
  const contents = useMemo(
    () => document.contents.filter(({ windowId }) => windowId === activeWindowId),
    [activeWindowId, document.contents],
  );
  const scale = Math.min(width / PROTOTYPE_PAGE_WIDTH, 0.56);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry?.contentRect.width ?? 560)));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stage = stageRef.current;
      if (!stage) return;
      onScreenshot(stage.toDataURL({ pixelRatio: Math.max(1, 900 / stage.width()) }));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [contents, onScreenshot, scale]);

  return (
    <div className="ai-preview-canvas" ref={containerRef}>
      <Stage
        ref={stageRef}
        width={PROTOTYPE_PAGE_WIDTH * scale}
        height={PROTOTYPE_PAGE_HEIGHT * scale}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          <Rect width={PROTOTYPE_PAGE_WIDTH} height={PROTOTYPE_PAGE_HEIGHT} fill="#fff" />
          {contents.map((content) => <CanvasContentShape key={content.id} content={content} />)}
        </Layer>
      </Stage>
    </div>
  );
}
