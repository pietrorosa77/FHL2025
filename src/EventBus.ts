export type EventMap = {
  'viewport:change': { scale: number; offset: {x:number;y:number} };
  'connection:draft:start': { sourceId: string };
  'connection:draft:end': { sourceId: string; canceled: boolean; targetId?: string };
  'connection:added': { id: string; sourceId: string; targetId: string };
  'block:drag:start': { id: string };
  'block:drag:end': { id: string; position: { x:number;y:number } };
};

type Handler<T> = (payload: T) => void;

export class EventBus<E extends Record<string, any>> {
  private handlers: { [K in keyof E]?: Set<Handler<E[K]>> } = {};
  on<K extends keyof E>(evt: K, handler: Handler<E[K]>) { (this.handlers[evt] ||= new Set()).add(handler); return () => this.off(evt, handler); }
  off<K extends keyof E>(evt: K, handler: Handler<E[K]>) { this.handlers[evt]?.delete(handler); }
  emit<K extends keyof E>(evt: K, payload: E[K]) { this.handlers[evt]?.forEach(h => h(payload)); }
}
