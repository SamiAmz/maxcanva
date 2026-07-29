import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { WindowThumbnail } from './WindowThumbnail';

interface WindowNameInputProps {
  id: string;
  name: string;
}

function WindowNameInput({ id, name }: WindowNameInputProps) {
  const [draftName, setDraftName] = useState(name);
  const cancelRenameRef = useRef(false);
  const renameWindow = useEditorStore((state) => state.renameWindow);

  useEffect(() => setDraftName(name), [name]);

  const commit = () => {
    const normalizedName = draftName.trim();
    if (!normalizedName) {
      setDraftName(name);
      return;
    }
    renameWindow(id, normalizedName);
  };

  return (
    <input
      className="window-name-input"
      value={draftName}
      aria-label={`Nom de ${name}`}
      title="Cliquer pour renommer"
      spellCheck={false}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onFocus={(event) => {
        cancelRenameRef.current = false;
        event.currentTarget.select();
      }}
      onChange={(event) => setDraftName(event.target.value)}
      onBlur={() => {
        if (cancelRenameRef.current) {
          cancelRenameRef.current = false;
          setDraftName(name);
          return;
        }
        commit();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          cancelRenameRef.current = true;
          setDraftName(name);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export function WindowsPanel() {
  const windows = useEditorStore((state) => state.windows);
  const activeWindowId = useEditorStore((state) => state.activeWindowId);
  const contents = useEditorStore((state) => state.contents);
  const createWindow = useEditorStore((state) => state.createWindow);
  const deleteWindow = useEditorStore((state) => state.deleteWindow);
  const selectWindow = useEditorStore((state) => state.selectWindow);

  return (
    <aside className="windows-panel" aria-label="Fenêtres du prototype">
      <div className="windows-panel-header">
        <div>
          <h2>Fenêtres</h2>
          <span>{windows.length}</span>
        </div>
        <button
          className="add-window-button"
          type="button"
          onClick={createWindow}
          aria-label="Créer une nouvelle fenêtre"
          title="Nouvelle fenêtre"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>

      <div className="window-list">
        {windows.map((window, index) => {
          const windowContents = contents.filter(
            (content) => content.windowId === window.id,
          );
          const isActive = window.id === activeWindowId;

          return (
            <div
              key={window.id}
              className={`window-card ${isActive ? 'is-active' : ''}`}
            >
              <button
                className="window-select-button"
                type="button"
                onClick={() => selectWindow(window.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Ouvrir ${window.name}`}
              >
                <span className="window-number">{index + 1}</span>
                <span className="window-preview">
                  <WindowThumbnail contents={windowContents} />
                </span>
                <span className="window-card-footer">
                  <WindowNameInput id={window.id} name={window.name} />
                  <small>
                    {windowContents.length}{' '}
                    {windowContents.length > 1 ? 'éléments' : 'élément'}
                  </small>
                </span>
              </button>
              <button
                className="delete-window-button"
                type="button"
                disabled={windows.length === 1}
                aria-label={`Supprimer ${window.name}`}
                title={
                  windows.length === 1
                    ? 'Le projet doit conserver au moins une fenêtre'
                    : `Supprimer ${window.name}`
                }
                onClick={() => deleteWindow(window.id)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
