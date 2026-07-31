import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ProjectDocument,
  ProjectSummary,
  SaveProjectInput,
  StoredProject,
} from '@maxcanva/shared';
import {
  ProjectConflictError,
  type ProjectRepository,
} from '../application/projectPorts';

interface ProjectRow {
  id: string;
  owner_id: string;
  title: string;
  document: ProjectDocument;
  revision: number;
  created_at: string;
  updated_at: string;
}

const PROJECT_COLUMNS =
  'id,owner_id,title,document,revision,created_at,updated_at';

export class SupabaseProjectRepository implements ProjectRepository {
  private readonly client: SupabaseClient;

  constructor(url: string, secretKey: string) {
    this.client = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async list(ownerId: string): Promise<ProjectSummary[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('id,title,revision,created_at,updated_at')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Supabase project list failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findById(ownerId: string, projectId: string): Promise<StoredProject | null> {
    const { data, error } = await this.client
      .from('projects')
      .select(PROJECT_COLUMNS)
      .eq('owner_id', ownerId)
      .eq('id', projectId)
      .maybeSingle<ProjectRow>();

    if (error) throw new Error(`Supabase project lookup failed: ${error.message}`);
    return data ? toStoredProject(data) : null;
  }

  async save(ownerId: string, input: SaveProjectInput): Promise<StoredProject> {
    if (input.expectedRevision === undefined) {
      const { data, error } = await this.client
        .from('projects')
        .insert({
          id: input.id,
          owner_id: ownerId,
          title: input.document.title,
          document: input.document,
          revision: 1,
        })
        .select(PROJECT_COLUMNS)
        .single<ProjectRow>();

      if (error?.code === '23505') throw new ProjectConflictError();
      if (error) throw new Error(`Supabase project creation failed: ${error.message}`);
      return toStoredProject(data);
    }

    const { data, error } = await this.client
      .from('projects')
      .update({
        title: input.document.title,
        document: input.document,
        revision: input.expectedRevision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('owner_id', ownerId)
      .eq('id', input.id)
      .eq('revision', input.expectedRevision)
      .select(PROJECT_COLUMNS)
      .maybeSingle<ProjectRow>();

    if (error) throw new Error(`Supabase project update failed: ${error.message}`);
    if (!data) throw new ProjectConflictError();
    return toStoredProject(data);
  }

  async delete(ownerId: string, projectId: string): Promise<void> {
    const { error } = await this.client
      .from('projects')
      .delete()
      .eq('owner_id', ownerId)
      .eq('id', projectId);
    if (error) throw new Error(`Supabase project deletion failed: ${error.message}`);
  }
}

function toStoredProject(row: ProjectRow): StoredProject {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    document: row.document,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
