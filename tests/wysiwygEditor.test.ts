import { describe, it, expect, beforeEach } from 'vitest';
import { FlowchartApp } from '../src/app';

// Ensure ResizeObserver stub for jsdom
class RO { observe(){} unobserve(){} disconnect(){} }

describe('Wysiwyg Editor', () => {
  let app: FlowchartApp;
  beforeEach(() => {
    (globalThis as any).ResizeObserver = RO as any;
    document.body.innerHTML = '<div id="app"></div>';
    app = new FlowchartApp(document.getElementById('app')!);
  });

  it('double click description opens editor and save updates html', () => {
    (app as any).blockManager.createBlock('process', { x: 10, y: 10 });
    const state = (app as any).store.getState();
    const id = Object.keys(state.blocks)[0];
    const descEl = document.querySelector(`#${id} .fc-block-desc`) as HTMLElement;
    // Trigger dblclick
    descEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const toolbar = descEl.querySelector('.fc-wys-toolbar');
    expect(toolbar).toBeTruthy();
    const area = descEl.querySelector('.fc-wys-area') as HTMLElement;
    area.innerHTML = '<p><strong>Updated</strong> content</p>';
    const saveBtn = descEl.querySelector('.fc-wys-save') as HTMLButtonElement;
    saveBtn.click();
    const updated = (app as any).store.getState().blocks[id].descriptionHtml;
    expect(updated).toContain('<strong>Updated</strong>');
  });
});
