import { Store } from './Store.js';
import { IGridManager } from './interfaces.js';
import { EventBus, EventMap } from './EventBus.js';

export class GridManager implements IGridManager {
  private farThreshold = 0.55; // below this scale hide minor lines
  private bus?: EventBus<EventMap>;
  constructor(private store: Store, private canvas: HTMLElement, bus?: EventBus<EventMap>) {
    this.bus = bus;
    this.bus?.on('viewport:change', ({ scale }) => this.updateZoomClass(scale));
  }

  apply() {
    const st = this.store.getState();
    if (st.grid?.enabled) this.canvas.classList.add('with-grid'); else this.canvas.classList.remove('with-grid');
    this.updateZoomClass(this.store.getState().viewport.scale);
  }

  toggle() {
    const st = this.store.getState();
    const enabled = !(st.grid?.enabled);
    this.store.dispatch({ type: 'SET_GRID', grid: { enabled } });
    this.apply();
    this.persist();
    return enabled;
  }

  restore() {
    const grid = localStorage.getItem('fc-grid');
    if (grid) {
      try { const parsed = JSON.parse(grid); this.store.dispatch({ type:'SET_GRID', grid: parsed }); this.apply(); } catch {}
    }
  }

  persist() {
    const g = this.store.getState().grid;
    try { localStorage.setItem('fc-grid', JSON.stringify({ enabled: g?.enabled, size: g?.size, snap: g?.snap })); } catch {}
  }

  private updateZoomClass(scale: number) {
    if (!this.store.getState().grid?.enabled) { this.canvas.classList.remove('grid-zoom-far'); return; }
    if (scale <= this.farThreshold) this.canvas.classList.add('grid-zoom-far'); else this.canvas.classList.remove('grid-zoom-far');
  }
}
