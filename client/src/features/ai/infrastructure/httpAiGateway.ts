import type {
  AiProposal,
  AiProposalDecisionResponse,
  AiProposalRequest,
} from '@maxcanva/shared';
import { apiRequest } from '@/infrastructure/http/apiRequest';

class HttpAiGateway {
  create(input: AiProposalRequest): Promise<AiProposal> {
    return apiRequest('/api/ai/proposals', { method: 'POST', json: input });
  }

  get(runId: string): Promise<AiProposal | null> {
    return apiRequest(`/api/ai/proposals/${runId}`, { allowStatus: 404 });
  }

  review(runId: string, screenshotDataUrl: string): Promise<AiProposal> {
    return apiRequest(`/api/ai/proposals/${runId}/review`, {
      method: 'POST',
      json: { screenshotDataUrl },
    });
  }

  approve(runId: string): Promise<AiProposalDecisionResponse> {
    return apiRequest(`/api/ai/proposals/${runId}/approve`, { method: 'POST', json: {} });
  }

  async reject(runId: string): Promise<void> {
    await apiRequest(`/api/ai/proposals/${runId}/reject`, { method: 'POST', json: {} });
  }
}

export const aiGateway = new HttpAiGateway();
