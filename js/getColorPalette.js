/**
 * Color palette extraction utilities.
 *
 * Usage options:
 * 1. By image ID (most common in apps):
 *    getColorPaletteFromId('myImageId', 8, 1024, 4, 20).then(palette => { ... });
 *
 * 2. Directly from an HTMLImageElement:
 *    const img = document.getElementById('myImageId');
 *    getColorPaletteFromImageElement(img, 8, 1024, 4, 20).then(palette => { ... });
 *
 * The returned palette is an array of objects:
 * [
 *   {
 *     paletteColor: "#RRGGBB",
 *     textColor: "#000000" | "#FFFFFF",
 *     population: number,   // number of sampled pixels in this color cluster
 *     percentage: number    // fraction of total sampled pixels, between 0 and 1
 *   },
 *   ...
 * ]
 *
 * Parameters:
 * - paletteSize: number of colors to return (default 10).
 * - maxResolution: max width/height for downscaled image (default 1024).
 * - sampleStep: sample every Nth pixel for speed (default 2).
 * - nearDuplicateThreshold: max distance in RGB space for colors to be merged
 *   into the same cluster (default 50; set to 0 or negative to disable merging).
 */

/**
 * Main convenience function: find palette from an <img> element by ID.
 *
 * @param {string} id - CSS id of the <img> element.
 * @param {number} [paletteSize=10] - Number of colors to return.
 * @param {number} [maxResolution=1024] - Max width/height of resized image.
 * @param {number} [sampleStep=2] - Pixel sampling step (larger = faster, smaller = more accurate).
 * @param {number} [nearDuplicateThreshold=50] - RGB distance threshold for merging near-duplicate colors.
 * @returns {Promise<Array<{ paletteColor: string, textColor: string, population: number, percentage: number }>>}
 */
async function getColorPaletteFromId(
  id,
  paletteSize = 10,
  maxResolution = 1024,
  sampleStep = 2,
  nearDuplicateThreshold = 50
) {
  const img = document.getElementById(id);
  if (!img || img.tagName !== 'IMG') {
    throw new Error(`Element with id "${id}" is not an <img> or does not exist.`);
  }
  return getColorPaletteFromImageElement(
    img,
    paletteSize,
    maxResolution,
    sampleStep,
    nearDuplicateThreshold
  );
}

/**
 * Core function: find palette directly from an HTMLImageElement.
 *
 * @param {HTMLImageElement} img
 * @param {number} [paletteSize=8]
 * @param {number} [maxResolution=1024]
 * @param {number} [sampleStep=4] - Pixel sampling step. e.g. 4 = sample every 4th pixel.
 * @param {number} [nearDuplicateThreshold=50] - RGB distance threshold for merging near-duplicate colors.
 * @returns {Promise<Array<{ paletteColor: string, textColor: string, population: number, percentage: number }>>}
 */
async function getColorPaletteFromImageElement(
  img,
  paletteSize = 10,
  maxResolution = 1024,
  sampleStep = 2,
  nearDuplicateThreshold = 50
) {
  if (!(img instanceof HTMLImageElement)) {
    throw new Error('Provided element is not an HTMLImageElement.');
  }

  // NOTE (CORS best practice):
  // If your images are served from a different domain (image CDN/server),
  // ensure:
  //   1. The server sends proper CORS headers, for example:
  //        Access-Control-Allow-Origin: https://your-website-domain.com
  //   2. Your <img> tag uses crossOrigin="anonymous", e.g.:
  //        <img id="myImg" src="https://cdn.example.com/image.jpg" crossOrigin="anonymous">
  // Otherwise, canvas.getImageData(...) will throw a security error and you
  // won't be able to read pixel data for palette extraction.

  await ensureImageLoaded(img);

  const { width, height } = getScaledDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxResolution
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D context from canvas.');

  ctx.drawImage(img, 0, 0, width, height);

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch (err) {
    throw new Error(
      'Unable to read image data. Check CORS configuration and crossOrigin="anonymous" on <img>.'
    );
  }

  const data = imageData.data;

  // Map of quantizedColorKey -> { count, rSum, gSum, bSum }
  const colorMap = new Map();
  let totalSamples = 0;

  // Step through pixels with configurable sampleStep.
  // Each pixel is 4 entries in data (r, g, b, a),
  // so we jump 4 * sampleStep each loop.
  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Ignore fully / mostly transparent pixels
    if (a < 128) continue;

    totalSamples++;

    // Quantize to 16 levels per channel to reduce color space
    const qr = r >> 4; // 0–15
    const qg = g >> 4;
    const qb = b >> 4;

    const key = (qr << 8) | (qg << 4) | qb;

    let entry = colorMap.get(key);
    if (!entry) {
      entry = { count: 0, rSum: 0, gSum: 0, bSum: 0 };
      colorMap.set(key, entry);
    }
    entry.count++;
    entry.rSum += r;
    entry.gSum += g;
    entry.bSum += b;
  }

  if (totalSamples === 0) {
    return [];
  }

  // Convert map to averaged color list with population (raw clusters before merging)
  let colors = Array.from(colorMap.values()).map(entry => {
    const r = Math.round(entry.rSum / entry.count);
    const g = Math.round(entry.gSum / entry.count);
    const b = Math.round(entry.bSum / entry.count);
    return {
      r,
      g,
      b,
      population: entry.count
      // percentage will be assigned later, after optional merging
    };
  });

  // Sort by population (descending) before merging to favor stronger colors
  colors.sort((a, b) => b.population - a.population);

  // Optionally merge near-duplicate colors based on a threshold in RGB space
  if (nearDuplicateThreshold > 0) {
    colors = mergeSimilarColors(colors, nearDuplicateThreshold);
  }

  // Recompute percentages after merging
  const mergedTotalPopulation = colors.reduce(
    (sum, c) => sum + c.population,
    0
  );
  colors.forEach(c => {
    c.percentage = mergedTotalPopulation > 0 ? c.population / mergedTotalPopulation : 0;
  });

  // Sort again by population after merging, then slice to palette size
  colors.sort((a, b) => b.population - a.population);
  const limitedColors = colors.slice(0, paletteSize);

  // Build final palette with hex + best text color
  const palette = limitedColors.map(c => {
    const hex = rgbToHex(c.r, c.g, c.b);
    const textColor = bestTextColor(c.r, c.g, c.b); // "#000000" or "#FFFFFF"
    return {
      paletteColor: hex,
      textColor,
      population: c.population,
      percentage: c.percentage
    };
  });

  return palette;
}

/* ---------- Helpers ---------- */

// Wait for image to finish loading if it isn't already
function ensureImageLoaded(img) {
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

// Scale dimensions down to fit within maxResolution while keeping aspect ratio
function getScaledDimensions(naturalWidth, naturalHeight, maxResolution) {
  const largestSide = Math.max(naturalWidth, naturalHeight);
  const scale = largestSide > maxResolution ? maxResolution / largestSide : 1;

  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale))
  };
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map(v => {
        const hex = v.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

// sRGB -> relative luminance (WCAG)
function srgbToLuminance(r, g, b) {
  function channelToLinear(c) {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  }

  const R = channelToLinear(r);
  const G = channelToLinear(g);
  const B = channelToLinear(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(L1, L2) {
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Decide between black or white text for best readability
function bestTextColor(r, g, b) {
  const bgL = srgbToLuminance(r, g, b);
  const whiteL = srgbToLuminance(255, 255, 255);
  const blackL = srgbToLuminance(0, 0, 0);

  const contrastWithWhite = contrastRatio(bgL, whiteL);
  const contrastWithBlack = contrastRatio(bgL, blackL);

  return contrastWithWhite >= contrastWithBlack ? '#FFFFFF' : '#000000';
}

// Euclidean distance between two colors in RGB space
function colorDistance(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Merge similar colors based on a distance threshold in RGB space.
 * The more popular color "absorbs" the less popular one:
 * populations are summed and RGB values are recomputed as a weighted average.
 *
 * @param {Array<{r: number, g: number, b: number, population: number}>} colors
 * @param {number} threshold - Maximum RGB distance for colors to be considered duplicates.
 * @returns {Array<{r: number, g: number, b: number, population: number}>}
 */
function mergeSimilarColors(colors, threshold) {
  const merged = [];

  for (const color of colors) {
    let foundCluster = false;

    for (let i = 0; i < merged.length; i++) {
      const cluster = merged[i];
      const dist = colorDistance(color, cluster);

      if (dist <= threshold) {
        // Merge color into existing cluster using population-weighted average
        const totalPop = cluster.population + color.population;

        const newR = Math.round(
          (cluster.r * cluster.population + color.r * color.population) / totalPop
        );
        const newG = Math.round(
          (cluster.g * cluster.population + color.g * color.population) / totalPop
        );
        const newB = Math.round(
          (cluster.b * cluster.population + color.b * color.population) / totalPop
        );

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