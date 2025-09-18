// Core Types & State Management

export interface Point { x: number; y: number; }
export interface Size { width: number; height: number; }

export type BlockId = string;
export type ConnectionId = string;

export type BlockKind = 'start' | 'process' | 'decision' | 'io' | 'end';

export interface Block {
	id: BlockId;
	kind: BlockKind;
	position: Point;
	size: Size;
	title: string;
	descriptionHtml: string; // editable HTML region
	properties: Record<string, any>; // JSON object
}

export type ConnectionStyle = 'bezier' | 'orthogonal';

export interface Connection {
	id: ConnectionId;
	source: BlockId;
	target: BlockId;
	style: ConnectionStyle;
	label?: string; // editable label text stored separately from id
}

export interface ViewportState {
	scale: number; // zoom factor
	offset: Point; // panning offset
	bounds: { minScale: number; maxScale: number };
}

export interface AppState {
	blocks: Record<BlockId, Block>;
	connections: Record<ConnectionId, Connection>;
	selection: { blockId?: BlockId; connectionId?: ConnectionId };
	multiSelect?: BlockId[]; // multiple selected block ids (includes primary if present)
	viewport: ViewportState;
	connectionDraft?: { sourceBlock: BlockId; currentPoint: Point };
	connectionStyle: ConnectionStyle;
	grid?: { enabled: boolean; size: number; snap: boolean };
	historyVersion: number; // increments each mutating action for potential undo batching
}

export const initialState = (): AppState => ({
	blocks: {},
	connections: {},
	selection: {},
	multiSelect: [],
	viewport: { scale: 1, offset: { x: 0, y: 0 }, bounds: { minScale: 0.25, maxScale: 3 } },
	connectionStyle: 'bezier',
	grid: { enabled: true, size: 20, snap: true },
	historyVersion: 0
});

// Actions
export type Action =
	| { type: 'ADD_BLOCK'; block: Block }
	| { type: 'UPDATE_BLOCK'; id: BlockId; patch: Partial<Omit<Block, 'id'>> }
	| { type: 'MOVE_BLOCK'; id: BlockId; position: Point }
	| { type: 'DELETE_BLOCK'; id: BlockId }
	| { type: 'ADD_CONNECTION'; connection: Connection }
	| { type: 'UPDATE_CONNECTION'; id: ConnectionId; patch: Partial<Omit<Connection, 'id'>> }
	| { type: 'DELETE_CONNECTION'; id: ConnectionId }
	| { type: 'SET_CONNECTION_STYLE'; style: ConnectionStyle }
	| { type: 'START_CONNECTION_DRAFT'; sourceBlock: BlockId; point: Point }
	| { type: 'UPDATE_CONNECTION_DRAFT'; point: Point }
	| { type: 'CANCEL_CONNECTION_DRAFT' }
	| { type: 'SELECT_BLOCK'; id?: BlockId }
	| { type: 'SELECT_CONNECTION'; id?: ConnectionId }
	| { type: 'SET_MULTI_SELECT'; ids: BlockId[] }
	| { type: 'SET_VIEWPORT'; viewport: Partial<ViewportState> }
	| { type: 'SET_GRID'; grid: Partial<{ enabled: boolean; size: number; snap: boolean }> }
	| { type: 'INCREMENT_HISTORY' }
	| { type: 'BULK_SET_STATE'; state: Partial<AppState> }
	| { type: 'MULTIDRAG_BLOCKS'; changes: { id: BlockId; position: Point }[] };


// Simple EventBus
export type EventHandler = (payload?: any) => void;
export class EventBus {
	private listeners = new Map<string, Set<EventHandler>>();
	on(evt: string, handler: EventHandler) { if (!this.listeners.has(evt)) this.listeners.set(evt, new Set()); this.listeners.get(evt)!.add(handler); }
	off(evt: string, handler: EventHandler) { this.listeners.get(evt)?.delete(handler); }
	emit(evt: string, payload?: any) { this.listeners.get(evt)?.forEach(h => h(payload)); }
	clear() { this.listeners.clear(); }
}

// Utilities
export const uid = (p = 'id'): string => `${p}_${Math.random().toString(36).slice(2, 10)}`;
export function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

