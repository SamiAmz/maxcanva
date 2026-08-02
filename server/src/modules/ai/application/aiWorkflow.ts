import { Command, END, interrupt, MemorySaver, START, StateGraph, StateSchema } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { z } from 'zod';
import type { AiEditCommand, AiProposal, AiVisualReview, ProjectDocument } from '@maxcanva/shared';
import { applyAiCommands } from '../domain/applyAiCommands';
import { AiModelGateway } from '../infrastructure/aiModelGateway';

const WorkflowState = new StateSchema({
  prompt: z.string(),
  sourceDocument: z.custom<ProjectDocument>(),
  activeWindowId: z.string(),
  selectedContentIds: z.array(z.string()),
  summary: z.string().default(''),
  commands: z.custom<AiEditCommand[]>().default(() => []),
  proposedDocument: z.custom<ProjectDocument>().optional(),
  warnings: z.array(z.string()).default(() => []),
  provider: z.enum(['google', 'openrouter']).optional(),
  model: z.string().optional(),
  approved: z.boolean().optional(),
});

export class AiWorkflow {
  private graphPromise?: Promise<ReturnType<ReturnType<AiWorkflow['buildGraph']>['compile']>>;
  constructor(private readonly models: AiModelGateway) {}

  async propose(input: { runId: string; prompt: string; document: ProjectDocument; activeWindowId: string; selectedContentIds: string[] }) {
    const graph = await this.graph();
    const config = { configurable: { thread_id: input.runId } };
    await graph.invoke({
      prompt: input.prompt,
      sourceDocument: input.document,
      activeWindowId: input.activeWindowId,
      selectedContentIds: input.selectedContentIds,
    }, config);
    const state = await graph.getState(config);
    return state.values as typeof WorkflowState.State;
  }

  async decide(runId: string, approved: boolean) {
    const graph = await this.graph();
    const config = { configurable: { thread_id: runId } };
    await graph.invoke(new Command({ resume: { approved } }), config);
    return (await graph.getState(config)).values as typeof WorkflowState.State;
  }

  private async graph() {
    if (!this.graphPromise) this.graphPromise = this.createGraph();
    return this.graphPromise;
  }

  private async createGraph() {
    const checkpointer = process.env.DATABASE_URL
      ? PostgresSaver.fromConnString(process.env.DATABASE_URL)
      : new MemorySaver();
    if (checkpointer instanceof PostgresSaver) await checkpointer.setup();
    return this.buildGraph().compile({ checkpointer });
  }

  private buildGraph() {
    return new StateGraph(WorkflowState)
      .addNode('generate', async (state) => {
        const result = await this.models.propose({
          prompt: state.prompt,
          document: state.sourceDocument,
          activeWindowId: state.activeWindowId,
          selectedContentIds: state.selectedContentIds,
        });
        return {
          summary: result.value.summary,
          commands: result.value.commands,
          proposedDocument: applyAiCommands(state.sourceDocument, result.value.commands),
          warnings: result.value.warnings,
          provider: result.provider,
          model: result.model,
        };
      })
      .addNode('approval', (state) => {
        const decision = interrupt<{ kind: 'approval'; summary: string }, { approved: boolean }>({ kind: 'approval', summary: state.summary });
        return { approved: decision.approved };
      })
      .addEdge(START, 'generate')
      .addEdge('generate', 'approval')
      .addEdge('approval', END);
  }
}

export function toPublicProposal(runId: string, state: typeof WorkflowState.State, visualReview?: AiVisualReview): AiProposal {
  if (!state.proposedDocument || !state.provider || !state.model) throw new Error('Incomplete AI workflow state');
  return {
    runId,
    status: visualReview ? 'awaiting_approval' : 'awaiting_review',
    summary: state.summary,
    commands: state.commands,
    proposedDocument: state.proposedDocument,
    warnings: state.warnings,
    provider: state.provider,
    model: state.model,
    visualReview,
  };
}
