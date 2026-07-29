import {
  PROJECT_DOCUMENT_VERSION,
  type CanvasContent,
  type ContentGroup,
  type ProjectDocument,
  type PrototypeInteraction,
  type PrototypeWindow,
} from '@maxcanva/shared';

interface ProjectState {
  projectTitle: string;
  windows: PrototypeWindow[];
  contents: CanvasContent[];
  groups: ContentGroup[];
  interactions: PrototypeInteraction[];
}

/**
 * Isole le format persistant de l'état temporaire de l'éditeur
 * (outil actif, sélection, historique et préférences de dessin).
 */
export function toProjectDocument(state: ProjectState): ProjectDocument {
  return {
    schemaVersion: PROJECT_DOCUMENT_VERSION,
    title: state.projectTitle,
    windows: state.windows,
    contents: state.contents,
    groups: state.groups,
    interactions: state.interactions,
  };
}
