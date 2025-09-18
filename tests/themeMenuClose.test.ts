import { describe, it, expect } from 'vitest';
import { FlowchartApp } from '../src/core/FlowchartApp.js';

function setup() {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app')!;
  const app = new FlowchartApp(root);
  return app;
}

describe('Theme Menu Auto-Close', () => {
  it('closes menu after selecting a theme', () => {
    setup();
    const toolbarBtn = document.querySelector('[data-menu-btn="theme"]') as HTMLElement;
    expect(toolbarBtn).toBeTruthy();
    // Open theme menu
    toolbarBtn.click();
    let menu = document.querySelector('.fc-menu[data-menu="theme"]');
    expect(menu).toBeTruthy();
    // Click first theme item button
    const firstItem = menu!.querySelector('button.theme-item') as HTMLButtonElement;
    expect(firstItem).toBeTruthy();
    firstItem.click();
    // After selection, menu should be removed
    menu = document.querySelector('.fc-menu[data-menu="theme"]');
    expect(menu).toBeNull();
  });
});
