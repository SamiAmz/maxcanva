import { z } from 'zod';

const id = z.string().trim().min(1).max(120);
const color = z.string().trim().min(1).max(40);
const opacity = z.number().min(0).max(1);
const boundedNumber = (minimum: number, maximum: number) =>
  z.number().finite().transform((value) =>
    Math.min(maximum, Math.max(minimum, value)),
  );
const base = {
  id,
  windowId: id,
  color,
  opacity,
};

export const canvasContentSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('pencil'),
    points: z.array(z.number().finite()).min(4).max(400),
    strokeWidth: z.number().min(1).max(24),
  }),
  z.object({
    ...base,
    type: z.literal('rectangle'),
    x: z.number().finite(), y: z.number().finite(),
    width: z.number().positive(), height: z.number().positive(),
    fillColor: color, strokeWidth: z.number().min(1).max(24),
  }),
  z.object({
    ...base,
    type: z.literal('circle'),
    x: z.number().finite(), y: z.number().finite(),
    radiusX: z.number().positive(), radiusY: z.number().positive(),
    fillColor: color, strokeWidth: z.number().min(1).max(24),
  }),
  z.object({
    ...base,
    type: z.literal('text'),
    x: z.number().finite(), y: z.number().finite(),
    text: z.string().max(500), fontSize: z.number().min(8).max(96),
  }),
  z.object({
    ...base,
    type: z.literal('checkbox'),
    x: z.number().finite(), y: z.number().finite(),
    width: z.number().positive(), height: z.number().positive(),
    label: z.string().max(160), checked: z.boolean(),
  }),
  z.object({
    ...base,
    type: z.literal('text-input'),
    x: z.number().finite(), y: z.number().finite(),
    width: z.number().positive(), height: z.number().positive(),
    placeholder: z.string().max(160),
  }),
]);

export const interactionSchema = z.object({
  id,
  sourceWindowId: id,
  targetWindowId: id.optional(),
  url: z.string().url().max(2048).optional(),
  contentIds: z.array(id).min(1).max(40),
  type: z.enum(['button', 'link']),
});

export const projectDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string().trim().min(1).max(120),
  windows: z.array(z.object({ id, name: z.string().trim().min(1).max(120) })).min(1).max(20),
  contents: z.array(canvasContentSchema).max(500),
  groups: z.array(z.object({ id, windowId: id, contentIds: z.array(id).min(2).max(80) })).max(100),
  interactions: z.array(interactionSchema).max(200),
});

export const aiCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('set-project-title'), title: z.string().trim().min(1).max(120) }),
  z.object({ type: z.literal('create-window'), window: z.object({ id, name: z.string().trim().min(1).max(120) }) }),
  z.object({ type: z.literal('rename-window'), windowId: id, name: z.string().trim().min(1).max(120) }),
  z.object({ type: z.literal('delete-window'), windowId: id }),
  z.object({ type: z.literal('clear-window'), windowId: id }),
  z.object({
    type: z.literal('create-navigation-button'),
    button: z.object({
      id,
      windowId: id,
      targetWindowId: id,
      label: z.string().trim().min(1).max(80),
      x: z.number().finite(),
      y: z.number().finite(),
      // Les modèles peuvent rater une limite de quelques pixels. On corrige
      // la dimension ici, puis applyAiCommands vérifie toujours le plan final.
      width: boundedNumber(80, 400),
      height: boundedNumber(32, 100),
      backgroundColor: color,
      textColor: color,
    }),
  }),
  z.object({ type: z.literal('add-content'), content: canvasContentSchema }),
  z.object({ type: z.literal('replace-content'), content: canvasContentSchema }),
  z.object({ type: z.literal('delete-content'), contentId: id }),
  z.object({
    type: z.literal('create-group'),
    group: z.object({ id, windowId: id, contentIds: z.array(id).min(2).max(80) }),
  }),
  z.object({ type: z.literal('delete-group'), groupId: id }),
  z.object({ type: z.literal('create-interaction'), interaction: interactionSchema }),
  z.object({ type: z.literal('delete-interaction'), interactionId: id }),
]);

export const aiModelProposalSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  commands: z.array(aiCommandSchema).min(1).max(40),
  warnings: z.array(z.string().trim().min(1).max(240)).max(8).default([]),
});

export const aiVisualReviewSchema = z.object({
  verdict: z.enum(['accepted', 'needs_revision']),
  summary: z.string().trim().min(1).max(500),
  issues: z.array(z.string().trim().min(1).max(240)).max(8),
});

export const aiProposalRequestSchema = z.object({
  prompt: z.string().trim().min(3, 'Décrivez la modification souhaitée.').max(2000),
  document: projectDocumentSchema,
  activeWindowId: id,
  selectedContentIds: z.array(id).max(80),
  projectId: z.string().uuid().optional(),
});

export const aiReviewRequestSchema = z.object({
  screenshotDataUrl: z.string().startsWith('data:image/png;base64,').max(2_800_000),
});

export type AiModelProposal = z.infer<typeof aiModelProposalSchema>;
