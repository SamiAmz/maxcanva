import { Label, Rect, Tag, Text } from 'react-konva';
import type {
  CanvasContent,
  PrototypeInteraction,
} from '@maxcanva/shared';
import { getCombinedBounds } from '@/domain/project/contentGeometry';

interface InteractionOverlayProps {
  interaction: PrototypeInteraction;
  contents: CanvasContent[];
  targetLabel: string;
  scale: number;
}

export function InteractionOverlay({
  interaction,
  contents,
  targetLabel,
  scale,
}: InteractionOverlayProps) {
  const linkedContents = contents.filter((content) =>
    interaction.contentIds.includes(content.id),
  );
  const bounds = getCombinedBounds(linkedContents);
  if (!bounds) return null;

  const padding = 12 / scale;
  const label = `${interaction.type === 'button' ? 'Bouton' : 'Lien'} → ${targetLabel}`;

  return (
    <>
      <Rect
        x={bounds.x - padding}
        y={bounds.y - padding}
        width={bounds.width + padding * 2}
        height={bounds.height + padding * 2}
        stroke="#2563eb"
        strokeWidth={1.5 / scale}
        dash={[6 / scale, 4 / scale]}
        cornerRadius={7 / scale}
        listening={false}
      />
      <Label
        x={bounds.x - padding}
        y={bounds.y - padding - 25 / scale}
        scaleX={1 / scale}
        scaleY={1 / scale}
        listening={false}
      >
        <Tag fill="#2563eb" cornerRadius={6} />
        <Text
          text={label}
          fill="#ffffff"
          fontSize={11}
          fontStyle="bold"
          padding={6}
        />
      </Label>
    </>
  );
}
