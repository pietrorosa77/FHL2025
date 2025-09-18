import { Store } from './Store.js';
import { AppState, Block } from './types.js';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from './config.js';

interface MinimapDeps {
  store: Store;
  applyViewport(): void;
}

export class MinimapManager {
  private deps: MinimapDeps;
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 200;
  private height = 200;
  private scaleX = this.width / DEFAULT_CANVAS_WIDTH;
  private scaleY = this.height / DEFAULT_CANVAS_HEIGHT;
  private draggingView = false;
  private dragOffset: { dx:number; dy:number } | null = null;
  private rafPending = false;

  constructor(container: HTMLElement, deps: MinimapDeps) {
    this.deps = deps;
    this.root = document.createElement('div');
    this.root.className = 'fc-minimap';
  this.root.style.position = 'fixed';
  // Positioned bottom-left per latest requirement
  this.root.style.left = '12px';
  this.root.style.bottom = '12px';
    this.root.style.width = this.width+'px';
    this.root.style.height = this.height+'px';
    this.root.style.border = '1px solid var(--fc-border-strong)';
    this.root.style.background = 'rgba(0,0,0,0.35)';
    this.root.style.backdropFilter = 'blur(2px)';
    this.root.style.cursor = 'pointer';
    this.root.style.borderRadius = '4px';
    this.root.style.zIndex = '2000';
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width; this.canvas.height = this.height;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.root.appendChild(this.canvas);
    container.appendChild(this.root);
    const ctx = this.canvas.getContext('2d');
    // In test environment (jsdom) context may be null; create shim
    this.ctx = (ctx || {
      clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
      fillStyle: '', strokeStyle: '', lineWidth: 1
    }) as any;
    this.attachEvents();
    this.render();
  }

  private attachEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      const vpRect = this.viewportRect();
      const mx = e.offsetX; const my = e.offsetY;
      if (mx >= vpRect.x && my >= vpRect.y && mx <= vpRect.x + vpRect.w && my <= vpRect.y + vpRect.h) {
        // drag viewport
        this.draggingView = true;
        this.dragOffset = { dx: mx - vpRect.x, dy: my - vpRect.y };
      } else {
        this.centerMainAt(mx, my);
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.draggingView) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
      const newX = mx - (this.dragOffset?.dx||0);
      const newY = my - (this.dragOffset?.dy||0);
      this.panViewportToRectOrigin(newX, newY);
    });
    window.addEventListener('mouseup', () => { this.draggingView = false; this.dragOffset = null; });
  }

  private state(): AppState { return this.deps.store.getState(); }

  private viewportRect() {
    const st = this.state();
    // Main viewport visible size in logical coords approximated using canvas element size (root canvas size is DOM size of flow area)
    const rootEl = (document.querySelector('.fc-canvas') as HTMLElement) || { clientWidth: 1200, clientHeight: 800 } as any;
    const logicalW = rootEl.clientWidth / st.viewport.scale;
    const logicalH = rootEl.clientHeight / st.viewport.scale;
    // Offset is top-left in logical space
    const vx = st.viewport.offset.x * this.scaleX;
    const vy = st.viewport.offset.y * this.scaleY;
    const vw = logicalW * this.scaleX;
    const vh = logicalH * this.scaleY;
    return { x: vx, y: vy, w: vw, h: vh };
  }

  private centerMainAt(mx: number, my: number) {
    const st = this.state();
    const rootEl = (document.querySelector('.fc-canvas') as HTMLElement) || { clientWidth: 1200, clientHeight: 800 } as any;
    const logicalW = rootEl.clientWidth / st.viewport.scale;
    const logicalH = rootEl.clientHeight / st.viewport.scale;
    const targetLogicalX = mx / this.scaleX - logicalW / 2;
    const targetLogicalY = my / this.scaleY - logicalH / 2;
    this.deps.store.dispatch({ type:'SET_VIEWPORT', viewport: { offset: { x: targetLogicalX, y: targetLogicalY } } });
    this.deps.applyViewport();
    this.requestRender();
  }

  private panViewportToRectOrigin(miniX: number, miniY: number) {
    const st = this.state();
    const rootEl = (document.querySelector('.fc-canvas') as HTMLElement) || { clientWidth: 1200, clientHeight: 800 } as any;
    const logicalW = rootEl.clientWidth / st.viewport.scale;
    const logicalH = rootEl.clientHeight / st.viewport.scale;
    const targetLogicalX = miniX / this.scaleX;
    const targetLogicalY = miniY / this.scaleY;
    this.deps.store.dispatch({ type:'SET_VIEWPORT', viewport: { offset: { x: targetLogicalX, y: targetLogicalY } } });
    this.deps.applyViewport();
    this.requestRender();
  }

  private requestRender() {
    if (this.rafPending) return; this.rafPending = true; requestAnimationFrame(()=> { this.rafPending = false; this.render(); });
  }

  public render() {
    const st = this.state();
    this.ctx.clearRect(0,0,this.width,this.height);
    // Background grid representation (faint)
    this.ctx.fillStyle = 'rgba(255,255,255,0.05)';
    this.ctx.fillRect(0,0,this.width,this.height);
    // Blocks
    this.ctx.lineWidth = 1;
    for (const blk of Object.values(st.blocks) as Block[]) {
      const x = blk.position.x * this.scaleX;
      const y = blk.position.y * this.scaleY;
      const w = blk.size.width * this.scaleX;
      const h = blk.size.height * this.scaleY;
      this.ctx.fillStyle = blk.id === st.selection.blockId ? 'rgba(80,160,255,0.9)' : 'rgba(255,255,255,0.7)';
      this.ctx.fillRect(x, y, Math.max(2,w), Math.max(2,h));
      this.ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      this.ctx.strokeRect(x+0.5, y+0.5, Math.max(2,w)-1, Math.max(2,h)-1);
    }
    // Viewport rectangle
    const vp = this.viewportRect();
    this.ctx.strokeStyle = 'rgba(255,200,0,0.9)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(vp.x+0.5, vp.y+0.5, vp.w, vp.h);
  }

  public notifyStateChange(prev: AppState, next: AppState) {
    if (prev.blocks !== next.blocks || prev.viewport !== next.viewport || prev.selection !== next.selection) {
      this.requestRender();
    }
  }

  public setVisible(on: boolean) { this.root.style.display = on ? 'block' : 'none'; }
  public isVisible() { return this.root.style.display !== 'none'; }
  public getElement() { return this.root; }
}

// Pure utilities (testable without DOM/canvas)
export function computeMinimapScale(miniWidth: number, miniHeight: number, canvasW = DEFAULT_CANVAS_WIDTH, canvasH = DEFAULT_CANVAS_HEIGHT) {
  return { scaleX: miniWidth / canvasW, scaleY: miniHeight / canvasH };
}

export function mapBlockToMinimap(block: Block, scaleX: number, scaleY: number) {
  return {
    x: block.position.x * scaleX,
    y: block.position.y * scaleY,
    w: Math.max(2, block.size.width * scaleX),
    h: Math.max(2, block.size.height * scaleY)
  };
}
