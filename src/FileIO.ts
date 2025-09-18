import { Store } from './Store.js';
import { IFileIO } from './interfaces.js';

export class FileIO implements IFileIO {
  constructor(private store: Store, private statusCb: (msg: string)=>void) {}

  exportJSON() {
    const data = JSON.stringify(this.store.getState(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'flowchart.json'; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 0);
    this.statusCb('Exported JSON');
  }

  importJSON() {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='.json';
    inp.onchange = () => {
      const file = inp.files?.[0]; if (!file) return;
      file.text().then(t => {
        try { const parsed = JSON.parse(t); this.store.dispatch({ type:'BULK_SET_STATE', state: parsed }); this.statusCb('Imported'); }
        catch { alert('Invalid JSON'); }
      });
    };
    inp.click();
  }
}
