export const STROKE_COLORS = [
  '#343a40',
  '#4c6ef5',
  '#e8590c',
  '#2b8a3e',
  '#7048e8',
];

export const FILL_COLORS = [
  '#f1f3f5',
  '#e7f5ff',
  '#fff4e6',
  '#ebfbee',
  '#f3f0ff',
];

export const STROKE_WIDTHS = [2, 4, 8, 14];

interface ColorPaletteProps {
  colors: string[];
  customColorLabel: string;
  includeTransparent?: boolean;
  selectedColor: string;
  swatchLabel: string;
  onChange: (color: string) => void;
}

function ColorPalette({
  colors,
  customColorLabel,
  includeTransparent = false,
  selectedColor,
  swatchLabel,
  onChange,
}: ColorPaletteProps) {
  return (
    <div className="color-options">
      {includeTransparent && (
        <button
          className={`color-swatch transparent-swatch ${selectedColor === 'transparent' ? 'is-selected' : ''}`}
          type="button"
          aria-label="Aucun remplissage"
          aria-pressed={selectedColor === 'transparent'}
          onClick={() => onChange('transparent')}
        />
      )}
      {colors.map((color) => (
        <button
          key={color}
          className={`color-swatch ${selectedColor === color ? 'is-selected' : ''}`}
          style={{ backgroundColor: color }}
          type="button"
          aria-label={`${swatchLabel} ${color}`}
          aria-pressed={selectedColor === color}
          onClick={() => onChange(color)}
        />
      ))}
      <label className="custom-color" title={customColorLabel}>
        <span aria-hidden="true">+</span>
        <input
          type="color"
          value={selectedColor === 'transparent' ? '#ffffff' : selectedColor}
          aria-label={customColorLabel}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

interface ShapeStyleControlsProps {
  color: string;
  fillColor?: string;
  showFill?: boolean;
  strokeWidth?: number;
  showWidth?: boolean;
  onColorChange: (color: string) => void;
  onFillColorChange?: (color: string) => void;
  onStrokeWidthChange?: (width: number) => void;
}

export function ShapeStyleControls({
  color,
  fillColor = 'transparent',
  showFill = false,
  strokeWidth,
  showWidth = true,
  onColorChange,
  onFillColorChange,
  onStrokeWidthChange,
}: ShapeStyleControlsProps) {
  return (
    <div className="shape-style-controls">
      <div className="shape-style-group">
        <span className="shape-style-label">Contour</span>
        <ColorPalette
          colors={STROKE_COLORS}
          customColorLabel="Couleur de contour personnalisée"
          selectedColor={color}
          swatchLabel="Choisir le contour"
          onChange={onColorChange}
        />
      </div>

      {showFill && onFillColorChange && (
        <div className="shape-style-group">
          <span className="shape-style-label">Fond</span>
          <ColorPalette
            colors={FILL_COLORS}
            customColorLabel="Couleur de fond personnalisée"
            includeTransparent
            selectedColor={fillColor}
            swatchLabel="Choisir le fond"
            onChange={onFillColorChange}
          />
        </div>
      )}

      {showWidth && strokeWidth !== undefined && onStrokeWidthChange && (
        <div className="shape-style-group stroke-width-group">
          <span className="shape-style-label">Trait</span>
          <div className="width-options">
            {STROKE_WIDTHS.map((width) => (
              <button
                key={width}
                className={`width-button ${strokeWidth === width ? 'is-selected' : ''}`}
                type="button"
                aria-label={`Épaisseur de ${width} pixels`}
                aria-pressed={strokeWidth === width}
                onClick={() => onStrokeWidthChange(width)}
              >
                <span style={{ height: Math.min(width, 10) }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
