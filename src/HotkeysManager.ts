import { IHotkeysManager } from './interfaces.js';

export class HotkeysManager implements IHotkeysManager {
  constructor(private undo: ()=>void, private redo: ()=>void) {}
  attach() {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo(); }
      else if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) { e.preventDefault(); this.redo(); }
    });
  }
}
