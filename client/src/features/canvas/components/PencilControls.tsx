import { useEditorStore } from '../../../store/useEditorStore';

const COLORS = ['#1f2937', '#2563eb', '#dc2626', '#16a34a', '#7c3aed'];
const WIDTHS = [2, 4, 8, 14];

export function PencilControls() {
  const color = useEditorStore((state) => state.pencilColor);
  const width = useEditorStore((state) => state.pencilWidth);
  const setColor = useEditorStore((state) => state.setPencilColor);
  const setWidth = useEditorStore((state) => state.setPencilWidth);

  return (
    <section className="pencil-controls" aria-label="Options du crayon">
      <div className="control-group">
        <span className="control-label">Couleur</span>
        <div className="color-options">
          {COLORS.map((option) => (
            <button
              key={option}
              className={`color-swatch ${color === option ? 'is-selected' : ''}`}
              style={{ backgroundColor: option }}
              type="button"
              aria-label={`Choisir la couleur ${option}`}
              aria-pressed={color === option}
              onClick={() => setColor(option)}
            />
          ))}
          <label className="custom-color" title="Couleur personnalisée">
            <span aria-hidden="true">+</span>
            <input
              type="color"
              value={color}
              aria-label="Choisir une couleur personnalisée"
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="control-divider" />

      <div className="control-group">
        <span className="control-label">Épaisseur</span>
        <div className="width-options">
          {WIDTHS.map((option) => (
            <button
              key={option}
              className={`width-button ${width === option ? 'is-selected' : ''}`}
              type="button"
              aria-label={`Épaisseur de ${option} pixels`}
              aria-pressed={width === option}
              onClick={() => setWidth(option)}
            >
              <span style={{ height: Math.min(option, 10) }} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
