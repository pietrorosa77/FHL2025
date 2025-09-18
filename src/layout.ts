export interface LayoutRefs {
  root: HTMLElement;
  canvas: HTMLElement;
  status: HTMLElement;
}

export function buildLayout(root: HTMLElement, toolbar: HTMLElement): LayoutRefs {
  root.innerHTML = '';
  root.appendChild(toolbar);
  const workspaceWrapper = document.createElement('div');
  workspaceWrapper.className='fc-workspace-wrapper';
  const canvas = document.createElement('div');
  canvas.className='fc-canvas';
  workspaceWrapper.appendChild(canvas);
  root.appendChild(workspaceWrapper);
  const status = document.createElement('div');
  status.className='fc-status';
  status.id='fc-status';
  status.textContent='Ready';
  root.appendChild(status);
  return { root, canvas, status };
}
