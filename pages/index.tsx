/* eslint-disable @next/next/no-img-element */
import type React from 'react';
import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import PaletteSwatch from '../components/PaletteSwatch';
import { getColorPaletteFromImageElement, type PaletteColor } from '../lib/getColorPalette';
import { PALETTE_DEFAULTS } from '../lib/paletteConfig';

type SortMode = 'population' | 'populationAsc' | 'hex';

export default function Home() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [paletteSize, setPaletteSize] = useState<number>(PALETTE_DEFAULTS.paletteSize);
  const [maxResolution, setMaxResolution] = useState<number>(PALETTE_DEFAULTS.maxResolution);
  const [sampleStep, setSampleStep] = useState<number>(PALETTE_DEFAULTS.sampleStep);
  const [nearDuplicateThreshold, setNearDuplicateThreshold] = useState<number>(
    PALETTE_DEFAULTS.nearDuplicateThreshold
  );
  const [sortMode, setSortMode] = useState<SortMode>('population');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setImageDataUrl(result);
        setPalette([]);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const generatePalette = async () => {
    if (!imageDataUrl) {
      setError('Please upload an image before generating a palette.');
      return;
    }

    const imageElement = imgRef.current;
    if (!imageElement) {
      setError('Image reference is not available yet.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const paletteResult = await getColorPaletteFromImageElement(
        imageElement,
        paletteSize,
        maxResolution,
        sampleStep,
        nearDuplicateThreshold
      );
      setPalette(paletteResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePalette = () => {
    void generatePalette();
  };

  const sortedPalette = useMemo(() => {
    const paletteCopy = [...palette];
    switch (sortMode) {
      case 'population':
        return paletteCopy.sort((a, b) => b.population - a.population);
      case 'populationAsc':
        return paletteCopy.sort((a, b) => a.population - b.population);
      case 'hex':
        return paletteCopy.sort((a, b) => a.paletteColor.localeCompare(b.paletteColor));
      default:
        return paletteCopy;
    }
  }, [palette, sortMode]);

  useEffect(() => {
    if (!imageDataUrl) return;
    void generatePalette();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageDataUrl, paletteSize, maxResolution, sampleStep, nearDuplicateThreshold]);

  return (
    <>
      <Head>
        <title>Color Palette Playground</title>
        <meta
          name="description"
          content="Extract dominant color palettes from an uploaded image with tunable settings."
        />
      </Head>
      <main className="page">
        <header className="header">
          <div>
            <p className="eyebrow">Color analysis toolkit</p>
            <h1>Color Palette Generator</h1>
            <p className="lede">
              Upload an image, tune the sampling parameters, and generate a readable palette with text
              contrast suggestions.
            </p>
          </div>
        </header>

        <div className="layout">
          <div className="sidebar">
            <section className="card">
              <div className="section-header">
                <div>
                  <h2>1. Upload an image</h2>
                  <p className="muted">Images are processed locally in your browser.</p>
                </div>
                <label className="button button-secondary">
                  Choose file
                  <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                </label>
              </div>
              {imageDataUrl ? (
                <div className="preview-wrapper thumbnail">
                  {/* Using <img> directly so we can read pixels via canvas for palette extraction */}
                  <img
                    id="previewImage"
                    src={imageDataUrl}
                    alt="Preview"
                    ref={imgRef}
                    crossOrigin="anonymous"
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px' }}
                  />
                </div>
              ) : (
                <div className="empty-state">Select an image to see a preview.</div>
              )}
            </section>

            <section className="card">
              <div className="section-header">
                <div>
                  <h2>2. Adjust parameters</h2>
                  <p className="muted">Fine-tune how the palette is extracted.</p>
                </div>
              </div>
              <div className="controls-grid">
                <Control
                  label="Palette Size"
                  value={paletteSize}
                  onChange={setPaletteSize}
                  min={1}
                  max={32}
                  step={1}
                />
                <Control
                  label="Max Resolution"
                  value={maxResolution}
                  onChange={setMaxResolution}
                  min={256}
                  max={2048}
                  step={64}
                />
                <Control
                  label="Sample Step"
                  value={sampleStep}
                  onChange={setSampleStep}
                  min={1}
                  max={16}
                  step={1}
                  helper="Larger values are faster but less precise (samples fewer pixels)."
                />
                <Control
                  label="Near Duplicate Threshold"
                  value={nearDuplicateThreshold}
                  onChange={setNearDuplicateThreshold}
                  min={0}
                  max={100}
                  step={1}
                  helper="Higher values merge more similar colors into one swatch."
                />
              </div>
            </section>
          </div>

          <div className="main-content">
            <section className="card actions-card">
              <div className="actions">
                <div className="sorter">
                  <label htmlFor="sortMode">Sort by</label>
                  <select
                    id="sortMode"
                    value={sortMode}
                    onChange={e => setSortMode(e.target.value as SortMode)}
                  >
                    <option value="population">Population (desc)</option>
                    <option value="populationAsc">Population (asc)</option>
                    <option value="hex">Hex value (asc)</option>
                  </select>
                </div>
                <button className="button" onClick={handleGeneratePalette} disabled={isGenerating}>
                  {isGenerating ? 'Generating…' : 'Generate Palette'}
                </button>
              </div>
              {error && <p className="error">{error}</p>}
            </section>

            <section className="card">
              <div className="section-header">
                <div>
                  <h2>3. Palette</h2>
                  <p className="muted">Swatches with recommended text color and relative frequency.</p>
                </div>
              </div>
              {sortedPalette.length === 0 ? (
                <div className="empty-state">Upload an image to see results.</div>
              ) : (
                <div className="swatch-grid">
                  {sortedPalette.map(color => (
                    <PaletteSwatch key={`${color.paletteColor}-${color.population}`} color={color} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

interface ControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  helper?: string;
}

function Control({ label, value, onChange, min, max, step, helper }: ControlProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = Number(e.target.value);
    onChange(numericValue);
  };

  return (
    <div className="control">
      <div className="control-header">
        <label>{label}</label>
        <div className="control-inputs">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
          />
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
          />
        </div>
      </div>
      {helper && <p className="helper">{helper}</p>}
    </div>
  );
}
