import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '../src/Store.js';
import { ConnectionManager } from '../src/ConnectionManager.js';
import { EventBus, EventMap } from '../src/EventBus.js';

function setup() {
  document.body.innerHTML = '<div id="root"></div>';
  const root = document.getElementById('root')!;
  const store = new Store();
  const bus = new EventBus<EventMap>();
  const cm = new ConnectionManager(root, { dispatch: (a)=>store.dispatch(a), getState: ()=> store.getState(), bus });
  // create two blocks in state manually
  const s = store.getState();
  const sourceId = 'b1';
  const targetId = 'b2';
  s.blocks[sourceId] = { id: sourceId, kind: 'process', title: 'A', description:'', position:{x:100,y:100}, size:{width:120,height:60} } as any;
  s.blocks[targetId] = { id: targetId, kind: 'process', title: 'B', description:'', position:{x:400,y:200}, size:{width:120,height:60} } as any;
  return { store, cm, bus, sourceId, targetId, root };
}

describe('ConnectionManager path styles', () => {
  it('generates orthogonal path', () => {
    const { store, cm, sourceId, targetId } = setup();
    store.dispatch({ type: 'SET_CONNECTION_STYLE', style: 'orthogonal' });
    cm.addConnection(sourceId, targetId);
    cm.renderAll();
    const path = document.querySelector('.fc-conn-path') as SVGPathElement;
    expect(path).toBeTruthy();
    const d = path.getAttribute('d')!;
    expect(d).toMatch(/L/); // contains line segments
    expect(d.split('C').length).toBe(1); // no cubic Bezier commands
  });

  it('generates bezier path', () => {
    const { store, cm, sourceId, targetId } = setup();
    store.dispatch({ type: 'SET_CONNECTION_STYLE', style: 'bezier' });
    cm.addConnection(sourceId, targetId);
    cm.renderAll();
    const path = document.querySelector('.fc-conn-path') as SVGPathElement;
    expect(path).toBeTruthy();
    const d = path.getAttribute('d')!;
    expect(d).toMatch(/C/); // has cubic command
  });
});
