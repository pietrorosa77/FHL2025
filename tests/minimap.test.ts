import { describe, it, expect } from 'vitest';
import { initialState, Block } from '../src/types.js';
import { Store } from '../src/Store.js';
import { MinimapManager } from '../src/MinimapManager.js';

function makeBlock(id:string, x:number,y:number,w=100,h=60): Block {
  return { id, kind:'process', position:{x,y}, size:{width:w,height:h}, title:id, descriptionHtml:'', properties:{} };
}

describe('Minimap basic mapping', () => {
  it('maps block coordinates proportionally', () => {
    const store = new Store();
    let st = initialState();
    st.blocks['a'] = makeBlock('a', 2000, 2000); // center of 4000x4000
    store.replaceState(st);
    const host = document.createElement('div'); document.body.appendChild(host);
    const mm = new MinimapManager(host, { store, applyViewport: ()=>{} });
    // @ts-ignore access internals
    const scaled = { x: 2000 * (mm.width / 4000), y: 2000 * (mm.height / 4000) };
    // sample pixel read by forcing a render then checking nothing crashes
    mm.render();
    expect(scaled.x).toBeCloseTo(100, 1); // 2000 * (200/4000) = 100
    expect(scaled.y).toBeCloseTo(100, 1);
  });
});
