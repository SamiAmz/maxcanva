import type { ProjectSummary, SaveProjectInput, StoredProject } from '@maxcanva/shared';
import type { ProjectRepository } from '@/application/ports/projectRepository';
import { apiRequest } from '@/infrastructure/http/apiRequest';

export { ApiRequestError as ProjectRequestError } from '@/infrastructure/http/apiRequest';

class HttpProjectRepository implements ProjectRepository {
  list(): Promise<ProjectSummary[]> {
    return apiRequest('/api/projects');
  }

  get(id: string): Promise<StoredProject | null> {
    return apiRequest(`/api/projects/${id}`, { allowStatus: 404 });
  }

  save(input: SaveProjectInput): Promise<StoredProject> {
    return apiRequest(`/api/projects/${input.id}`, {
      method: 'PUT',
      json: {
        document: input.document,
        expectedRevision: input.expectedRevision,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await apiRequest(`/api/projects/${id}`, { method: 'DELETE' });
  }
}

export const projectRepository = new HttpProjectRepository();
