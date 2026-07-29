import { Layer, Rect, Stage } from 'react-konva';
import type { CanvasContent } from '@maxcanva/shared';
import { CanvasContentShape } from '@/features/canvas/components/CanvasContentShape';

const THUMBNAIL_WIDTH = 164;
const THUMBNAIL_HEIGHT = 110;
// Les miniatures réutilisent les coordonnées 960x640 à une échelle réduite.
const SCALE = THUMBNAIL_WIDTH / 960;

interface WindowThumbnailProps {
  contents: CanvasContent[];
}

export function WindowThumbnail({ contents }: WindowThumbnailProps) {
  return (
    <Stage width={THUMBNAIL_WIDTH} height={THUMBNAIL_HEIGHT} listening={false}>
      <Layer scaleX={SCALE} scaleY={SCALE}>
        <Rect width={960} height={640} fill="#ffffff" />
        {contents.map((content) => (
          <CanvasContentShape key={content.id} content={content} />
        ))}
      </Layer>
    </Stage>
  );
}
