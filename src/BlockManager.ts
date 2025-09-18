import { Action, Block, BlockId, BlockKind, Point, Size, uid } from './types.js';
import { JsonEditor } from './JsonEditor.js';
import { EventBus, EventMap } from './EventBus.js';
import { WysiwygEditor } from './WysiwygEditor.js';

interface BlockManagerDeps {
	dispatch(a: Action): void;
	getState(): any;
	bus?: EventBus<EventMap>;
}

export class BlockManager {
	private root: HTMLElement;
	private deps: BlockManagerDeps;
	private rafDragging = false;
	private dragRafHandle: number | null = null;
	private dragContext: null | { id: BlockId; offset: Point; initialPositions: Record<string, Point> } = null;
	private resizeObserver: ResizeObserver;
	private observed = new Set<string>();

	constructor(root: HTMLElement, deps: BlockManagerDeps) {
		this.root = root;
		this.deps = deps;
		this.resizeObserver = new ResizeObserver(entries => {
			for (const entry of entries) {
				const el = entry.target as HTMLElement;
				const id = el.id;
				if (!id || !this.observed.has(id)) continue;
				const state = this.deps.getState();
				const blk = state.blocks[id] as Block | undefined;
				if (!blk) continue;
				const newW = Math.round(entry.contentRect.width);
				const newH = Math.round(entry.contentRect.height);
				if (newW !== blk.size.width || newH !== blk.size.height) {
					this.deps.dispatch({ type: 'UPDATE_BLOCK', id, patch: { size: { width: newW, height: newH } } });
				}
			}
		});
	}

	createBlock(kind: BlockKind, position: Point) {
		const block: Block = {
			id: uid('blk'),
			kind,
			position,
			size: { width: 170, height: 100 },
			title: kind.charAt(0).toUpperCase() + kind.slice(1),
			descriptionHtml: '<p>Description...</p>',
			properties: {}
		};
		this.deps.dispatch({ type: 'ADD_BLOCK', block });
		this.renderBlock(block);
		// Fallback: if caller did not wrap in undo run, attempt to commit operation (legacy safety)
		queueMicrotask(()=> (this.deps as any).undoCommit?.());
	}

	renderAll() {
		// Clear existing
		this.root.querySelectorAll('.fc-block').forEach(el => el.remove());
		const { blocks } = this.deps.getState();
		(Object.values(blocks) as Block[]).forEach(b => this.renderBlock(b));
	}

	private renderBlock(block: Block) {
		let el = document.getElementById(block.id) as HTMLElement | null;
		if (!el) {
			el = document.createElement('div');
			el.id = block.id;
			el.className = 'fc-block';
			el.dataset.type = block.kind;
			el.innerHTML = `
				<div class="fc-block-header">
					<div class="fc-block-title"></div>
					<div class="fc-block-actions">
						<button class="fc-icon-btn fc-props-btn" title="Edit block" aria-label="Edit block">⚙</button>
						<button class="fc-icon-btn fc-del-btn" title="Delete block" aria-label="Delete block">✕</button>
					</div>
				</div>
				<div class="fc-block-desc"></div>
				<div class="fc-anchor" title="Drag to connect"></div>
			`;
			this.root.appendChild(el);
			this.attachBlockEvents(el, block.id);
		}
		el.style.left = block.position.x + 'px';
		el.style.top = block.position.y + 'px';
		(el.querySelector('.fc-block-title') as HTMLElement).textContent = block.title;
		(el.querySelector('.fc-block-desc') as HTMLElement).innerHTML = block.descriptionHtml;
		// Ensure observed for size changes
		if (!this.observed.has(block.id)) {
			this.resizeObserver.observe(el);
			this.observed.add(block.id);
		}
	}

	updateBlock(block: Block) {
		this.renderBlock(block);
	}

	removeBlock(id: BlockId) {
		const el = document.getElementById(id);
		if (el) {
			this.resizeObserver.unobserve(el);
			this.observed.delete(id);
			el.remove();
		}
	}

	private attachBlockEvents(el: HTMLElement, id: BlockId) {
		const titleEl = el.querySelector('.fc-block-title') as HTMLElement;
		const descEl = el.querySelector('.fc-block-desc') as HTMLElement;
		const propsBtn = el.querySelector('.fc-props-btn') as HTMLButtonElement;
		const delBtn = el.querySelector('.fc-del-btn') as HTMLButtonElement;

		// Selection (supports multi-select with Shift or toggle with Ctrl/Meta)
		el.addEventListener('mousedown', (e) => {
			if ((e.target as HTMLElement).closest('.fc-anchor')) return; // connection handled elsewhere
			const state = this.deps.getState();
			const multi = state.multiSelect as string[] | undefined;
			const toggle = e.ctrlKey || e.metaKey; // toggle selection membership
			// Guard: if a true multi-selection (>1) exists, ignore plain clicks (no collapse)
			if (multi && multi.length > 1 && !toggle && !e.shiftKey) {
				return; // preserve existing multi-selection
			}
			const additive = e.shiftKey; // add to selection (only when no existing multi or user explicitly using shift)
			this.selectBlock(id, additive, toggle);
		});

		// Drag start (single or multi-drag)
		el.addEventListener('pointerdown', (e) => {
			if ((e.target as HTMLElement).isContentEditable) return;
			if ((e.target as HTMLElement).closest('button')) return;
			if ((e.target as HTMLElement).closest('.fc-anchor')) return;
			const rect = el.getBoundingClientRect();
			// Determine selection set for drag; ensure at least this block
			const state = this.deps.getState();
			let selected: string[] = state.multiSelect && state.multiSelect.length ? state.multiSelect : [id];
			if (!selected.includes(id)) selected = [id];
			const initialPositions: Record<string, Point> = {};
			selected.forEach(bid => { const b = state.blocks[bid]; if (b) initialPositions[bid] = { ...b.position }; });
			this.dragContext = { id, offset: { x: e.clientX - rect.left, y: e.clientY - rect.top }, initialPositions };
			el.classList.add('dragging');
				(this.deps as any).undoBegin?.('move-block');
			this.deps.bus?.emit('block:drag:start', { id });
			window.addEventListener('pointermove', this.onPointerMove);
			window.addEventListener('pointerup', this.onPointerUp, { once: true });
		});

		// Double click to edit title
		titleEl.addEventListener('dblclick', (e) => {
			e.stopPropagation();
			this.beginEdit(titleEl, 'title', id);
		});
		// Double click to edit description
		descEl.addEventListener('dblclick', (e) => {
			e.stopPropagation();
			this.beginEdit(descEl, 'descriptionHtml', id, true);
		});

		propsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.openPropertiesEditor(id);
		});

		delBtn.addEventListener('click', (e) => {
			e.stopPropagation();
				(this.deps as any).undoBegin?.('delete-block');
			this.deps.dispatch({ type: 'DELETE_BLOCK', id });
			this.removeBlock(id);
				(this.deps as any).undoCommit?.();
		});
	}

private selectBlock(id: BlockId, additive = false, toggle = false) {
	const state = this.deps.getState();
	let current: string[] = state.multiSelect || [];
	if (!additive && !toggle) {
		current = [id];
	} else if (toggle) {
		if (current.includes(id)) current = current.filter(b=> b!==id); else current = [...current, id];
	} else if (additive) {
		if (!current.includes(id)) current = [...current, id];
	}
	this.deps.dispatch({ type: 'SELECT_BLOCK', id });
	this.deps.dispatch({ type: 'SET_MULTI_SELECT', ids: current });
	this.root.querySelectorAll('.fc-block').forEach(b => b.classList.remove('selected'));
	current.forEach(bid => document.getElementById(bid)?.classList.add('selected'));
}

	private onPointerMove = (e: PointerEvent) => {
		if (!this.dragContext) return;
		if (!this.rafDragging) {
			this.rafDragging = true;
			this.dragRafHandle = requestAnimationFrame(() => {
				this.rafDragging = false;
				const ctx = this.dragContext; // capture current drag context
				if (!ctx) return; // drag may have ended before RAF executed
				const state = this.deps.getState();
				const blk = state.blocks[ctx.id] as Block | undefined;
				if (!blk) return;
				const canvasRect = this.root.getBoundingClientRect();
				const vp = state.viewport;
				const localX = (e.clientX - canvasRect.left) / vp.scale;
				const localY = (e.clientY - canvasRect.top) / vp.scale;
				const canvasW = this.root.clientWidth || parseInt((this.root as HTMLElement).getAttribute('data-test-width')||'0',10) || 1200;
				const canvasH = this.root.clientHeight || parseInt((this.root as HTMLElement).getAttribute('data-test-height')||'0',10) || 800;
				const originalPrimary = ctx.initialPositions[ctx.id];
				let dx = (localX - ctx.offset.x) - originalPrimary.x;
				let dy = (localY - ctx.offset.y) - originalPrimary.y;
				const ids = Object.keys(ctx.initialPositions);
				if (ids.length > 1) {
					// Compute group bounding box after applying tentative delta
					let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
					for (const bid of ids) {
						const ip = ctx.initialPositions[bid];
						const b = state.blocks[bid]; if (!b) continue;
						const nx = ip.x + dx; const ny = ip.y + dy;
						if (nx < minX) minX = nx;
						if (ny < minY) minY = ny;
						if (nx + b.size.width > maxX) maxX = nx + b.size.width;
						if (ny + b.size.height > maxY) maxY = ny + b.size.height;
					}
					// Adjust delta so entire group stays within canvas
					if (minX < 0) dx += -minX;
					if (minY < 0) dy += -minY;
					if (maxX > canvasW) dx += (canvasW - maxX);
					if (maxY > canvasH) dy += (canvasH - maxY);
				} else {
					// Single block clamp identical to previous logic
					let newX = originalPrimary.x + dx;
					let newY = originalPrimary.y + dy;
					let maxX = canvasW - blk.size.width; if (maxX < 0) maxX = 0;
					let maxY = canvasH - blk.size.height; if (maxY < 0) maxY = 0;
					if (newX < 0) newX = 0; else if (newX > maxX) newX = maxX;
					if (newY < 0) newY = 0; else if (newY > maxY) newY = maxY;
					dx = newX - originalPrimary.x;
					dy = newY - originalPrimary.y;
				}
				const changes: { id: string; position: Point }[] = ids.map(bid => {
					const ip = ctx.initialPositions[bid];
					return { id: bid, position: { x: ip.x + dx, y: ip.y + dy } };
				});
				this.deps.dispatch({ type: changes.length === 1 ? 'MOVE_BLOCK' : 'MULTIDRAG_BLOCKS', ...(changes.length === 1 ? { id: changes[0].id, position: changes[0].position } : { changes }) } as any);
				for (const ch of changes) {
					const el2 = document.getElementById(ch.id);
					if (el2) { el2.style.left = ch.position.x + 'px'; el2.style.top = ch.position.y + 'px'; }
				}
			});
		}
	};

	private onPointerUp = () => {
		if (this.dragContext) {
			const id = this.dragContext.id;
			document.getElementById(id)?.classList.remove('dragging');
			const blk = this.deps.getState().blocks[id];
			if (blk) this.deps.bus?.emit('block:drag:end', { id, position: blk.position });
		}
		window.removeEventListener('pointermove', this.onPointerMove);
		if (this.dragRafHandle !== null) { cancelAnimationFrame(this.dragRafHandle); this.dragRafHandle = null; this.rafDragging = false; }
		this.dragContext = null;
	};

	private openPropertiesEditor(id: BlockId) {
		const state = this.deps.getState();
		const blk = state.blocks[id] as Block;
		if (!blk) return;
		const popup = document.createElement('div');
		popup.className = 'fc-props-popup fade-in';
		popup.innerHTML = `
			<div class="fc-props-header">Block Properties <button class="fc-close fc-btn">✕</button></div>
			<div class="fc-props-body">
				<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
					<label style="font-size:12px; opacity:.8;">JSON Properties</label>
					<small style="font-size:11px; opacity:.6;">Esc to cancel</small>
				</div>
				<div class="fc-json-editor-host"></div>
			</div>
			<div class="fc-props-footer">
				<button class="fc-btn fc-cancel">Cancel</button>
				<button class="fc-btn primary fc-save" disabled>Save</button>
			</div>
		`;
		document.body.appendChild(popup);
		const close = () => popup.remove();
		popup.querySelector('.fc-close')?.addEventListener('click', close);
		popup.querySelector('.fc-cancel')?.addEventListener('click', close);
		const saveBtn = popup.querySelector('.fc-save') as HTMLButtonElement;
		let currentValue: any = blk.properties;
		const host = popup.querySelector('.fc-json-editor-host') as HTMLElement;
		const editor = new JsonEditor({
			value: blk.properties,
			onChange: v => { currentValue = v; },
			onValidity: valid => { saveBtn.disabled = !valid; }
		});
		host.appendChild(editor.root);
		setTimeout(()=> editor.focus(), 30);
		popup.querySelector('.fc-save')?.addEventListener('click', () => {
			if (saveBtn.disabled) return; // invalid
			(this.deps as any).undoBegin?.('edit-properties');
			this.deps.dispatch({ type: 'UPDATE_BLOCK', id, patch: { properties: currentValue } });
			(this.deps as any).undoCommit?.();
			close();
		});
	}

	private beginEdit(el: HTMLElement, field: 'title' | 'descriptionHtml', id: BlockId, rich = false) {
		if (el.querySelector('.fc-wys-editor')) return; // already editing
		if (field === 'descriptionHtml' && rich) {
			const original = el.innerHTML;
			const editor = new WysiwygEditor({
				value: original,
				onSave: (html) => {
					this.deps.dispatch({ type: 'UPDATE_BLOCK', id, patch: { descriptionHtml: html } });
					el.innerHTML = html; // render new html
				},
				onCancel: () => {
					el.innerHTML = original;
				}
			});
			el.innerHTML = '';
			el.appendChild(editor.root);
			setTimeout(()=> editor.focus(), 20);
			// Remove editor after save/cancel buttons (handled inside component). Mutation done directly.
			const finalize = () => {
				const current = el.querySelector('.fc-wys-editor');
				if (current) {
					// If editor root still present but value already applied, replace with rendered content
					if (current.parentElement === el) {
						// nothing extra
					}
				}
			};
			editor.root.addEventListener('click', (e) => {
				const t = e.target as HTMLElement;
				if (t.classList.contains('fc-wys-save') || t.classList.contains('fc-wys-cancel')) {
					// Delay to allow onSave/onCancel to run
					setTimeout(finalize, 0);
				}
			});
			return;
		}
		// Simple inline contentEditable for title or non-rich fallback
		if (el.isContentEditable) return;
		const original = field === 'title' ? (el.textContent || '') : el.innerHTML;
		el.contentEditable = 'true';
		el.classList.add('editing');
		el.focus();
		const range = document.createRange();
		range.selectNodeContents(el);
		range.collapse(false);
		const sel = window.getSelection();
		if (sel) { sel.removeAllRanges(); sel.addRange(range); }
		const finish = (cancel: boolean) => {
			el.contentEditable = 'false';
			el.classList.remove('editing');
			if (!cancel) {
				(this.deps as any).undoBegin?.('edit-block');
				if (field === 'title') {
					this.deps.dispatch({ type: 'UPDATE_BLOCK', id, patch: { title: el.textContent || '' } });
				} else {
					this.deps.dispatch({ type: 'UPDATE_BLOCK', id, patch: { descriptionHtml: el.innerHTML } });
				}
				(this.deps as any).undoCommit?.();
			} else {
				if (field === 'title') el.textContent = original; else el.innerHTML = original;
			}
		};
		const keyHandler = (ev: KeyboardEvent) => {
			if (ev.key === 'Enter' && field === 'title') { ev.preventDefault(); finish(false); cleanup(); }
			else if (ev.key === 'Escape') { ev.preventDefault(); finish(true); cleanup(); }
			else if (ev.key === 'Enter' && field !== 'title' && !ev.shiftKey) { ev.preventDefault(); finish(false); cleanup(); }
		};
		const blurHandler = () => { finish(false); cleanup(); };
		const cleanup = () => {
			el.removeEventListener('keydown', keyHandler);
			el.removeEventListener('blur', blurHandler);
		};
		el.addEventListener('keydown', keyHandler);
		el.addEventListener('blur', blurHandler, { once: true });
	}

}

