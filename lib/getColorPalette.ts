/**
 * TypeScript port of the color palette extraction utilities.
 * Based on js/getColorPalette.js (kept as a reference/backup).
 */

import { PALETTE_DEFAULTS } from './paletteConfig';

export interface PaletteColor {
  paletteColor: string; // "#RRGGBB"
  textColor: string; // "#000000" | "#FFFFFF"
  population: number;
  percentage: number; // 0–1
}

interface RawColor {
  r: number;
  g: number;
  b: number;
  population: number;
  percentage?: number;
}

export async function getColorPaletteFromId(
  id: string,
  paletteSize = PALETTE_DEFAULTS.paletteSize,
  maxResolution = PALETTE_DEFAULTS.maxResolution,
  sampleStep = PALETTE_DEFAULTS.sampleStep,
  nearDuplicateThreshold = PALETTE_DEFAULTS.nearDuplicateThreshold
): Promise<PaletteColor[]> {
  const element = document.getElementById(id);
  if (!element || element.tagName !== 'IMG') {
    throw new Error(`Element with id "${id}" is not an <img> or does not exist.`);
  }

  return getColorPaletteFromImageElement(
    element as HTMLImageElement,
    paletteSize,
    maxResolution,
    sampleStep,
    nearDuplicateThreshold
  );
}

export async function getColorPaletteFromImageElement(
  img: HTMLImageElement,
  paletteSize = PALETTE_DEFAULTS.paletteSize,
  maxResolution = PALETTE_DEFAULTS.maxResolution,
  sampleStep = PALETTE_DEFAULTS.sampleStep,
  nearDuplicateThreshold = PALETTE_DEFAULTS.nearDuplicateThreshold
): Promise<PaletteColor[]> {
  if (!(img instanceof HTMLImageElement)) {
    throw new Error('Provided element is not an HTMLImageElement.');
  }

  await ensureImageLoaded(img);

  const { width, height } = getScaledDimensions(img.naturalWidth, img.naturalHeight, maxResolution);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not get 2D context from canvas.');
  }

  ctx.drawImage(img, 0, 0, width, height);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch (err) {
    throw new Error(
      'Unable to read image data. Check CORS configuration and crossOrigin="anonymous" on <img>.'
    );
  }

  const data = imageData.data;
  const colorMap: Map<number, { count: number; rSum: number; gSum: number; bSum: number }> = new Map();
  let totalSamples = 0;

  for (let i = 0; i < data.length; i += 4 * Math.max(1, Math.floor(sampleStep))) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 128) continue;

    totalSamples++;

    const qr = r >> 4;
    const qg = g >> 4;
    const qb = b >> 4;

    const key = (qr << 8) | (qg << 4) | qb;

    const entry = colorMap.get(key) ?? { count: 0, rSum: 0, gSum: 0, bSum: 0 };
    entry.count += 1;
    entry.rSum += r;
    entry.gSum += g;
    entry.bSum += b;
    colorMap.set(key, entry);
  }

  if (totalSamples === 0) return [];

  let colors: RawColor[] = Array.from(colorMap.values()).map(entry => {
    const r = Math.round(entry.rSum / entry.count);
    const g = Math.round(entry.gSum / entry.count);
    const b = Math.round(entry.bSum / entry.count);
    return {
      r,
      g,
      b,
      population: entry.count
    };
  });

  colors.sort((a, b) => b.population - a.population);

  if (nearDuplicateThreshold > 0) {
    colors = mergeSimilarColors(colors, nearDuplicateThreshold);
  }

  const mergedTotalPopulation = colors.reduce((sum, c) => sum + c.population, 0);
  colors.forEach(c => {
    c.percentage = mergedTotalPopulation > 0 ? c.population / mergedTotalPopulation : 0;
  });

  colors.sort((a, b) => b.population - a.population);
  const limitedColors = colors.slice(0, Math.max(1, Math.floor(paletteSize)));

  return limitedColors.map(c => {
    const hex = rgbToHex(c.r, c.g, c.b);
    const textColor = bestTextColor(c.r, c.g, c.b);
    return {
      paletteColor: hex,
      textColor,
      population: c.population,
      percentage: c.percentage ?? 0
    };
  });
}

function ensureImageLoaded(img: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }

    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Image failed to load.'));
    };
    const cleanup = () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
  });
}

function getScaledDimensions(naturalWidth: number, naturalHeight: number, maxResolution: number) {
  const largestSide = Math.max(naturalWidth, naturalHeight);
  const scale = largestSide > maxResolution ? maxResolution / largestSide : 1;

  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale))
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(value => {
        const hex = value.toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
      })
      .join('')
  );
}

function srgbToLuminance(r: number, g: number, b: number): number {
  const channelToLinear = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };

  const R = channelToLinear(r);
  const G = channelToLinear(g);
  const B = channelToLinear(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(L1: number, L2: number): number {
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function bestTextColor(r: number, g: number, b: number): string {
  const bgL = srgbToLuminance(r, g, b);
  const whiteL = srgbToLuminance(255, 255, 255);
  const blackL = srgbToLuminance(0, 0, 0);

  const contrastWithWhite = contrastRatio(bgL, whiteL);
  const contrastWithBlack = contrastRatio(bgL, blackL);

  return contrastWithWhite >= contrastWithBlack ? '#FFFFFF' : '#000000';
}

function colorDistance(c1: RawColor, c2: RawColor): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function mergeSimilarColors(colors: RawColor[], threshold: number): RawColor[] {
  const merged: RawColor[] = [];

  for (const color of colors) {
    let foundCluster = false;

    for (let i = 0; i < merged.length; i += 1) {
      const cluster = merged[i];
      const dist = colorDistance(color, cluster);

      if (dist <= threshold) {
        const totalPop = cluster.population + color.population;

        const newR = Math.round((cluster.r * cluster.population + color.r * color.population) / totalPop);
        const newG = Math.round((cluster.g * cluster.population + color.g * color.population) / totalPop);
        const newB = Math.round((cluster.b * cluster.population + color.b * color.population) / totalPop);

        merged[i] = {
          r: newR,
          g: newG,
          b: newB,
          population: totalPop
        };

        foundCluster = true;
        break;
      }
    }

    if (!foundCluster) {
      merged.push({ ...color });
    }
  }

  return merged;
}
