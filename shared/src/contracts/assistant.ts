import type {
  CanvasContent,
  ContentGroup,
  ProjectDocument,
  PrototypeInteraction,
  PrototypeWindow,
} from './project';

export type PrototypeCommand =
  | { type: 'window.create'; window: PrototypeWindow }
  | { type: 'window.update'; window: PrototypeWindow }
  | { type: 'window.delete'; windowId: string }
  | { type: 'content.create'; content: CanvasContent }
  | { type: 'content.replace'; content: CanvasContent }
  | { type: 'content.delete'; contentId: string }
  | { type: 'group.upsert'; group: ContentGroup }
  | { type: 'group.delete'; groupId: string }
  | {
      type: 'interaction.upsert';
      interaction: PrototypeInteraction;
    }
  | { type: 'interaction.delete'; interactionId: string };

export interface AssistantRequest {
  instruction: string;
  project: ProjectDocument;
  context: {
    activeWindowId: string;
    selectedContentIds: string[];
  };
}

/**
 * Le modèle propose des commandes structurées. Le serveur devra les valider
 * avant que le client les applique comme une seule opération annulable.
 */
export interface AssistantChangeSet {
  summary: string;
  commands: PrototypeCommand[];
}
