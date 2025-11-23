# ColorPalette
ColorPalette is a Next.js + TypeScript playground for extracting dominant color palettes from images using a custom color analysis utility.

## Prerequisites
- Node.js 18+
- pnpm installed globally

## Get the code (GitHub basics)
If you are new to GitHub, here is the easiest way to get the project locally:
1. Open your terminal (Command Prompt or PowerShell on Windows, Terminal on macOS/Linux).
2. Run the following to clone and enter the folder:
   ```bash
   git clone https://github.com/<your-org-or-user>/ColorPalette.git
   cd ColorPalette
   ```
   If you prefer not to use `git`, you can click the green “Code” button on GitHub, choose “Download ZIP”, unzip it, then `cd` into the extracted `ColorPalette` folder.
3. Install dependencies (only needs to be done once):
   ```bash
   pnpm install
   ```

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
4. The palette regenerates automatically when you change the image or any parameter (you can also click Generate Palette if you want to force it).
5. Review the resulting swatches:
   - Background represents the palette color.
   - Text uses the recommended contrast color (black or white).
   - Population and percentage indicate frequency.
6. Use the “Sort by” control to reorder the palette by population (asc/desc) or hex.

## Notes
- Image processing happens completely client-side.
- The original JavaScript implementation lives in `js/getColorPalette.js`.
- A TypeScript utility is available at `lib/getColorPalette.ts` and is used by the UI.
