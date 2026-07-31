import type { ContentBounds } from '@/domain/project/contentGeometry';
import { PROTOTYPE_PAGE_HEIGHT, PROTOTYPE_PAGE_WIDTH } from '@maxcanva/shared';

export interface AlignmentGuide {
  orientation: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
}

interface SnapResult {
  deltaX: number;
  deltaY: number;
  guides: AlignmentGuide[];
}

interface Target {
  kind: 'start' | 'center' | 'end';
  value: number;
  start: number;
  end: number;
}

function findClosestSnap(
  anchors: Array<{ kind: Target['kind']; value: number }>,
  targets: Target[],
  tolerance: number,
) {
  let closest:
    | { correction: number; target: Target; distance: number }
    | undefined;

  anchors.forEach((anchor) => {
    targets.forEach((target) => {
      if (anchor.kind !== target.kind) return;
      const correction = target.value - anchor.value;
      const distance = Math.abs(correction);
      if (
        distance <= tolerance &&
        (!closest || distance < closest.distance)
      ) {
        closest = { correction, target, distance };
      }
    });
  });
  return closest;
}

// Compare les bords et centres d'une sélection avec les autres contenus.
export function getAlignmentSnap(
  movingBounds: ContentBounds,
  otherBounds: ContentBounds[],
  rawDeltaX: number,
  rawDeltaY: number,
  tolerance: number,
  pageWidth = PROTOTYPE_PAGE_WIDTH,
  pageHeight = PROTOTYPE_PAGE_HEIGHT,
): SnapResult {
  const moved = {
    ...movingBounds,
    x: movingBounds.x + rawDeltaX,
    y: movingBounds.y + rawDeltaY,
  };
  const xTargets: Target[] = [
    { kind: 'start', value: 0, start: 0, end: pageHeight },
    { kind: 'center', value: pageWidth / 2, start: 0, end: pageHeight },
    { kind: 'end', value: pageWidth, start: 0, end: pageHeight },
  ];
  const yTargets: Target[] = [
    { kind: 'start', value: 0, start: 0, end: pageWidth },
    { kind: 'center', value: pageHeight / 2, start: 0, end: pageWidth },
    { kind: 'end', value: pageHeight, start: 0, end: pageWidth },
  ];

  otherBounds.forEach((bounds) => {
    xTargets.push(
      {
        kind: 'start',
        value: bounds.x,
        start: bounds.y,
        end: bounds.y + bounds.height,
      },
      {
        kind: 'center',
        value: bounds.x + bounds.width / 2,
        start: bounds.y,
        end: bounds.y + bounds.height,
      },
      {
        kind: 'end',
        value: bounds.x + bounds.width,
        start: bounds.y,
        end: bounds.y + bounds.height,
      },
    );
    yTargets.push(
      {
        kind: 'start',
        value: bounds.y,
        start: bounds.x,
        end: bounds.x + bounds.width,
      },
      {
        kind: 'center',
        value: bounds.y + bounds.height / 2,
        start: bounds.x,
        end: bounds.x + bounds.width,
      },
      {
        kind: 'end',
        value: bounds.y + bounds.height,
        start: bounds.x,
        end: bounds.x + bounds.width,
      },
    );
  });

  const xSnap = findClosestSnap(
    [
      { kind: 'start', value: moved.x },
      { kind: 'center', value: moved.x + moved.width / 2 },
      { kind: 'end', value: moved.x + moved.width },
    ],
    xTargets,
    tolerance,
  );
  const ySnap = findClosestSnap(
    [
      { kind: 'start', value: moved.y },
      { kind: 'center', value: moved.y + moved.height / 2 },
      { kind: 'end', value: moved.y + moved.height },
    ],
    yTargets,
    tolerance,
  );

  const deltaX = rawDeltaX + (xSnap?.correction ?? 0);
  const deltaY = rawDeltaY + (ySnap?.correction ?? 0);
  const snappedBounds = {
    ...movingBounds,
    x: movingBounds.x + deltaX,
    y: movingBounds.y + deltaY,
  };
  const guides: AlignmentGuide[] = [];

  if (xSnap) {
    guides.push({
      orientation: 'vertical',
      position: xSnap.target.value,
      start: Math.max(0, Math.min(snappedBounds.y, xSnap.target.start) - 12),
      end: Math.min(
        pageHeight,
        Math.max(
          snappedBounds.y + snappedBounds.height,
          xSnap.target.end,
        ) + 12,
      ),
    });
  }
  if (ySnap) {
    guides.push({
      orientation: 'horizontal',
      position: ySnap.target.value,
      start: Math.max(0, Math.min(snappedBounds.x, ySnap.target.start) - 12),
      end: Math.min(
        pageWidth,
        Math.max(
          snappedBounds.x + snappedBounds.width,
          ySnap.target.end,
        ) + 12,
      ),
    });
  }

  return { deltaX, deltaY, guides };
}
