import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape as KonvaShape } from 'konva/lib/Shape';
import rough from 'roughjs';
import type { Drawable } from 'roughjs/bin/core';
import { Line, Shape, Text } from 'react-konva';
import type { CanvasContent } from '@maxcanva/shared';

interface CanvasContentShapeProps {
  content: CanvasContent;
  interactive?: boolean;
  draggable?: boolean;
  nodeRef?: (node: KonvaShape | null) => void;
  onPointerDown?: (event: KonvaEventObject<PointerEvent>) => void;
  onDoubleClick?: (event: KonvaEventObject<MouseEvent>) => void;
  onDragStart?: (event: KonvaEventObject<DragEvent>) => void;
  onDragMove?: (event: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (event: KonvaEventObject<DragEvent>) => void;
}

const roughGenerator = rough.generator();

function seedFromId(id: string) {
  let seed = 0;
  for (const character of id) {
    seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
  }
  return Math.max(1, seed);
}

function drawRoughShape(
  context: { _context: CanvasRenderingContext2D },
  drawable: Drawable,
) {
  const canvasContext = context._context;

  drawable.sets.forEach((drawing) => {
    if (drawing.type !== 'path') return;

    canvasContext.save();
    canvasContext.strokeStyle = drawable.options.stroke;
    canvasContext.lineWidth = drawable.options.strokeWidth;
    canvasContext.lineCap = 'round';
    canvasContext.lineJoin = 'round';
    canvasContext.beginPath();

    drawing.ops.forEach(({ op, data }) => {
      if (op === 'move') {
        canvasContext.moveTo(data[0], data[1]);
      } else if (op === 'lineTo') {
        canvasContext.lineTo(data[0], data[1]);
      } else {
        canvasContext.bezierCurveTo(
          data[0],
          data[1],
          data[2],
          data[3],
          data[4],
          data[5],
        );
      }
    });

    canvasContext.stroke();
    canvasContext.restore();
  });
}

function fillRoundedRectangle(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
  fillColor: string,
) {
  if (fillColor === 'transparent') return;
  const cornerRadius = Math.min(radius, width / 2, height / 2);

  context.save();
  context.fillStyle = fillColor;
  context.beginPath();
  context.moveTo(cornerRadius, 0);
  context.lineTo(width - cornerRadius, 0);
  context.quadraticCurveTo(width, 0, width, cornerRadius);
  context.lineTo(width, height - cornerRadius);
  context.quadraticCurveTo(width, height, width - cornerRadius, height);
  context.lineTo(cornerRadius, height);
  context.quadraticCurveTo(0, height, 0, height - cornerRadius);
  context.lineTo(0, cornerRadius);
  context.quadraticCurveTo(0, 0, cornerRadius, 0);
  context.closePath();
  context.fill();
  context.restore();
}

export function CanvasContentShape({
  content,
  interactive = false,
  draggable = false,
  nodeRef,
  onPointerDown,
  onDoubleClick,
  onDragStart,
  onDragMove,
  onDragEnd,
}: CanvasContentShapeProps) {
  const interactionProps = {
    ref: nodeRef,
    id: content.id,
    listening: interactive,
    draggable,
    onPointerDown,
    onDblClick: onDoubleClick,
    onDragStart,
    onDragMove,
    onDragEnd,
  };

  if (content.type === 'pencil') {
    return (
      <Line
        {...interactionProps}
        points={content.points}
        stroke={content.color}
        strokeWidth={content.strokeWidth}
        opacity={content.opacity}
        lineCap="round"
        lineJoin="round"
        tension={0.35}
        hitStrokeWidth={Math.max(18, content.strokeWidth + 8)}
      />
    );
  }

  if (content.type === 'rectangle') {
    const radius = Math.min(12, content.width / 4, content.height / 4);
    const right = Math.max(1, content.width - 1);
    const bottom = Math.max(1, content.height - 1);
    const drawable = roughGenerator.path(
      [
        `M ${radius + 1} 1`,
        `L ${right - radius} 1`,
        `Q ${right} 1 ${right} ${radius + 1}`,
        `L ${right} ${bottom - radius}`,
        `Q ${right} ${bottom} ${right - radius} ${bottom}`,
        `L ${radius + 1} ${bottom}`,
        `Q 1 ${bottom} 1 ${bottom - radius}`,
        `L 1 ${radius + 1}`,
        `Q 1 1 ${radius + 1} 1`,
        'Z',
      ].join(' '),
      {
        seed: seedFromId(content.id),
        stroke: content.color,
        strokeWidth: content.strokeWidth,
        roughness: 1.2,
        bowing: 1,
      },
    );

    return (
      <Shape
        {...interactionProps}
        x={content.x}
        y={content.y}
        width={content.width}
        height={content.height}
        opacity={content.opacity}
        fill="rgba(255,255,255,0.001)"
        sceneFunc={(context) => {
          fillRoundedRectangle(
            context._context,
            content.width,
            content.height,
            radius,
            content.fillColor,
          );
          drawRoughShape(context, drawable);
        }}
        hitFunc={(context, shape) => {
          context.beginPath();
          context.roundRect(0, 0, content.width, content.height, radius);
          context.closePath();
          context.fillStrokeShape(shape);
        }}
      />
    );
  }

  if (content.type === 'circle') {
    const width = content.radiusX * 2;
    const height = content.radiusY * 2;
    const drawable = roughGenerator.ellipse(
      content.radiusX,
      content.radiusY,
      Math.max(0, width - 2),
      Math.max(0, height - 2),
      {
        seed: seedFromId(content.id),
        stroke: content.color,
        strokeWidth: content.strokeWidth,
        roughness: 1.2,
        bowing: 1,
      },
    );

    return (
      <Shape
        {...interactionProps}
        x={content.x}
        y={content.y}
        width={width}
        height={height}
        offsetX={content.radiusX}
        offsetY={content.radiusY}
        opacity={content.opacity}
        fill="rgba(255,255,255,0.001)"
        sceneFunc={(context) => {
          if (content.fillColor !== 'transparent') {
            const canvasContext = context._context;
            canvasContext.save();
            canvasContext.fillStyle = content.fillColor;
            canvasContext.beginPath();
            canvasContext.ellipse(
              content.radiusX,
              content.radiusY,
              content.radiusX,
              content.radiusY,
              0,
              0,
              Math.PI * 2,
            );
            canvasContext.fill();
            canvasContext.restore();
          }
          drawRoughShape(context, drawable);
        }}
        hitFunc={(context, shape) => {
          context.beginPath();
          context.ellipse(
            content.radiusX,
            content.radiusY,
            content.radiusX,
            content.radiusY,
            0,
            0,
            Math.PI * 2,
          );
          context.closePath();
          context.fillStrokeShape(shape);
        }}
      />
    );
  }

  if (content.type === 'checkbox') {
    return (
      <Shape
        {...interactionProps}
        x={content.x}
        y={content.y}
        width={content.width}
        height={content.height}
        fill="#ffffff"
        sceneFunc={(context) => {
          const boxSize = Math.min(22, content.height - 6);
          const boxY = (content.height - boxSize) / 2;

          context.save();
          context.fillStyle = '#ffffff';
          context.strokeStyle = '#9aa4b2';
          context.lineWidth = 2;
          context.beginPath();
          context.roundRect(1, boxY, boxSize, boxSize, 5);
          context.fill();
          context.stroke();
          if (content.checked) {
            context.fillStyle = '#5b5bd6';
            context.beginPath();
            context.roundRect(1, boxY, boxSize, boxSize, 5);
            context.fill();
            context.strokeStyle = '#ffffff';
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(6, boxY + boxSize / 2);
            context.lineTo(10, boxY + boxSize - 6);
            context.lineTo(boxSize - 4, boxY + 6);
            context.stroke();
          }
          if (content.label) {
            context.fillStyle = '#374151';
            context.font = '500 16px Assistant, Arial, sans-serif';
            context.textBaseline = 'middle';
            context.fillText(
              content.label,
              boxSize + 11,
              content.height / 2,
              Math.max(0, content.width - boxSize - 11),
            );
          }
          context.restore();
        }}
        hitFunc={(context, shape) => {
          context.beginPath();
          context.rect(0, 0, content.width, content.height);
          context.closePath();
          context.fillStrokeShape(shape);
        }}
      />
    );
  }

  if (content.type === 'text-input') {
    return (
      <Shape
        {...interactionProps}
        x={content.x}
        y={content.y}
        width={content.width}
        height={content.height}
        fill="#ffffff"
        sceneFunc={(context) => {
          context.save();
          context.fillStyle = '#ffffff';
          context.strokeStyle = '#aeb7c4';
          context.lineWidth = 1.5;
          context.beginPath();
          context.roundRect(
            1,
            1,
            Math.max(0, content.width - 2),
            Math.max(0, content.height - 2),
            8,
          );
          context.fill();
          context.stroke();
          context.fillStyle = '#98a1af';
          context.font = '400 15px Assistant, Arial, sans-serif';
          context.textBaseline = 'middle';
          context.fillText(
            content.placeholder,
            13,
            content.height / 2,
            Math.max(0, content.width - 26),
          );
          context.restore();
        }}
        hitFunc={(context, shape) => {
          context.beginPath();
          context.rect(0, 0, content.width, content.height);
          context.closePath();
          context.fillStrokeShape(shape);
        }}
      />
    );
  }

  return (
    <Text
      {...interactionProps}
      x={content.x}
      y={content.y}
      text={content.text}
      fill={content.color}
      opacity={content.opacity}
      fontSize={content.fontSize}
      fontFamily="Excalifont, sans-serif"
      hitStrokeWidth={8}
    />
  );
}
