import { Point, clamp } from './types.js';
import { Store } from './Store.js';
import { EventBus, EventMap } from './EventBus.js';

export class ViewportController {
  private canvas: HTMLElement;
  private store: Store;
  private panOrigin: Point | null = null;
  private isPanning = false;
  private raf = false;
  private bus?: EventBus<EventMap>;

  constructor(canvas: HTMLElement, store: Store, bus?: EventBus<EventMap>) {
    this.canvas = canvas;
    this.store = store;
    this.bus = bus;
  }

  startPan(clientX: number, clientY: number) {
    this.isPanning = true; this.panOrigin = { x: clientX, y: clientY }; this.canvas.classList.add('grabbing');
  }
  endPan() { this.isPanning = false; this.panOrigin = null; this.canvas.classList.remove('grabbing'); }

  handlePointerMove(e: PointerEvent) {
    if (!this.isPanning || !this.panOrigin) return;
    const st = this.store.getState();
    const dx = e.clientX - this.panOrigin.x;
    const dy = e.clientY - this.panOrigin.y;
    this.panOrigin = { x: e.clientX, y: e.clientY };
    this.store.dispatch({ type: 'SET_VIEWPORT', viewport: { offset: { x: st.viewport.offset.x + dx, y: st.viewport.offset.y + dy } } });
    this.apply();
  }

  wheelZoom(e: WheelEvent, screenToLocal: (x:number,y:number)=>Point) {
    if (!e.ctrlKey) return false;
    e.preventDefault();
    const st = this.store.getState();
    const before = screenToLocal(e.clientX, e.clientY);
    const scale = clamp(st.viewport.scale * (e.deltaY < 0 ? 1.1 : 0.9), st.viewport.bounds.minScale, st.viewport.bounds.maxScale);
    this.store.dispatch({ type: 'SET_VIEWPORT', viewport: { scale } });
    const after = screenToLocal(e.clientX, e.clientY);
    const v = this.store.getState().viewport;
    const adjust = { x: v.offset.x + (after.x - before.x)*scale, y: v.offset.y + (after.y - before.y)*scale };
    this.store.dispatch({ type: 'SET_VIEWPORT', viewport: { offset: adjust } });
    this.apply();
    return true;
  }

  pinchStartDistance: number | null = null;
  touchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.pinchStartDistance = Math.hypot(dx, dy);
    }
  }
  touchMove(e: TouchEvent, screenToLocal: (x:number,y:number)=>Point) {
    if (e.touches.length === 2 && this.pinchStartDistance) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const st = this.store.getState();
      const scale = clamp(st.viewport.scale * (dist / this.pinchStartDistance), st.viewport.bounds.minScale, st.viewport.bounds.maxScale);
      this.pinchStartDistance = dist;
      this.store.dispatch({ type:'SET_VIEWPORT', viewport: { scale } });
      this.apply();
    }
  }

  apply() {
    const { viewport } = this.store.getState();
    this.canvas.style.transform = `translate(${viewport.offset.x}px, ${viewport.offset.y}px) scale(${viewport.scale})`;
    this.bus?.emit('viewport:change', { scale: viewport.scale, offset: { x: viewport.offset.x, y: viewport.offset.y } });
  }
}
