import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { AiProposal } from '@maxcanva/shared';
import { createPortal } from 'react-dom';
import { ApiRequestError } from '@/infrastructure/http/apiRequest';
import { toProjectDocument } from '@/domain/project/projectDocument';
import { useEditorStore } from '@/features/editor/store/useEditorStore';
import { aiGateway } from '../infrastructure/httpAiGateway';
import { AiProjectPreview } from './AiProjectPreview';

const PENDING_RUN_KEY = 'maxcanva.ai.pending-run';

interface AiAssistantDialogProps {
  open: boolean;
  projectId: string | null;
  onClose: () => void;
  onApplied: () => void;
}

export function AiAssistantDialog({ open, projectId, onClose, onApplied }: AiAssistantDialogProps) {
  const titleId = useId();
  const [prompt, setPrompt] = useState('');
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [busy, setBusy] = useState<'generate' | 'review' | 'apply' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reviewStartedRef = useRef(false);

  useEffect(() => {
    if (!open || proposal || busy) return;
    const pendingRun = sessionStorage.getItem(PENDING_RUN_KEY);
    if (!pendingRun) return;
    setBusy('generate');
    void aiGateway.get(pendingRun)
      .then((result) => {
        if (result && result.status !== 'approved' && result.status !== 'rejected') setProposal(result);
        else sessionStorage.removeItem(PENDING_RUN_KEY);
      })
      .catch(() => sessionStorage.removeItem(PENDING_RUN_KEY))
      .finally(() => setBusy(null));
  }, [busy, open, proposal]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [busy, onClose, open]);

  const generate = async () => {
    if (prompt.trim().length < 3) {
      setError('Décrivez en quelques mots ce que vous voulez créer ou modifier.');
      return;
    }
    setBusy('generate');
    setError(null);
    setProposal(null);
    reviewStartedRef.current = false;
    try {
      const state = useEditorStore.getState();
      const result = await aiGateway.create({
        prompt: prompt.trim(),
        document: toProjectDocument(state),
        activeWindowId: state.activeWindowId,
        selectedContentIds: state.selectedContentIds,
        projectId: projectId ?? undefined,
      });
      sessionStorage.setItem(PENDING_RUN_KEY, result.runId);
      setProposal(result);
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(null);
    }
  };

  const reviewScreenshot = useCallback(async (screenshot: string) => {
    if (!proposal || reviewStartedRef.current || proposal.status !== 'awaiting_review') return;
    reviewStartedRef.current = true;
    setBusy('review');
    try {
      const reviewed = await aiGateway.review(proposal.runId, screenshot);
      setProposal(reviewed);
      if (reviewed.status === 'awaiting_review') reviewStartedRef.current = false;
    } catch (caught) {
      setError(`L’aperçu est prêt, mais la vérification visuelle n’a pas abouti. ${friendlyError(caught)}`);
    } finally {
      setBusy(null);
    }
  }, [proposal]);

  const approve = async () => {
    if (!proposal) return;
    setBusy('apply');
    setError(null);
    try {
      const result = await aiGateway.approve(proposal.runId);
      useEditorStore.getState().applyProjectDocument(result.document);
      sessionStorage.removeItem(PENDING_RUN_KEY);
      setProposal(null);
      setPrompt('');
      onApplied();
      onClose();
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(null);
    }
  };

  const discard = async () => {
    if (proposal) await aiGateway.reject(proposal.runId).catch(() => undefined);
    sessionStorage.removeItem(PENDING_RUN_KEY);
    setProposal(null);
    setPrompt('');
    setError(null);
    reviewStartedRef.current = false;
  };

  if (!open) return null;

  return createPortal(
    <div className="dialog-backdrop ai-dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="ai-assistant-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="ai-dialog-header">
          <div className="ai-dialog-mark" aria-hidden="true">✦</div>
          <div>
            <span className="dialog-eyebrow">Assistant de création</span>
            <h2 id={titleId}>{proposal ? 'Vérifiez la proposition' : 'Créer avec l’IA'}</h2>
          </div>
          <button className="dialog-close-button" type="button" aria-label="Fermer" disabled={Boolean(busy)} onClick={onClose}>×</button>
        </header>

        {!proposal ? (
          <>
            <p className="dialog-description">Décrivez le résultat voulu. L’assistant prépare des modifications, mais ne touche au projet qu’après votre confirmation.</p>
            <p className="ai-data-note">Le prompt, le prototype courant et son aperçu sont traités par le fournisseur IA configuré sur le serveur.</p>
            <label className="ai-prompt-field">
              <span>Votre demande</span>
              <textarea
                autoFocus
                value={prompt}
                maxLength={2000}
                placeholder="Ex. Crée une page de connexion avec un titre, deux champs et un bouton violet."
                onChange={(event) => setPrompt(event.target.value)}
              />
              <small>{prompt.length}/2000</small>
            </label>
            <div className="ai-prompt-examples" aria-label="Exemples de demandes">
              {['Créer une page de connexion', 'Aligner et espacer la sélection', 'Ajouter une fenêtre de confirmation'].map((example) => (
                <button type="button" key={example} onClick={() => setPrompt(example)}>{example}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="ai-proposal-summary">
              <span className="ai-status-dot" aria-hidden="true" />
              <div><strong>{proposal.summary}</strong><small>{proposal.commands.length} modification{proposal.commands.length > 1 ? 's' : ''} · {proposal.model}</small></div>
            </div>
            <AiProjectPreview document={proposal.proposedDocument} preferredWindowId={previewWindowId(proposal)} onScreenshot={reviewScreenshot} />
            <div className={`ai-review-card is-${proposal.visualReview?.verdict ?? 'pending'}`}>
              <strong>{busy === 'review' ? 'Vérification visuelle en cours…' : reviewLabel(proposal)}</strong>
              <p>{proposal.visualReview?.summary ?? 'Gemini vérifie la lisibilité, les alignements et les débordements de l’aperçu.'}</p>
              {proposal.visualReview?.issues.map((issue) => <small key={issue}>• {issue}</small>)}
              {proposal.warnings.map((warning) => <small key={warning}>• {warning}</small>)}
            </div>
          </>
        )}

        {error && <div className="ai-friendly-error" role="alert"><span aria-hidden="true">!</span><p>{error}</p></div>}

        <footer className="ai-dialog-footer">
          {proposal ? (
            <>
              <button className="ai-secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void discard()}>Recommencer</button>
              <span className="dialog-footer-spacer" />
              <button className="ai-primary-button" type="button" disabled={Boolean(busy)} onClick={() => void approve()}>{busy === 'apply' ? 'Application…' : 'Appliquer au projet'}</button>
            </>
          ) : (
            <>
              <button className="ai-secondary-button" type="button" disabled={Boolean(busy)} onClick={onClose}>Annuler</button>
              <span className="dialog-footer-spacer" />
              <button className="ai-primary-button" type="button" disabled={Boolean(busy) || prompt.trim().length < 3} onClick={() => void generate()}>{busy === 'generate' ? 'Création…' : 'Préparer un aperçu'}</button>
            </>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function friendlyError(error: unknown) {
  if (error instanceof ApiRequestError) return error.message;
  return 'La demande n’a pas pu être traitée. Réessayez dans quelques instants.';
}

function reviewLabel(proposal: AiProposal) {
  if (!proposal.visualReview) return 'Vérification en attente';
  if (proposal.visualReview.verdict === 'accepted') return 'Aperçu vérifié';
  if (proposal.visualReview.verdict === 'needs_revision') return 'Points à vérifier avant d’appliquer';
  return 'Vérification visuelle facultative';
}

function previewWindowId(proposal: AiProposal) {
  for (const command of proposal.commands) {
    if (command.type === 'add-content' || command.type === 'replace-content') return command.content.windowId;
    if (command.type === 'create-window') return command.window.id;
    if (command.type === 'rename-window' || command.type === 'delete-window') return command.windowId;
  }
  return useEditorStore.getState().activeWindowId;
}
