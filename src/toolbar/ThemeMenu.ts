import { ToolbarDeps } from '../Toolbar.js';

export class ThemeMenu {
  private currentMenu: HTMLElement | null = null;
  constructor(private deps: ToolbarDeps) {}

  open(btn: HTMLElement, closeMenus: ()=>void) {
    // Toggle behaviour: if already open, just close.
    if (btn.getAttribute('data-open')==='true') { this.closeMenu(closeMenus); return; }
    closeMenus();
    const menu = document.createElement('div'); menu.className='fc-menu'; menu.dataset.menu='theme';
    this.currentMenu = menu;
    const themes = [
      'dark','light','high-contrast','blue','green','purple',
      'light-blue','light-green','light-orange','light-gray','light-contrast'
    ];
    const tm = (window as any).flowchartApp?.themeManager;
    themes.forEach(name => {
      const item = document.createElement('button'); item.className='fc-menu-item theme-item';
      const sw = document.createElement('div'); sw.className='fc-theme-swatch';
      const stack = document.createElement('div'); stack.className='fc-theme-swatch-stack';
      const a = document.createElement('span'); const b = document.createElement('span');
      let pv: any;
      if (tm && tm.ensurePreviewForBuiltin) {
        pv = tm.ensurePreviewForBuiltin(name);
        a.style.background = pv.bg; b.style.background = pv.accent;
      } else { a.style.background = '#ffffff'; b.style.background = '#4ea1ff'; }
      stack.appendChild(a); stack.appendChild(b); sw.appendChild(stack);
      const labelWrap = document.createElement('div'); labelWrap.className='label-wrap';
      labelWrap.innerHTML = `<span>${name}</span>`;
      item.appendChild(sw); item.appendChild(labelWrap);
  item.addEventListener('click', () => { this.deps.setTheme(name); this.deps.updateStatus('Theme: '+name); this.closeMenu(closeMenus); });
      menu.appendChild(item);
    });
    const sep=document.createElement('div'); sep.className='fc-menu-group-sep'; menu.appendChild(sep);
    const customBtn=document.createElement('button'); customBtn.className='fc-menu-item'; customBtn.textContent='Add Custom Theme';
  customBtn.addEventListener('click', () => { this.closeMenu(closeMenus); this.openCustomThemeModal(); });
    menu.appendChild(customBtn);
    document.body.appendChild(menu);
    // Position then clamp to viewport
    const rect = btn.getBoundingClientRect();
    const vpW = window.innerWidth; const vpH = window.innerHeight;
    // Initial preferred position (above & right aligned)
    let top = rect.top - menu.offsetHeight - 8;
    let left = rect.left - menu.offsetWidth + rect.width;
    // If above goes off screen, place below
    if (top < 0) top = rect.bottom + 8;
    // Clamp horizontally & vertically
    if (left + menu.offsetWidth > vpW - 4) left = vpW - menu.offsetWidth - 4;
    if (left < 4) left = 4;
    if (top + menu.offsetHeight > vpH - 4) top = Math.max(4, vpH - menu.offsetHeight - 4);
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    btn.setAttribute('data-open','true');

    // Outside click & escape handling specific to this menu so it can self-close.
    const onPointerDown = (e: PointerEvent) => {
      if (!this.currentMenu) return;
      if (!(e.target as HTMLElement).closest('.fc-menu') && !(e.target as HTMLElement).closest('[data-menu-btn="theme"]')) {
        this.closeMenu(closeMenus);
        window.removeEventListener('pointerdown', onPointerDown, true);
        window.removeEventListener('keydown', onKeyDown, true);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeMenu(closeMenus);
        window.removeEventListener('pointerdown', onPointerDown, true);
        window.removeEventListener('keydown', onKeyDown, true);
      }
    };
    // Capture phase so it fires before toolbar global handler if any
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
  }

  private openCustomThemeModal() {
    const backdrop = document.createElement('div'); backdrop.className='backdrop';
    const modal = document.createElement('div'); modal.className='fc-theme-modal fade-in';
    modal.innerHTML = `<h2>Custom Theme</h2><div class="body">
      <div class="hint">Paste JSON mapping of CSS variables to values. Only keys starting with <code>--fc-</code> are applied.</div>
      <input type="text" placeholder="theme-name" class="name" style="padding:6px 8px; font-size:13px; border:1px solid var(--fc-border-strong); background:var(--fc-bg); color:var(--fc-text); border-radius:4px;" />
      <textarea class="vars" placeholder='{"--fc-bg":"#ffffff","--fc-accent":"#2563eb","--fc-text":"#111827"}'></textarea>
      <div class="err" style="display:none"></div>
    </div>
    <div class="actions">
      <button class="fc-btn" data-act="cancel">Cancel</button>
      <button class="fc-btn primary" data-act="save">Save Theme</button>
    </div>`;
  const remove = () => { backdrop.remove(); modal.remove(); };
    backdrop.addEventListener('click', remove);
    document.body.appendChild(backdrop); document.body.appendChild(modal);
    const nameInput = modal.querySelector('.name') as HTMLInputElement;
    const textarea = modal.querySelector('.vars') as HTMLTextAreaElement;
    const errEl = modal.querySelector('.err') as HTMLElement;
    modal.querySelector('[data-act="cancel"]')?.addEventListener('click', remove);
    modal.querySelector('[data-act="save"]')?.addEventListener('click', () => {
      errEl.style.display='none';
      const name = (nameInput.value || '').trim();
      if (!name) { errEl.textContent='Name required'; errEl.style.display='block'; return; }
      let parsed: any; try { parsed = JSON.parse(textarea.value || '{}'); } catch(e:any) { errEl.textContent='Invalid JSON: '+e.message; errEl.style.display='block'; return; }
      const filtered: Record<string,string> = {};
      Object.entries(parsed).forEach(([k,v])=> { if (k.startsWith('--fc-') && typeof v === 'string') filtered[k]=v; });
      if (Object.keys(filtered).length === 0) { errEl.textContent='No valid --fc- variables found.'; errEl.style.display='block'; return; }
      if ((window as any).flowchartApp?.themeManager?.registerCustom) {
        (window as any).flowchartApp.themeManager.registerCustom(name, filtered);
      }
      this.deps.setTheme(name);
      this.deps.updateStatus('Theme: '+name+' (custom)');
      remove();
    });
  }

  private closeMenu(closeMenus: ()=>void) {
    if (this.currentMenu) {
      this.currentMenu.remove();
      this.currentMenu = null;
    }
    closeMenus();
  }
}
