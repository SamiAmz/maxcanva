import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogle } from '@langchain/google/node';
import { ChatOpenAI } from '@langchain/openai';
import type { AiVisualReview, ProjectDocument } from '@maxcanva/shared';
import { runAiToolAgent } from '../application/aiToolAgent';
import { aiVisualReviewSchema, type AiModelProposal } from '../domain/aiSchemas';

export interface AiGenerationContext {
  prompt: string;
  document: ProjectDocument;
  activeWindowId: string;
  selectedContentIds: string[];
  revisionFeedback?: string[];
}

export interface ModelResult<T> {
  value: T;
  provider: 'google' | 'openrouter';
  model: string;
}

export interface AiProviderFailure {
  provider: 'google' | 'openrouter';
  name: string;
  message: string;
  status?: number;
}

export class AiProviderUnavailableError extends Error {
  constructor(readonly failures: AiProviderFailure[]) {
    super(failures.length > 0
      ? 'Tous les fournisseurs IA configurés ont échoué.'
      : 'Aucun fournisseur IA n’est configuré.');
    this.name = 'AiProviderUnavailableError';
  }
}

export class AiModelGateway {
  private readonly googleKey = process.env.GOOGLE_API_KEY?.trim();
  private readonly openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  private readonly googleModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';
  private readonly openRouterModel = process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free';
  // Un agent effectue plusieurs appels modèle-outil avant de terminer son brouillon.
  private readonly providerTimeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 90_000);

  get configured() {
    return Boolean(this.googleKey || this.openRouterKey);
  }

  async propose(context: AiGenerationContext): Promise<ModelResult<AiModelProposal>> {
    return this.withFallback(async (provider) => {
      const value = await runAiToolAgent(
        this.createModel(provider),
        context,
        this.providerTimeoutMs,
      );
      return {
        value,
        provider,
        model: provider === 'google' ? this.googleModel : this.openRouterModel,
      };
    });
  }

  async review(screenshotDataUrl: string, prompt: string): Promise<ModelResult<AiVisualReview>> {
    return this.withFallback(async (provider) => {
      const structured = this.createModel(provider).withStructuredOutput(
        aiVisualReviewSchema,
        { name: 'maxcanva_visual_review' },
      );
      const value = await structured.invoke([
        new SystemMessage(VISUAL_REVIEW_SYSTEM_PROMPT),
        new HumanMessage({
          content: [
            { type: 'text', text: `Demande originale : ${prompt}\nVérifie uniquement si l’image répond visuellement à cette demande.` },
            { type: 'image_url', image_url: { url: screenshotDataUrl } },
          ],
        }),
      ], { signal: AbortSignal.timeout(this.providerTimeoutMs) });
      return {
        value,
        provider,
        model: provider === 'openrouter' ? this.openRouterModel : this.googleModel,
      };
    });
  }

  private createModel(provider: 'google' | 'openrouter') {
    if (provider === 'google') {
      return new ChatGoogle({ apiKey: this.googleKey, model: this.googleModel, maxRetries: 0 });
    }
    return new ChatOpenAI({
      apiKey: this.openRouterKey,
      model: this.openRouterModel,
      temperature: 0.1,
      maxRetries: 0,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
          'X-Title': 'MaxCanva',
        },
      },
    });
  }

  private async withFallback<T>(operation: (provider: 'google' | 'openrouter') => Promise<ModelResult<T>>) {
    const failures: AiProviderFailure[] = [];
    const providers: Array<'openrouter' | 'google'> = ['openrouter', 'google'];
    for (const provider of providers) {
      if (provider === 'openrouter' && !this.openRouterKey) continue;
      if (provider === 'google' && !this.googleKey) continue;
      try {
        return await operation(provider);
      } catch (error) {
        failures.push(toProviderFailure(provider, error));
      }
    }
    throw new AiProviderUnavailableError(failures);
  }
}

function toProviderFailure(provider: 'google' | 'openrouter', error: unknown): AiProviderFailure {
  if (!(error instanceof Error)) {
    return { provider, name: 'UnknownError', message: 'Erreur inconnue.' };
  }
  const candidate = error as Error & { status?: number; statusCode?: number };
  return {
    provider,
    name: candidate.name,
    message: candidate.message.slice(0, 500),
    status: candidate.status ?? candidate.statusCode,
  };
}

const VISUAL_REVIEW_SYSTEM_PROMPT = `Tu es un vérificateur visuel de prototype. Observe la capture rendue, puis indique si elle satisfait la demande originale. Vérifie le débordement, la lisibilité, l’alignement, les chevauchements involontaires et la hiérarchie visuelle. Réponds exclusivement selon le schéma.`;
