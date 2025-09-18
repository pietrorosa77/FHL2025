# Flow Chart Editor - Requirements Specification (Version 1.7.14)

## Project Overview
A comprehensive flow chart editor built with typescript and esbuild without external frameworks, featuring modular architecture, dynamic UI creation, and advanced connection management.

## Rebuild Guide (LLM / Engineer Oriented)
This section enumerates the exact components, contracts, and algorithms required to faithfully recreate the application from scratch without accessing the original source. Follow steps in order; every symbol is intentional.

### 1. Tech & Build Baseline
- Tooling: TypeScript (ES2018 target), esbuild bundler (IIFE output) → single `dist/app.js` bundled from `src/app.ts`.
- No runtime frameworks (no React/Vue/etc). Pure DOM APIs.
- Tests: Vitest + jsdom. Suggested folder: `src/__tests__` (current tests exist but not enumerated here; replicate based on Test Matrix).
- Entry HTML (`index.html`): body contains a single root container `<div id="app"></div>` plus `<script src="dist/app.js"></script>` and `<link rel="stylesheet" href="themes.css">`, `<link rel="stylesheet" href="styles.css">`.

### 2. Global CSS & Theming Contract
- Two CSS files:
	1. `themes.css`: declares all `--fc-` variables including colors, grid sizing (`--fc-grid-minor-size:16px`, `--fc-grid-major-size:80px`), line colors (`--fc-grid-minor-line`, `--fc-grid-major-line`), and theme variant scopes via `:root[data-theme="<name>"]`.
	2. `styles.css`: structural/layout styles, grid background gradients; adaptive variant `.fc-canvas.with-grid.grid-zoom-far` (only major lines) used when zoom < 0.55.

### 3. Core Data Structures (Type Summary)
Replicate `AppState`, `Block`, `Connection`, `ViewportState` exactly as documented under Core Data Schema. Reducer must be pure, keyed by action types under Action Contract.

### 4. Store & Dispatch Enhancement
- Provide a minimal Store with methods: `getState()`, `dispatch(action)`, optional `subscribe`. No middleware chain; enhancement occurs in `FlowchartApp.enhanceDispatch` to wrap undo operation logic and minimap notifications.
- Operation-based undo uses `UndoManager` with APIs: `begin(label)`, `commitIfChanged()`, `cancel()`, `run(label, fn)`. Each logical operation encloses state mutations; move (drag) coalesced until pointer up.

### 5. Managers & Their Responsibilities
- `BlockManager`: create/render/update blocks; maintains DOM elements with ids equal to block ids; updates position styles after reducer changes; handles ResizeObserver to capture size updates.
- Each block DOM includes exactly one connection anchor element (class `.fc-block-anchor`) positioned (e.g., centered on right edge) used to initiate a connection draft via pointer drag. Anchor emits pointerdown leading to `START_CONNECTION_DRAFT` with source block id.
- `ConnectionManager`: render all connections into SVG layer; update connections referencing a moved/resized block; manage markers & deletion icon.
- `GridManager`: apply/remove `with-grid`; persist settings to localStorage key `fc-grid`; listen to `viewport:change` to toggle `grid-zoom-far` below scale threshold 0.55.
- `ThemeManager`: restore last selected theme (`fc-theme`), manage custom themes (`fc-custom-themes`), generate swatch previews (`fc-theme-previews`). Applies custom theme by injecting a `<style>` block with `:root[data-theme="<custom>"]`.
- `FileIO`: export/import JSON (stringify entire AppState); import path validates structural shape.
- `HotkeysManager`: global listeners for undo/redo, escape, selection operations.
- `MinimapManager`: canvas overlay (200×200) bottom-left; renders block rectangles, selection highlight, viewport rectangle; supports click-to-center & drag viewport rectangle; visibility persisted under `fc-minimap-enabled`.
- `ViewportController`: handle pan (pointer drag), wheel zoom with `Ctrl`, pinch zoom, maintain scale within bounds, emit `viewport:change` via EventBus.
- `ConnectionDraftController`: transient connection creation; Esc cancels; draft line follows pointer.
- `UndoDebugPanel` (optional/dev): attaches when `?undoDebug=1`; shows undo/redo stack meta.

### 6. Event Bus
- Generic `EventBus<EventMap>` supporting `on`, `off`, `emit`.
- `EventMap` includes: `viewport:change`, `connection:draft:start|end`, `connection:added`, `block:drag:start|end`.
- Consumers: `GridManager` (for adaptive grid), `MinimapManager`, debug tooling.

### 7. Algorithms & Interactions
1. Drag Coalescing: On first MOVE_BLOCK dispatch, call `undo.begin('move-block')`; subsequent MOVE_BLOCK actions skip new undo entries; at drag end (pointer up), dispatch final MOVE_BLOCK (if changed) then `undo.commitIfChanged()`.
2. Arrange (Align/Distribute): Compute selection bounding box; for distribution, lock first & last block positions, compute uniform gap = (span - sumWidths)/(n-1); snap/clamp via reducer safety after dispatch (`MULTIDRAG_BLOCKS`).
3. Connection Routing:
	 - Bézier: cubic; control points horizontally offset from source/target centers (simple heuristic: dx = |target.x - source.x|*0.4 + 40, with sign by direction).
	 - Orthogonal: polyline with horizontal then vertical (or vice versa) segments; simplified L-shape; arrow placed at end.
4. Minimap Rectangle: viewportRect.x = offset.x * (miniW / CANVAS_W); width = (clientWidth / scale) * (miniW / CANVAS_W); similar for Y.
5. Adaptive Grid: if `viewport.scale <= 0.55` add `grid-zoom-far`; minor gradients removed for clarity.
6. Save/Load Validation: Ensure maps are objects; each block id matches key; block has numeric position & size; each connection has id/source/target strings. Reject invalid with alert.
7. Undo Snapshot Equality: Skip creating a history entry if structural segments (blocks, connections, viewport, grid, connectionStyle) unchanged (deep compare serialized or iterative compare of keys & primitives).

### 8. Persistence Keys (Final Canonical Set)
```
fc-saved-charts      // Array<{ name:string; savedAt:string; state:AppState }>
fc-custom-themes     // Custom themes array
fc-theme-previews    // Theme preview cache
fc-theme             // Last selected theme name
fc-grid              // { enabled:boolean; size?:number; snap?:boolean }
fc-minimap-enabled   // '1' | '0'
```

### 9. Required DOM Structure (Runtime Generated)
```
div#app
	div.app-root
		(toolbar container injected early → replaced by dynamic toolbar)
		div.fc-workspace-wrapper
			div.fc-canvas (absolute positioned logical canvas; id-less; width/height via CSS vars)
			svg.fc-svg-layer (connections)
			(optional minimap container appended to root outside workspace)
```
Block elements: `.fc-block` with inline styles `left/top/width/height`, child header, description, anchor.
Each `.fc-block` MUST contain exactly one child anchor element (class `.fc-block-anchor`) positioned (commonly on the right edge, vertically centered) serving as the interaction point for initiating a new connection draft (pointerdown + drag). Only this element starts connection creation; dragging elsewhere on the block body initiates a move.

### 10. Initialization Sequence
1. Construct `FlowchartApp(root)`.
2. Restore minimap & theme preferences (localStorage fetch inside constructor).
3. Build base layout (layout builder returns canvas element).
4. Instantiate managers (order matters: BlockManager, ConnectionManager, DraftController, ViewportController, ThemeManager, GridManager, FileIO, MinimapManager).
5. Enhance dispatch for undo + minimap updates.
6. Render initial empty state (`render()` calls managers to draw nothing but establish layers).
7. Attach toolbar with callbacks bound to undo operations.
8. After initial interactive creation, force undo baseline capture if supported.

### 11. Testing Strategy Outline
Replicate each item in Test Matrix with Vitest: mock DOM via jsdom; stub canvas context for minimap if needed; simulate dispatch for arrange, save/load, and grid toggle persistence.

### 12. Non-Goals Affirmation
Do not implement collaboration, server sync, advanced routing, heavy editor features, or external frameworks—keeping bundle lightweight.

### 13. Rebuild Checklist (Condensed)
```
[ ] Data schema + reducer
[ ] Store + operation-based undo
[ ] Managers (block, connection, viewport, grid, theme, minimap, file IO, hotkeys, draft)
[ ] EventBus + viewport:change emission
[ ] Toolbar UI + modals (save/load, custom theme, arrange menu)
[ ] WYSIWYG (contentEditable + execCommand buttons)
[ ] JSON editor (live parse, highlight classes)
[ ] Grid rendering + adaptive class logic
[ ] Minimap canvas overlay
[ ] Arrange algorithms
[ ] Persistence (localStorage keys)
[ ] Theming + custom theme registration
[ ] Tests per matrix
[ ] README + .gitignore
```

---

## Architecture

### Modular Design
- the main index.html should only reference the bundle script and the css and should have the main chart container.
- the chart should take the full screen
- All UI elements are dynamically created via their own specific component file.
- Use of a state manager with action/reducer pattern to hold the application state

## Implemented Features
### 🔍 System Overview Addendum
This specification is the single source of truth. Another engineer or LLM should be able to recreate the application (logic, UI, persistence, tests) solely from this file.

### 🧬 Core Data Schema
AppState shape (TypeScript-like):
```
interface AppState {
	blocks: { [id: string]: Block };
	connections: { [id: string]: Connection };
	selection: { blockId?: string; connectionId?: string };
	viewport: { scale:number; offset:{x:number;y:number}; bounds:{ minScale:number; maxScale:number } };
	connectionDraft?: { sourceBlock: string; currentPoint:{x:number;y:number} };
	connectionStyle: 'bezier'|'orthogonal';
	grid: { enabled:boolean; size:number; snap:boolean };
	historyVersion: number;
}
interface Block { id:string; kind:'start'|'process'|'decision'|'io'|'end'; position:{x:number;y:number}; size:{width:number;height:number}; title:string; descriptionHtml:string; properties:Record<string,any>; /* exactly one visual connection anchor rendered per block */ }
interface Connection { id:string; source:string; target:string; style:'bezier'|'orthogonal'; label?:string }
```

### ♻️ Action Contract
ADD_BLOCK, UPDATE_BLOCK, MOVE_BLOCK, MULTIDRAG_BLOCKS, DELETE_BLOCK
ADD_CONNECTION, UPDATE_CONNECTION, DELETE_CONNECTION
SET_CONNECTION_STYLE
START_CONNECTION_DRAFT, UPDATE_CONNECTION_DRAFT, CANCEL_CONNECTION_DRAFT
SELECT_BLOCK, SELECT_CONNECTION, SET_MULTI_SELECT
SET_VIEWPORT, SET_GRID
INCREMENT_HISTORY (legacy incremental counter)
BULK_SET_STATE (partial replace/merge)

### ⏪ Undo Operation Model
UndoManager uses begin/commitIfChanged/cancel. One undo step per logical operation (e.g., drag end). Operation labels: add-block, delete-block, move-block, set-conn-style, edit-block, toggle-grid, import-json, clear-all, reset-view, load-chart.

### 🗄 LocalStorage Keys
```
fc-saved-charts   // Array<SavedChartEntry>
fc-custom-themes  // Array<{ name:string; vars:Record<string,string> }>
fc-theme-previews // { [themeName]: { bg:string; accent:string } }
fc-grid-enabled   // '1' | '0' (optional)
```
SavedChartEntry: `{ name:string; savedAt:string; state:AppState }`.

### 💾 Save / Load Algorithms
Save: read list -> check name -> confirm overwrite -> replace/append -> persist -> timestamp ISO.
Load: list -> pick entry -> validate (maps, id consistency, required fields) -> BULK_SET_STATE -> renderAll -> applyViewport/grid -> undo baseline (load-chart).

### 📝 WYSIWYG Editor
ContentEditable region for descriptionHtml. Toolbar commands (bold, italic, underline, link, image, media, save, cancel). Popups restore selection before insertion. Image/media -> full-width wrapper div. Paste heuristics: URL -> link; image URL/file -> image block; YouTube/video URL -> iframe/video block.

### 🔐 Validation
Load validation is lightweight (structural). Failing entries produce alert; data not mutated.

### 🧪 Test Matrix (High-Level)
1 Add block each kind; undo baseline.
2 Drag coalescing single undo step.
3 Create/delete connection + undo/redo integrity.
4 Style toggle updates all connections.
5 JSON editor invalid -> error; valid -> commit & pretty-print.
6 WYSIWYG save vs cancel difference.
7 Image insertion full-width.
8 Media insertion YouTube -> iframe.
9 Selection preserved for link insertion.
10 Grid toggle persists.
11 Theme switch & custom theme registration persists preview.
12 Distinct undo steps for add/move/edit.
13 Save overwrite confirmation updates timestamp.
14 Tampered saved state rejected.
15 Delete saved chart updates storage.
16 Pagination with >24 entries.
17 Search filter narrows list.
18 Two-column layout when >12 wide screen.
19 Reset view restores default viewport.
20 Import JSON equality.

### 🧩 Theming Variables (Representative)
`--fc-bg, --fc-bg-alt, --fc-border, --fc-border-strong, --fc-text, --fc-accent, --fc-grid-minor, --fc-grid-major, --fc-dot, --fc-block-bg, --fc-block-header, --fc-toolbar-bg, --fc-toolbar-border, --fc-btn-bg, --fc-btn-hover, --fc-btn-active, --fc-popup-bg, --fc-danger, --fc-code-str, --fc-code-num, --fc-code-bool, --fc-code-null`.

### 🔄 Rendering Flow
Dispatch -> reducer -> enhanced dispatch side-effects -> managers render blocks & connections -> viewport + grid applied -> status updated.

### 🪟 Saved Charts UI Behavior
Recomputes list on dialog open; sort/search/pagination mutate derived subset; page reset on sort/filter; grid auto when >12 & width>900px.

### ⚠️ Limitations
No grouping (beyond ad-hoc multi-select drag), server sync, or collaborative editing. execCommand reliance.

### 🚫 Security
Assumes trusted local usage; production SHOULD sanitize descriptionHtml.

### ✅ Block Management
- Add blocks of multiple kinds (start, process, decision, io, end)
- Drag & drop with rAF throttling and coalesced undo entries
	- Multi-select: Shift adds to selection; Ctrl/Cmd toggles membership; drag moves all selected blocks together while preserving relative offsets. MULTIDRAG_BLOCKS action dispatched with per-block target positions; single MOVE_BLOCK used when only one block involved. Plain (unmodified) click on any block while a multi-selection (>1 blocks) is active NO LONGER collapses the selection—this preserves the multi-selection context. Only Shift (add) or Ctrl/Cmd (toggle) mutate the current multi-selection when more than one block is already selected.
	- Drag algorithm (single block): on pointerdown over block body record `startPointer` (screen coords) & `startPos` (block.position). On pointermove compute `dx,dy` in logical space using inverse viewport transform then target = `startPos + {dx,dy}`. Clamp target: `target.x = max(0, min(target.x, canvasWidth - block.width))`, similarly for y with canvasHeight and block.height. Dispatch MOVE_BLOCK only if target differs from current to avoid noise. On pointerup finalize; UndoManager commits one operation labeled `move-block`.
	- Drag algorithm (multi-block): record each block's `startPos`; compute shared delta from pointer movement; pre-clamp by forming group bounding box (minX,minY,maxX,maxY) then adjust delta so box stays within `[0,canvasWidth] x [0,canvasHeight]`. Apply delta to every selected block; dispatch MULTIDRAG_BLOCKS with full changes array. Reducer performs secondary per-block clamp (safety) to enforce `0 <= x <= canvasWidth - width` etc.
	- Group clamp: During multi-drag the combined bounding rectangle of all selected blocks is clamped to canvas bounds; delta adjusted so no block exits the canvas. Reducer applies a secondary group clamp for safety.
		- Selection marquee: Shift+drag on empty canvas draws a translucent rectangle selecting blocks fully enclosed; updates in real time; releases pointer to finalize multi-selection.
		- Multi-delete: Press Delete/Backspace with more than one block selected (and focus not in an editor) to remove all selected blocks in a single undo operation.
			- Select-all: Ctrl+A / Cmd+A (when focus not in editable field) selects every block and sets the first as primary.
- Single connection anchor per block for initiating connections
- Inline editable title (plain text) via double‑click
		- Rich HTML description editing via modular WYSIWYG editor (execCommand based) with save / cancel
			- Toolbar supports enhanced theming (gradient background, SVG icon buttons, accent save button) via CSS variables/classes
			- Modular popup for inserting/editing links (URL + text)
			- Pasting a URI auto-inserts as a link
			- Modular popups for inserting images & media (YouTube/video) with themed OK/Cancel buttons
			- Pasting image file or image URL auto-inserts as a full-width block (no adjacent content)
			- Pasting YouTube/video link auto-inserts as a full-width media block (iframe or video tag, no adjacent content)
- `properties` JSON object editable in dedicated JSON editor popup
- Automatic size observation (ResizeObserver) updates stored block size when content changes
- Drag clamping keeps blocks within canvas logical bounds

### ✅ JSON Properties Editor
- Invoked from a block to edit its `properties` object as raw JSON.
- Backed by a `<textarea>` ensuring direct text editing (never hidden when editor visible).
- Live validation: parses on each input; shows status message ("Valid JSON" or detailed error) without committing invalid changes.
- Error feedback includes line, column, and absolute character position when available (e.g., `Error Ln 3, Col 15 (pos 57)`).
- Pretty-print (Format) button re-serializes valid JSON with 2-space indentation.
- Syntax highlighting layer (strings, numbers, booleans, null, punctuation) using lightweight regex tokenization.
- Highlight toggle (HL On/Off) allows user to disable coloring; auto-disabled for large payloads (>20k chars) to prevent performance issues.
- Status region color-coded (success / error) and announced via `aria-live="polite"` for accessibility.
- Esc key hint displayed (Esc to close popup) for consistent dismissal UX.
- Theming through CSS variables (e.g., `--fc-code-str`, `--fc-code-num`, etc.) so highlight colors adapt to current theme.
- Caret & selection remain usable with highlight enabled: textarea text becomes transparent while overlay shows tokens.

### ✅ Undo / Redo System
- Central UndoManager maintains history of state snapshots.
- Baseline snapshot captured prior to first mutating action to enable full restoration.
- Action dispatch wrapper captures pre-action baseline for first change after load and handles coalescing logic.
- Coalesced MOVE_BLOCK actions: continuous drag movements during an active drag session collapse into a single history entry (reduces history noise and improves UX).
- Undo / Redo toolbar buttons plus keyboard shortcuts:
	- Ctrl+Z: Undo
	- Ctrl+Y or Ctrl+Shift+Z: Redo
- Internal flag (e.g., dragMoveActive) controls grouping scope for move operations.

### ✅ Grid Overlay & Persistence
- Grid now enabled by default (`initialState.grid.enabled = true`)
- Toggle control in toolbar switches grid on/off and persists preference (localStorage)
- Dual-layer graph paper: minor (8px) + major (40px) lines theme-driven
- When disabled, a subtle sparse dotted pattern (customizable via CSS vars) provides visual texture

### ✅ Toolbar & Hotkeys
- Central toolbar dynamically created at runtime.
- Provides at minimum: Undo, Redo, Grid Toggle, Connection Style switching (curved / orthogonal), and JSON properties editing trigger (contextual or via block UI).
- Data menu now includes enhanced local save/load:
	- Save chart with user-provided name (stored in localStorage with timestamp)
	- Overwrite protection: confirmation required if name already exists
	- Multiple named charts managed in a single `fc-saved-charts` array
	- Load dialog lists saved charts with human-readable timestamp
	- Sort toggle: by last saved date (desc, default) or by name (A→Z)
	- Search filter (incremental, debounced) narrows chart list by name
	- Pagination (24 per page) with page indicators when filtered set exceeds page size
	- Two‑column adaptive grid when >12 entries and viewport width > 900px; otherwise single column
	- Responsive modal sizing (min 480px, up to 90vw capped at 780px; max-height 90vh) to minimize scrolling
	- Per‑entry delete button (confirmation required) updates list live
	- Lightweight schema validation before load (verifies block & connection object maps: ids, kind, position/size integrity); invalid entries rejected with alert
	- Successful load refreshes rendered blocks & connections and records an undo baseline
- Hotkeys: Undo/Redo as above; Esc consistently cancels transient modes (e.g., connection drafting, properties popup) without applying unintended changes.

### ✅ Connection System
- Visual connection creation via drag from a block anchor to target block
- SVG-based rendering (paths + arrowheads + delete affordance)
- Multiple styles: Bézier (curved) & orthogonal; switchable live from toolbar
- Direction arrow markers & hover state styling
- Mid-connection trash icon for quick deletion
- Editable connection labels (default to connection id) rendered via `foreignObject` with inline editing & dynamic repositioning on block move
 - Directionality semantics: `source` (origin block) -> `target` (destination block). Arrowhead marker attached at path end closest to target block center. Path always begins at the source block's single anchor center point and terminates at a computed perimeter intersection point on the target block (simple heuristic: line from source anchor to target center then clamp to target bounding box edge). Marker orientation auto-derived from final segment direction (SVG marker `orient="auto"`).
 - During draft: provisional path updates with pointer; arrowhead only rendered after target block is confirmed (pointerup over valid block). Cancel via Esc removes draft without creating connection.

### ✅ Navigation & Viewport
- Pan & zoom (wheel + touch pinch) with scale clamped to configured bounds
- Reset view button returns to default scale/offset
- Smooth pointer‑based panning and draft updating using shared screen→local coordinate conversion

### ✅ Interaction / Draft Cancellation
- Connection drafting (when user starts dragging from an anchor) can be canceled via Esc to avoid accidental connections.
- Consistent Esc behavior across editor contexts (drafts, property editor popup).

### ✅ Performance Considerations
- Drag move coalescing reduces undo stack size and improves performance during block repositioning.
- requestAnimationFrame throttling ensures smooth block dragging without layout thrash.
- Syntax highlighting auto-disabled for large JSON payloads to prevent sluggish typing.

### ✅ Accessibility
- JSON editor status (`role="status"`, `aria-live="polite"`)
- Highlight overlay `aria-hidden="true"`
- Toolbar buttons semantic with titles / labels
- Connection labels & block titles editable via standard contentEditable / inputs for AT compatibility

### ✅ Theming & Canvas
- Multi-theme support (default dark + light + high-contrast + blue + green + purple)
- Extensive CSS variable system (colors, grid lines, pattern dots, shadows)
- Canvas dimension variables: `--fc-canvas-width`, `--fc-canvas-height` (default 4000px each)
- Dotted background & graph paper colors theme-adjusted

### ✅ Empty Initial Canvas
- Loads with no demo blocks for a clean workspace (user explicitly creates content)

### ✅ Testing & Quality (Overview)
- Automated tests cover: undo/redo, grid toggle persistence, move coalescing, connection label editing + reposition, WYSIWYG editor, drag clamping
- JSON editor parsing deterministic with line/column error extraction

### ✅ Modular Architecture (1.3 Refactor)
- `app.ts` responsibilities decomposed into focused modules:
	- `layout.ts` (DOM scaffold builder)
	- `GridManager.ts` (grid state persistence + application)
	- `ThemeManager.ts` (theme restore/persist)
	- `FileIO.ts` (export/import JSON state)
	- `HotkeysManager.ts` (keyboard shortcuts wiring)
	- Reducer extracted earlier into `reducer.ts` (already done pre‑1.3) for clearer separation from type definitions.
- Promotes testability and future extension (e.g., additional managers) without inflating core app bootstrap file.

### ✅ Reducer-Level Safety Clamp
### ✅ Shared Configuration & DI (1.4)
### ✅ Expanded Light Theme Set (1.5)
### ✅ Theme Swatches & Custom Themes (1.6)
### 🛠 Patch 1.6.1
- Swatch preview generation now derives real CSS variable values per theme via `ThemeManager.ensurePreviewForBuiltin` instead of heuristic guesses (which rendered blank/white squares in some cases).
- Toolbar theme menu updated to consult centralized preview cache for consistency and persistence.

- Theme menu now displays visual swatches (background + accent) for quick scanning.
- Added modal (replacing prompt) for injecting custom theme JSON mapping of CSS variables (only `--fc-` prefixed keys applied).
- Custom themes persisted in `localStorage` (`fc-custom-themes`) and restored on load; previews cached (`fc-theme-previews`).
- Dynamic registration generates a `<style>` block with `:root[data-theme="<name>"] { ... }` scoping.
- Users can immediately switch to the newly created theme; status bar reflects custom theme activation.

- Added multiple light‑oriented themes to improve accessibility and user preference coverage: `light-blue`, `light-green`, `light-orange`, `light-gray`, `light-contrast`.
- Theme selector updated to expose new variants; all inherit semantic token model ensuring consistent component styling.
- Each light theme tunes grid contrast, connection colors, and JSON token palette for adequate readability on bright backgrounds.

- Central `config.ts` exports `DEFAULT_CANVAS_WIDTH` / `DEFAULT_CANVAS_HEIGHT` used by reducer and CSS variables (eliminates magic numbers in logic).
- Manager interfaces (`interfaces.ts`): `IGridManager`, `IThemeManager`, `IFileIO`, `IHotkeysManager` plus `AppDependencies` for dependency injection.
- `FlowchartApp` constructor accepts optional partial `AppDependencies` enabling headless/unit tests to supply mocks (e.g., stubbed grid or theme managers) without touching DOM or localStorage.
- Managers updated to `implements` their interfaces ensuring swappability and compile-time contract checking.

- MOVE_BLOCK action now clamps positions within fixed canvas bounds (4000x4000) in addition to UI-level clamp, ensuring programmatic moves cannot escape.

## Deferred / Potential Enhancements (Not Yet Implemented)
	- Modular popup for image/media block insertion (full-width enforced)
	- Paste handler for images/media (auto block insertion)
- Full project persistence (save/load flow definitions) beyond manual JSON export
- Search / filter blocks & properties
- Schema-aware validation / JSON folding
- Additional keyboard shortcuts (format JSON, toggle highlight, focus search)
- Connection label collision avoidance / smart reposition
- Connection routing improvements (obstacle avoidance)
- Snap-to-major-grid (currently basic snap by grid.size when enabled)
- Snap-to-major-grid (currently basic snap by grid.size when enabled)

## Architectural Notes (Addendum)
- Dynamic UI generation keeps `index.html` minimal (script + stylesheet + container only).
- State manager with action/reducer pattern underpins deterministic updates suitable for undo snapshots.
- Undo integration wraps dispatch to ensure snapshots occur exactly once per logical user action or coalesced action group.
- JSON editor kept dependency-free (no external libraries) to minimize bundle size and complexity.

## Non-Goals (Current Scope)
- Real-time multi-user collaboration.
- Server-side persistence or cloud sync.
- Rich code editor features (folding, multi-cursor) beyond lightweight highlighting.

## Summary
Version 1.3 delivers a structural modular refactor (manager pattern) and introduces reducer-level movement clamping, while retaining all 1.2 feature gains (grid, labels, WYSIWYG, dotted background, theming). The codebase is now cleaner for ongoing feature growth (persistence, routing intelligence, advanced editing ergonomics).

## Patch 1.7.14 (Multi-Select Plain Click Guard)
- Added guard preventing accidental collapse of an active multi-selection when performing a plain click on a selected block (or another block) while more than one block is selected. This ensures users can interact (e.g., begin a drag) without losing their multi-selection unless they explicitly modify it with Shift (add) or Ctrl/Cmd (toggle).
- Updated specs to reflect clarified multi-select interaction model.

## Patch 1.6.2 (Undo/Redo Stabilization)
- ## Patch 1.6.3 (Undo Noise Reduction)
- ## Patch 1.6.4 (Undo Debug Panel & Test Alignment)
- Reintroduced historyVersion increment on MOVE_BLOCK to maintain compatibility with existing unit tests expecting version changes per move.
- Added optional runtime debug panel (enable via `?undoDebug=1` in URL) displaying undo/redo stack depths and top history versions.
- Panel offers actions: Dump (console snapshot), ForceCap (manual snapshot), Clear (development-only stack reset).
- UndoManager now dispatches `fc:undo:debug` CustomEvents after every snapshot or traversal, enabling external instrumentation.
- Drag moves now create exactly one undo entry per completed drag (baseline at pointer down, final snapshot at drag end). Intermediate MOVE_BLOCK actions are not recorded.
- Block creation coalesced into a single undo step (ADD_BLOCK plus initial size observation updates no longer require multiple undo presses).
- Removed historyVersion increments on each MOVE_BLOCK to prevent artificial version churn; final drag-end capture handles version boundary.
- Simplified dispatch wrapper: discrete mutations capture only post-change state; baseline snapshots removed except for drag start.
- Further snapshot deduplication leverages existing structural equality checks in UndoManager.
- Eliminated no-op history entries: `UndoManager` now ignores snapshots identical in core structure (blocks, connections, viewport, grid, connection style).
- `MOVE_BLOCK` reducer increments `historyVersion` only when position actually changes; early return for zero-delta moves prevents noisy history growth during micro drags or redundant dispatches.
- Drag sequencing: baseline snapshot captured at drag start; incremental move actions update state & historyVersion; final state capture occurs without duplicating unchanged snapshots.
- Discrete (non-move) mutations now capture pre-action baseline and post-action result ensuring a clear before/after pair while deduplicating if reducer didn't effect a change.
- Added guarded post-mutation history bump when reducer did not advance `historyVersion` (e.g., viewport tweaks) to keep undo semantics consistent.
- Prevented add-block popup appearing during undo/redo by canceling any active connection draft prior to history traversal (ensures stray draft completion logic cannot fire after state rewind).

## Version 1.7.0 (Operation-Based Undo/Redo Rewrite)
- Replaced version-based snapshot capturing with explicit operation lifecycle (begin/commit/cancel).
- Each logical user action produces at most one undo step: add/delete/move (on drop)/edit (title, description, properties)/style change/grid toggle/viewport reset/import/clear-all.
- Dragging a block only records on drop; intermediate MOVE_BLOCK dispatches are ignored for history purposes.
- Block creation and initial size adjustments (ResizeObserver) coalesced via microtask commit.
- New `UndoManager` API: `begin(label)`, `commitIfChanged()`, `cancel()`, `run(label, fn)`; legacy methods retained as harmless shims.
- Undo stack stores pre-change snapshots with labels; redo restores forward states operation-by-operation.
- Debug panel updated to surface operation labels and active operation state.

## Patch 1.7.1 (Local Save Management Enhancements)
- Added overwrite confirmation to Save Chart dialog to prevent accidental replacement of existing named charts.
- Load dialog revamped with per‑entry Load / Delete controls and scrollable list.
- Added sort toggle (Date desc default / Name asc) for saved charts.
- Implemented lightweight schema validation (blocks + connections basic shape) prior to applying a loaded state; invalid data rejected with user feedback.
- Added per‑entry delete with confirmation; changes persist immediately to `localStorage`.
- Updated specs to reflect new persistence behaviors (overwrite protection, sorting, deletion, validation).

## Patch 1.7.2 (Saved Charts UX Improvements)
- Responsive Load Chart modal (auto width ≤90vw capped at 780px; max-height 90vh).
- Added search filter (debounced) for saved chart names.
- Added pagination (24 items per page) with page controls and total count display.
- Automatic two-column grid layout when large result sets (>12 entries) and sufficient screen width.
- Increased spacing and adaptive layout; scrollbar rarely needed unless extreme counts.

## Patch 1.7.3 (Specification Consolidation)
- Elevated specification to authoritative source including: full AppState schema, action contract, undo operation catalog, theming variable set, save/load algorithms, WYSIWYG behavior, test matrix, and localStorage key registry.
- Added explicit rendering flow documentation and security/limitation notes.
- Clarified saved chart validation and UI interaction rules (sort, search, pagination, grid switch).

## Patch 1.7.4 (Selection Count Status)
- Status bar now always appends current selection count when at least one block is selected.
- Multi-select and single selection both reported as: `... Zoom: 100% Selected: N`.
- Zero selection omits the suffix for brevity.

## Patch 1.7.5 (Arrange: Align & Distribute)
- Added toolbar Arrange (📐) menu exposing alignment and distribution operations for multi-selected blocks.
- Alignment commands: Align Left / Center / Right (horizontal), Align Top / Middle / Bottom (vertical).
- Distribution commands: Distribute Horizontal / Distribute Vertical (even spacing of gaps between block edges, preserving first & last positions).
- Implementation details:
	- `runArrange(kind)` gathers current multi-selection (requires ≥2 blocks) and computes target positions.
	- For align operations, only the relevant axis is modified (e.g., align-left sets all left x to group minimum; align-middle centers each block vertically relative to group bounding box).
	- For distribution, interior blocks are repositioned so gaps between adjacent block edges are equal. First and last blocks remain fixed to preserve outer bounds.
	- Reducer safety clamp still applies via `MULTIDRAG_BLOCKS` to keep the entire adjusted group inside canvas bounds.
	- All selected blocks (changed and unchanged) are included in the dispatched `MULTIDRAG_BLOCKS` changes array to ensure accurate group clamp calculations; unchanged blocks retain their coordinates.
	- DOM synchronization: enhanced dispatch now updates `.style.left/.top` for every moved (or potentially clamped) block after `MOVE_BLOCK` and `MULTIDRAG_BLOCKS` actions—covers programmatic arrange operations (previously only drag path updated DOM immediately).
	- Undo integration: each arrange action captured as a single operation labeled `arrange-blocks` (one undo step). Redo restores pre‑arranged layout.
- Tests added:
	- Horizontal distribution correctness (equalized gaps) with grid disabled for deterministic values.
	- Align-right correctness (right edges equal) including unchanged block participation.
- Edge cases / safeguards:
	- If selection <2 blocks, operation aborts with status message (no-op).
	- Zero effective position delta (already aligned) reports `Arrange: no changes` (no undo entry created).
	- Grid snapping applies post-calculation through reducer when enabled, potentially quantizing arranged positions.
- Future considerations (not implemented yet): disable menu entries when insufficient selection; visual flash or guideline overlays; distribution preview before commit.

## Patch 1.7.6 (Minimap Navigation)
- Added fixed-position minimap (default 200x200px) bottom-right overlay showing block positions and current viewport.
- Renders lightweight rectangles for each block scaled against logical canvas size (4000x4000).
- Viewport outline (yellow) reflects visible region derived from viewport offset & scale and current canvas client dimensions.
- Interactions:
	- Click on minimap recenters main viewport at clicked logical point.
	- Drag the viewport rectangle to pan main canvas continuously.
- Implementation: `MinimapManager` listens to store updates (blocks, viewport, selection) via dispatch hook and re-renders with rAF throttling.
- Scaling: `miniX = block.position.x * (miniW / CANVAS_W)`, likewise for Y/width/height.
- Selected block highlighted with accent color rectangle (distinct fill).
- Undo unaffected (pure navigation adjustments dispatch viewport changes outside undo stack semantics).
- Future enhancements (not implemented): connection previews, zoom slider, minimap toggle visibility, dynamic sizing based on content extents.

## Patch 1.7.7 (Minimap Reposition & Toggle)
- Minimap moved from bottom-right to bottom-left to comply with updated layout requirements (avoids overlap with existing status elements on some viewports).
- Added toolbar Minimap (🗺) button to toggle visibility. Button reflects active state (CSS `active` class) based on current minimap visibility.
- `FlowchartApp` maintains `minimapEnabled` boolean flag; `toggleMinimap()` updates flag, calls `MinimapManager.setVisible()`, and posts status message (`Minimap on/off`).
- `MinimapManager` now exposes `setVisible(on:boolean)`, `isVisible()`, and `getElement()` helpers for future feature extensions (e.g., persistence, animations).
- Display toggle does not affect undo history (pure UI visibility). Viewport navigation remains functional when re-enabled (state changes always dispatched even when hidden).
- Specification updated to reflect new control; previous future enhancement note about minimap toggle visibility now realized.
- Persistence: minimap visibility stored in `localStorage` key `fc-minimap-enabled` (`'1'` or `'0'`) and restored on load before instantiating manager so initial state matches prior session.

## Patch 1.7.8 (Graph Paper Grid Refinement)
- Adjusted grid to resemble traditional engineering graph paper at 100% zoom.
- Introduced CSS variables `--fc-grid-minor-size` (default 20px) and `--fc-grid-major-size` (default 100px) in theme root for consistent scaling and easy theme overrides.
- Updated `.fc-canvas.with-grid` to use these variables instead of hard-coded 8px / 40px values; major lines remain darker (`--fc-grid-major`) while minor lines use `--fc-grid-minor` for subtle contrast.
- Layout now produces evenly spaced minor intersections (every 20 logical pixels) with strong major lines every 5 minors.
- Future option: dynamic scaling of grid size when zooming far out/in (not implemented yet).

## Patch 1.7.9 (Grid Contrast Enhancement)
- Introduced dedicated variables `--fc-grid-minor-line` and `--fc-grid-major-line` decoupling color choice from size logic for clarity and theme flexibility.
- Increased major line stroke thickness to 2px while retaining 1px minor lines, improving legibility at 100% zoom on high‑DPI displays.
- Dark theme: intensified major line (`--fc-grid-major` darkened to `#42474d`) while keeping minor lines subtle for authentic graph paper layering.
- Light theme: major line darkened relative to minor (`#b9c1ca` vs `#e4e8ee`) and line vars exposed explicitly for downstream light variants.
- `.fc-canvas.with-grid` now references line variables instead of structural color tokens, enabling potential future adaptive contrast adjustments.
- No functional logic changes; purely visual refinement. Undo / state management unaffected.

## Patch 1.7.10 (Grid Density & Major Line Softening)
- Reduced minor grid size from 20px to 16px and major grid interval from 100px to 80px (still 5× minor). This increases perceived graph paper density at default (100%) zoom, making block alignment landmarks feel closer and more natural for typical flow sizes.
- Lightened major line color in both dark and light default themes to soften contrast introduced in 1.7.9 while preserving structural hierarchy via thickness (2px) + subtle tonal shift instead of heavy darkness.
	- Dark theme major line: `#42474d` → `#3a4046`.
	- Light theme major line: `#b9c1ca` → `#c1c8d0`.
- Rationale: High-contrast thick major lines at previous spacing (20/100) visually dominated sparse diagrams; tighter spacing plus gentler chroma produces an authentic engineering pad aesthetic without distraction.
- Implementation: Variable adjustments only (`--fc-grid-minor-size`, `--fc-grid-major-size`, and updated `--fc-grid-major` values); no layout or JS changes. Existing gradient layering & line variable indirection remain unchanged.
- Risk assessment: Low. Tests unaffected (no assertions on specific pixel values of CSS variables). Undo / rendering logic untouched.
- Future consideration: adaptive grid stepping (e.g., hide minor lines beyond certain zoom thresholds) could further enhance clarity when zoomed far out; deferred.

## Patch 1.7.11 (Adaptive Grid & Theme Alignment)
- Applied softened major grid color adjustments to all built-in themes (blue, green, purple, light-blue, light-green, light-orange, light-gray, light-contrast) to maintain consistent hierarchy after core dark/light tweak in 1.7.10.
- Introduced adaptive grid behavior: when viewport scale drops below 0.55, minor grid lines are hidden (class `grid-zoom-far`) leaving only major lines (2px) for reduced visual noise during high-level navigation.
- Implementation details:
	- `ViewportController` already emits `viewport:change`; `GridManager` now subscribes (via injected EventBus) and toggles `grid-zoom-far` class based on threshold.
	- CSS adds `.fc-canvas.with-grid.grid-zoom-far` variant with only major line gradients (minor layers removed) for performance and clarity.
	- Threshold stored in `GridManager.farThreshold` (0.55) for easy future tuning or potential theming.
- Fallback safety: adaptive class removed whenever grid disabled to avoid stale styling when re-enabled at different zoom levels.
- No state schema changes; feature purely stylistic/reactive. Test coverage unchanged (no tests asserted pixel-level grid visuals). Low regression risk.
- Future options: multi-tier adaptation (e.g., second threshold to reduce major thickness) and smooth transition via opacity instead of immediate layer removal.

## Patch 1.7.12 (Comprehensive Reconstruction Spec)
- Updated specification version to 1.7.12 and appended an extensive "Rebuild Guide" detailing module responsibilities, data contracts, algorithms, persistence keys, DOM expectations, and initialization order.
- Clarified adaptive grid threshold (0.55) and ensured explicit listing of all active localStorage keys (added `fc-theme`, `fc-grid`, `fc-minimap-enabled`).
- Added reconstruction checklist enabling deterministic recreation by another engineer or LLM without the original codebase.
- No runtime behavioral changes—documentation only. Serves as consolidation milestone preparing for potential external publication / open-source release.

## Patch 1.7.13 (Drag, Anchor & Direction Clarifications)
- Clarified explicit drag algorithms for single and multi-block movement including logical delta computation and boundary clamping (0..canvasWidth - width / 0..canvasHeight - height) with group clamp pre-adjustment plus reducer safety clamp.
- Documented mandatory single connection anchor per block (`.fc-block-anchor`) and its role as the sole initiation point for connection drafting; dragging elsewhere performs block move.
- Expanded Connection System section with detailed directionality semantics (source -> target), arrowhead marker placement/orientation, draft behavior (provisional path, arrowhead only after confirmation), and perimeter intersection heuristic for target endpoint.
- Added DOM structure requirement paragraph specifying presence and typical positioning of `.fc-block-anchor` inside each block element.
- Updated Block interface comment noting exactly one visual anchor per block.
- Documentation-only patch; no code changes implied.

