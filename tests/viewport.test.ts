import { describe, it, expect } from 'vitest';
import { Store } from '../src/Store.js';
import { ViewportController } from '../src/ViewportController.js';
import { EventBus, EventMap } from '../src/EventBus.js';

function setup() {
  const canvas = document.createElement('div');
  canvas.id = 'canvas';
  document.body.appendChild(canvas);
  const store = new Store();
  const bus = new EventBus<EventMap>();
  const vp = new ViewportController(canvas, store, bus);
  return { canvas, store, vp, bus };
}

describe('ViewportController', () => {
  it('applies pan and emits event', () => {
    const { canvas, store, vp, bus } = setup();
    const events: any[] = [];
    bus.on('viewport:change', (p) => events.push(p));
    // simulate pan by directly dispatching viewport update
    store.dispatch({ type: 'SET_VIEWPORT', viewport: { offset: { x: 50, y: 30 } } });
    vp.apply();
    expect(canvas.style.transform).toContain('translate(50px, 30px)');
    expect(events.length).toBe(1);
    expect(events[0].offset).toEqual({ x:50, y:30 });
  });

  it('applies zoom and emits event', () => {
    const { canvas, store, vp, bus } = setup();
    const events: any[] = [];
    bus.on('viewport:change', (p) => events.push(p));
    store.dispatch({ type: 'SET_VIEWPORT', viewport: { scale: 1.5 } });
    vp.apply();
    expect(canvas.style.transform).toContain('scale(1.5)');
    expect(events.length).toBe(1);
    expect(events[0].scale).toBe(1.5);
  });
});
