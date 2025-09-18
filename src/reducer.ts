import { AppState, Action, Connection } from './types.js';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from './config.js';

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_BLOCK': {
      return { ...state, blocks: { ...state.blocks, [action.block.id]: action.block }, historyVersion: state.historyVersion + 1 };
    }
    case 'UPDATE_BLOCK': {
      const existing = state.blocks[action.id];
      if (!existing) return state;
      return { ...state, blocks: { ...state.blocks, [action.id]: { ...existing, ...action.patch } }, historyVersion: state.historyVersion + 1 };
    }
    case 'MOVE_BLOCK': {
      const blk = state.blocks[action.id];
      if (!blk) return state;
      let pos = action.position;
      if (state.grid?.enabled && state.grid.snap) {
        const size = state.grid.size || 20;
        pos = { x: Math.round(pos.x / size) * size, y: Math.round(pos.y / size) * size };
      }
  const CANVAS_W = DEFAULT_CANVAS_WIDTH;
  const CANVAS_H = DEFAULT_CANVAS_HEIGHT;
      let maxX = CANVAS_W - blk.size.width; if (maxX < 0) maxX = 0;
      let maxY = CANVAS_H - blk.size.height; if (maxY < 0) maxY = 0;
      if (pos.x < 0) pos = { ...pos, x: 0 }; else if (pos.x > maxX) pos = { ...pos, x: maxX };
      if (pos.y < 0) pos = { ...pos, y: 0 }; else if (pos.y > maxY) pos = { ...pos, y: maxY };
      if (blk.position.x === pos.x && blk.position.y === pos.y) return state; // no movement
      return { ...state, blocks: { ...state.blocks, [action.id]: { ...blk, position: pos } }, historyVersion: state.historyVersion + 1 };
    }
    case 'DELETE_BLOCK': {
      if (!state.blocks[action.id]) return state;
      const { [action.id]: _, ...rest } = state.blocks;
      const filteredConns: Record<string, Connection> = {};
      Object.values(state.connections).forEach(c => { if (c.source !== action.id && c.target !== action.id) filteredConns[c.id] = c; });
      const ms = state.multiSelect ? state.multiSelect.filter(id => id !== action.id) : [];
      return { ...state, blocks: rest, connections: filteredConns, selection: {}, multiSelect: ms, historyVersion: state.historyVersion + 1 };
    }
    case 'ADD_CONNECTION': {
      return { ...state, connections: { ...state.connections, [action.connection.id]: action.connection }, historyVersion: state.historyVersion + 1 };
    }
    case 'UPDATE_CONNECTION': {
      const existing = state.connections[action.id];
      if (!existing) return state;
      return { ...state, connections: { ...state.connections, [action.id]: { ...existing, ...action.patch } }, historyVersion: state.historyVersion + 1 };
    }
    case 'DELETE_CONNECTION': {
      const { [action.id]: __, ...rest } = state.connections;
      return { ...state, connections: rest, selection: state.selection.connectionId === action.id ? {} : state.selection, historyVersion: state.historyVersion + 1 };
    }
    case 'SET_CONNECTION_STYLE': {
      if (state.connectionStyle === action.style) return state;
      const updatedConns: Record<string, Connection> = {};
      Object.values(state.connections).forEach(c => { updatedConns[c.id] = { ...c, style: action.style }; });
      return { ...state, connectionStyle: action.style, connections: updatedConns, historyVersion: state.historyVersion + 1 };
    }
    case 'START_CONNECTION_DRAFT': {
      return { ...state, connectionDraft: { sourceBlock: action.sourceBlock, currentPoint: action.point } };
    }
    case 'UPDATE_CONNECTION_DRAFT': {
      if (!state.connectionDraft) return state;
      return { ...state, connectionDraft: { ...state.connectionDraft, currentPoint: action.point } };
    }
    case 'CANCEL_CONNECTION_DRAFT': {
      const { connectionDraft, ...rest } = state;
      return { ...rest } as AppState;
    }
    case 'SELECT_BLOCK': {
      return { ...state, selection: { blockId: action.id } };
    }
    case 'SELECT_CONNECTION': {
      return { ...state, selection: { connectionId: action.id } };
    }
    case 'SET_MULTI_SELECT': {
      return { ...state, multiSelect: [...action.ids] };
    }
    case 'SET_VIEWPORT': {
      return { ...state, viewport: { ...state.viewport, ...action.viewport } };
    }
    case 'SET_GRID': {
      const current = state.grid || { enabled: false, size: 20, snap: true };
      return { ...state, grid: { enabled: action.grid.enabled ?? current.enabled, size: action.grid.size ?? current.size, snap: action.grid.snap ?? current.snap } };
    }
    case 'INCREMENT_HISTORY': {
      return { ...state, historyVersion: state.historyVersion + 1 };
    }
    case 'BULK_SET_STATE': {
      return { ...state, ...action.state };
    }
    case 'MULTIDRAG_BLOCKS': {
      if (!action.changes.length) return state;
      // Snap first, then compute group bounding box and adjust as one.
      const CANVAS_W = DEFAULT_CANVAS_WIDTH;
      const CANVAS_H = DEFAULT_CANVAS_HEIGHT;
      const updated: typeof state.blocks = { ...state.blocks };
      const snapped: { id:string; pos:{x:number;y:number}; size:{w:number;h:number} }[] = [];
      for (const ch of action.changes) {
        const blk = updated[ch.id]; if (!blk) continue;
        let pos = ch.position;
        if (state.grid?.enabled && state.grid.snap) {
          const size = state.grid.size || 20;
          pos = { x: Math.round(pos.x / size) * size, y: Math.round(pos.y / size) * size };
        }
        snapped.push({ id: ch.id, pos: { x: pos.x, y: pos.y }, size: { w: blk.size.width, h: blk.size.height } });
      }
      if (!snapped.length) return state;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const s of snapped) {
        if (s.pos.x < minX) minX = s.pos.x;
        if (s.pos.y < minY) minY = s.pos.y;
        if (s.pos.x + s.size.w > maxX) maxX = s.pos.x + s.size.w;
        if (s.pos.y + s.size.h > maxY) maxY = s.pos.y + s.size.h;
      }
      let adjustX = 0, adjustY = 0;
      if (minX < 0) adjustX = -minX; if (minY < 0) adjustY = -minY;
      if (maxX + adjustX > CANVAS_W) adjustX += (CANVAS_W - (maxX + adjustX));
      if (maxY + adjustY > CANVAS_H) adjustY += (CANVAS_H - (maxY + adjustY));
      let changed = false;
      for (const s of snapped) {
        const blk = updated[s.id]; if (!blk) continue;
        const nx = s.pos.x + adjustX;
        const ny = s.pos.y + adjustY;
        if (blk.position.x === nx && blk.position.y === ny) continue;
        updated[s.id] = { ...blk, position: { x: nx, y: ny } };
        changed = true;
      }
      if (!changed) return state;
      return { ...state, blocks: updated, historyVersion: state.historyVersion + 1 };
    }
    default:
      return state;
  }
}
