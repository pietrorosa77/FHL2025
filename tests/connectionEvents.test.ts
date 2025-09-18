import { describe, it, expect } from 'vitest';
import { Store } from '../src/Store.js';
import { ConnectionManager } from '../src/ConnectionManager.js';
import { ConnectionDraftController } from '../src/ConnectionDraftController.js';
import { EventBus, EventMap } from '../src/EventBus.js';

function seedBlocks(store: Store) {
  const s = store.getState();
  s.blocks['s'] = { id: 's', kind: 'process', title:'S', description:'', position:{x:100,y:100}, size:{width:120,height:60} } as any;
  s.blocks['t'] = { id: 't', kind: 'process', title:'T', description:'', position:{x:400,y:160}, size:{width:120,height:60} } as any;
}

describe('Connection events', () => {
  it('emits draft start, added, draft end (success)', () => {
    const store = new Store();
    seedBlocks(store);
    const bus = new EventBus<EventMap>();
    const root = document.createElement('div');
    document.body.appendChild(root);
    const cm = new ConnectionManager(root, { dispatch: (a)=>store.dispatch(a), getState: ()=> store.getState(), bus });
    const draft = new ConnectionDraftController(root, store, bus, cm);
    const events: string[] = [];
    bus.on('connection:draft:start', () => events.push('start'));
    bus.on('connection:added', () => events.push('added'));
    bus.on('connection:draft:end', (p) => events.push(p.canceled ? 'end-cancel' : 'end-ok'));
    draft.startDraft('s', { x: 220, y: 130 });
    draft.updateDraft({ x: 360, y: 140 });
    draft.completeDraft('t');
    expect(events).toEqual(['start','added','end-ok']);
  });

  it('emits draft start and cancel on no target', () => {
    const store = new Store();
    seedBlocks(store);
    const bus = new EventBus<EventMap>();
    const root = document.createElement('div');
    document.body.appendChild(root);
    const cm = new ConnectionManager(root, { dispatch: (a)=>store.dispatch(a), getState: ()=> store.getState(), bus });
    const draft = new ConnectionDraftController(root, store, bus, cm);
    const events: string[] = [];
    bus.on('connection:draft:start', () => events.push('start'));
    bus.on('connection:draft:end', (p) => events.push(p.canceled ? 'end-cancel' : 'end-ok'));
    draft.startDraft('s', { x: 220, y: 130 });
    draft.cancelDraft();
    expect(events).toEqual(['start','end-cancel']);
  });
});
