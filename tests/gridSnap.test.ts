import { describe, it, expect } from 'vitest';
import { Store } from '../src/Store.js';

describe('Grid snapping', () => {
  it('snaps block movement when enabled', () => {
    const store = new Store();
    const st = store.getState();
    st.blocks['g1'] = { id: 'g1', kind: 'process', title:'G', descriptionHtml:'', properties:{}, position:{x:5,y:5}, size:{width:100,height:50} } as any;
    store.dispatch({ type: 'SET_GRID', grid: { enabled: true, size: 25 } });
    store.dispatch({ type: 'MOVE_BLOCK', id: 'g1', position: { x: 37, y: 63 } });
    const updated = store.getState().blocks['g1'];
    expect(updated.position).toEqual({ x: 25, y: 75 });
  });
});
