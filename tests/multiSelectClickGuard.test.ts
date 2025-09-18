import { describe, it, expect } from 'vitest';
// Global ResizeObserver polyfill now provided via tests/testSetup.ts
import { FlowchartApp } from '../src/core/FlowchartApp.js';

// Utility to create root container like existing tests
function setupRoot() {
  document.body.innerHTML = '<div id="app" style="width:1200px;height:800px; position:relative;"></div>';
  return document.getElementById('app') as HTMLElement;
}

describe('Multi-select Plain Click Guard', () => {
  it('plain click on one block preserves existing multi-selection (>1)', () => {
    const root = setupRoot();
    const app = new FlowchartApp(root);
    // create three blocks via public API (toolbar normally does this, use internal for test)
    (app as any).blockManager.createBlock('process', { x: 100, y: 100 });
    (app as any).blockManager.createBlock('decision', { x: 300, y: 120 });
    (app as any).blockManager.createBlock('terminator', { x: 500, y: 140 });
    const state1 = (app as any).store.getState();
    const ids = Object.keys(state1.blocks);
    expect(ids.length).toBe(3);
    // Simulate multi-select of first two blocks (dispatch directly mimicking shift selection)
    (app as any).store.dispatch({ type: 'SET_MULTI_SELECT', ids: [ids[0], ids[1]] });
    (app as any).store.dispatch({ type: 'SELECT_BLOCK', id: ids[0] });

    // Now simulate plain mousedown on second block (should NOT collapse selection)
    const secondEl = document.getElementById(ids[1])!;
    secondEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    const state2 = (app as any).store.getState();
    expect(state2.multiSelect?.length).toBe(2);
    expect(state2.multiSelect).toContain(ids[0]);
    expect(state2.multiSelect).toContain(ids[1]);
  });

  it('ctrl/meta click toggles membership inside existing multi-selection', () => {
    const root = setupRoot();
    const app = new FlowchartApp(root);
    (app as any).blockManager.createBlock('process', { x: 100, y: 100 });
    (app as any).blockManager.createBlock('decision', { x: 300, y: 120 });
    const state1 = (app as any).store.getState();
    const ids = Object.keys(state1.blocks);
    // start multi select with both
    (app as any).store.dispatch({ type: 'SET_MULTI_SELECT', ids });
    (app as any).store.dispatch({ type: 'SELECT_BLOCK', id: ids[0] });

    // ctrl click second to toggle it off
    const secondEl = document.getElementById(ids[1])!;
    secondEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ctrlKey: true }));
    let state2 = (app as any).store.getState();
    expect(state2.multiSelect).toContain(ids[0]);
    expect(state2.multiSelect).not.toContain(ids[1]);

    // ctrl click second again to add back
    secondEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ctrlKey: true }));
    state2 = (app as any).store.getState();
    expect(state2.multiSelect).toContain(ids[0]);
    expect(state2.multiSelect).toContain(ids[1]);
  });
});
