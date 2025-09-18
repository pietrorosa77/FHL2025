import { describe, it, expect, beforeEach } from 'vitest';
import { Toolbar } from '../src/Toolbar';

// Minimal polyfill env (jsdom provided by vitest --environment jsdom by default if configured)

describe('Toolbar', () => {
  let container: HTMLElement;
  let createdKinds: string[] = [];
  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    createdKinds = [];
    new Toolbar(container, {
      createBlock: (k) => { createdKinds.push(k); },
      setConnectionStyle: () => {},
      exportJSON: () => {},
      importJSON: () => {},
      clearAll: () => {},
      setTheme: () => {},
      resetView: () => {},
      randomPosition: () => ({ x:0, y:0 }),
      updateStatus: () => {},
      undo: () => {},
      redo: () => {},
      toggleGrid: () => {},
      gridEnabled: () => false
    });
  });

  it('renders toolbar buttons', () => {
    const buttons = container.querySelectorAll('.fc-toolbar button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('opens add menu and triggers block create', () => {
    const addBtn = container.querySelector('[data-menu-btn="add"]') as HTMLButtonElement;
    expect(addBtn).toBeTruthy();
    addBtn.click();
    const menu = document.querySelector('.fc-menu');
    expect(menu).toBeTruthy();
    const processItem = Array.from(menu!.querySelectorAll('button')).find(b => b.textContent === 'Process') as HTMLButtonElement;
    expect(processItem).toBeTruthy();
    processItem.click();
    expect(createdKinds).toContain('process');
  });
});
