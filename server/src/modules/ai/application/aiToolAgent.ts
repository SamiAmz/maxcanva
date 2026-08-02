import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { createAgent, toolCallLimitMiddleware } from 'langchain';
import type { AiGenerationContext } from '../infrastructure/aiModelGateway';
import type { AiModelProposal } from '../domain/aiSchemas';
import { AiToolSession } from './aiToolSession';

const SYSTEM_PROMPT = `Tu es l’assistant de conception de MaxCanva. Tu modifies un brouillon de prototype uniquement avec les outils fournis.

Procédure obligatoire :
1. Appelle inspect_project avant toute autre action.
2. Si la demande concerne un élément existant, appelle inspect_selection puis inspect_window.
3. Utilise les identifiants exacts retournés par les outils. N’invente jamais l’identifiant d’un élément existant.
4. Si une sélection doit ouvrir une autre page, utilise make_selection_navigate. Ne crée pas un second bouton.
5. Une page signifie une fenêtre. Sans précision, utilise la fenêtre active.
6. Ne crée une fenêtre que si l’utilisateur le demande explicitement.
7. Modifie uniquement ce qui est demandé et conserve le reste.
8. Tous les éléments doivent rester dans le canvas de 1100 × 640 pixels.
9. Termine chaque proposition contenant une modification par validate_draft.

Les outils appliquent chaque commande à un brouillon validé. Une erreur d’outil signifie que tu dois corriger tes paramètres et réessayer. Ta réponse finale doit résumer brièvement les changements réellement appliqués, sans code.`;

export async function runAiToolAgent(
  model: BaseChatModel,
  context: AiGenerationContext,
  timeoutMs: number,
): Promise<AiModelProposal> {
  const session = new AiToolSession(context);
  const agent = createAgent({
    model,
    tools: session.tools,
    systemPrompt: SYSTEM_PROMPT,
    middleware: [toolCallLimitMiddleware({ runLimit: 30 })],
  });
  const result = await agent.invoke({
    messages: [{ role: 'user', content: buildUserMessage(context) }],
  }, {
    recursionLimit: 70,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const { commands } = session.result;
  if (commands.length === 0) throw new Error('L’agent n’a appliqué aucune modification au brouillon.');
  return {
    summary: extractLastAssistantText(result.messages) || 'Modifications préparées avec les outils de l’assistant.',
    commands,
    warnings: [],
  };
}

function buildUserMessage(context: AiGenerationContext) {
  return [
    `Demande : ${context.prompt}`,
    `Fenêtre active : ${context.activeWindowId}`,
    `Sélection actuelle : ${context.selectedContentIds.join(', ') || 'aucune'}`,
    context.revisionFeedback?.length
      ? `Corrections demandées après la revue visuelle : ${context.revisionFeedback.join(' | ')}`
      : '',
  ].filter(Boolean).join('\n');
}

function extractLastAssistantText(messages: BaseMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.getType() !== 'ai') continue;
    if (typeof message.content === 'string') return message.content.slice(0, 500).trim();
    const text = message.content
      .filter((block): block is { type: 'text'; text: string } =>
        typeof block === 'object' && block !== null && block.type === 'text' && typeof block.text === 'string')
      .map(({ text }) => text)
      .join(' ')
      .trim();
    return text.slice(0, 500);
  }
  return '';
}
