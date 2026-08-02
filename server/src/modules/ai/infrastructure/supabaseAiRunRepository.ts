import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AiEditCommand, AiProposal, AiVisualReview, ProjectDocument } from '@maxcanva/shared';

export interface AiRunRecord extends AiProposal {
  ownerId: string;
  projectId?: string;
  prompt: string;
  sourceDocument: ProjectDocument;
  createdAt: string;
  updatedAt: string;
}

interface AiRunRow {
  id: string; owner_id: string; project_id: string | null; prompt: string; status: AiRunRecord['status'];
  summary: string; commands: AiEditCommand[]; source_document: ProjectDocument; proposed_document: ProjectDocument;
  warnings: string[]; provider: AiRunRecord['provider']; model: string; visual_review: AiVisualReview | null;
  created_at: string; updated_at: string;
}

export class SupabaseAiRunRepository {
  private readonly client: SupabaseClient;
  constructor(url: string, secret: string) {
    this.client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async create(run: AiRunRecord) {
    const { error } = await this.client.from('ai_runs').insert(toRow(run));
    if (error) throw error;
  }

  async findById(ownerId: string, id: string): Promise<AiRunRecord | null> {
    const { data, error } = await this.client.from('ai_runs').select('*').eq('owner_id', ownerId).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as AiRunRow) : null;
  }

  async update(ownerId: string, id: string, changes: Partial<Pick<AiRunRecord, 'status' | 'visualReview' | 'summary' | 'commands' | 'proposedDocument' | 'warnings' | 'provider' | 'model'>>) {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (changes.status) row.status = changes.status;
    if (changes.visualReview) row.visual_review = changes.visualReview;
    if (changes.summary) row.summary = changes.summary;
    if (changes.commands) row.commands = changes.commands;
    if (changes.proposedDocument) row.proposed_document = changes.proposedDocument;
    if (changes.warnings) row.warnings = changes.warnings;
    if (changes.provider) row.provider = changes.provider;
    if (changes.model) row.model = changes.model;
    const { error } = await this.client.from('ai_runs').update(row).eq('owner_id', ownerId).eq('id', id);
    if (error) throw error;
  }

  async countSince(ownerId: string, since: string) {
    const { count, error } = await this.client.from('ai_runs').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).gte('created_at', since);
    if (error) throw error;
    return count ?? 0;
  }
}

function toRow(run: AiRunRecord): AiRunRow {
  return {
    id: run.runId, owner_id: run.ownerId, project_id: run.projectId ?? null, prompt: run.prompt,
    status: run.status, summary: run.summary, commands: run.commands, source_document: run.sourceDocument,
    proposed_document: run.proposedDocument, warnings: run.warnings, provider: run.provider, model: run.model,
    visual_review: run.visualReview ?? null, created_at: run.createdAt, updated_at: run.updatedAt,
  };
}

function fromRow(row: AiRunRow): AiRunRecord {
  return {
    runId: row.id, ownerId: row.owner_id, projectId: row.project_id ?? undefined, prompt: row.prompt,
    status: row.status, summary: row.summary, commands: row.commands, sourceDocument: row.source_document,
    proposedDocument: row.proposed_document, warnings: row.warnings, provider: row.provider, model: row.model,
    visualReview: row.visual_review ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
