export interface PaletteConfig {
  paletteSize: number;
  maxResolution: number;
  sampleStep: number;
  nearDuplicateThreshold: number;
}

export const PALETTE_DEFAULTS: PaletteConfig = {
  paletteSize: 8,
  maxResolution: 1024,
  sampleStep: 4,
  nearDuplicateThreshold: 30
};
