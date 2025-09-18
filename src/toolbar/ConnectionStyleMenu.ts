import { ToolbarDeps } from '../Toolbar.js';

export class ConnectionStyleMenu {
  constructor(private deps: ToolbarDeps) {}
  buildItems() {
    return [
      { label:'Bezier', action: ()=> { this.deps.setConnectionStyle('bezier'); this.deps.updateStatus('Style: bezier'); } },
      { label:'Orthogonal', action: ()=> { this.deps.setConnectionStyle('orthogonal'); this.deps.updateStatus('Style: orthogonal'); } }
    ];
  }
}
