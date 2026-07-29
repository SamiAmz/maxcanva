import { useEditorStore } from '../../../store/useEditorStore';
import { ShapeStyleControls } from './ShapeStyleControls';

export function DrawingControls() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const color = useEditorStore((state) => state.drawingColor);
  const fillColor = useEditorStore((state) => state.drawingFillColor);
  const width = useEditorStore((state) => state.drawingWidth);
  const setColor = useEditorStore((state) => state.setDrawingColor);
  const setFillColor = useEditorStore((state) => state.setDrawingFillColor);
  const setWidth = useEditorStore((state) => state.setDrawingWidth);

  return (
    <section className="drawing-controls" aria-label="Style du contenu">
      <ShapeStyleControls
        color={color}
        fillColor={fillColor}
        strokeWidth={width}
        showFill={activeTool === 'rectangle' || activeTool === 'circle'}
        showWidth={activeTool !== 'text'}
        onColorChange={setColor}
        onFillColorChange={setFillColor}
        onStrokeWidthChange={setWidth}
      />
    </section>
  );
}
