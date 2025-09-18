import { describe, it, expect } from 'vitest';
import { initialState, Block } from '../src/types.js';
import { reducer } from '../src/reducer.js';

function makeBlock(id: string, x:number, y:number, w=100, h=60): Block {
  return { id, kind:'process', position:{x,y}, size:{width:w,height:h}, title:id, descriptionHtml:'', properties:{} };
}

describe('Align Right arrange', () => {
  it('align-right keeps all selected right edges equal', () => {
    let st = initialState();
    st = reducer(st, { type:'ADD_BLOCK', block: makeBlock('a', 100, 100, 120, 50) });
    st = reducer(st, { type:'ADD_BLOCK', block: makeBlock('b', 400, 160, 80, 50) });
    st = reducer(st, { type:'SET_MULTI_SELECT', ids:['a','b'] });
    const aR = st.blocks['a'].position.x + st.blocks['a'].size.width;
    const bR = st.blocks['b'].position.x + st.blocks['b'].size.width;
    const rightEdge = Math.max(aR, bR);
    // emulate align-right fullChanges (include unchanged block)
    const targetPositions = ['a','b'].map(id => {
      const blk = st.blocks[id];
      const newX = rightEdge - blk.size.width;
      return { id, position: { x: newX, y: blk.position.y } };
    });
    st = reducer(st, { type:'MULTIDRAG_BLOCKS', changes: targetPositions });
    const aR2 = st.blocks['a'].position.x + st.blocks['a'].size.width;
    const bR2 = st.blocks['b'].position.x + st.blocks['b'].size.width;
    expect(aR2).toBe(bR2);
  });
});
