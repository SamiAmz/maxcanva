import type {
  AuthErrorPayload,
  ProjectSummary,
  SaveProjectInput,
  StoredProject,
} from '@maxcanva/shared';
import type { ProjectRepository } from '@/application/ports/projectRepository';

export class ProjectRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

export class HttpProjectRepository implements ProjectRepository {
  list(): Promise<ProjectSummary[]> {
    return this.request('/api/projects');
  }

  get(id: string): Promise<StoredProject | null> {
    return this.request(`/api/projects/${id}`, undefined, true);
  }

  save(input: SaveProjectInput): Promise<StoredProject> {
    return this.request(`/api/projects/${input.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        document: input.document,
        expectedRevision: input.expectedRevision,
      }),
    });
  }

  async delete(id: string): Promise<void> {
    await this.request(`/api/projects/${id}`, { method: 'DELETE' });
  }

  private async request<T>(
    path: string,
    options?: RequestInit,
    allowNotFound = false,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(path, {
        ...options,
        credentials: 'include',
        headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
      });
    } catch {
      throw new ProjectRequestError(
        'Impossible de joindre le serveur.',
        'NETWORK_ERROR',
      );
    }

    if (allowNotFound && response.status === 404) return null as T;
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as AuthErrorPayload | null;
      throw new ProjectRequestError(
        payload?.error.message ?? 'Une erreur est survenue.',
        payload?.error.code ?? 'UNKNOWN_ERROR',
        payload?.error.requestId,
      );
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}

export const projectRepository = new HttpProjectRepository();
