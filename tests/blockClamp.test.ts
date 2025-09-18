import { describe, it, expect, beforeEach } from 'vitest';
import { FlowchartApp } from '../src/app';

// Polyfill PointerEvent for JSDOM if missing
if (typeof (globalThis as any).PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    width: number;
    height: number;
    pressure: number;
    tangentialPressure: number;
    tiltX: number;
    tiltY: number;
    twist: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, params: any = {}) {
      super(type, params);
      this.pointerId = params.pointerId || 1;
      this.width = params.width || 0;
      this.height = params.height || 0;
      this.pressure = params.pressure || 0;
      this.tangentialPressure = params.tangentialPressure || 0;
      this.tiltX = params.tiltX || 0;
      this.tiltY = params.tiltY || 0;
      this.twist = params.twist || 0;
      this.pointerType = params.pointerType || 'mouse';
      this.isPrimary = params.isPrimary !== false;
    }
  }
  ;(globalThis as any).PointerEvent = PointerEventPolyfill as any;
}

class RO { observe(){} unobserve(){} disconnect(){} }

describe('Block Drag Clamping', () => {
  let app: FlowchartApp;
  beforeEach(() => {
    (globalThis as any).ResizeObserver = RO as any;
    document.body.innerHTML = '<div id="app"></div>';
    app = new FlowchartApp(document.getElementById('app')!);
  });

  it('prevents dragging block outside canvas negative area', () => {
    (app as any).blockManager.createBlock('process', { x: 30, y: 30 });
    const id = Object.keys((app as any).store.getState().blocks)[0];
    const el = document.getElementById(id)!;
    const rect = el.getBoundingClientRect();
    // Simulate pointerdown to start drag
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + 5, clientY: rect.top + 5, bubbles:true }));
    // Attempt pointermove to negative space
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left - 500, clientY: rect.top - 500, bubbles:true }));
    // End drag
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
    const blk = (app as any).store.getState().blocks[id];
    expect(blk.position.x).toBeGreaterThanOrEqual(0);
    expect(blk.position.y).toBeGreaterThanOrEqual(0);
  });

  it('prevents dragging block beyond canvas right/bottom edge', async () => {
    (app as any).blockManager.createBlock('process', { x: 50, y: 50 });
    const id = Object.keys((app as any).store.getState().blocks)[0];
    const el = document.getElementById(id)!;
    const canvas = document.querySelector('.fc-canvas') as HTMLElement;
    // Provide explicit size hints for test environment if layout not computed
    canvas.setAttribute('data-test-width', '1000');
    canvas.setAttribute('data-test-height', '600');
    const canvasRect = canvas.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    // start drag near center
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: elRect.left + 10, clientY: elRect.top + 10, bubbles:true }));
    // move beyond right/bottom
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: canvasRect.right + 1000, clientY: canvasRect.bottom + 1000, bubbles:true }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
    // Wait a tick to allow RAF-driven move handler to commit state
    await new Promise(r => setTimeout(r, 20));
    const blk = (app as any).store.getState().blocks[id];
    const canvasW = canvas.clientWidth || 1000;
    const canvasH = canvas.clientHeight || 600;
    // Clamp should keep block within canvas bounds
    expect(blk.position.x + blk.size.width).toBeLessThanOrEqual(canvasW + 0.1);
    expect(blk.position.y + blk.size.height).toBeLessThanOrEqual(canvasH + 0.1);
  });
});
