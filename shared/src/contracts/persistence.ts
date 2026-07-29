import type { ProjectDocument } from './project';

export interface ProjectSummary {
  id: string;
  title: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredProject extends ProjectSummary {
  ownerId: string;
  document: ProjectDocument;
}

export interface SaveProjectInput {
  id: string;
  document: ProjectDocument;
  expectedRevision?: number;
}
