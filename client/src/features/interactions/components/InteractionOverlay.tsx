import { Label, Rect, Tag, Text } from 'react-konva';
import type { PrototypeInteraction, Stroke } from '../../../types/drawing';

interface InteractionOverlayProps {
  interaction: PrototypeInteraction;
  strokes: Stroke[];
  targetLabel: string;
  scale: number;
}

export function InteractionOverlay({
  interaction,
  strokes,
  targetLabel,
  scale,
}: InteractionOverlayProps) {
  const linkedStrokes = strokes.filter((stroke) =>
    interaction.contentIds.includes(stroke.id),
  );
  if (linkedStrokes.length === 0) return null;

  // Une seule boîte englobe tous les traits qui composent l'interaction.
  const xs = linkedStrokes.flatMap((stroke) =>
    stroke.points.filter((_, index) => index % 2 === 0),
  );
  const ys = linkedStrokes.flatMap((stroke) =>
    stroke.points.filter((_, index) => index % 2 === 1),
  );
  const padding = 12 / scale;
  const left = Math.min(...xs) - padding;
  const top = Math.min(...ys) - padding;
  const right = Math.max(...xs) + padding;
  const bottom = Math.max(...ys) + padding;
  const label = `${interaction.type === 'button' ? 'Bouton' : 'Lien'} → ${targetLabel}`;

  return (
    <>
      <Rect
        x={left}
        y={top}
        width={right - left}
        height={bottom - top}
        stroke="#2563eb"
        strokeWidth={1.5 / scale}
        dash={[6 / scale, 4 / scale]}
        cornerRadius={7 / scale}
        listening={false}
      />
      <Label x={left} y={top - 25 / scale} scaleX={1 / scale} scaleY={1 / scale} listening={false}>
        <Tag fill="#2563eb" cornerRadius={6} />
        <Text text={label} fill="#ffffff" fontSize={11} fontStyle="bold" padding={6} />
      </Label>
    </>
  );
}
