import { Layer, Line, Rect, Stage } from 'react-konva';
import type { Stroke } from '../../../types/drawing';

const THUMBNAIL_WIDTH = 164;
const THUMBNAIL_HEIGHT = 110;
// Les miniatures réutilisent les coordonnées 960x640 à une échelle réduite.
const SCALE = THUMBNAIL_WIDTH / 960;

interface WindowThumbnailProps {
  strokes: Stroke[];
}

export function WindowThumbnail({ strokes }: WindowThumbnailProps) {
  return (
    <Stage width={THUMBNAIL_WIDTH} height={THUMBNAIL_HEIGHT} listening={false}>
      <Layer scaleX={SCALE} scaleY={SCALE}>
        <Rect width={960} height={640} fill="#ffffff" />
        {strokes.map((stroke) => (
          <Line
            key={stroke.id}
            points={stroke.points}
            stroke={stroke.color}
            strokeWidth={Math.max(stroke.width, 5)}
            opacity={stroke.opacity}
            lineCap="round"
            lineJoin="round"
            tension={0.35}
          />
        ))}
      </Layer>
    </Stage>
  );
}
