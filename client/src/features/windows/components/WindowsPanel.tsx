import { useEditorStore } from '../../../store/useEditorStore';
import { WindowThumbnail } from './WindowThumbnail';

export function WindowsPanel() {
  const windows = useEditorStore((state) => state.windows);
  const activeWindowId = useEditorStore((state) => state.activeWindowId);
  const strokes = useEditorStore((state) => state.strokes);
  const createWindow = useEditorStore((state) => state.createWindow);
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
          const windowStrokes = strokes.filter(
            (stroke) => stroke.windowId === window.id,
          );
          const isActive = window.id === activeWindowId;

          return (
            <button
              key={window.id}
              className={`window-card ${isActive ? 'is-active' : ''}`}
              type="button"
              onClick={() => selectWindow(window.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="window-number">{index + 1}</span>
              <span className="window-preview">
                <WindowThumbnail strokes={windowStrokes} />
              </span>
              <span className="window-card-footer">
                <strong>{window.name}</strong>
                <small>
                  {windowStrokes.length}{' '}
                  {windowStrokes.length > 1 ? 'traits' : 'trait'}
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
