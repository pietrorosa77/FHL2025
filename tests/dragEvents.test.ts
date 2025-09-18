import { describe, it, expect, beforeAll } from 'vitest';
import { Store } from '../src/Store.js';
import { BlockManager } from '../src/BlockManager.js';
import { EventBus, EventMap } from '../src/EventBus.js';

describe('Block drag events', () => {
  beforeAll(() => {
    if (!(globalThis as any).ResizeObserver) {
      (globalThis as any).ResizeObserver = class { observe(){} unobserve(){} disconnect(){} } as any;
    }
  });
  it('emits start and end events', () => {
    const root = document.createElement('div');
    root.style.position = 'relative';
    document.body.appendChild(root);
    const store = new Store();
    const bus = new EventBus<EventMap>();
    const events: string[] = [];
    bus.on('block:drag:start', (p)=> events.push('start:'+p.id));
    bus.on('block:drag:end', (p)=> events.push('end:'+p.id));
    const bm = new BlockManager(root, { dispatch: (a)=>store.dispatch(a), getState: ()=>store.getState(), bus });
    bm.createBlock('process', { x: 10, y: 10 });
    const el = root.querySelector('.fc-block') as HTMLElement;
    const PE: any = (globalThis as any).PointerEvent || MouseEvent;
    el.dispatchEvent(new PE('pointerdown', { clientX: 15, clientY: 15, bubbles: true }));
    window.dispatchEvent(new PE('pointerup', { clientX: 15, clientY: 15, bubbles: true }));
    expect(events[0]).toMatch(/start:/);
    expect(events[1]).toMatch(/end:/);
  });
});
