import type {
  ProjectSummary,
  SaveProjectInput,
  StoredProject,
} from '@maxcanva/shared';

/**
 * Le ownerId est obligatoire à chaque opération afin que l'autorisation
 * reste une règle du serveur et non une convention du client.
 */
export interface ProjectRepository {
  list(ownerId: string): Promise<ProjectSummary[]>;
  findById(ownerId: string, projectId: string): Promise<StoredProject | null>;
  save(ownerId: string, input: SaveProjectInput): Promise<StoredProject>;
  delete(ownerId: string, projectId: string): Promise<void>;
}
