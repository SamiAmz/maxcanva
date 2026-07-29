import type {
  ProjectSummary,
  SaveProjectInput,
  StoredProject,
} from '@maxcanva/shared';

/**
 * Frontière unique pour une persistance distante ou locale.
 * Une implémentation IndexedDB et une implémentation HTTP pourront respecter
 * ce contrat sans modifier les composants de l'éditeur.
 */
export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<StoredProject | null>;
  save(input: SaveProjectInput): Promise<StoredProject>;
  delete(id: string): Promise<void>;
}
