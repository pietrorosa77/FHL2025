import { describe, it, expect } from 'vitest';
import { initialState, Action, Block } from '../src/types';
import { reducer } from '../src/reducer';

function dispatchSeq(actions: Action[]) {
  let st = initialState();
  for (const a of actions) st = reducer(st, a);
  return st;
}

describe('Reducer Clamp', () => {
  it('clamps MOVE_BLOCK action positions beyond canvas', () => {
    const block: Block = {
      id: 'blk_test', kind: 'process', position: { x: 10, y: 10 }, size: { width: 200, height: 100 }, title: 'Test', descriptionHtml: '<p>Desc</p>', properties: {}
    };
    let st = dispatchSeq([{ type: 'ADD_BLOCK', block }]);
    // Intentionally move far outside expected bounds
    st = reducer(st, { type: 'MOVE_BLOCK', id: block.id, position: { x: 99999, y: 99999 } });
    const moved = st.blocks[block.id];
    expect(moved.position.x).toBeLessThanOrEqual(4000 - moved.size.width);
    expect(moved.position.y).toBeLessThanOrEqual(4000 - moved.size.height);
  });

  it('clamps negative MOVE_BLOCK positions', () => {
    const block: Block = {
      id: 'blk_test2', kind: 'process', position: { x: 10, y: 10 }, size: { width: 150, height: 80 }, title: 'Test2', descriptionHtml: '<p>D</p>', properties: {}
    };
    let st = dispatchSeq([{ type: 'ADD_BLOCK', block }]);
    st = reducer(st, { type: 'MOVE_BLOCK', id: block.id, position: { x: -500, y: -300 } });
    const moved = st.blocks[block.id];
    expect(moved.position.x).toBeGreaterThanOrEqual(0);
    expect(moved.position.y).toBeGreaterThanOrEqual(0);
  });
});
