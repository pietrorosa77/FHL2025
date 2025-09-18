import { BlockKind } from './types.js';
import { SaveLoadManager } from './toolbar/SaveLoadManager.js';
import { ThemeMenu } from './toolbar/ThemeMenu.js';
import { ArrangeMenu } from './toolbar/ArrangeMenu.js';
import { ConnectionStyleMenu } from './toolbar/ConnectionStyleMenu.js';

export interface ToolbarDeps {
  createBlock(kind: BlockKind, pos: {x:number;y:number}): void;
  setConnectionStyle(style: 'bezier'|'orthogonal'): void;
  exportJSON(): void;
  importJSON(): void;
  clearAll(): void;
  setTheme(theme: string): void;
  resetView(): void;
  randomPosition(): {x:number;y:number};
  updateStatus(msg: string): void;
  undo(): void;
  redo(): void;
  toggleGrid(): void;
  gridEnabled(): boolean;
  arrange(kind: string): void; // kind: align-left|align-center|align-right|align-top|align-middle|align-bottom|dist-h|dist-v
  toggleMinimap(): void;
  minimapEnabled(): boolean;
}

export class Toolbar {
  private deps: ToolbarDeps;
  private root: HTMLElement;
  private openMenus: { [key:string]: HTMLElement } = {};
  // Extracted feature modules
  private saveLoad: SaveLoadManager;
  private themeMenu: ThemeMenu;
  private arrangeMenu: ArrangeMenu;
  private styleMenu: ConnectionStyleMenu;

  constructor(container: HTMLElement, deps: ToolbarDeps) {
    this.deps = deps;
  this.root = document.createElement('div');
    this.root.className = 'fc-toolbar';
    this.root.innerHTML = `
      <button title="Undo" data-act="undo">↺</button>
      <button title="Redo" data-act="redo">↻</button>
      <button title="Add Block" data-menu-btn="add">➕</button>
      <button title="Connection Style" data-menu-btn="style">🧬</button>
      <button title="Data" data-menu-btn="data">🗂</button>
      <button title="Theme" data-menu-btn="theme">🎨</button>
      <button title="Grid" data-act="grid">#</button>
  <button title="Arrange" data-menu-btn="arrange">📐</button>
  <button title="Reset View" data-act="resetView">🧭</button>
  <button title="Minimap" data-act="minimap">🗺</button>
    `;
    container.appendChild(this.root);
    // Instantiate feature modules
    this.saveLoad = new SaveLoadManager(deps);
    this.themeMenu = new ThemeMenu(deps);
    this.arrangeMenu = new ArrangeMenu(deps);
    this.styleMenu = new ConnectionStyleMenu(deps);
    this.attachEvents();
  }

  getElement() { return this.root; }

  private attachEvents() {
    window.addEventListener('pointerdown', (e) => {
      if (!(e.target as HTMLElement).closest('.fc-toolbar') && !(e.target as HTMLElement).closest('.fc-menu')) {
        this.closeAllMenus();
      }
    });
    this.root.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('button'); if (!btn) return;
        e.stopPropagation();
        e.preventDefault();
      if (btn.dataset.act) {
        switch(btn.dataset.act) {
          case 'resetView': this.deps.resetView(); this.closeAllMenus(); return;
          case 'undo': this.deps.undo(); return;
          case 'redo': this.deps.redo(); return;
          case 'grid': this.deps.toggleGrid(); btn.classList.toggle('active', this.deps.gridEnabled()); return;
          case 'minimap': this.deps.toggleMinimap(); btn.classList.toggle('active', this.deps.minimapEnabled()); return;
        }
      }
      if (!btn.dataset.menuBtn) return;
      switch(btn.dataset.menuBtn) {
        case 'add':
          return this.toggleMenu('add', btn, [
            { label:'Start', action: ()=> this.deps.createBlock('start', this.deps.randomPosition()) },
            { label:'Process', action: ()=> this.deps.createBlock('process', this.deps.randomPosition()) },
            { label:'Decision', action: ()=> this.deps.createBlock('decision', this.deps.randomPosition()) },
            { label:'I/O', action: ()=> this.deps.createBlock('io', this.deps.randomPosition()) },
            { label:'End', action: ()=> this.deps.createBlock('end', this.deps.randomPosition()) }
          ]);
        case 'style':
          return this.toggleMenu('style', btn, this.styleMenu.buildItems());
        case 'data':
          return this.toggleMenu('data', btn, this.saveLoad.buildDataMenuItems(()=>this.closeAllMenus()));
        case 'theme':
          return this.themeMenu.open(btn, ()=>this.closeAllMenus());
        case 'arrange':
          return this.toggleMenu('arrange', btn, this.arrangeMenu.buildItems());
      }
    });
  }

  private buildMenu(id: string, items: { label: string; action: () => void; danger?: boolean }[]) {
    const menu = document.createElement('div'); menu.className='fc-menu'; menu.dataset.menu=id;
    items.forEach(it => {
      if (it.label === '---') { const sep=document.createElement('div'); sep.className='fc-menu-group-sep'; menu.appendChild(sep); return; }
      const btn=document.createElement('button'); btn.className='fc-menu-item'+(it.danger?' danger':''); btn.textContent=it.label; btn.addEventListener('click', () => { it.action(); this.closeAllMenus(); }); menu.appendChild(btn);
    });
    return menu;
  }

  private positionMenu(menu: HTMLElement, anchorBtn: HTMLElement) {
    const rect = anchorBtn.getBoundingClientRect();
    menu.style.top = (rect.top - menu.offsetHeight - 8) + 'px';
    menu.style.left = (rect.left - menu.offsetWidth + rect.width) + 'px';
    if (parseFloat(menu.style.top) < 0) menu.style.top = (rect.bottom + 8) + 'px';
  }

  private toggleMenu(key: string, btn: HTMLElement, items: { label: string; action: () => void; danger?: boolean }[]) {
    if (this.openMenus[key]) { this.closeAllMenus(); return; }
    this.closeAllMenus();
    const m = this.buildMenu(key, items);
    document.body.appendChild(m);
    this.positionMenu(m, btn);
    this.openMenus[key] = m;
    btn.setAttribute('data-open','true');
  }

  // Feature modules now own theme modal & save/load dialogs.

  private closeAllMenus() {
    Object.values(this.openMenus).forEach(m => m.remove());
    Object.keys(this.openMenus).forEach(k => delete this.openMenus[k]);
    this.root.querySelectorAll('[data-open="true"]').forEach(b => b.removeAttribute('data-open'));
  }
}
