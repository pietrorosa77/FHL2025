import { Action, AppState, Block, Connection, ConnectionId, ConnectionStyle, Point, uid } from './types.js';
import { EventBus, EventMap } from './EventBus.js';

interface Deps { dispatch(a: Action): void; getState(): AppState; bus?: EventBus<EventMap>; }

export class ConnectionManager {
	private svg: SVGSVGElement;
	private deps: Deps;
	private root: HTMLElement;
	private hoverConn: ConnectionId | null = null;

	constructor(root: HTMLElement, deps: Deps) {
		this.root = root;
		this.deps = deps;
		this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.svg.classList.add('fc-svg-layer');
		this.root.appendChild(this.svg);
	}

	renderAll() {
		this.svg.innerHTML = '';
		const { connections } = this.deps.getState();
		Object.values(connections).forEach(c => this.renderConnection(c));
	}

	private getSourceAnchor(b: Block): Point {
		const el = document.getElementById(b.id);
		if (el) {
			const w = el.offsetWidth;
			const h = el.offsetHeight;
			return { x: b.position.x + w, y: b.position.y + h / 2 };
		}
		return { x: b.position.x + b.size.width, y: b.position.y + b.size.height / 2 };
	}

	private getTargetAnchor(b: Block): Point {
		const el = document.getElementById(b.id);
		if (el) {
			const h = el.offsetHeight;
			return { x: b.position.x, y: b.position.y + h / 2 };
		}
		return { x: b.position.x, y: b.position.y + b.size.height / 2 };
	}

	private renderConnection(conn: Connection) {
		const state = this.deps.getState();
		const src = state.blocks[conn.source];
		const tgt = state.blocks[conn.target];
		if (!src || !tgt) return;
		const sp = this.getSourceAnchor(src);
		const tp = this.getTargetAnchor(tgt);

		let g = this.svg.querySelector(`[data-id="${conn.id}"]`) as SVGGElement | null;
		let path: SVGPathElement;
		let trash: SVGGElement;
		let labelDiv: HTMLDivElement;
		let fObj: SVGForeignObjectElement;
		const mid: Point = { x: (sp.x + tp.x) / 2, y: (sp.y + tp.y) / 2 };
		if (!g) {
			g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			g.classList.add('fc-conn');
			g.dataset.id = conn.id;
			path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.classList.add('fc-conn-path');
			g.appendChild(path);
			this.addDirectionMarkers(g, sp, tp, conn.style);
			trash = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			trash.classList.add('fc-conn-trash');
			const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			rect.setAttribute('width', '16'); rect.setAttribute('height', '16'); rect.setAttribute('rx', '3');
			const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			line1.setAttribute('x1', '4'); line1.setAttribute('y1', '4'); line1.setAttribute('x2', '12'); line1.setAttribute('y2', '12'); line1.setAttribute('stroke', '#ccc');
			const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			line2.setAttribute('x1', '12'); line2.setAttribute('y1', '4'); line2.setAttribute('x2', '4'); line2.setAttribute('y2', '12'); line2.setAttribute('stroke', '#ccc');
			trash.appendChild(rect); trash.appendChild(line1); trash.appendChild(line2);
			g.appendChild(trash);
			fObj = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
			fObj.setAttribute('width', '140');
			fObj.setAttribute('height', '34');
			labelDiv = document.createElement('div');
			labelDiv.className = 'fc-conn-label fade';
			labelDiv.textContent = conn.label ?? conn.id;
			fObj.appendChild(labelDiv as any);
			g.appendChild(fObj);
			labelDiv.addEventListener('dblclick', (e) => {
				e.stopPropagation();
				this.beginLabelEdit(labelDiv, conn.id, labelDiv.textContent || conn.id);
			});
			labelDiv.addEventListener('mouseenter', () => labelDiv.classList.add('hover')); // increase visibility on hover
			labelDiv.addEventListener('mouseleave', () => labelDiv.classList.remove('hover'));
			// Events
			g.addEventListener('mouseenter', () => path.classList.add('hover'));
			g.addEventListener('mouseleave', () => path.classList.remove('hover'));
			trash.addEventListener('click', (e) => { e.stopPropagation(); this.deleteConnection(conn.id); });
			path.addEventListener('click', (e) => { e.stopPropagation(); this.selectConnection(conn.id); });
			this.svg.appendChild(g);
		} else {
			path = g.querySelector('.fc-conn-path') as SVGPathElement;
			trash = g.querySelector('.fc-conn-trash') as SVGGElement;
			fObj = g.querySelector('foreignObject') as SVGForeignObjectElement;
			labelDiv = fObj.querySelector('.fc-conn-label') as HTMLDivElement;
			labelDiv.textContent = conn.label ?? conn.id;
		}
		path.setAttribute('d', this.buildPath(sp, tp, conn.style));
		trash.setAttribute('transform', `translate(${mid.x - 8}, ${mid.y - 8})`);
		this.updateLabelPosition(fObj, mid);
	}

	private updateLabelPosition(fObj: SVGForeignObjectElement, mid: Point) {
		const labelOffsetX = -50;
		const labelOffsetY = -28;
		fObj.setAttribute('x', String(mid.x + labelOffsetX));
		fObj.setAttribute('y', String(mid.y + labelOffsetY));
	}

	private beginLabelEdit(el: HTMLElement, id: ConnectionId, original: string) {
		if (el.isContentEditable) return;
		el.setAttribute('contenteditable', 'true');
		el.classList.add('editing');
		el.classList.remove('fade');
		el.focus();
		const range = document.createRange();
		range.selectNodeContents(el);
		range.collapse(false);
		const sel = window.getSelection();
		if (sel) { sel.removeAllRanges(); sel.addRange(range); }
		const finish = (cancel: boolean) => {
			el.contentEditable = 'false';
			el.classList.remove('editing');
			el.classList.add('fade');
			if (!cancel) {
				this.deps.dispatch({ type: 'UPDATE_CONNECTION', id, patch: { label: el.textContent || '' } });
			} else {
				el.textContent = original;
			}
		};
		const keyHandler = (ev: KeyboardEvent) => {
			if (ev.key === 'Enter') { ev.preventDefault(); finish(false); cleanup(); }
			else if (ev.key === 'Escape') { ev.preventDefault(); finish(true); cleanup(); }
		};
		const blurHandler = () => { finish(false); cleanup(); };
		const cleanup = () => {
			el.removeEventListener('keydown', keyHandler);
			el.removeEventListener('blur', blurHandler);
		};
		el.addEventListener('keydown', keyHandler);
		el.addEventListener('blur', blurHandler, { once: true });
	}

	private addDirectionMarkers(group: SVGGElement, sp: Point, tp: Point, style: ConnectionStyle) {
		const markers = 3; // number of markers excluding final head
		for (let i=1; i<=markers; i++) {
			const t = i/(markers+1);
			const p = this.pointOnPath(sp, tp, style, t);
			const nxt = this.pointOnPath(sp, tp, style, Math.min(t+0.01, 1));
			const poly = this.buildDirectionPolygon(p, nxt, 9);
			group.appendChild(poly);
		}
		// Final arrowhead at endpoint
		const head = this.buildDirectionPolygon({x: tp.x, y: tp.y}, tp, 12, true, sp);
		group.appendChild(head);
	}

	private pointOnPath(sp: Point, tp: Point, style: ConnectionStyle, t: number): Point {
		if (style === 'orthogonal') {
			// Piecewise linear: sp -> midX,sp.y -> midX,tp.y -> tp
			const midX = (sp.x + tp.x) / 2;
			// lengths
			const seg1 = Math.abs(midX - sp.x);
			const seg2 = Math.abs(tp.y - sp.y);
			const seg3 = Math.abs(tp.x - midX);
			const total = seg1 + seg2 + seg3;
			let d = t * total;
			if (d <= seg1) {
				return { x: sp.x + (midX - sp.x) * (d/seg1), y: sp.y };
			}
			d -= seg1;
			if (d <= seg2) {
				return { x: midX, y: sp.y + (tp.y - sp.y) * (d/seg2) };
			}
			d -= seg2;
			return { x: midX + (tp.x - midX) * (d/seg3), y: tp.y };
		}
		// Bezier
		const dx = (tp.x - sp.x) * 0.5;
		const c1 = { x: sp.x + dx, y: sp.y };
		const c2 = { x: tp.x - dx, y: tp.y };
		// Cubic Bezier formula
		const u = 1 - t;
		const x = u*u*u*sp.x + 3*u*u*t*c1.x + 3*u*t*t*c2.x + t*t*t*tp.x;
		const y = u*u*u*sp.y + 3*u*u*t*c1.y + 3*u*t*t*c2.y + t*t*t*tp.y;
		return { x, y };
	}

	private buildDirectionPolygon(p: Point, nxt: Point, size: number, solidHead=false, src?: Point): SVGPolygonElement {
		const angle = Math.atan2(nxt.y - p.y, nxt.x - p.x);
		const len = size;
		const w = len * 0.6;
		// Triangle pointing from p toward nxt
		const tipX = p.x + Math.cos(angle) * len;
		const tipY = p.y + Math.sin(angle) * len;
		const leftX = p.x + Math.cos(angle + Math.PI/2) * w/2;
		const leftY = p.y + Math.sin(angle + Math.PI/2) * w/2;
		const rightX = p.x + Math.cos(angle - Math.PI/2) * w/2;
		const rightY = p.y + Math.sin(angle - Math.PI/2) * w/2;
		const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		poly.classList.add('fc-conn-dir');
		poly.setAttribute('points', `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`);
		if (solidHead) poly.classList.add('fc-conn-arrow');
		return poly;
	}

	private buildPath(sp: Point, tp: Point, style: ConnectionStyle): string {
		if (style === 'orthogonal') {
			const midX = (sp.x + tp.x) / 2;
			return `M ${sp.x} ${sp.y} L ${midX} ${sp.y} L ${midX} ${tp.y} L ${tp.x} ${tp.y}`;
		}
		// default bezier
		const dx = (tp.x - sp.x) * 0.5;
		const c1x = sp.x + dx;
		const c2x = tp.x - dx;
		return `M ${sp.x} ${sp.y} C ${c1x} ${sp.y}, ${c2x} ${tp.y}, ${tp.x} ${tp.y}`;
	}

	private buildArrow(sp: Point, tp: Point): SVGPathElement {
		const angle = Math.atan2(tp.y - sp.y, tp.x - sp.x);
		const size = 10;
		const ax = tp.x - Math.cos(angle) * 12;
		const ay = tp.y - Math.sin(angle) * 12;
		const p1x = ax + Math.cos(angle + Math.PI / 2) * size * 0.4;
		const p1y = ay + Math.sin(angle + Math.PI / 2) * size * 0.4;
		const p2x = ax + Math.cos(angle - Math.PI / 2) * size * 0.4;
		const p2y = ay + Math.sin(angle - Math.PI / 2) * size * 0.4;
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.classList.add('fc-conn-arrow');
		path.setAttribute('d', `M ${tp.x} ${tp.y} L ${p1x} ${p1y} L ${p2x} ${p2y} Z`);
		return path;
	}

	addConnection(source: string, target: string): string | undefined {
		if (source === target) return;
		const state = this.deps.getState();
		// prevent duplicate
		if (Object.values(state.connections).some(c => c.source === source && c.target === target)) return;
		const newId = uid('conn');
		const conn: Connection = { id: newId, source, target, style: state.connectionStyle, label: newId };
		this.deps.dispatch({ type: 'ADD_CONNECTION', connection: conn });
		this.deps.bus?.emit('connection:added', { id: conn.id, sourceId: source, targetId: target });
		return conn.id;
	}

	deleteConnection(id: ConnectionId) {
		this.deps.dispatch({ type: 'DELETE_CONNECTION', id });
		// full rerender handled externally
	}

	updateConnectionsForBlock(blockId: string) {
		// Rerender all connections that involve block
		const state = this.deps.getState();
		const related = Object.values(state.connections).filter(c => c.source === blockId || c.target === blockId);
		related.forEach(c => this.svg.querySelector(`[data-id="${c.id}"]`)?.remove());
		related.forEach(c => this.renderConnection(c));
	}

	selectConnection(id: ConnectionId) {
		const state = this.deps.getState();
		if (!state.connections[id]) return;
		this.deps.dispatch({ type: 'SELECT_CONNECTION', id });
		this.svg.querySelectorAll('.fc-conn').forEach(g => g.classList.remove('selected'));
		this.svg.querySelector(`[data-id="${id}"]`)?.classList.add('selected');
	}
}

