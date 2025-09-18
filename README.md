# fhlvibeflowchart

A lightweight, dependency-free (runtime) TypeScript flow chart editor featuring operation-based undo/redo, rich text block descriptions, multi-theme support, minimap navigation, arrange (align/distribute) tools, adaptive graph paper grid, and local save/load with pagination & search.

## Features
- Blocks: start / process / decision / I/O / end
- Drag, multi-select marquee, arrange align & distribute
- Connections: bezier or orthogonal with labels & deletion affordance
- WYSIWYG HTML description editor (execCommand based)
- JSON properties editor with live validation & highlighting
- Operation-based undo/redo (single step per logical action)
- Persistent themes & custom theme registration
- Minimap (toggle + persistence) with viewport drag
- Adaptive grid: 16px minor / 80px major, minor lines hidden when zoomed far out
- Local storage save/load (search, sort, paginate, overwrite confirm)

## Tech Stack
- TypeScript + esbuild bundling
- No UI framework (pure DOM APIs)
- Vitest + jsdom for tests

## Getting Started
```bash
npm install
npm run build   # produce dist/app.js
npm run serve   # build then serve at http://localhost:9999
npm run dev     # watch mode with esbuild
npm test        # run vitest suite
```
Open `index.html` via the dev server root to use the editor.

## Scripts
- `build`: Bundles `src/app.ts` to `dist/app.js`
- `dev`: Watch + serve
- `serve`: Production build then static server on port 9999
- `test`: Run Vitest tests

## Project Structure (excerpt)
```
src/
  app.ts            # bootstrap
  GridManager.ts    # grid enable + adaptive zoom class
  ViewportController.ts
  MinimapManager.ts
  ...
themes.css          # theme & grid variables
styles.css          # layout + grid gradients
specs.md            # authoritative requirements / patch log
```

## Adaptive Grid
Minor lines hidden below scale 0.55 (`grid-zoom-far` class) to reduce noise. Threshold tweakable in `GridManager.farThreshold`.

## Custom Themes
Accessible via theme manager UI; stored in `localStorage` under `fc-custom-themes`. Swatches auto-generated.

### Theme Menu Behavior
The theme menu now:
- Toggles closed when the toolbar Theme button is clicked again.
- Closes on outside click or pressing Escape.
- Clamps its position within the viewport (repositions below if not enough space above, and horizontally within window margins) to avoid rendering off-screen.

## Saving & Loading
Charts saved as serialized app state objects (with timestamp) in `fc-saved-charts`. Load dialog offers delete, search, sort & pagination.

## Undo Semantics
One undo per logical action (add, move (on drop), edit, arrange, style change, import, clear, reset view, toggle grid). Implemented via operation begin/commit pattern.

## License
Add your chosen license here (MIT recommended). Currently unspecified.

---
See `specs.md` for full authoritative specification including schema, actions, patch history, and test matrix.
