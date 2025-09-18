import { describe, it, expect, beforeEach } from 'vitest';
import { FlowchartApp } from '../src/app.js';

// jsdom environment lacks ResizeObserver; provide minimal stub
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class { observe(){} unobserve(){} disconnect(){} } as any;
}

describe('Minimap persistence', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.clear();
  });

  it('restores hidden state from localStorage', () => {
    localStorage.setItem('fc-minimap-enabled','0');
    const app = new FlowchartApp(document.getElementById('app')!);
    const miniEl = document.querySelector('.fc-minimap') as HTMLElement;
    expect(miniEl).toBeTruthy();
    expect(miniEl.style.display).toBe('none');
  });

  it('persists toggle action', () => {
    const app = new FlowchartApp(document.getElementById('app')!);
    const btn = Array.from(document.querySelectorAll('.fc-toolbar button'))
      .find(b => (b as HTMLElement).title === 'Minimap') as HTMLButtonElement;
    expect(localStorage.getItem('fc-minimap-enabled')).toBe('1');
    btn.click(); // toggle off
    expect(localStorage.getItem('fc-minimap-enabled')).toBe('0');
    btn.click(); // toggle on
    expect(localStorage.getItem('fc-minimap-enabled')).toBe('1');
  });
});
