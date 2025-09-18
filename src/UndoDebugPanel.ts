export class UndoDebugPanel {
  private root: HTMLDivElement;
  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'fc-undo-debug';
    this.root.style.cssText = [
      'position:fixed','bottom:8px','right:8px','z-index:9999','font:11px/1.4 monospace',
      'background:var(--fc-bg-alt,rgba(0,0,0,0.7))','color:var(--fc-text,#fff)','padding:6px 8px',
      'border:1px solid var(--fc-border,#444)','border-radius:4px','max-width:220px','box-shadow:0 2px 6px rgba(0,0,0,0.4)'
    ].join(';');
    this.root.innerHTML = '<strong style="font-weight:600;">Undo Debug</strong><div class="fc-ud-body"></div><div class="fc-ud-actions" style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;"></div>';
    const actions = this.root.querySelector('.fc-ud-actions') as HTMLDivElement;
    const btnDump = document.createElement('button'); btnDump.textContent='Dump'; btnDump.style.cssText='flex:1;cursor:pointer;padding:2px 4px;font-size:11px;';
    btnDump.addEventListener('click', ()=> {
      const detail = (window as any).flowchartApp?.undoManager?.getDebugStacks?.();
      console.log('[UndoDebug dump]', detail);
    });
    const btnForce = document.createElement('button'); btnForce.textContent='ForceCap'; btnForce.style.cssText='flex:1;cursor:pointer;padding:2px 4px;font-size:11px;';
    btnForce.addEventListener('click', ()=> {
      (window as any).flowchartApp?.undoManager?.forceCapture?.();
    });
    const btnClear = document.createElement('button'); btnClear.textContent='Clear'; btnClear.style.cssText='flex:1;cursor:pointer;padding:2px 4px;font-size:11px;';
    btnClear.addEventListener('click', ()=> {
      const um = (window as any).flowchartApp?.undoManager; if (!um) return;
      // Not providing a public clear; only for dev: reassign internal arrays
      if (confirm('Clear undo/redo stacks?')) {
        um['undoStack'] = []; um['redoStack'] = []; um['lastVersion'] = (window as any).flowchartApp?.store?.getState().historyVersion || 0;
        window.dispatchEvent(new CustomEvent('fc:undo:debug', { detail: um.getDebugStacks() }));
      }
    });
    actions.append(btnDump, btnForce, btnClear);
    document.body.appendChild(this.root);
    window.addEventListener('fc:undo:debug', (e: any)=> this.render(e.detail));
    // initial state
    setTimeout(()=> {
      const um = (window as any).flowchartApp?.undoManager; if (um) this.render(um.getDebugStacks());
    }, 50);
  }
  private render(detail: any) {
    const body = this.root.querySelector('.fc-ud-body'); if (!body) return;
    body.innerHTML = `
      <div>undoDepth: ${detail.undoDepth}</div>
      <div>redoDepth: ${detail.redoDepth}</div>
      <div>lastVersion: ${detail.lastVersion}</div>
      <div>topUndo: ${detail.topUndo ?? '-'}</div>
      <div>topRedo: ${detail.topRedo ?? '-'}</div>
    `;
  }
}
