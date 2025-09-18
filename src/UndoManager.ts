import { AppState } from './types.js';
import { Store } from './Store.js';

interface UndoSnapshotMeta { label: string; } // extendable

export class UndoManager {
  private store: Store;
  private undoStack: { state: AppState; meta: UndoSnapshotMeta }[] = [];
  private redoStack: { state: AppState; meta: UndoSnapshotMeta }[] = [];
  private opBaseline: AppState | null = null;
  private opLabel = '';
  constructor(store: Store) { this.store = store; }

  // Operation lifecycle -----------------------------------------------------
  begin(label: string) {
    if (this.opBaseline) return; // already in op
    this.opBaseline = structuredClone(this.store.getState());
    this.opLabel = label;
  }

  commitIfChanged() {
    if (!this.opBaseline) return;
    const current = this.store.getState();
    if (!this.statesEqual(this.opBaseline, current)) {
      this.undoStack.push({ state: this.opBaseline, meta: { label: this.opLabel } });
      this.redoStack.length = 0;
      this.emitDebug();
    }
    this.opBaseline = null; this.opLabel='';
  }

  cancel() { this.opBaseline = null; this.opLabel=''; }

  // Equality on structural slices only
  private statesEqual(a: AppState, b: AppState) {
    return JSON.stringify({blocks:a.blocks,connections:a.connections,viewport:a.viewport,grid:a.grid,style:a.connectionStyle}) ===
           JSON.stringify({blocks:b.blocks,connections:b.connections,viewport:b.viewport,grid:b.grid,style:b.connectionStyle});
  }

  // Legacy method shims (for tests/external code not yet migrated) ---------
  captureIfChanged() { /* no-op in new model */ }
  forceCapture() { if (!this.opBaseline) { this.begin('legacy'); this.commitIfChanged(); } }
  captureCurrent() { this.commitIfChanged(); }

  // Traversal ---------------------------------------------------------------
  undo() {
    if (this.opBaseline) { // abort active op (treat as not committed)
      this.cancel();
    }
    if (this.undoStack.length === 0) return false;
    const snapshot = this.undoStack.pop()!;
    const current = structuredClone(this.store.getState());
    this.redoStack.push({ state: current, meta: { label: snapshot.meta.label } });
    this.store.replaceState(structuredClone(snapshot.state));
    this.emitDebug();
    return true;
  }

  redo() {
    if (this.opBaseline) { this.cancel(); }
    if (this.redoStack.length === 0) return false;
    const snapshot = this.redoStack.pop()!;
    const current = structuredClone(this.store.getState());
    this.undoStack.push({ state: current, meta: { label: snapshot.meta.label } });
    this.store.replaceState(structuredClone(snapshot.state));
    this.emitDebug();
    return true;
  }

  run(label: string, fn: () => void) {
    this.begin(label);
    try { fn(); } finally { this.commitIfChanged(); }
  }

  // Debug ------------------------------------------------------------------
  getDebugStacks() {
    return {
      undoDepth: this.undoStack.length,
      redoDepth: this.redoStack.length,
      opActive: !!this.opBaseline,
      opLabel: this.opLabel,
      lastUndoLabel: this.undoStack[this.undoStack.length-1]?.meta.label,
      lastRedoLabel: this.redoStack[this.redoStack.length-1]?.meta.label
    };
  }
  private emitDebug() { window.dispatchEvent(new CustomEvent('fc:undo:debug', { detail: this.getDebugStacks() })); }
}
