export interface PaletteConfig {
  paletteSize: number;
  maxResolution: number;
  sampleStep: number;
  nearDuplicateThreshold: number;
}

export const PALETTE_DEFAULTS: PaletteConfig = {
  paletteSize: 10,
  maxResolution: 1024,
  sampleStep: 2,
  nearDuplicateThreshold: 50
};
