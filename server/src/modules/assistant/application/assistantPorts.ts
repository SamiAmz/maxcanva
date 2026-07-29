import type {
  AssistantChangeSet,
  AssistantRequest,
} from '@maxcanva/shared';

/**
 * Le fournisseur concret pourra être OpenAI ou un autre LLM.
 * La validation des commandes proposées restera sous le contrôle du serveur.
 */
export interface AssistantModelGateway {
  proposeChanges(request: AssistantRequest): Promise<AssistantChangeSet>;
}
