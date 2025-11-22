# ColorPalette
ColorPalette is a Next.js + TypeScript playground for extracting dominant color palettes from images using a custom color analysis utility.

## Prerequisites
- Node.js 18+
- pnpm installed globally

## Development
```bash
pnpm dev
```
Then open http://localhost:3000 in a browser.

## Build & Run Production
```bash
pnpm build
pnpm start
```

## Usage
1. Go to the main page.
2. Upload an image using the file picker.
3. Adjust:
   - Palette size
   - Max resolution
   - Sample step
   - Near-duplicate threshold
4. Click Generate Palette.
5. Review the resulting swatches:
   - Background represents the palette color.
   - Text uses the recommended contrast color (black or white).
   - Population and percentage indicate frequency.
6. Use the “Sort by” control to reorder the palette by population, percentage, or hex.

## Notes
- Image processing happens completely client-side.
- The original JavaScript implementation lives in `js/getColorPalette.js`.
- A TypeScript utility is available at `lib/getColorPalette.ts` and is used by the UI.
