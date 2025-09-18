import { initialState, Action, BlockKind, Point } from '../types.js';
import { BlockManager } from '../BlockManager.js';
import { ConnectionManager } from '../ConnectionManager.js';
import { Toolbar } from '../Toolbar.js';
import { AutoCreatePopup } from '../AutoCreatePopup.js';
import { Store } from '../Store.js';
import { EventBus, EventMap } from '../EventBus.js';
import { ViewportController } from '../ViewportController.js';
import { ConnectionDraftController } from '../ConnectionDraftController.js';
import { UndoManager } from '../UndoManager.js';
import { buildLayout } from '../layout.js';
import { GridManager } from '../GridManager.js';
import { ThemeManager } from '../ThemeManager.js';
import { FileIO } from '../FileIO.js';
import { HotkeysManager } from '../HotkeysManager.js';
import { UndoDebugPanel } from '../UndoDebugPanel.js';
import { AppDependencies, IGridManager, IThemeManager, IFileIO, IHotkeysManager } from '../interfaces.js';
import { MinimapManager } from '../MinimapManager.js';

export class FlowchartApp {
  private store = new Store();
  private root: HTMLElement;
  private canvas!: HTMLElement;
  private blockManager!: BlockManager;
  private connectionManager!: ConnectionManager;
  private draftController!: ConnectionDraftController;
  private viewportController!: ViewportController;
  private bus = new EventBus<EventMap>();
  private undoManager = new UndoManager(this.store);
  private viewportEl!: HTMLElement;
  private rafPointer = false;
  private contentBounds: { minX:number; minY:number; maxX:number; maxY:number } = { minX:0, minY:0, maxX:0, maxY:0 };
  private dragMoveActive = false;
  private marqueeEl: HTMLElement | null = null;
  private marqueeStart: Point | null = null;
  private marqueeActive = false;
  private minimap?: MinimapManager;
  private minimapEnabled: boolean = true;
  private themeManager!: IThemeManager;
  private gridManager!: IGridManager;
  private fileIO!: IFileIO;
  private hotkeys?: IHotkeysManager;

  constructor(root: HTMLElement, deps?: Partial<AppDependencies>) {
    this.root = root;
    try {
      const raw = localStorage.getItem('fc-minimap-enabled');
      if (raw === '0') this.minimapEnabled = false; else if (raw === '1') this.minimapEnabled = true;
      localStorage.setItem('fc-minimap-enabled', this.minimapEnabled ? '1' : '0');
    } catch {}
    const toolbarContainer = document.createElement('div');
    const layout = buildLayout(root, toolbarContainer);
    this.canvas = layout.canvas;
    this.viewportEl = layout.canvas;
    this.blockManager = new BlockManager(this.canvas, { dispatch: (a)=>this.store.dispatch(a), getState: ()=> this.store.getState(), bus: this.bus });
    this.connectionManager = new ConnectionManager(this.canvas, { dispatch: (a)=>this.store.dispatch(a), getState: ()=> this.store.getState(), bus: this.bus });
    this.draftController = new ConnectionDraftController(this.canvas, this.store, this.bus, this.connectionManager);
    this.viewportController = new ViewportController(this.canvas, this.store, this.bus);
    this.enhanceDispatch();
    this.attachGlobalEvents();
    this.themeManager = deps?.themeManager || new ThemeManager();
    this.themeManager.restore();
    this.gridManager = deps?.gridManager || new GridManager(this.store, this.canvas, this.bus);
    this.gridManager.restore();
    this.fileIO = deps?.fileIO || new FileIO(this.store, (m)=> this.updateStatus(m));
    new Toolbar(toolbarContainer, {
      createBlock: (k,pos)=> (this.undoManager as any).run('add-block', ()=> this.blockManager.createBlock(k,pos)),
      setConnectionStyle: (style)=> (this.undoManager as any).run('set-conn-style', ()=> { this.store.dispatch({ type:'SET_CONNECTION_STYLE', style }); this.connectionManager.renderAll(); }),
      exportJSON: ()=> this.fileIO.exportJSON(),
      importJSON: ()=> (this.undoManager as any).run('import-json', ()=> this.fileIO.importJSON()),
      clearAll: ()=> (this.undoManager as any).run('clear-all', ()=> { this.store.dispatch({ type:'BULK_SET_STATE', state: initialState() }); this.blockManager.renderAll(); this.connectionManager.renderAll(); }),
      setTheme: (theme)=> { this.themeManager.set(theme); },
      resetView: ()=> (this.undoManager as any).run('reset-view', ()=> { this.store.dispatch({ type: 'SET_VIEWPORT', viewport: { scale:1, offset:{x:0,y:0} } }); this.applyViewport(); }),
      randomPosition: ()=> this.randomPosition(),
      updateStatus: (m)=> this.updateStatus(m),
      undo: ()=> this.undo(),
      redo: ()=> this.redo(),
      toggleGrid: ()=> (this.undoManager as any).run('toggle-grid', ()=> { const on = this.gridManager.toggle(); this.updateStatus('Grid '+(on?'on':'off')); }),
      gridEnabled: ()=> !!this.store.getState().grid?.enabled,
      arrange: (kind: string)=> this.runArrange(kind),
      toggleMinimap: ()=> this.toggleMinimap(),
      minimapEnabled: ()=> this.minimapEnabled
    });
    this.render();
    this.minimap = new MinimapManager(this.root, { store: this.store, applyViewport: ()=> this.applyViewport() });
    this.minimap.setVisible(this.minimapEnabled);
    (this as any).themeManager = this.themeManager;
    if ((this.undoManager as any).forceCapture) { (this.undoManager as any).forceCapture(); }
  }

  private enhanceDispatch() {
    const original = this.store.dispatch.bind(this.store);
    this.store.dispatch = ((action: Action) => {
      const isMove = action.type === 'MOVE_BLOCK' || action.type === 'MULTIDRAG_BLOCKS';
      if (isMove) {
        if (!this.dragMoveActive) { (this.undoManager as any).begin?.('move-block'); this.dragMoveActive = true; }
        original(action);
      } else {
        original(action);
        (this.undoManager as any).commitIfChanged?.();
        this.dragMoveActive = false;
      }
      const after = this.store.getState();
      this.minimap?.notifyStateChange((this as any)._prevState || after, after);
      (this as any)._prevState = after;
      switch(action.type) {
        case 'MOVE_BLOCK':
          this.connectionManager.updateConnectionsForBlock(action.id);
          const blk = after.blocks[action.id];
          const el = document.getElementById(action.id);
          if (blk && el) { el.style.left = blk.position.x + 'px'; el.style.top = blk.position.y + 'px'; }
          break;
        case 'MULTIDRAG_BLOCKS':
          for (const ch of action.changes) {
            this.connectionManager.updateConnectionsForBlock(ch.id);
            const blk2 = after.blocks[ch.id];
            const el2 = document.getElementById(ch.id);
            if (blk2 && el2) { el2.style.left = blk2.position.x + 'px'; el2.style.top = blk2.position.y + 'px'; }
          }
          break;
        case 'UPDATE_BLOCK':
          if (action.patch?.size || action.patch?.position) this.connectionManager.updateConnectionsForBlock(action.id);
          break;
        case 'ADD_CONNECTION':
        case 'DELETE_CONNECTION':
        case 'SET_CONNECTION_STYLE':
          this.connectionManager.renderAll();
          break;
        case 'ADD_BLOCK':
        case 'DELETE_BLOCK':
          this.connectionManager.renderAll();
          if (action.type === 'DELETE_BLOCK') { const el3 = document.getElementById(action.id); if (el3) el3.remove(); }
          break;
      }
      this.updateStatus(`Blocks: ${Object.keys(after.blocks).length} Conns: ${Object.keys(after.connections).length} Zoom: ${(after.viewport.scale*100).toFixed(0)}%`);
    }) as any;

    this.bus.on('block:drag:end', () => {
      if (this.dragMoveActive) { (this.undoManager as any).commitIfChanged?.(); }
      this.dragMoveActive = false;
    });
  }

  private toggleMinimap() {
    this.minimapEnabled = !this.minimapEnabled;
    if (this.minimap) this.minimap.setVisible(this.minimapEnabled);
    try { localStorage.setItem('fc-minimap-enabled', this.minimapEnabled ? '1' : '0'); } catch {}
    this.updateStatus('Minimap ' + (this.minimapEnabled ? 'on' : 'off'));
  }

  private randomPosition(): Point { return { x: 80 + Math.random()*400, y: 80 + Math.random()*300 }; }

  private attachGlobalEvents() {
    this.canvas.addEventListener('pointerdown', (e) => {
      const anchor = (e.target as HTMLElement).closest('.fc-anchor');
      if (anchor) {
        const blockEl = (anchor.parentElement as HTMLElement);
        const id = blockEl.id;
        const blk = this.store.getState().blocks[id];
        if (blk) {
          const w = blockEl.offsetWidth;
          const h = blockEl.offsetHeight;
          const startPoint = { x: blk.position.x + w, y: blk.position.y + h/2 };
          this.draftController.startDraft(id, startPoint);
        }
        e.stopPropagation();
      } else if (e.target === this.canvas) {
        if (e.shiftKey) {
          const pt = this.screenToLocal(e.clientX, e.clientY);
          this.startMarquee(pt);
        } else {
          this.viewportController.startPan(e.clientX, e.clientY);
        }
      }
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.rafPointer) { this.rafPointer = true; requestAnimationFrame(()=>{ this.rafPointer=false; this.onPointerMove(e); }); }
    });
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive:false });
    this.canvas.addEventListener('touchstart', (e)=> this.onTouchStart(e), { passive:false });
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target as HTMLElement).isContentEditable) {
        const st = this.store.getState();
        if (st.multiSelect && st.multiSelect.length > 1) { e.preventDefault(); this.handleMultiDelete(); }
      }
      if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
        const target = e.target as HTMLElement;
        if (target && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        const blocks = this.store.getState().blocks;
        const ids = Object.keys(blocks);
        if (ids.length) { e.preventDefault(); this.store.dispatch({ type: 'SET_MULTI_SELECT', ids }); this.store.dispatch({ type: 'SELECT_BLOCK', id: ids[0] }); this.applySelectionHighlight(ids); }
      }
    });
  }

  private onPointerMove(e: PointerEvent) {
    this.viewportController.handlePointerMove(e);
    const st = this.store.getState();
    if (this.marqueeActive && this.marqueeStart) { const cur = this.screenToLocal(e.clientX, e.clientY); this.updateMarquee(cur); }
    if (st.connectionDraft) { const pt = this.pointerToLocal(e); this.draftController.updateDraft(pt); }
  }

  private onPointerUp(e: PointerEvent) {
    this.viewportController.endPan();
    const st = this.store.getState();
    if (this.marqueeActive) { this.finishMarquee(); }
    if (st.connectionDraft) {
      const targetBlock = (e.target as HTMLElement).closest('.fc-block');
      if (targetBlock && targetBlock.id !== st.connectionDraft.sourceBlock) { this.draftController.completeDraft(targetBlock.id); }
      else if (!targetBlock) { const dropPoint = this.pointerToLocal(e); this.showCreateBlockPopup(st.connectionDraft.sourceBlock, dropPoint); }
      else { this.draftController.cancelDraft(); }
    }
  }

  private popup = new AutoCreatePopup({
    createBlock: (k,pos)=> this.blockManager.createBlock(k as any, pos),
    addConnection: (s,t)=> this.connectionManager.addConnection(s,t),
    getBlocks: ()=> this.store.getState().blocks
  });

  private showCreateBlockPopup(sourceId: string, at: { x: number; y: number }) { this.draftController.cancelDraft(); this.popup.show(sourceId, at); }
  private onWheel(e: WheelEvent) { this.viewportController.wheelZoom(e, (x,y)=> this.screenToLocal(x,y)); }
  private onTouchStart(e: TouchEvent) { this.viewportController.touchStart(e); }
  private onTouchMove(e: TouchEvent) { this.viewportController.touchMove(e, (x,y)=> this.screenToLocal(x,y)); }
  private applyViewport() { this.viewportController.apply(); }
  private pointerToLocal(e: PointerEvent): Point { return this.screenToLocal(e.clientX, e.clientY); }
  private screenToLocal(clientX: number, clientY: number): Point { const rect = this.canvas.getBoundingClientRect(); const st = this.store.getState(); return { x: (clientX - rect.left) / st.viewport.scale, y: (clientY - rect.top) / st.viewport.scale }; }

  private updateStatus(msg: string) {
    const el = document.getElementById('fc-status'); if (!el) return; try { const st = this.store.getState(); const count = st.multiSelect ? st.multiSelect.length : (st.selection.blockId ? 1 : 0); if (count > 0) { el.textContent = msg + ' Selected: ' + count; } else { el.textContent = msg; } } catch { el.textContent = msg; }
  }

  private runArrange(kind: string) {
    const st = this.store.getState();
    const ids = st.multiSelect && st.multiSelect.length ? st.multiSelect : (st.selection.blockId ? [st.selection.blockId] : []);
    if (ids.length < 2) { this.updateStatus('Arrange requires ≥2 blocks'); return; }
    const blocks = ids.map(id => st.blocks[id]).filter(Boolean);
    if (blocks.length < 2) return;
    const changes: { id:string; position:{x:number;y:number} }[] = [];
    const xs = blocks.map(b=>b.position.x);
    const ys = blocks.map(b=>b.position.y);
    const left = Math.min(...xs);
    const right = Math.max(...blocks.map(b=> b.position.x + b.size.width));
    const top = Math.min(...ys);
    const bottom = Math.max(...blocks.map(b=> b.position.y + b.size.height));
    const centerX = (left + right) / 2;
    const middleY = (top + bottom) / 2;
    const byId: Record<string, any> = {}; blocks.forEach(b=> byId[b.id]=b);
    const applyPosition = (id: string, x:number, y:number) => { const b = byId[id]; if (!b) return; if (b.position.x !== x || b.position.y !== y) changes.push({ id, position:{x,y} }); };
    if (kind.startsWith('align-')) {
      for (const b of blocks) {
        switch(kind) {
          case 'align-left': applyPosition(b.id, left, b.position.y); break;
          case 'align-right': applyPosition(b.id, right - b.size.width, b.position.y); break;
          case 'align-center': applyPosition(b.id, Math.round(centerX - b.size.width/2), b.position.y); break;
          case 'align-top': applyPosition(b.id, b.position.x, top); break;
          case 'align-bottom': applyPosition(b.id, b.position.x, bottom - b.size.height); break;
          case 'align-middle': applyPosition(b.id, b.position.x, Math.round(middleY - b.size.height/2)); break;
        }
      }
    } else if (kind === 'dist-h' || kind === 'dist-v') {
      if (kind === 'dist-h') {
        const ordered = [...blocks].sort((a,b)=> a.position.x - b.position.x);
        const first = ordered[0]; const last = ordered[ordered.length-1];
        const spanTotal = (last.position.x + last.size.width) - first.position.x;
        if (ordered.length > 2 && spanTotal > 0) {
          const totalWidths = ordered.reduce((s,b)=> s + b.size.width, 0);
          const gaps = ordered.length - 1;
          const freeSpace = spanTotal - totalWidths;
          const gapSize = freeSpace / gaps;
          let cursor = first.position.x + first.size.width + gapSize;
          for (let i=1;i<ordered.length-1;i++) { const b = ordered[i]; applyPosition(b.id, Math.round(cursor), b.position.y); cursor += b.size.width + gapSize; }
        }
      } else {
        const ordered = [...blocks].sort((a,b)=> a.position.y - b.position.y);
        const first = ordered[0]; const last = ordered[ordered.length-1];
        const spanTotal = (last.position.y + last.size.height) - first.position.y;
        if (ordered.length > 2 && spanTotal > 0) {
          const totalHeights = ordered.reduce((s,b)=> s + b.size.height, 0);
          const gaps = ordered.length - 1;
          const freeSpace = spanTotal - totalHeights;
          const gapSize = freeSpace / gaps;
          let cursor = first.position.y + first.size.height + gapSize;
          for (let i=1;i<ordered.length-1;i++) { const b = ordered[i]; applyPosition(b.id, b.position.x, Math.round(cursor)); cursor += b.size.height + gapSize; }
        }
      }
    }
    if (!changes.length) { this.updateStatus('Arrange: no changes'); return; }
    const existingMap: Record<string, {x:number;y:number}> = {}; blocks.forEach(b=> existingMap[b.id] = { x: b.position.x, y: b.position.y });
    const changedSet = new Set(changes.map(c=>c.id));
    const fullChanges = ids.map(id => changedSet.has(id) ? changes.find(c=>c.id===id)! : { id, position: { ...existingMap[id] } });
    (this.undoManager as any).run('arrange-blocks', () => { if (fullChanges.length === 1) { this.store.dispatch({ type:'MOVE_BLOCK', id: fullChanges[0].id, position: fullChanges[0].position }); } else { this.store.dispatch({ type:'MULTIDRAG_BLOCKS', changes: fullChanges }); } });
    this.applySelectionHighlight(ids);
  }

  private startMarquee(start: Point) { this.cancelMarquee(); this.marqueeStart = start; this.marqueeActive = true; this.marqueeEl = document.createElement('div'); this.marqueeEl.className = 'fc-marquee'; this.canvas.appendChild(this.marqueeEl); }
  private updateMarquee(current: Point) { if (!this.marqueeEl || !this.marqueeStart) return; const x1 = Math.min(this.marqueeStart.x, current.x); const y1 = Math.min(this.marqueeStart.y, current.y); const x2 = Math.max(this.marqueeStart.x, current.x); const y2 = Math.max(this.marqueeStart.y, current.y); this.marqueeEl.style.left = x1 + 'px'; this.marqueeEl.style.top = y1 + 'px'; this.marqueeEl.style.width = (x2 - x1) + 'px'; this.marqueeEl.style.height = (y2 - y1) + 'px'; const st = this.store.getState(); const ids: string[] = []; for (const blk of Object.values(st.blocks)) { const bx1 = blk.position.x; const by1 = blk.position.y; const bx2 = bx1 + blk.size.width; const by2 = by1 + blk.size.height; if (bx1 >= x1 && by1 >= y1 && bx2 <= x2 && by2 <= y2) ids.push(blk.id); } this.store.dispatch({ type: 'SET_MULTI_SELECT', ids }); this.store.dispatch({ type: 'SELECT_BLOCK', id: ids[0] }); this.applySelectionHighlight(ids); }
  private finishMarquee() { this.marqueeActive = false; this.marqueeStart = null; if (this.marqueeEl) { this.marqueeEl.remove(); this.marqueeEl = null; } }
  private cancelMarquee() { if (this.marqueeEl) { this.marqueeEl.remove(); } this.marqueeEl = null; this.marqueeActive = false; this.marqueeStart = null; }
  private applySelectionHighlight(ids: string[]) { this.canvas.querySelectorAll('.fc-block').forEach(el => el.classList.remove('selected')); ids.forEach(id => document.getElementById(id)?.classList.add('selected')); }
  private handleMultiDelete() { const st = this.store.getState(); const ids: string[] = st.multiSelect && st.multiSelect.length ? [...st.multiSelect] : []; if (!ids.length) return; (this.undoManager as any).run('delete-block', () => { for (const id of ids) { this.store.dispatch({ type: 'DELETE_BLOCK', id }); } const fragRemovals: HTMLElement[] = []; ids.forEach(id => { const el = document.getElementById(id); if (el) fragRemovals.push(el); }); if (fragRemovals.length) { fragRemovals.forEach(el => el.remove()); } }); }

  private render() { this.applyGridOverlay(); }
  private applyGridOverlay() { this.gridManager.apply(); }
  undo() { if (this.store.getState().connectionDraft) { this.draftController.cancelDraft(); } if (this.undoManager.undo()) { this.afterHistoryChange(); } }
  redo() { if (this.store.getState().connectionDraft) { this.draftController.cancelDraft(); } if (this.undoManager.redo()) { this.afterHistoryChange(); } }
  toggleGrid() { const on = this.gridManager.toggle(); this.updateStatus('Grid '+(on?'on':'off')); }
  private afterHistoryChange() { this.blockManager.renderAll(); this.connectionManager.renderAll(); this.applyViewport(); this.applyGridOverlay(); const st = this.store.getState(); this.updateStatus(`Blocks: ${Object.keys(st.blocks).length} Conns: ${Object.keys(st.connections).length} Zoom: ${(st.viewport.scale*100).toFixed(0)}%`); }
  public undoBegin(label: string) { (this.undoManager as any).begin(label); }
  public undoCommit() { (this.undoManager as any).commitIfChanged(); }
  public undoCancel() { (this.undoManager as any).cancel(); }
  private attachHotkeys() { this.hotkeys = new HotkeysManager(()=> this.undo(), ()=> this.redo()); this.hotkeys.attach(); }
}

export function bootstrap() {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app');
    if (!root) return;
    const app = new FlowchartApp(root);
    (app as any)['attachHotkeys']?.();
    (window as any).flowchartApp = app;
    if (new URLSearchParams(location.search).get('undoDebug') === '1') { new UndoDebugPanel(); }
  });
}
