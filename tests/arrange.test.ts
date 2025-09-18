import { describe, it, expect } from 'vitest';
import { initialState, Block } from '../src/types.js';
import { reducer } from '../src/reducer.js';

// Lightweight harness to simulate arrange logic similar to app.runArrange (logic duplicated minimal)
function apply(actions: any[]) {
  let st = initialState();
  actions.forEach(a => { st = reducer(st, a); });
  return st;
}

function makeBlock(id: string, x:number, y:number, w=100, h=60): Block {
  return { id, kind:'process', position:{x,y}, size:{width:w,height:h}, title:id, descriptionHtml:'', properties:{} };
}

describe('Arrange operations', () => {
  it('align-left moves all to min x', () => {
    let state = apply([
      { type:'ADD_BLOCK', block: makeBlock('a', 300, 100) },
      { type:'ADD_BLOCK', block: makeBlock('b', 120, 200) },
      { type:'ADD_BLOCK', block: makeBlock('c', 500, 250) },
      { type:'SET_MULTI_SELECT', ids:['a','b','c'] }
    ]);
    // Emulate arrange align-left
    const ids = state.multiSelect!;
    const left = Math.min(...ids.map(id=> state.blocks[id].position.x));
    const changes = ids.map(id => ({ id, position: { x: left, y: state.blocks[id].position.y } }));
    state = reducer(state, { type:'MULTIDRAG_BLOCKS', changes });
    ids.forEach(id => expect(state.blocks[id].position.x).toBe(left));
  });

  it('distribute-horizontal spaces interiors evenly', () => {
    let state = apply([
      { type:'ADD_BLOCK', block: makeBlock('a', 100, 100, 80, 50) },
      { type:'ADD_BLOCK', block: makeBlock('b', 200, 120, 80, 50) },
      { type:'ADD_BLOCK', block: makeBlock('c', 600, 140, 80, 50) },
      { type:'ADD_BLOCK', block: makeBlock('d', 900, 160, 80, 50) },
      { type:'SET_GRID', grid: { enabled:false } },
      { type:'SET_MULTI_SELECT', ids:['a','b','c','d'] }
    ]);
    // Compute distribution similar to runArrange('dist-h')
    const ids = state.multiSelect!;
    const blocks = ids.map(id => state.blocks[id]);
    const ordered = [...blocks].sort((a,b)=> a.position.x - b.position.x);
    const first = ordered[0]; const last = ordered[ordered.length-1];
    const spanTotal = (last.position.x + last.size.width) - first.position.x;
    const totalWidths = ordered.reduce((s,b)=> s + b.size.width, 0);
    const gaps = ordered.length - 1;
    const freeSpace = spanTotal - totalWidths;
    const gapSize = freeSpace / gaps;
    let cursor = first.position.x + first.size.width + gapSize;
    const changes: {id:string; position:{x:number;y:number}}[] = [];
    for (let i=1;i<ordered.length-1;i++) {
      const b = ordered[i];
      changes.push({ id: b.id, position:{ x: Math.round(cursor), y: b.position.y } });
      cursor += b.size.width + gapSize;
    }
    state = reducer(state, { type:'MULTIDRAG_BLOCKS', changes });
    // Verify interior x positions form arithmetic progression based on gapSize
    const updatedOrdered = [...ids.map(id=> state.blocks[id])].sort((a,b)=> a.position.x - b.position.x);
    const xs = updatedOrdered.map(b=> b.position.x);
    // first and last unchanged
    expect(xs[0]).toBe(first.position.x);
    expect(xs[xs.length-1]).toBe(last.position.x);
    // compute gaps between right edge of block i and left edge of block i+1
    const updated = updatedOrdered;
    const gapsComputed: number[] = [];
    for (let i=0;i<updated.length-1;i++) {
      const a = updated[i]; const b = updated[i+1];
      const gap = b.position.x - (a.position.x + a.size.width);
      gapsComputed.push(gap);
    }
    const target = gapsComputed[0];
    gapsComputed.forEach(g => expect(Math.abs(g - target)).toBeLessThanOrEqual(1));
  });
});
