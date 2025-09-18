export interface AutoCreatePopupDeps {
  createBlock(kind: string, pos: {x:number;y:number}): void;
  addConnection(source: string, target: string): void;
  getBlocks(): Record<string, any>;
}

export class AutoCreatePopup {
  private deps: AutoCreatePopupDeps;
  constructor(deps: AutoCreatePopupDeps) { this.deps = deps; }

  show(sourceId: string, at: { x:number; y:number }) {
    const kinds = [
      { kind: 'process', label: 'Process' },
      { kind: 'decision', label: 'Decision' },
      { kind: 'io', label: 'I/O' },
      { kind: 'end', label: 'End' }
    ];
    const popup = document.createElement('div');
    popup.className = 'fc-auto-popup fade-in';
    popup.innerHTML = `
      <div class="fc-auto-header">Create block?<button class="fc-close" aria-label="Close">✕</button></div>
      <div class="fc-auto-body">
        <p style="margin:0 0 6px; font-size:12px; opacity:.8;">Add a new block here and connect from source.</p>
        <div class="fc-auto-list"></div>
        <div class="fc-auto-actions">
          <button class="fc-btn fc-cancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    const list = popup.querySelector('.fc-auto-list') as HTMLElement;
    kinds.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'fc-btn kind';
      btn.textContent = k.label;
      btn.addEventListener('click', () => {
        const newPos = { x: at.x, y: at.y - 40 };
        this.deps.createBlock(k.kind, newPos);
        const blocks = this.deps.getBlocks();
        let newBlockId: string | null = null;
        for (const bId of Object.keys(blocks)) {
          const b = blocks[bId];
            if (Math.abs(b.position.x - newPos.x) < 2 && Math.abs(b.position.y - newPos.y) < 2) { newBlockId = bId; }
        }
        if (newBlockId) {
          this.deps.addConnection(sourceId, newBlockId);
        }
        popup.remove();
      });
      list.appendChild(btn);
    });
    popup.querySelector('.fc-cancel')?.addEventListener('click', () => popup.remove());
    popup.querySelector('.fc-close')?.addEventListener('click', () => popup.remove());
  }
}
