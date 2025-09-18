import { initialState, Action, AppState } from './types.js';
import { reducer } from './reducer.js';

export class Store {
  private state: AppState = initialState();
  private listeners = new Set<() => void>();
  dispatch(action: Action) { this.state = reducer(this.state, action); this.listeners.forEach(l => l()); }
  getState() { return this.state; }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  replaceState(next: AppState) { this.state = next; this.listeners.forEach(l => l()); }
}
