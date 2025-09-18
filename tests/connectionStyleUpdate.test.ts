import { describe, it, expect } from 'vitest';
import { Store } from '../src/Store.js';
import { ConnectionManager } from '../src/ConnectionManager.js';
import { EventBus, EventMap } from '../src/EventBus.js';

// We'll inspect path after style switch

describe('Connection style propagation', () => {
  it('updates existing connection when style changes', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const store = new Store();
    const bus = new EventBus<EventMap>();
    const cm = new ConnectionManager(root, { dispatch: (a)=>store.dispatch(a), getState: ()=> store.getState(), bus });
    // seed blocks
    const s = store.getState();
    s.blocks['a'] = { id: 'a', kind: 'process', title:'A', descriptionHtml:'', properties:{}, position:{x:100,y:100}, size:{width:120,height:60} } as any;
    s.blocks['b'] = { id: 'b', kind: 'process', title:'B', descriptionHtml:'', properties:{}, position:{x:400,y:200}, size:{width:120,height:60} } as any;

    // initial style bezier -> add connection
    cm.addConnection('a','b');
    cm.renderAll();
    let path = root.querySelector('.fc-conn-path') as SVGPathElement;
    expect(path.getAttribute('d')).toMatch(/C/);

    // change style to orthogonal
    store.dispatch({ type: 'SET_CONNECTION_STYLE', style: 'orthogonal' });
    cm.renderAll(); // connections mutated; re-render all

    path = root.querySelector('.fc-conn-path') as SVGPathElement;
    const d = path.getAttribute('d')!;
    expect(d.includes('C')).toBe(false);
    expect(d.match(/L/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
