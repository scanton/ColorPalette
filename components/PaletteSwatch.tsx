import React from 'react';
import { PaletteColor } from '../lib/getColorPalette';

interface PaletteSwatchProps {
  color: PaletteColor;
}

export function PaletteSwatch({ color }: PaletteSwatchProps) {
  const percentageLabel = `${(color.percentage * 100).toFixed(1)}%`;
  const hueLabel = `${color.metrics.hue.toFixed(1)}°`;
  const saturationLabel = `${color.metrics.saturation.toFixed(1)}%`;
  const luminanceLabel = `${(color.metrics.luminance * 100).toFixed(1)}%`;

  return (
    <div className="swatch" style={{ backgroundColor: color.paletteColor, color: color.textColor }}>
      <div className="swatch-label">Sample text on this color</div>
      <div className="swatch-content">
        <p className="swatch-hex">{color.paletteColor}</p>
        <p className="swatch-meta">Population: {color.population.toLocaleString()}</p>
        <p className="swatch-meta">Percentage: {percentageLabel}</p>
        <p className="swatch-meta">Hue: {hueLabel}</p>
        <p className="swatch-meta">Saturation: {saturationLabel}</p>
        <p className="swatch-meta">Luminance: {luminanceLabel}</p>
      </div>
    </div>
  );
}

export default PaletteSwatch;
