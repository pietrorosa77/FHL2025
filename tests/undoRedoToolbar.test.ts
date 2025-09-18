import { describe, it, expect, beforeEach } from 'vitest';
import { FlowchartApp } from '../src/app';

// Minimal DOM scaffolding for the app
function setupDom() {
  document.body.innerHTML = '<div id="app"></div>';
}

function getFirstBlockId(app: any): string {
  const state = (app as any).store.getState();
  return Object.keys(state.blocks)[0];
}

describe('Undo/Redo Toolbar & Coalescing', () => {
  let app: FlowchartApp;
  beforeEach(() => {
    setupDom();
    // ResizeObserver polyfilled globally in tests/testSetup.ts
    app = new FlowchartApp(document.getElementById('app')!);
  });

  it('undo button reverts last non-move action (add block)', () => {
    expect(Object.keys((app as any).store.getState().blocks).length).toBe(0);
    (app as any).undoBegin('add-block');
    (app as any).blockManager.createBlock('process', { x: 300, y: 300 });
    // ADD_BLOCK auto-commits via dispatch wrapper
    const countAfterAdd = Object.keys((app as any).store.getState().blocks).length;
    expect(countAfterAdd).toBe(1);
    (app as any).undo();
    const countAfterUndo = Object.keys((app as any).store.getState().blocks).length;
    expect(countAfterUndo).toBe(0);
  });

  it('coalesces multiple MOVE_BLOCK actions into single undo step', () => {
  (app as any).blockManager.createBlock('process', { x: 100, y: 100 });
  const id = getFirstBlockId(app);
  const store = (app as any).store;
  const originalPos = { ...store.getState().blocks[id].position };

    // Simulate rapid MOVE_BLOCK dispatches (drag sequence)
    for (let i=0;i<10;i++) {
      store.dispatch({ type:'MOVE_BLOCK', id, position: { x: originalPos.x + i*5, y: originalPos.y + i*3 } });
    }
    // Commit the drag operation (single snapshot)
    (app as any).undoCommit();
    const afterPos = { ...store.getState().blocks[id].position };
    expect(afterPos.x).not.toBe(originalPos.x);

    // Undo should jump back to originalPos (single step)
    (app as any).undo();
    const revertedPos = store.getState().blocks[id].position;
    expect(revertedPos).toEqual(originalPos);
  });

  it('redo reapplies move after undo', () => {
  (app as any).blockManager.createBlock('process', { x: 120, y: 120 });
  const id = getFirstBlockId(app);
  const store = (app as any).store;
  const originalPos = { ...store.getState().blocks[id].position };

    for (let i=0;i<6;i++) store.dispatch({ type:'MOVE_BLOCK', id, position: { x: originalPos.x + i*7, y: originalPos.y + i*4 } });
    (app as any).undoCommit();
    const moved = { ...store.getState().blocks[id].position };
    (app as any).undo();
    expect(store.getState().blocks[id].position).toEqual(originalPos);
    (app as any).redo();
    expect(store.getState().blocks[id].position).toEqual(moved);
  });

  it('grid toggle is undoable (explicit expectation)', () => {
    const store = (app as any).store;
    const before = !!store.getState().grid?.enabled;
    (app as any).undoBegin('toggle-grid');
    (app as any).toggleGrid();
    const toggled = !!store.getState().grid?.enabled;
    expect(toggled).toBe(!before);
    (app as any).undo();
    const reverted = !!store.getState().grid?.enabled;
    expect(reverted).toBe(before);
  });

  it('hotkeys Ctrl+Z / Ctrl+Y trigger undo/redo', () => {
  (app as any).blockManager.createBlock('process', { x: 140, y: 120 });
  const id = getFirstBlockId(app);
  const store = (app as any).store;
    // Ensure hotkey listeners are attached (private in app)
    (app as any).attachHotkeys?.();
    const originalPos = { ...store.getState().blocks[id].position };
    // First move operation
    (app as any).undoBegin('move-block');
    store.dispatch({ type:'MOVE_BLOCK', id, position: { x: originalPos.x + 50, y: originalPos.y + 10 } });
    (app as any).undoCommit();
    const firstMove = { ...store.getState().blocks[id].position };
    // Second move operation
    (app as any).undoBegin('move-block');
    store.dispatch({ type:'MOVE_BLOCK', id, position: { x: firstMove.x + 10, y: firstMove.y + 5 } });
    (app as any).undoCommit();
    const secondMove = { ...store.getState().blocks[id].position };
    // Undo (Ctrl+Z) reverts secondMove → firstMove
  window.dispatchEvent(new KeyboardEvent('keydown', { key:'z', ctrlKey:true }));
  expect(store.getState().blocks[id].position).toEqual(firstMove);
  // Undo again returns to originalPos
  window.dispatchEvent(new KeyboardEvent('keydown', { key:'z', ctrlKey:true }));
  expect(store.getState().blocks[id].position).toEqual(originalPos);
  // Redo (Ctrl+Y) goes to firstMove
  window.dispatchEvent(new KeyboardEvent('keydown', { key:'y', ctrlKey:true }));
  expect(store.getState().blocks[id].position).toEqual(firstMove);
  // Redo again goes to secondMove
  window.dispatchEvent(new KeyboardEvent('keydown', { key:'y', ctrlKey:true }));
  expect(store.getState().blocks[id].position).toEqual(secondMove);
  });

  it('connection draft is canceled by undo', () => {
    (app as any).blockManager.createBlock('process', { x: 200, y: 200 });
    const firstId = getFirstBlockId(app);
    // Fake dimensions for anchor start point
    (app as any).draftController.startDraft(firstId, { x: 100, y: 100 });
    expect((app as any).store.getState().connectionDraft).toBeTruthy();
    (app as any).undo();
    // Undo may or may not change data, but draft should be gone due to cancellation in undo()
    expect((app as any).store.getState().connectionDraft).toBeFalsy();
  });
});
