import {
  PROTOTYPE_PAGE_HEIGHT,
  PROTOTYPE_PAGE_WIDTH,
  type AiEditCommand,
  type CanvasContent,
  type ProjectDocument,
} from '@maxcanva/shared';
import { projectDocumentSchema } from './aiSchemas';

export class AiCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiCommandError';
  }
}

export function applyAiCommands(
  source: ProjectDocument,
  commands: AiEditCommand[],
): ProjectDocument {
  const document = structuredClone(source);

  for (const command of commands) {
    switch (command.type) {
      case 'set-project-title':
        document.title = command.title.trim();
        break;
      case 'create-window':
        ensure(!document.windows.some(({ id }) => id === command.window.id), `L’identifiant ${command.window.id} existe déjà.`);
        document.windows.push(command.window);
        break;
      case 'rename-window': {
        const window = document.windows.find(({ id }) => id === command.windowId);
        ensure(window, `La fenêtre ${command.windowId} n’existe pas.`);
        window.name = command.name.trim();
        break;
      }
      case 'delete-window':
        ensure(document.windows.length > 1, 'La dernière fenêtre ne peut pas être supprimée.');
        ensure(document.windows.some(({ id }) => id === command.windowId), `La fenêtre ${command.windowId} n’existe pas.`);
        document.windows = document.windows.filter(({ id }) => id !== command.windowId);
        document.contents = document.contents.filter(({ windowId }) => windowId !== command.windowId);
        cleanupReferences(document);
        break;
      case 'clear-window': {
        ensure(document.windows.some(({ id }) => id === command.windowId), `La fenêtre ${command.windowId} n’existe pas.`);
        const removedIds = new Set(
          document.contents
            .filter(({ windowId }) => windowId === command.windowId)
            .map(({ id }) => id),
        );
        document.contents = document.contents.filter(({ windowId }) => windowId !== command.windowId);
        document.groups = document.groups.filter(({ windowId }) => windowId !== command.windowId);
        document.interactions = document.interactions
          .filter(({ sourceWindowId }) => sourceWindowId !== command.windowId)
          .map((interaction) => ({
            ...interaction,
            contentIds: interaction.contentIds.filter((id) => !removedIds.has(id)),
          }))
          .filter(({ contentIds }) => contentIds.length > 0);
        break;
      }
      case 'create-navigation-button':
        createNavigationButton(document, command.button);
        break;
      case 'add-content':
        ensure(!document.contents.some(({ id }) => id === command.content.id), `Le contenu ${command.content.id} existe déjà.`);
        validateContent(command.content, document);
        document.contents.push(command.content);
        break;
      case 'replace-content': {
        const index = document.contents.findIndex(({ id }) => id === command.content.id);
        ensure(index >= 0, `Le contenu ${command.content.id} n’existe pas.`);
        validateContent(command.content, document);
        document.contents[index] = command.content;
        break;
      }
      case 'delete-content':
        ensure(document.contents.some(({ id }) => id === command.contentId), `Le contenu ${command.contentId} n’existe pas.`);
        document.contents = document.contents.filter(({ id }) => id !== command.contentId);
        cleanupReferences(document);
        break;
      case 'create-group':
        ensure(!document.groups.some(({ id }) => id === command.group.id), `Le groupe ${command.group.id} existe déjà.`);
        ensure(document.windows.some(({ id }) => id === command.group.windowId), `La fenêtre ${command.group.windowId} n’existe pas.`);
        for (const contentId of command.group.contentIds) {
          ensure(
            document.contents.some(({ id, windowId }) => id === contentId && windowId === command.group.windowId),
            `Le contenu ${contentId} n’existe pas dans la fenêtre du groupe.`,
          );
        }
        document.groups = document.groups
          .map((group) => ({ ...group, contentIds: group.contentIds.filter((id) => !command.group.contentIds.includes(id)) }))
          .filter(({ contentIds }) => contentIds.length > 1);
        document.groups.push(command.group);
        break;
      case 'delete-group':
        ensure(document.groups.some(({ id }) => id === command.groupId), `Le groupe ${command.groupId} n’existe pas.`);
        document.groups = document.groups.filter(({ id }) => id !== command.groupId);
        break;
      case 'create-interaction':
        ensure(!document.interactions.some(({ id }) => id === command.interaction.id), `L’interaction ${command.interaction.id} existe déjà.`);
        validateInteraction(command.interaction, document);
        document.interactions = document.interactions
          .map((item) => ({ ...item, contentIds: item.contentIds.filter((id) => !command.interaction.contentIds.includes(id)) }))
          .filter((item) => item.contentIds.length > 0);
        document.interactions.push(command.interaction);
        break;
      case 'delete-interaction':
        document.interactions = document.interactions.filter(({ id }) => id !== command.interactionId);
        break;
    }
  }

  cleanupReferences(document);
  return projectDocumentSchema.parse(document) as ProjectDocument;
}

function createNavigationButton(
  document: ProjectDocument,
  button: Extract<AiEditCommand, { type: 'create-navigation-button' }>['button'],
) {
  ensure(document.windows.some(({ id }) => id === button.windowId), `La fenêtre source ${button.windowId} n’existe pas.`);
  ensure(document.windows.some(({ id }) => id === button.targetWindowId), `La fenêtre cible ${button.targetWindowId} n’existe pas.`);
  ensure(button.windowId !== button.targetWindowId, 'Un bouton de navigation doit cibler une autre fenêtre.');
  ensure(
    button.x >= 0 && button.y >= 0 &&
      button.x + button.width <= PROTOTYPE_PAGE_WIDTH &&
      button.y + button.height <= PROTOTYPE_PAGE_HEIGHT,
    'Le bouton de navigation dépasse du plan de dessin.',
  );

  const shapeId = `${button.id}-shape`;
  const labelId = `${button.id}-label`;
  const groupId = `${button.id}-group`;
  const interactionId = `${button.id}-interaction`;
  ensure(
    !document.contents.some(({ id }) => id === shapeId || id === labelId) &&
      !document.groups.some(({ id }) => id === groupId) &&
      !document.interactions.some(({ id }) => id === interactionId),
    `L’identifiant de bouton ${button.id} existe déjà.`,
  );

  const preferredFontSize = button.height >= 52 ? 18 : 16;
  const fontSize = Math.max(
    12,
    Math.min(preferredFontSize, (button.width - 24) / Math.max(1, button.label.length * 0.56)),
  );
  const estimatedLabelWidth = button.label.length * fontSize * 0.56;
  document.contents.push(
    {
      id: shapeId,
      windowId: button.windowId,
      type: 'rectangle',
      x: button.x,
      y: button.y,
      width: button.width,
      height: button.height,
      color: button.backgroundColor,
      fillColor: button.backgroundColor,
      strokeWidth: 2,
      opacity: 1,
    },
    {
      id: labelId,
      windowId: button.windowId,
      type: 'text',
      x: Math.max(button.x + 12, button.x + (button.width - estimatedLabelWidth) / 2),
      y: button.y + (button.height - fontSize * 1.25) / 2,
      text: button.label,
      fontSize,
      color: button.textColor,
      opacity: 1,
    },
  );
  document.groups.push({ id: groupId, windowId: button.windowId, contentIds: [shapeId, labelId] });
  document.interactions.push({
    id: interactionId,
    sourceWindowId: button.windowId,
    targetWindowId: button.targetWindowId,
    contentIds: [shapeId, labelId],
    type: 'button',
  });
}

function validateContent(content: CanvasContent, document: ProjectDocument) {
  ensure(document.windows.some(({ id }) => id === content.windowId), `La fenêtre ${content.windowId} n’existe pas.`);
  if (content.type === 'pencil') {
    ensure(content.points.length % 2 === 0, 'Une ligne doit contenir des paires de coordonnées.');
    for (let index = 0; index < content.points.length; index += 2) {
      ensure(inPage(content.points[index]!, content.points[index + 1]!), 'Une ligne dépasse du plan de dessin.');
    }
    return;
  }
  ensure(inPage(content.x, content.y), `Le contenu ${content.id} commence hors du plan de dessin.`);
  const bounds = getExtent(content);
  ensure(bounds.x <= PROTOTYPE_PAGE_WIDTH && bounds.y <= PROTOTYPE_PAGE_HEIGHT, `Le contenu ${content.id} dépasse du plan de dessin.`);
}

function validateInteraction(interaction: ProjectDocument['interactions'][number], document: ProjectDocument) {
  ensure(document.windows.some(({ id }) => id === interaction.sourceWindowId), 'La fenêtre source de l’interaction n’existe pas.');
  if (interaction.type === 'button') {
    ensure(Boolean(interaction.targetWindowId), 'Un bouton doit cibler une fenêtre.');
    ensure(document.windows.some(({ id }) => id === interaction.targetWindowId), 'La fenêtre cible de l’interaction n’existe pas.');
  } else {
    ensure(Boolean(interaction.url), 'Un hyperlien doit contenir une adresse web.');
  }
  for (const contentId of interaction.contentIds) {
    ensure(document.contents.some(({ id, windowId }) => id === contentId && windowId === interaction.sourceWindowId), `Le contenu ${contentId} n’existe pas dans la fenêtre source.`);
  }
}

function getExtent(content: Exclude<CanvasContent, { type: 'pencil' }>) {
  switch (content.type) {
    case 'circle': return { x: content.x + content.radiusX, y: content.y + content.radiusY };
    case 'text': return { x: content.x + Math.max(10, content.text.length * content.fontSize * 0.65), y: content.y + content.fontSize * 1.3 };
    default: return { x: content.x + content.width, y: content.y + content.height };
  }
}

function cleanupReferences(document: ProjectDocument) {
  const windowIds = new Set(document.windows.map(({ id }) => id));
  const contentIds = new Set(document.contents.map(({ id }) => id));
  document.groups = document.groups
    .filter(({ windowId }) => windowIds.has(windowId))
    .map((group) => ({ ...group, contentIds: group.contentIds.filter((id) => contentIds.has(id)) }))
    .filter(({ contentIds }) => contentIds.length > 1);
  document.interactions = document.interactions
    .filter(({ sourceWindowId, targetWindowId }) => windowIds.has(sourceWindowId) && (!targetWindowId || windowIds.has(targetWindowId)))
    .map((interaction) => ({ ...interaction, contentIds: interaction.contentIds.filter((id) => contentIds.has(id)) }))
    .filter(({ contentIds }) => contentIds.length > 0);
}

function inPage(x: number, y: number) {
  return x >= 0 && y >= 0 && x <= PROTOTYPE_PAGE_WIDTH && y <= PROTOTYPE_PAGE_HEIGHT;
}

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new AiCommandError(message);
}
