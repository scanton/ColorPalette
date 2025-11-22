import React from 'react';
import { PaletteColor } from '../lib/getColorPalette';

interface PaletteSwatchProps {
  color: PaletteColor;
}

export function PaletteSwatch({ color }: PaletteSwatchProps) {
  const percentageLabel = `${(color.percentage * 100).toFixed(1)}%`;

  return (
    <div className="swatch" style={{ backgroundColor: color.paletteColor, color: color.textColor }}>
      <div className="swatch-content">
        <p className="swatch-title">Sample text on this color</p>
        <p className="swatch-hex">{color.paletteColor}</p>
        <p className="swatch-meta">Population: {color.population.toLocaleString()}</p>
        <p className="swatch-meta">Percentage: {percentageLabel}</p>
      </div>
    </div>
  );
}

export default PaletteSwatch;
