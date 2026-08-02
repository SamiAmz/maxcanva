import { tool } from 'langchain';
import { z } from 'zod';
import {
  PROTOTYPE_PAGE_HEIGHT,
  PROTOTYPE_PAGE_WIDTH,
  type AiEditCommand,
  type CanvasContent,
  type ProjectDocument,
} from '@maxcanva/shared';
import { applyAiCommands } from '../domain/applyAiCommands';
import type { AiGenerationContext } from '../infrastructure/aiModelGateway';

const windowIdSchema = z.string().min(1).describe('Identifiant exact retourné par un outil de lecture.');
const colorSchema = z.string().min(1).max(40);
const opacitySchema = z.number().min(0).max(1).default(1);

export class AiToolSession {
  private draft: ProjectDocument;
  private readonly commands: AiEditCommand[] = [];

  constructor(private readonly context: AiGenerationContext) {
    this.draft = structuredClone(context.document);
  }

  get result() {
    return { commands: [...this.commands], document: structuredClone(this.draft) };
  }

  readonly tools = [
    tool(async () => this.json({
      title: this.draft.title,
      canvas: { width: PROTOTYPE_PAGE_WIDTH, height: PROTOTYPE_PAGE_HEIGHT },
      activeWindowId: this.context.activeWindowId,
      windows: this.draft.windows.map((window) => ({
        ...window,
        contentCount: this.draft.contents.filter(({ windowId }) => windowId === window.id).length,
      })),
    }), {
      name: 'inspect_project',
      description: 'Commence par cet outil. Retourne les fenêtres, leurs identifiants exacts, la fenêtre active et la taille du canvas.',
      schema: z.object({}),
    }),
    tool(async ({ title }) => this.commit({ type: 'set-project-title', title }), {
      name: 'set_project_title',
      description: 'Modifie le titre du projet.',
      schema: z.object({ title: z.string().min(1).max(120) }),
    }),
    tool(async ({ windowId }) => this.json({
      window: this.draft.windows.find(({ id }) => id === windowId) ?? null,
      contents: this.draft.contents.filter((content) => content.windowId === windowId),
      groups: this.draft.groups.filter((group) => group.windowId === windowId),
      interactions: this.draft.interactions.filter(({ sourceWindowId }) => sourceWindowId === windowId),
    }), {
      name: 'inspect_window',
      description: 'Inspecte tout le contenu, les groupes et les interactions d’une fenêtre avant de modifier des éléments existants.',
      schema: z.object({ windowId: windowIdSchema }),
    }),
    tool(async () => this.json({
      selectedContentIds: this.context.selectedContentIds,
      contents: this.draft.contents.filter(({ id }) => this.context.selectedContentIds.includes(id)),
    }), {
      name: 'inspect_selection',
      description: 'Retourne les contenus actuellement sélectionnés. Utilise-le lorsqu’une demande dit ce, cette sélection, ce bouton ou cet objet.',
      schema: z.object({}),
    }),
    tool(async ({ name }) => this.commit({
      type: 'create-window', window: { id: this.id('window'), name },
    }), {
      name: 'create_window',
      description: 'Crée une nouvelle fenêtre seulement si la demande le dit explicitement.',
      schema: z.object({ name: z.string().min(1).max(120) }),
    }),
    tool(async ({ windowId, name }) => this.commit({ type: 'rename-window', windowId, name }), {
      name: 'rename_window',
      description: 'Renomme une fenêtre existante.',
      schema: z.object({ windowId: windowIdSchema, name: z.string().min(1).max(120) }),
    }),
    tool(async ({ windowId }) => this.commit({ type: 'delete-window', windowId }), {
      name: 'delete_window',
      description: 'Supprime une fenêtre existante. La dernière fenêtre ne peut jamais être supprimée.',
      schema: z.object({ windowId: windowIdSchema }),
    }),
    tool(async ({ windowId }) => this.commit({ type: 'clear-window', windowId }), {
      name: 'clear_window',
      description: 'Supprime tout le contenu d’une fenêtre. À utiliser seulement si la demande exige de vider ou refaire la page.',
      schema: z.object({ windowId: windowIdSchema }),
    }),
    tool(async (input) => this.addContent({
      id: this.id('rectangle'), windowId: input.windowId, type: 'rectangle',
      x: input.x, y: input.y, width: input.width, height: input.height,
      color: input.strokeColor, fillColor: input.fillColor,
      strokeWidth: input.strokeWidth, opacity: input.opacity,
    }), {
      name: 'add_rectangle',
      description: 'Ajoute un rectangle dans une fenêtre.',
      schema: z.object({
        windowId: windowIdSchema, x: z.number(), y: z.number(),
        width: z.number().min(1), height: z.number().min(1),
        strokeColor: colorSchema, fillColor: colorSchema,
        strokeWidth: z.number().min(1).max(24).default(2), opacity: opacitySchema,
      }),
    }),
    tool(async (input) => this.addContent({
      id: this.id('circle'), windowId: input.windowId, type: 'circle',
      x: input.x, y: input.y, radiusX: input.radiusX, radiusY: input.radiusY,
      color: input.strokeColor, fillColor: input.fillColor,
      strokeWidth: input.strokeWidth, opacity: input.opacity,
    }), {
      name: 'add_circle',
      description: 'Ajoute un cercle ou une ellipse. x et y désignent le coin supérieur gauche de sa boîte.',
      schema: z.object({
        windowId: windowIdSchema, x: z.number(), y: z.number(),
        radiusX: z.number().min(1), radiusY: z.number().min(1),
        strokeColor: colorSchema, fillColor: colorSchema,
        strokeWidth: z.number().min(1).max(24).default(2), opacity: opacitySchema,
      }),
    }),
    tool(async (input) => this.addContent({
      id: this.id('text'), windowId: input.windowId, type: 'text',
      x: input.x, y: input.y, text: input.text, fontSize: input.fontSize,
      color: input.color, opacity: input.opacity,
    }), {
      name: 'add_text',
      description: 'Ajoute une chaîne de texte sur le canvas.',
      schema: z.object({
        windowId: windowIdSchema, x: z.number(), y: z.number(), text: z.string().max(500),
        fontSize: z.number().min(8).max(96), color: colorSchema, opacity: opacitySchema,
      }),
    }),
    tool(async (input) => this.addContent({
      id: this.id('checkbox'), windowId: input.windowId, type: 'checkbox',
      x: input.x, y: input.y, width: input.width, height: input.height,
      label: input.label, checked: input.checked, color: input.color, opacity: input.opacity,
    }), {
      name: 'add_checkbox',
      description: 'Ajoute une case à cocher simulable avec un libellé optionnel.',
      schema: z.object({
        windowId: windowIdSchema, x: z.number(), y: z.number(),
        width: z.number().min(20), height: z.number().min(20), label: z.string().max(160).default(''),
        checked: z.boolean().default(false), color: colorSchema.default('#1b1b1f'), opacity: opacitySchema,
      }),
    }),
    tool(async (input) => this.addContent({
      id: this.id('input'), windowId: input.windowId, type: 'text-input',
      x: input.x, y: input.y, width: input.width, height: input.height,
      placeholder: input.placeholder, color: input.color, opacity: input.opacity,
    }), {
      name: 'add_text_input',
      description: 'Ajoute un champ de texte simulable.',
      schema: z.object({
        windowId: windowIdSchema, x: z.number(), y: z.number(),
        width: z.number().min(80), height: z.number().min(32),
        placeholder: z.string().max(160), color: colorSchema.default('#1b1b1f'), opacity: opacitySchema,
      }),
    }),
    tool(async ({ windowId, points, color, strokeWidth, opacity }) => this.addContent({
      id: this.id('pencil'), windowId, type: 'pencil', points, color, strokeWidth, opacity,
    }), {
      name: 'add_pencil_stroke',
      description: 'Ajoute un trait de crayon. Les points alternent x,y et doivent rester dans le canvas.',
      schema: z.object({
        windowId: windowIdSchema, points: z.array(z.number()).min(4).max(400),
        color: colorSchema, strokeWidth: z.number().min(1).max(24).default(2), opacity: opacitySchema,
      }),
    }),
    tool(async ({ contentId, x, y, width, height }) => {
      const content = this.requireContent(contentId);
      const updated = moveAndResize(content, { x, y, width, height });
      return this.commit({ type: 'replace-content', content: updated });
    }, {
      name: 'move_or_resize_content',
      description: 'Déplace ou redimensionne un contenu existant en conservant son type et son style. Inspecte la fenêtre avant.',
      schema: z.object({
        contentId: z.string().min(1), x: z.number(), y: z.number(),
        width: z.number().min(1).optional(), height: z.number().min(1).optional(),
      }),
    }),
    tool(async ({ contentId, color, fillColor, opacity, strokeWidth, fontSize, text }) => {
      const content = this.requireContent(contentId);
      return this.commit({
        type: 'replace-content',
        content: updateContentAppearance(content, { color, fillColor, opacity, strokeWidth, fontSize, text }),
      });
    }, {
      name: 'update_content_appearance',
      description: 'Modifie la couleur, le remplissage, l’opacité, l’épaisseur ou le texte d’un contenu sans changer sa position.',
      schema: z.object({
        contentId: z.string().min(1), color: colorSchema.optional(), fillColor: colorSchema.optional(),
        opacity: z.number().min(0).max(1).optional(), strokeWidth: z.number().min(1).max(24).optional(),
        fontSize: z.number().min(8).max(96).optional(), text: z.string().max(500).optional(),
      }),
    }),
    tool(async ({ contentIds }) => this.commitMany(contentIds.map((contentId) => ({
      type: 'delete-content' as const, contentId,
    }))), {
      name: 'delete_contents',
      description: 'Supprime un ou plusieurs contenus existants après inspection.',
      schema: z.object({ contentIds: z.array(z.string().min(1)).min(1).max(80) }),
    }),
    tool(async ({ windowId, contentIds }) => this.commit({
      type: 'create-group', group: { id: this.id('group'), windowId, contentIds },
    }), {
      name: 'group_contents',
      description: 'Groupe au moins deux contenus d’une même fenêtre.',
      schema: z.object({ windowId: windowIdSchema, contentIds: z.array(z.string().min(1)).min(2).max(80) }),
    }),
    tool(async ({ groupId }) => this.commit({ type: 'delete-group', groupId }), {
      name: 'ungroup_contents',
      description: 'Dégroupe un groupe existant sans supprimer ses contenus.',
      schema: z.object({ groupId: z.string().min(1) }),
    }),
    tool(async ({ targetWindowId }) => this.makeSelectionNavigate(targetWindowId), {
      name: 'make_selection_navigate',
      description: 'Transforme exactement la sélection actuelle en navigation vers une fenêtre. Ne crée aucun nouveau visuel.',
      schema: z.object({ targetWindowId: windowIdSchema }),
    }),
    tool(async (input) => this.commit({
      type: 'create-navigation-button',
      button: { id: this.id('button'), ...input },
    }), {
      name: 'create_navigation_button',
      description: 'Crée un nouveau bouton visuel naviguant vers une autre fenêtre. Ne pas utiliser si un bouton est sélectionné ou existe déjà.',
      schema: z.object({
        windowId: windowIdSchema, targetWindowId: windowIdSchema,
        label: z.string().min(1).max(80), x: z.number(), y: z.number(),
        width: z.number().min(80).max(400), height: z.number().min(32).max(100),
        backgroundColor: colorSchema, textColor: colorSchema,
      }),
    }),
    tool(async ({ url }) => {
      const selected = this.draft.contents.filter(({ id }) => this.context.selectedContentIds.includes(id));
      if (selected.length === 0) throw new Error('Aucun contenu n’est sélectionné pour recevoir le lien.');
      const sourceWindowId = selected[0]!.windowId;
      return this.commit({
        type: 'create-interaction',
        interaction: {
          id: this.id('interaction'), sourceWindowId, url,
          contentIds: selected.filter(({ windowId }) => windowId === sourceWindowId).map(({ id }) => id),
          type: 'link',
        },
      });
    }, {
      name: 'make_selection_external_link',
      description: 'Transforme exactement la sélection actuelle en hyperlien vers une URL externe. Ne sert pas à naviguer entre les fenêtres.',
      schema: z.object({ url: z.string().url().max(2048) }),
    }),
    tool(async ({ interactionId }) => this.commit({ type: 'delete-interaction', interactionId }), {
      name: 'remove_interaction',
      description: 'Retire le comportement de bouton ou d’hyperlien sans supprimer son visuel.',
      schema: z.object({ interactionId: z.string().min(1) }),
    }),
    tool(async () => this.json({ valid: true, commandCount: this.commands.length, document: this.draft }), {
      name: 'validate_draft',
      description: 'Termine toujours par cet outil pour vérifier le document proposé et voir le résultat complet.',
      schema: z.object({}),
    }),
  ];

  makeSelectionNavigate(targetWindowId: string) {
    const selected = this.draft.contents.filter(({ id }) => this.context.selectedContentIds.includes(id));
    if (selected.length === 0) {
      throw new Error('Aucun contenu n’est sélectionné. Inspecte la fenêtre pour trouver les identifiants ou crée un nouveau bouton.');
    }
    const sourceWindowId = selected[0]!.windowId;
    const contentIds = selected.filter(({ windowId }) => windowId === sourceWindowId).map(({ id }) => id);
    return this.commit({
      type: 'create-interaction',
      interaction: { id: this.id('interaction'), sourceWindowId, targetWindowId, contentIds, type: 'button' },
    });
  }

  private addContent(content: CanvasContent) {
    return this.commit({ type: 'add-content', content });
  }

  private commit(command: AiEditCommand) {
    return this.commitMany([command]);
  }

  private commitMany(commands: AiEditCommand[]) {
    this.draft = applyAiCommands(this.draft, commands);
    this.commands.push(...commands);
    return this.json({ ok: true, applied: commands.map(({ type }) => type), commandCount: this.commands.length });
  }

  private requireContent(contentId: string) {
    const content = this.draft.contents.find(({ id }) => id === contentId);
    if (!content) throw new Error(`Le contenu ${contentId} n’existe pas.`);
    return content;
  }

  private id(kind: string) {
    return `ai-${kind}-${crypto.randomUUID()}`;
  }

  private json(value: unknown) {
    return JSON.stringify(value);
  }
}

function moveAndResize(
  content: CanvasContent,
  input: { x: number; y: number; width?: number; height?: number },
): CanvasContent {
  if (content.type === 'pencil') {
    const xs = content.points.filter((_, index) => index % 2 === 0);
    const ys = content.points.filter((_, index) => index % 2 === 1);
    const minX = Math.min(...xs); const minY = Math.min(...ys);
    const oldWidth = Math.max(1, Math.max(...xs) - minX);
    const oldHeight = Math.max(1, Math.max(...ys) - minY);
    const scaleX = (input.width ?? oldWidth) / oldWidth;
    const scaleY = (input.height ?? oldHeight) / oldHeight;
    return {
      ...content,
      points: content.points.map((value, index) => index % 2 === 0
        ? input.x + (value - minX) * scaleX
        : input.y + (value - minY) * scaleY),
    };
  }
  if (content.type === 'circle') {
    return { ...content, x: input.x, y: input.y, radiusX: (input.width ?? content.radiusX * 2) / 2, radiusY: (input.height ?? content.radiusY * 2) / 2 };
  }
  if (content.type === 'text') {
    return { ...content, x: input.x, y: input.y, fontSize: input.height ? Math.max(8, Math.min(96, input.height / 1.3)) : content.fontSize };
  }
  return { ...content, x: input.x, y: input.y, width: input.width ?? content.width, height: input.height ?? content.height };
}

function updateContentAppearance(
  content: CanvasContent,
  input: {
    color?: string; fillColor?: string; opacity?: number; strokeWidth?: number;
    fontSize?: number; text?: string;
  },
): CanvasContent {
  const base = {
    ...content,
    color: input.color ?? content.color,
    opacity: input.opacity ?? content.opacity,
  };
  if (base.type === 'rectangle' || base.type === 'circle') {
    return {
      ...base,
      fillColor: input.fillColor ?? base.fillColor,
      strokeWidth: input.strokeWidth ?? base.strokeWidth,
    };
  }
  if (base.type === 'pencil') {
    return { ...base, strokeWidth: input.strokeWidth ?? base.strokeWidth };
  }
  if (base.type === 'text') {
    return { ...base, fontSize: input.fontSize ?? base.fontSize, text: input.text ?? base.text };
  }
  return base;
}
