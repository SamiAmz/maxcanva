import type { CanvasContent, ContentGroup, ProjectDocument, PrototypeInteraction, PrototypeWindow } from './project';

export type AiEditCommand =
  | { type: 'set-project-title'; title: string }
  | { type: 'create-window'; window: PrototypeWindow }
  | { type: 'rename-window'; windowId: string; name: string }
  | { type: 'delete-window'; windowId: string }
  | { type: 'clear-window'; windowId: string }
  | {
      type: 'create-navigation-button';
      button: {
        id: string;
        windowId: string;
        targetWindowId: string;
        label: string;
        x: number;
        y: number;
        width: number;
        height: number;
        backgroundColor: string;
        textColor: string;
      };
    }
  | { type: 'add-content'; content: CanvasContent }
  | { type: 'replace-content'; content: CanvasContent }
  | { type: 'delete-content'; contentId: string }
  | { type: 'create-group'; group: ContentGroup }
  | { type: 'delete-group'; groupId: string }
  | { type: 'create-interaction'; interaction: PrototypeInteraction }
  | { type: 'delete-interaction'; interactionId: string };

export interface AiProposalRequest {
  prompt: string;
  document: ProjectDocument;
  activeWindowId: string;
  selectedContentIds: string[];
  projectId?: string;
}

export interface AiProposal {
  runId: string;
  status: 'awaiting_review' | 'awaiting_approval' | 'approved' | 'rejected';
  summary: string;
  commands: AiEditCommand[];
  proposedDocument: ProjectDocument;
  warnings: string[];
  provider: 'google' | 'openrouter';
  model: string;
  visualReview?: AiVisualReview;
}

export interface AiVisualReview {
  verdict: 'accepted' | 'needs_revision' | 'unavailable';
  summary: string;
  issues: string[];
}

export interface AiVisualReviewRequest {
  screenshotDataUrl: string;
}

export interface AiProposalDecisionResponse {
  runId: string;
  document: ProjectDocument;
}
