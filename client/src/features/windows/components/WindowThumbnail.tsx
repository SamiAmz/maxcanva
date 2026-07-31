import { Layer, Rect, Stage } from 'react-konva';
import {
  PROTOTYPE_PAGE_HEIGHT,
  PROTOTYPE_PAGE_WIDTH,
  type CanvasContent,
} from '@maxcanva/shared';
import { CanvasContentShape } from '@/features/canvas/components/CanvasContentShape';

const THUMBNAIL_WIDTH = 164;
const THUMBNAIL_HEIGHT = THUMBNAIL_WIDTH * PROTOTYPE_PAGE_HEIGHT / PROTOTYPE_PAGE_WIDTH;
const SCALE = THUMBNAIL_WIDTH / PROTOTYPE_PAGE_WIDTH;

interface WindowThumbnailProps {
  contents: CanvasContent[];
}

export function WindowThumbnail({ contents }: WindowThumbnailProps) {
  return (
    <Stage width={THUMBNAIL_WIDTH} height={THUMBNAIL_HEIGHT} listening={false}>
      <Layer scaleX={SCALE} scaleY={SCALE}>
        <Rect
          width={PROTOTYPE_PAGE_WIDTH}
          height={PROTOTYPE_PAGE_HEIGHT}
          fill="#ffffff"
        />
        {contents.map((content) => (
          <CanvasContentShape key={content.id} content={content} />
        ))}
      </Layer>
    </Stage>
  );
}
