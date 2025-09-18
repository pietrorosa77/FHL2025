import { ToolbarDeps } from '../Toolbar.js';

export class ArrangeMenu {
  constructor(private deps: ToolbarDeps) {}

  buildItems() {
    return [
      { label:'Align Left', action: ()=> this.deps.arrange('align-left') },
      { label:'Align Center', action: ()=> this.deps.arrange('align-center') },
      { label:'Align Right', action: ()=> this.deps.arrange('align-right') },
      { label:'Align Top', action: ()=> this.deps.arrange('align-top') },
      { label:'Align Middle', action: ()=> this.deps.arrange('align-middle') },
      { label:'Align Bottom', action: ()=> this.deps.arrange('align-bottom') },
      { label:'---', action: ()=> {} },
      { label:'Distribute Horizontal', action: ()=> this.deps.arrange('dist-h') },
      { label:'Distribute Vertical', action: ()=> this.deps.arrange('dist-v') }
    ];
  }
}
