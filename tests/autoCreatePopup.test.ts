import { describe, it, expect } from 'vitest';
import { AutoCreatePopup } from '../src/AutoCreatePopup.js';

// Minimal fake deps capturing interactions
function setup() {
  const created: any[] = [];
  const connections: any[] = [];
  const blocks: Record<string, any> = {};
  let idCounter = 0;
  const deps = {
    createBlock: (kind: string, pos: {x:number;y:number}) => {
      const id = 'b'+(++idCounter);
      blocks[id] = { id, kind, position: { ...pos }, size: { width: 120, height: 60 } };
      created.push({ id, kind, pos });
    },
    addConnection: (s: string, t: string) => { connections.push({ s, t }); },
    getBlocks: () => blocks
  };
  return { popup: new AutoCreatePopup(deps), created, connections, blocks };
}

describe('AutoCreatePopup', () => {
  it('creates block and connection on selection', () => {
    const { popup, created, connections, blocks } = setup();
    document.body.innerHTML = '';
    popup.show('source1', { x: 200, y: 300 });
    const btn = Array.from(document.querySelectorAll('.fc-auto-list .fc-btn.kind'))[0] as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(created.length).toBe(1);
    const newBlock = created[0];
    // Position adjusted by -40 y in implementation
    expect(newBlock.pos).toEqual({ x:200, y:260 });
    expect(Object.keys(blocks).length).toBe(1);
    expect(connections.length).toBe(1);
    expect(connections[0]).toEqual({ s: 'source1', t: Object.keys(blocks)[0] });
    // popup removed
    expect(document.querySelector('.fc-auto-popup')).toBeNull();
  });

  it('cancel removes popup without side effects', () => {
    const { popup, created, connections } = setup();
    popup.show('src', { x: 10, y: 20 });
    const cancel = document.querySelector('.fc-auto-popup .fc-cancel') as HTMLButtonElement;
    expect(cancel).toBeTruthy();
    cancel.click();
    expect(created.length).toBe(0);
    expect(connections.length).toBe(0);
    expect(document.querySelector('.fc-auto-popup')).toBeNull();
  });
});
