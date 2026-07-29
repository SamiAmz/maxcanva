import type {
  AssistantChangeSet,
  AssistantRequest,
} from '@maxcanva/shared';

/**
 * Ce port sera implémenté par un client HTTP.
 * Aucune clé ni requête vers un fournisseur LLM ne doit vivre dans le navigateur.
 */
export interface AssistantGateway {
  proposeChanges(request: AssistantRequest): Promise<AssistantChangeSet>;
}
