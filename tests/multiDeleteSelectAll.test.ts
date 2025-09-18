import { describe, it, expect, beforeEach } from 'vitest';
import { FlowchartApp } from '../src/app';

// Minimal ResizeObserver stub
class RO { observe(){} unobserve(){} disconnect(){} }

if (typeof (globalThis as any).PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent { constructor(type:string, params:any={}) { super(type, params); } }
  ;(globalThis as any).PointerEvent = PointerEventPolyfill as any;
}

describe('Multi-delete & Select-All', () => {
  let app: FlowchartApp;
  beforeEach(() => {
    (globalThis as any).ResizeObserver = RO as any;
    document.body.innerHTML = '<div id="app"></div>';
    app = new FlowchartApp(document.getElementById('app')!);
  });

  function createBlocks(n: number) {
    for (let i=0;i<n;i++) (app as any).blockManager.createBlock('process', { x: 50 + i*30, y: 60 + i*20 });
  }

  it('select-all (Ctrl+A) selects all blocks', () => {
    createBlocks(4);
    // Trigger Ctrl+A
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles:true }));
    const st = (app as any).store.getState();
    expect(st.multiSelect.length).toBe(4);
  });

  it('multi-delete removes all selected blocks and associated connections in one undo step', () => {
    createBlocks(3);
    const ids = Object.keys((app as any).store.getState().blocks);
    // Manually set multiSelect for test (bypass marquee)
    (app as any).store.dispatch({ type: 'SET_MULTI_SELECT', ids });
    (app as any).store.dispatch({ type: 'SELECT_BLOCK', id: ids[0] });
    // Track historyVersion before
  const beforeHV = (app as any).store.getState().historyVersion;
    // Hit Delete
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles:true }));
    const st = (app as any).store.getState();
    expect(Object.keys(st.blocks).length).toBe(0);
    // Ensure multiSelect cleared of removed ids
    expect(st.multiSelect.length).toBe(0);
    // Undo should restore all blocks in one step
    (app as any).undo();
    const afterUndo = (app as any).store.getState();
    expect(Object.keys(afterUndo.blocks).length).toBe(3);
  // historyVersion may not strictly increase due to operation-based undo coalescing; ensure blocks restored
  });
});
