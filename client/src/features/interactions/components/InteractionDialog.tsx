import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditorStore } from '../../../store/useEditorStore';
import type { InteractionType } from '../../../types/drawing';

interface InteractionDialogProps {
  open: boolean;
  onClose: () => void;
}

function normalizeWebUrl(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`,
    );

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function InteractionDialog({ open, onClose }: InteractionDialogProps) {
  const windows = useEditorStore((state) => state.windows);
  const activeWindowId = useEditorStore((state) => state.activeWindowId);
  const selectedIds = useEditorStore((state) => state.selectedStrokeIds);
  const interactions = useEditorStore((state) => state.interactions);
  const saveInteraction = useEditorStore((state) => state.saveInteraction);
  const removeInteraction = useEditorStore(
    (state) => state.removeInteractionsForContents,
  );

  const targetWindows = useMemo(
    () => windows.filter((window) => window.id !== activeWindowId),
    [activeWindowId, windows],
  );
  const existingInteraction = useMemo(
    () =>
      interactions.find(
        (interaction) =>
          selectedIds.length > 0 &&
          selectedIds.every((id) => interaction.contentIds.includes(id)),
      ),
    [interactions, selectedIds],
  );

  const [type, setType] = useState<InteractionType>('button');
  const [targetWindowId, setTargetWindowId] = useState('');
  const [webUrl, setWebUrl] = useState('');

  useEffect(() => {
    if (!open) return;

    setType(existingInteraction?.type ?? 'button');
    setTargetWindowId(
      existingInteraction?.targetWindowId ?? targetWindows[0]?.id ?? '',
    );
    setWebUrl(existingInteraction?.url ?? '');

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [existingInteraction, onClose, open, targetWindows]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedIds.length === 0) return;

    const normalizedUrl = type === 'link' ? normalizeWebUrl(webUrl) : null;
    if (type === 'button' && !targetWindowId) return;
    if (type === 'link' && !normalizedUrl) return;

    saveInteraction({
      sourceWindowId: activeWindowId,
      targetWindowId: type === 'button' ? targetWindowId : undefined,
      url: type === 'link' ? normalizedUrl ?? undefined : undefined,
      contentIds: selectedIds,
      type,
    });
    onClose();
  };

  const handleRemove = () => {
    removeInteraction(selectedIds);
    onClose();
  };

  return createPortal(
    <div className="dialog-backdrop" onPointerDown={onClose}>
      <form
        className="interaction-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interaction-title"
        onSubmit={handleSubmit}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="interaction-dialog-header">
          <div>
            <span className="dialog-eyebrow">Interaction</span>
            <h2 id="interaction-title">
              {existingInteraction ? 'Modifier le lien' : 'Créer un lien'}
            </h2>
          </div>
          <button
            className="dialog-close-button"
            type="button"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <p className="dialog-description">
          {selectedIds.length > 1
            ? `Les ${selectedIds.length} traits sélectionnés agiront ensemble`
            : 'Le trait sélectionné agira'}{' '}
          pendant la simulation.
        </p>

        <fieldset className="interaction-type-fieldset">
          <legend>Comportement</legend>
          <div className="interaction-type-options">
            <button
              className={`interaction-type-card ${type === 'button' ? 'is-selected' : ''}`}
              type="button"
              aria-pressed={type === 'button'}
              onClick={() => setType('button')}
            >
              <span className="interaction-type-icon" aria-hidden="true">▣</span>
              <span>
                <strong>Bouton</strong>
                <small>Une zone cliquable</small>
              </span>
            </button>
            <button
              className={`interaction-type-card ${type === 'link' ? 'is-selected' : ''}`}
              type="button"
              aria-pressed={type === 'link'}
              onClick={() => setType('link')}
            >
              <span className="interaction-type-icon" aria-hidden="true">↗</span>
              <span>
                <strong>Hyperlien</strong>
                <small>Une adresse web externe</small>
              </span>
            </button>
          </div>
        </fieldset>

        {type === 'button' ? (
          <label className="target-window-field">
            <span>Fenêtre de destination</span>
            <select
              value={targetWindowId}
              onChange={(event) => setTargetWindowId(event.target.value)}
              autoFocus
            >
              {targetWindows.length === 0 && (
                <option value="">Créez d’abord une autre fenêtre</option>
              )}
              {targetWindows.map((window) => (
                <option key={window.id} value={window.id}>
                  {window.name}
                </option>
              ))}
            </select>
            {targetWindows.length === 0 && (
              <small>Fermez cette fenêtre, puis utilisez le bouton + dans « Fenêtres ».</small>
            )}
          </label>
        ) : (
          <label className="target-url-field">
            <span>Adresse web</span>
            <input
              type="text"
              inputMode="url"
              value={webUrl}
              onChange={(event) => setWebUrl(event.target.value)}
              placeholder="https://exemple.com"
              autoFocus
            />
            {webUrl && !normalizeWebUrl(webUrl) && (
              <small>Entrez une adresse web valide.</small>
            )}
          </label>
        )}

        <div className="interaction-dialog-footer">
          {existingInteraction && (
            <button
              className="remove-interaction-button"
              type="button"
              onClick={handleRemove}
            >
              Retirer le lien
            </button>
          )}
          <span className="dialog-footer-spacer" />
          <button className="dialog-cancel-button" type="button" onClick={onClose}>
            Annuler
          </button>
          <button
            className="dialog-confirm-button"
            type="submit"
            disabled={
              type === 'button'
                ? !targetWindowId
                : !normalizeWebUrl(webUrl)
            }
          >
            {existingInteraction ? 'Enregistrer' : 'Créer le lien'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
