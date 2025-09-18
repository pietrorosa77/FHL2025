import { ToolbarDeps } from '../Toolbar.js';

export class SaveLoadManager {
  constructor(private deps: ToolbarDeps) {}

  buildDataMenuItems(closeMenus: ()=>void) {
    return [
      { label:'Save Chart', action: ()=> this.openSaveDialog(closeMenus) },
      { label:'Load Chart', action: ()=> this.openLoadDialog(closeMenus) },
      { label:'---', action: ()=> {} },
      { label:'Export JSON', action: ()=> { closeMenus(); this.deps.exportJSON(); } },
      { label:'Import JSON', action: ()=> { closeMenus(); this.deps.importJSON(); } },
      { label:'Clear All', action: ()=> { if (confirm('Clear all blocks and connections?')) { this.deps.clearAll(); } }, danger:true }
    ];
  }

  openSaveDialog(closeMenus: ()=>void) {
    closeMenus();
    const backdrop = document.createElement('div'); backdrop.className='backdrop';
    const modal = document.createElement('div'); modal.className='fc-theme-modal fade-in';
    const applyResponsiveSize = () => {
      const vw = window.innerWidth;
      const target = Math.min(780, Math.max(480, Math.floor(vw * 0.9)));
      modal.style.width = target + 'px';
      modal.style.maxHeight = Math.min(window.innerHeight * 0.9, 720) + 'px';
    };
    applyResponsiveSize();
    window.addEventListener('resize', applyResponsiveSize, { once: true });
    modal.innerHTML = `<h2>Save Chart</h2><div class="body">
      <div class="hint">Provide a name to save the current chart locally. Existing names require confirmation to overwrite.</div>
      <input type="text" class="chart-name" placeholder="chart-name" style="padding:6px 8px; font-size:13px; border:1px solid var(--fc-border-strong); background:var(--fc-bg); color:var(--fc-text); border-radius:4px;" />
      <div class="err" style="display:none"></div>
    </div>
    <div class="actions">
      <button class="fc-btn" data-act="cancel">Cancel</button>
      <button class="fc-btn primary" data-act="save">Save</button>
    </div>`;
    const remove = ()=> { backdrop.remove(); modal.remove(); };
    backdrop.addEventListener('click', remove);
    document.body.appendChild(backdrop); document.body.appendChild(modal);
    const nameInput = modal.querySelector('.chart-name') as HTMLInputElement;
    const errEl = modal.querySelector('.err') as HTMLElement;
    modal.querySelector('[data-act="cancel"]')?.addEventListener('click', remove);
    modal.querySelector('[data-act="save"]')?.addEventListener('click', () => {
      errEl.style.display='none';
      const name = (nameInput.value||'').trim();
      if (!name) { errEl.textContent='Name required'; errEl.style.display='block'; return; }
      try {
        const app = (window as any).flowchartApp; if (!app) throw new Error('App missing');
        const state = app.store.getState();
        const wrapper = { savedAt: new Date().toISOString(), state };
        const key = 'fc-saved-charts';
        const existingRaw = localStorage.getItem(key);
        let list: any[] = existingRaw ? JSON.parse(existingRaw) : [];
        const already = list.find(x => x.name === name);
        if (already) {
          if (!confirm(`Overwrite existing chart "${name}"?`)) { return; }
          list = list.filter(x => x.name !== name);
        } else {
          list = list.filter(x => x.name !== name);
        }
        list.push({ name, ...wrapper });
        localStorage.setItem(key, JSON.stringify(list));
        this.deps.updateStatus('Saved chart: '+name);
        remove();
      } catch(e:any) {
        errEl.textContent = 'Error: '+ e.message;
        errEl.style.display='block';
      }
    });
    nameInput.focus();
  }

  openLoadDialog(closeMenus: ()=>void) {
    closeMenus();
    const key = 'fc-saved-charts';
    let list: any[] = [];
    try { const raw = localStorage.getItem(key); if (raw) list = JSON.parse(raw); } catch {}
    const backdrop = document.createElement('div'); backdrop.className='backdrop';
    const modal = document.createElement('div'); modal.className='fc-theme-modal fade-in';
    modal.innerHTML = `<h2>Load Chart</h2><div class="body">
      <div class="hint">Select a chart to load. Current unsaved changes will be lost.</div>
      <div class="toolbar-row" style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:4px 0 6px;">
        <div style="display:flex; gap:6px;">
          <button class="fc-btn small" data-sort="date">Sort: Date</button>
          <button class="fc-btn small" data-sort="name">Sort: Name</button>
        </div>
        <input type="text" placeholder="Search..." class="chart-search" style="flex:1 1 160px; min-width:140px; padding:4px 6px; font-size:12px; border:1px solid var(--fc-border-strong); background:var(--fc-bg); color:var(--fc-text); border-radius:4px;" />
      </div>
      <div class="chart-list" style="display:flex; flex-direction:column; gap:8px; transition:all .15s ease;"></div>
      <div class="pager" style="display:none; justify-content:space-between; align-items:center; margin-top:10px; gap:12px;">
        <button class="fc-btn small" data-page="prev" disabled>Prev</button>
        <div class="page-info" style="font-size:11px; opacity:.75;">Page 1</div>
        <button class="fc-btn small" data-page="next" disabled>Next</button>
      </div>
      <div class="err" style="display:none"></div>
    </div>
    <div class="actions">
      <button class="fc-btn" data-act="close">Close</button>
    </div>`;
    const remove = ()=> { backdrop.remove(); modal.remove(); };
    backdrop.addEventListener('click', remove);
    document.body.appendChild(backdrop); document.body.appendChild(modal);
    modal.querySelector('[data-act="close"]')?.addEventListener('click', remove);
    const listEl = modal.querySelector('.chart-list') as HTMLElement;
    const errEl = modal.querySelector('.err') as HTMLElement;
    const searchInput = modal.querySelector('.chart-search') as HTMLInputElement;
    const pagerEl = modal.querySelector('.pager') as HTMLElement;
    const prevBtn = pagerEl.querySelector('[data-page="prev"]') as HTMLButtonElement;
    const nextBtn = pagerEl.querySelector('[data-page="next"]') as HTMLButtonElement;
    const pageInfo = pagerEl.querySelector('.page-info') as HTMLElement;
    let sortMode: 'date'|'name' = 'date';
    let filterText = '';
    let page = 1;
    const pageSize = 24;

    const validateState = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return 'State not an object';
      if (!obj.blocks || typeof obj.blocks !== 'object') return 'Missing blocks map';
      if (!obj.connections || typeof obj.connections !== 'object') return 'Missing connections map';
      for (const [id,b] of Object.entries<any>(obj.blocks)) {
        if (!b || typeof b !== 'object') return 'Invalid block entry';
        if (b.id !== id) return 'Block id mismatch';
        if (typeof b.kind !== 'string') return 'Block kind missing';
        if (!b.position || typeof b.position.x !== 'number' || typeof b.position.y !== 'number') return 'Block position invalid';
        if (!b.size || typeof b.size.width !== 'number' || typeof b.size.height !== 'number') return 'Block size invalid';
      }
      for (const [id,c] of Object.entries<any>(obj.connections)) {
        if (!c || typeof c !== 'object') return 'Invalid connection entry';
        if (c.id !== id) return 'Connection id mismatch';
        if (typeof c.source !== 'string' || typeof c.target !== 'string') return 'Connection endpoints invalid';
      }
      return null;
    };

    const buildRows = (entries: any[]) => {
      listEl.innerHTML='';
      if (entries.length === 0) {
        listEl.innerHTML = '<div style="opacity:.7;font-size:12px;">No saved charts.</div>';
        return;
      }
      const many = entries.length > 12 && window.innerWidth > 900;
      if (many) {
        listEl.style.display='grid';
        listEl.style.gridTemplateColumns='1fr 1fr';
      } else {
        listEl.style.display='flex';
        listEl.style.flexDirection='column';
      }
      entries.forEach(entry => {
        const row = document.createElement('div');
        row.className='fc-menu-item';
        row.style.display='flex';
        row.style.alignItems='center';
        row.style.gap='8px';
        row.style.height='auto';
        const loadBtn = document.createElement('button');
        loadBtn.className='fc-btn small';
        loadBtn.textContent='Load';
        const delBtn = document.createElement('button');
        delBtn.className='fc-btn small danger';
        delBtn.textContent='✕';
        const meta = document.createElement('div');
        meta.style.display='flex';
        meta.style.flexDirection='column';
        meta.style.alignItems='flex-start';
        meta.style.flex='1 1 auto';
        const time = new Date(entry.savedAt).toLocaleString();
        meta.innerHTML = `<span style="font-size:12px;">${entry.name}</span><span style="opacity:.6;font-size:10px;">${time}</span>`;
        loadBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          try {
            const app = (window as any).flowchartApp; if (!app) throw new Error('App missing');
            const err = validateState(entry.state);
            if (err) { alert('Invalid saved chart: '+err); return; }
            app.store.dispatch({ type:'BULK_SET_STATE', state: entry.state });
            app['blockManager']?.renderAll();
            app['connectionManager']?.renderAll();
            app['applyViewport']?.();
            app['applyGridOverlay']?.();
            app['undoBegin']?.('load-chart');
            app['undoCommit']?.();
            this.deps.updateStatus('Loaded chart: '+entry.name);
            remove();
          } catch(e:any) {
            alert('Failed to load chart: '+e.message);
          }
        });
        delBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (!confirm(`Delete saved chart "${entry.name}"? This cannot be undone.`)) return;
          list = list.filter(x => x !== entry);
          try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
          render();
        });
        row.appendChild(loadBtn);
        row.appendChild(meta);
        row.appendChild(delBtn);
        listEl.appendChild(row);
      });
    };

    const filterAndSlice = () => {
      if (list.length === 0) { buildRows([]); pagerEl.style.display='none'; return; }
      if (sortMode === 'date') list.sort((a,b)=> new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      else list.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
      const filtered = filterText ? list.filter(e => (e.name||'').toLowerCase().includes(filterText)) : list.slice();
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (page > totalPages) page = totalPages;
      const start = (page-1)*pageSize;
      const pageEntries = filtered.slice(start, start + pageSize);
      buildRows(pageEntries);
      if (filtered.length > pageSize) {
        pagerEl.style.display='flex';
        prevBtn.disabled = page === 1;
        nextBtn.disabled = page === totalPages;
        pageInfo.textContent = `Page ${page} / ${totalPages} (${filtered.length} items)`;
      } else {
        pagerEl.style.display='none';
      }
    };

    const render = () => { filterAndSlice(); };

    modal.querySelectorAll('[data-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        sortMode = (btn as HTMLElement).getAttribute('data-sort') === 'name' ? 'name' : 'date';
        page = 1; render();
      });
    });
    const doFilter = () => { filterText = (searchInput.value||'').trim().toLowerCase(); page = 1; render(); };
    let filterTimer: any;
    searchInput.addEventListener('input', () => { clearTimeout(filterTimer); filterTimer = setTimeout(doFilter, 160); });
    prevBtn.addEventListener('click', ()=> { if (page>1){ page--; render(); } });
    nextBtn.addEventListener('click', ()=> { page++; render(); });

    render();
  }
}
