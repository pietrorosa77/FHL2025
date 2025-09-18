import { Store } from './Store.js';
import { EventBus, EventMap } from './EventBus.js';
import { Point } from './types.js';
import { ConnectionManager } from './ConnectionManager.js';

export class ConnectionDraftController {
  private store: Store;
  private bus: EventBus<EventMap>;
  private connectionManager: ConnectionManager;
  private canvas: HTMLElement;
  private draftLine: SVGPathElement | null = null;

  constructor(canvas: HTMLElement, store: Store, bus: EventBus<EventMap>, connectionManager: ConnectionManager) {
    this.canvas = canvas;
    this.store = store;
    this.bus = bus;
    this.connectionManager = connectionManager;
  }

  startDraft(sourceBlockId: string, startPoint: Point) {
    this.store.dispatch({ type: 'START_CONNECTION_DRAFT', sourceBlock: sourceBlockId, point: startPoint });
    this.ensureDraftPath();
    this.bus.emit('connection:draft:start', { sourceId: sourceBlockId });
  }

  updateDraft(currentPoint: Point) {
    const st = this.store.getState();
    if (!st.connectionDraft || !this.draftLine) return;
    this.store.dispatch({ type: 'UPDATE_CONNECTION_DRAFT', point: currentPoint });
    const refreshed = this.store.getState();
    const srcBlk = refreshed.blocks[refreshed.connectionDraft!.sourceBlock];
    if (!srcBlk) return;
    const srcEl = document.getElementById(srcBlk.id);
    const w = srcEl ? srcEl.offsetWidth : srcBlk.size.width;
    const h = srcEl ? srcEl.offsetHeight : srcBlk.size.height;
    const start = { x: srcBlk.position.x + w, y: srcBlk.position.y + h/2 };
    const style = refreshed.connectionStyle;
    if (style === 'orthogonal') {
      const midX = (start.x + currentPoint.x) / 2;
      this.draftLine.setAttribute('d', `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${currentPoint.y} L ${currentPoint.x} ${currentPoint.y}`);
    } else {
      const dx = (currentPoint.x - start.x) * 0.5;
      const c1x = start.x + dx;
      const c2x = currentPoint.x - dx;
      this.draftLine.setAttribute('d', `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${currentPoint.y}, ${currentPoint.x} ${currentPoint.y}`);
    }
  }

  completeDraft(targetBlockId?: string) {
    const st = this.store.getState();
    if (!st.connectionDraft) return;
    const sourceId = st.connectionDraft.sourceBlock;
    if (targetBlockId && targetBlockId !== sourceId) {
      const id = this.connectionManager.addConnection(sourceId, targetBlockId);
      if (id) {
        // connection:added already emitted by ConnectionManager; just emit draft end
        this.bus.emit('connection:draft:end', { sourceId, canceled: false, targetId: targetBlockId });
      } else {
        this.bus.emit('connection:draft:end', { sourceId, canceled: true });
      }
    } else {
      this.bus.emit('connection:draft:end', { sourceId, canceled: true });
    }
    this.cleanup();
  }

  cancelDraft() {
    const st = this.store.getState();
    if (!st.connectionDraft) return;
    const sourceId = st.connectionDraft.sourceBlock;
    this.bus.emit('connection:draft:end', { sourceId, canceled: true });
    this.cleanup();
  }

  private ensureDraftPath() {
    if (!this.draftLine) {
      const svg = this.connectionManager['svg'] as SVGSVGElement; // internal access
      this.draftLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.draftLine.setAttribute('stroke', '#4ea1ff');
      this.draftLine.setAttribute('stroke-width', '2');
      this.draftLine.setAttribute('fill', 'none');
      svg.appendChild(this.draftLine);
    }
  }

  private cleanup() {
    this.store.dispatch({ type: 'CANCEL_CONNECTION_DRAFT' });
    this.draftLine?.remove();
    this.draftLine = null;
  }
}
