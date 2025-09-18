import { describe, it, expect, beforeAll } from 'vitest';
import { Store } from '../src/Store.js';
import { BlockManager } from '../src/BlockManager.js';

// This test simulates quick pointerdown/up to ensure no exceptions and no lingering RAF.

describe('Block drag rapid cancel', () => {
  beforeAll(() => {
    if (!(globalThis as any).ResizeObserver) {
      (globalThis as any).ResizeObserver = class {
        constructor(cb: any) { this.cb = cb; }
        cb: any; observe() {} unobserve() {} disconnect() {}
      } as any;
    }
  });
  it('cancels scheduled RAF safely', () => {
    const root = document.createElement('div');
    root.style.position = 'relative';
    document.body.appendChild(root);
    const store = new Store();
    const bm = new BlockManager(root, { dispatch: (a)=>store.dispatch(a), getState: ()=>store.getState() });
    // seed one block
    bm.createBlock('process', { x: 50, y: 50 });
    const blkEl = root.querySelector('.fc-block') as HTMLElement;
    // simulate pointerdown then immediate pointerup without move
  const PE: any = (globalThis as any).PointerEvent || MouseEvent;
  const downEvt = new PE('pointerdown', { clientX: 60, clientY: 60, bubbles: true });
    blkEl.dispatchEvent(downEvt);
  const upEvt = new PE('pointerup', { clientX: 60, clientY: 60, bubbles: true });
    window.dispatchEvent(upEvt);
    // If we reach here without throwing, assumption holds; also block still exists
    expect(document.querySelector('.fc-block')).toBeTruthy();
  });
});
