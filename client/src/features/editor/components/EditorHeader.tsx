import { useEffect, useRef, useState } from 'react';
import type { AuthSession } from '@maxcanva/shared';
import { useEditorStore } from '@/features/editor/store/useEditorStore';

interface EditorHeaderProps {
  session: AuthSession | null;
  onOpenAuth: () => void;
  onOpenProjects: () => void;
  onSaveProject: () => void;
  onSignOut: () => void;
  onStartSimulation: () => void;
  savingProject: boolean;
  projectSaveState: 'unsaved' | 'saved' | 'error';
  hasSavedProject: boolean;
}

export function EditorHeader({
  session,
  onOpenAuth,
  onOpenProjects,
  onSaveProject,
  onSignOut,
  onStartSimulation,
  savingProject,
  projectSaveState,
  hasSavedProject,
}: EditorHeaderProps) {
  const activeWindow = useEditorStore((state) =>
    state.windows.find((window) => window.id === state.activeWindowId),
  );
  const projectTitle = useEditorStore((state) => state.projectTitle);
  const setProjectTitle = useEditorStore((state) => state.setProjectTitle);
  const undo = useEditorStore((state) => state.undo);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const undoOnShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches(
          'input, textarea, select, [contenteditable="true"]',
        )
      ) {
        return;
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'z'
      ) {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', undoOnShortcut);
    return () => window.removeEventListener('keydown', undoOnShortcut);
  }, [undo]);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!projectMenuRef.current?.contains(target)) setProjectMenuOpen(false);
      if (!accountMenuRef.current?.contains(target)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProjectMenuOpen(false);
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const saveLabel = savingProject
    ? 'Sauvegarde en cours…'
    : projectSaveState === 'error'
      ? 'Échec de la sauvegarde'
      : projectSaveState === 'saved' && hasSavedProject
        ? 'Projet sauvegardé'
        : session
          ? 'Modifications non sauvegardées'
          : 'Brouillon local uniquement';

  return (
    <header className="editor-header">
      <div className="document-title">
        <input
          className="project-title-input"
          value={projectTitle}
          aria-label="Titre du projet"
          spellCheck={false}
          onChange={(event) => setProjectTitle(event.target.value)}
          onBlur={() => {
            if (!projectTitle.trim()) setProjectTitle('Sans titre');
          }}
        />
        <span className="title-separator">/</span>
        <strong>{activeWindow?.name ?? 'Fenêtre'}</strong>
      </div>

      <div className="header-actions">
        <div className="header-menu-anchor" ref={projectMenuRef}>
          <button
            className="project-menu-trigger"
            type="button"
            aria-haspopup="menu"
            aria-expanded={projectMenuOpen}
            onClick={() => {
              setProjectMenuOpen((open) => !open);
              setAccountMenuOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3.5 7.5h6l1.8 2H20.5v8.7a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8V7.5Z" />
              <path d="M3.5 8.5V5.8A1.8 1.8 0 0 1 5.3 4h4.1l1.7 2H17" />
            </svg>
            <span className="project-menu-label">Projet</span>
            <span className={`save-state-dot is-${savingProject ? 'saving' : projectSaveState}`} aria-hidden="true" />
          </button>

          {projectMenuOpen && (
            <div className="editor-popover project-popover" role="menu">
              <div className="popover-project-summary">
                <strong>{projectTitle || 'Sans titre'}</strong>
                <span className={`save-state-text is-${savingProject ? 'saving' : projectSaveState}`}>{saveLabel}</span>
              </div>
              <button type="button" role="menuitem" onClick={() => { setProjectMenuOpen(false); onOpenProjects(); }}>
                <span className="popover-action-icon" aria-hidden="true">▱</span>
                <span><strong>Mes projets</strong><small>Ouvrir ou créer un prototype</small></span>
              </button>
              <button type="button" role="menuitem" disabled={savingProject} onClick={() => { setProjectMenuOpen(false); session ? onSaveProject() : onOpenAuth(); }}>
                <span className="popover-action-icon" aria-hidden="true">↓</span>
                <span><strong>{session ? 'Sauvegarder maintenant' : 'Se connecter pour sauvegarder'}</strong><small>{session ? 'Enregistrer toutes les modifications' : 'Le brouillon reste sur cet appareil'}</small></span>
              </button>
              <p className="local-draft-note"><span aria-hidden="true">✓</span> Brouillon local enregistré automatiquement</p>
            </div>
          )}
        </div>

        <button
          className="start-simulation-button"
          type="button"
          onClick={onStartSimulation}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 7 8 5-8 5V7Z" />
          </svg>
          <span className="simulation-button-label">Simuler</span>
        </button>

        {session ? (
          <div className="header-menu-anchor" ref={accountMenuRef}>
            <button
              className="account-trigger"
              type="button"
              aria-label="Ouvrir le menu du compte"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => {
                setAccountMenuOpen((open) => !open);
                setProjectMenuOpen(false);
              }}
            >
              {session.user.email[0]?.toUpperCase()}
            </button>
            {accountMenuOpen && (
              <div className="editor-popover account-popover" role="menu">
                <div className="account-popover-identity">
                  <span className="account-avatar" aria-hidden="true">{session.user.email[0]?.toUpperCase()}</span>
                  <span><small>Connecté en tant que</small><strong>{session.user.email}</strong></span>
                </div>
                <button type="button" role="menuitem" className="popover-sign-out" onClick={() => { setAccountMenuOpen(false); onSignOut(); }}>
                  <span aria-hidden="true">↗</span> Se déconnecter
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="open-auth-button compact-auth-button" type="button" aria-label="Se connecter" onClick={onOpenAuth}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5.5 19c.7-3.3 3.1-5 6.5-5s5.8 1.7 6.5 5" />
            </svg>
            <span>Se connecter</span>
          </button>
        )}
      </div>
    </header>
  );
}
