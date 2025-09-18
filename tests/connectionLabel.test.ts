import { describe, it, expect, beforeEach } from 'vitest';
import { FlowchartApp } from '../src/app';

class RO { observe(){} unobserve(){} disconnect(){} }

describe('Connection Label', () => {
  let app: FlowchartApp;
  beforeEach(() => {
    (globalThis as any).ResizeObserver = RO as any;
    document.body.innerHTML = '<div id="app"></div>';
    app = new FlowchartApp(document.getElementById('app')!);
  });

  function createTwoBlocks() {
    (app as any).blockManager.createBlock('process', { x: 50, y: 50 });
    (app as any).blockManager.createBlock('process', { x: 260, y: 50 });
    const ids = Object.keys((app as any).store.getState().blocks);
    return { a: ids[0], b: ids[1] };
  }

  it('creates connection with default label = id', () => {
    const { a, b } = createTwoBlocks();
    const connId = (app as any).connectionManager.addConnection(a, b);
    const state = (app as any).store.getState();
    const conn = state.connections[connId];
    expect(conn.label).toBe(connId);
    // DOM label exists
    const labelEl = document.querySelector(`[data-id="${connId}"] .fc-conn-label`) as HTMLElement;
    expect(labelEl).toBeTruthy();
    expect(labelEl.textContent).toBe(connId);
  });

  it('edits label on double click and saves when blurred', () => {
    const { a, b } = createTwoBlocks();
    const connId = (app as any).connectionManager.addConnection(a, b);
    const labelEl = document.querySelector(`[data-id="${connId}"] .fc-conn-label`) as HTMLElement;
  labelEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  const editedEl = document.querySelector(`[data-id="${connId}"] .fc-conn-label`) as HTMLElement;
  expect(editedEl.getAttribute('contenteditable')).toBe('true');
  editedEl.textContent = 'My Label';
  editedEl.dispatchEvent(new FocusEvent('blur')); // triggers save
    const updated = (app as any).store.getState().connections[connId];
    expect(updated.label).toBe('My Label');
  });

  it('repositions label after moving a block', () => {
    const { a, b } = createTwoBlocks();
    const connId = (app as any).connectionManager.addConnection(a, b);
    const initialLabel = document.querySelector(`[data-id="${connId}"] foreignObject`) as SVGForeignObjectElement;
    const initialX = parseFloat(initialLabel.getAttribute('x')!);
    // Move block a to the right
    (app as any).store.dispatch({ type:'MOVE_BLOCK', id: a, position: { x: 150, y: 50 } });
    // updateConnectionsForBlock is called by enhanced dispatch
    const updatedLabel = document.querySelector(`[data-id="${connId}"] foreignObject`) as SVGForeignObjectElement;
    const newX = parseFloat(updatedLabel.getAttribute('x')!);
    expect(newX).not.toBe(initialX);
  });
});
