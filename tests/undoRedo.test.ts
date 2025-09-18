import { describe, it, expect } from 'vitest';
import { Store } from '../src/Store.js';
import { UndoManager } from '../src/UndoManager.js';
import { uid } from '../src/types.js';

describe('Undo/Redo', () => {
  it('undoes and redoes block move', () => {
    const store = new Store();
    const undo = new UndoManager(store);
    const id = 'u1';
    // Disable snapping for this test to verify exact coordinates
    store.dispatch({ type: 'SET_GRID', grid: { snap: false } });
    store.getState().blocks[id] = { id, kind: 'process', title:'U', descriptionHtml:'', properties:{}, position:{x:0,y:0}, size:{width:100,height:50} } as any;
  // Operation-based: begin, apply, commit
  undo.begin('move');
  store.dispatch({ type: 'MOVE_BLOCK', id, position: { x: 40, y: 10 } });
  undo.commitIfChanged();
    expect(store.getState().blocks[id].position).toEqual({ x:40, y:10 });
    undo.undo();
    expect(store.getState().blocks[id].position).toEqual({ x:0, y:0 });
    undo.redo();
    expect(store.getState().blocks[id].position).toEqual({ x:40, y:10 });
  });
});
