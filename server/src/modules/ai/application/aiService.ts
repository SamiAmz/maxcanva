import type { AiProposal, AiProposalRequest, AiVisualReviewRequest } from '@maxcanva/shared';
import { AiProviderUnavailableError, AiModelGateway } from '../infrastructure/aiModelGateway';
import { SupabaseAiRunRepository } from '../infrastructure/supabaseAiRunRepository';
import { AiWorkflow, toPublicProposal } from './aiWorkflow';
import { applyAiCommands } from '../domain/applyAiCommands';

export type AiServiceErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_LIMIT_REACHED'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_INVALID_PROPOSAL'
  | 'AI_RUN_NOT_FOUND';

export class AiServiceError extends Error {
  constructor(readonly code: AiServiceErrorCode, readonly status: number, message: string, readonly cause?: unknown) {
    super(message);
  }
}

export class AiService {
  private readonly workflow: AiWorkflow;
  constructor(
    private readonly repository: SupabaseAiRunRepository,
    private readonly models: AiModelGateway,
  ) {
    this.workflow = new AiWorkflow(models);
  }

  async create(ownerId: string, request: AiProposalRequest): Promise<AiProposal> {
    if (!this.models.configured) {
      throw new AiServiceError('AI_NOT_CONFIGURED', 503, 'La création avec l’IA n’est pas encore configurée sur ce serveur.');
    }
    const dailyLimit = Number(process.env.AI_DAILY_REQUEST_LIMIT ?? 20);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (await this.repository.countSince(ownerId, today.toISOString()) >= dailyLimit) {
      throw new AiServiceError('AI_LIMIT_REACHED', 429, 'Vous avez atteint votre limite quotidienne de créations avec l’IA. Réessayez demain.');
    }

    const runId = crypto.randomUUID();
    try {
      const state = await this.workflow.propose({ runId, ...request });
      const proposal = toPublicProposal(runId, state);
      const now = new Date().toISOString();
      await this.repository.create({
        ...proposal,
        ownerId,
        projectId: request.projectId,
        prompt: request.prompt,
        sourceDocument: request.document,
        createdAt: now,
        updatedAt: now,
      });
      return proposal;
    } catch (error) {
      if (error instanceof AiProviderUnavailableError) {
        throw new AiServiceError('AI_PROVIDER_UNAVAILABLE', 503, 'Le service de création avec l’IA est temporairement indisponible. Réessayez dans quelques instants.', error);
      }
      throw new AiServiceError('AI_INVALID_PROPOSAL', 422, 'L’IA n’a pas réussi à produire une modification valide. Reformulez votre demande plus précisément.', error);
    }
  }

  async get(ownerId: string, runId: string): Promise<AiProposal> {
    const run = await this.requireRun(ownerId, runId);
    return publicRun(run);
  }

  async review(ownerId: string, runId: string, request: AiVisualReviewRequest): Promise<AiProposal> {
    const run = await this.requireRun(ownerId, runId);
    const review = await this.models.review(request.screenshotDataUrl, run.prompt);

    if (review.value.verdict === 'needs_revision' && !run.visualReview) {
      try {
        const correction = await this.models.propose({
          prompt: run.prompt,
          document: run.sourceDocument,
          activeWindowId: affectedWindowId(run) ?? run.sourceDocument.windows[0]?.id ?? '',
          selectedContentIds: [],
          revisionFeedback: review.value.issues,
        });
        const proposedDocument = applyAiCommands(run.sourceDocument, correction.value.commands);
        await this.repository.update(ownerId, runId, {
          status: 'awaiting_review',
          visualReview: review.value,
          summary: correction.value.summary,
          commands: correction.value.commands,
          proposedDocument,
          warnings: correction.value.warnings,
          provider: correction.provider,
          model: correction.model,
        });
        return {
          ...publicRun(run),
          status: 'awaiting_review',
          summary: correction.value.summary,
          commands: correction.value.commands,
          proposedDocument,
          warnings: correction.value.warnings,
          provider: correction.provider,
          model: correction.model,
          visualReview: review.value,
        };
      } catch {
        // La première proposition reste disponible; l’utilisateur garde le dernier mot.
      }
    }
    await this.repository.update(ownerId, runId, { visualReview: review.value, status: 'awaiting_approval' });
    return { ...publicRun(run), status: 'awaiting_approval', visualReview: review.value };
  }

  async approve(ownerId: string, runId: string) {
    const run = await this.requireRun(ownerId, runId);
    if (run.status === 'approved') return { runId, document: run.proposedDocument };
    if (run.status === 'rejected') {
      throw new AiServiceError('AI_RUN_NOT_FOUND', 409, 'Cette proposition a déjà été rejetée. Créez-en une nouvelle.');
    }
    // DATABASE_URL rend cette reprise persistante. Sans lui, l’approbation reste
    // sûre après un redémarrage grâce à l’état durable ai_runs.
    await this.workflow.decide(runId, true).catch(() => undefined);
    await this.repository.update(ownerId, runId, { status: 'approved' });
    return { runId, document: run.proposedDocument };
  }

  async reject(ownerId: string, runId: string) {
    const run = await this.requireRun(ownerId, runId);
    if (run.status !== 'approved' && run.status !== 'rejected') {
      await this.workflow.decide(runId, false).catch(() => undefined);
    }
    await this.repository.update(ownerId, runId, { status: 'rejected' });
  }

  private async requireRun(ownerId: string, runId: string) {
    const run = await this.repository.findById(ownerId, runId);
    if (!run) throw new AiServiceError('AI_RUN_NOT_FOUND', 404, 'Cette proposition IA n’existe plus ou ne vous appartient pas.');
    return run;
  }
}

function publicRun(run: Awaited<ReturnType<SupabaseAiRunRepository['findById']>> & {}) {
  return {
    runId: run.runId,
    status: run.status,
    summary: run.summary,
    commands: run.commands,
    proposedDocument: run.proposedDocument,
    warnings: run.warnings,
    provider: run.provider,
    model: run.model,
    visualReview: run.visualReview,
  } satisfies AiProposal;
}

function affectedWindowId(run: NonNullable<Awaited<ReturnType<SupabaseAiRunRepository['findById']>>>) {
  for (const command of run.commands) {
    if (command.type === 'add-content' || command.type === 'replace-content') return command.content.windowId;
    if (command.type === 'create-window') return command.window.id;
    if (command.type === 'rename-window' || command.type === 'delete-window') return command.windowId;
  }
  return undefined;
}
