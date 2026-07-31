import type { ProjectDocument } from '@maxcanva/shared';

const DRAFT_KEY = 'maxcanva.session-draft.v1';

export function saveSessionDraft(document: ProjectDocument) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(document));
  } catch {
    // Le stockage local peut être indisponible en navigation privée stricte.
  }
}

export function loadSessionDraft(): ProjectDocument | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ProjectDocument>;
    if (
      value.schemaVersion !== 1 ||
      typeof value.title !== 'string' ||
      !Array.isArray(value.windows) ||
      value.windows.length === 0 ||
      !Array.isArray(value.contents) ||
      !Array.isArray(value.groups) ||
      !Array.isArray(value.interactions)
    ) {
      return null;
    }
    return value as ProjectDocument;
  } catch {
    return null;
  }
}
