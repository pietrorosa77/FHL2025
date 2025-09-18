export interface JsonEditorOptions {
  value: any;
  onChange(value: any): void;
  onValidity?(valid: boolean): void;
  height?: number;
}

// Lightweight JSON editor with inline validation + basic syntax highlighting.
// Uses a textarea for input and a mirrored pre element for colored tokens.
export class JsonEditor {
  root: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private highlightPane: HTMLElement;
  private lastValid = true;
  private opts: JsonEditorOptions;
  private toolbar: HTMLElement;
  private highlightEnabled = true;
  private formatBtn: HTMLButtonElement;
  private highlightBtn: HTMLButtonElement;
  private statusEl: HTMLElement;

  constructor(opts: JsonEditorOptions) {
    this.opts = opts;
    this.root = document.createElement('div');
    this.root.className = 'fc-json-editor';
    this.root.innerHTML = `
      <div class="fc-json-editor-toolbar">
        <button type="button" class="fc-json-ed-btn fmt" title="Format JSON">Format</button>
        <button type="button" class="fc-json-ed-btn toggle-hl" title="Toggle Syntax Highlight">HL On</button>
        <div class="fc-json-ed-spacer"></div>
        <small class="fc-json-ed-hint">Esc to close popup</small>
      </div>
      <div class="fc-json-editor-stack">
        <textarea class="fc-json-editor-input" spellcheck="false"></textarea>
        <pre class="fc-json-editor-highlight" aria-hidden="true"></pre>
      </div>
      <div class="fc-json-editor-status" role="status" aria-live="polite"></div>
    `;
    this.textarea = this.root.querySelector('.fc-json-editor-input') as HTMLTextAreaElement;
    this.highlightPane = this.root.querySelector('.fc-json-editor-highlight') as HTMLElement;
    this.toolbar = this.root.querySelector('.fc-json-editor-toolbar') as HTMLElement;
    this.statusEl = this.root.querySelector('.fc-json-editor-status') as HTMLElement;
    this.formatBtn = this.toolbar.querySelector('.fmt') as HTMLButtonElement;
    this.highlightBtn = this.toolbar.querySelector('.toggle-hl') as HTMLButtonElement;
    this.textarea.value = JSON.stringify(opts.value ?? {}, null, 2);
    this.textarea.addEventListener('input', () => this.handleInput());
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    this.formatBtn.addEventListener('click', () => this.format());
    this.highlightBtn.addEventListener('click', () => this.toggleHighlight());
    this.handleInput();
    if (opts.height) {
      (this.root.querySelector('.fc-json-editor-stack') as HTMLElement).style.height = opts.height + 'px';
    }
    // Auto-disable highlighting for very large JSON to avoid perf issues
    if (this.textarea.value.length > 20000) {
      this.highlightEnabled = false;
      this.applyHighlightMode();
    } else {
      this.root.classList.add('with-highlight');
    }
  }

  focus() { this.textarea.focus(); }
  getValueRaw() { return this.textarea.value; }

  private syncScroll() { this.highlightPane.scrollTop = this.textarea.scrollTop; this.highlightPane.scrollLeft = this.textarea.scrollLeft; }

  private setStatus(msg: string, ok: boolean) {
    const status = this.root.querySelector('.fc-json-editor-status') as HTMLElement;
    status.textContent = msg;
    status.style.color = ok ? 'var(--fc-json-status-ok, var(--accent-color, #2d8f2d))' : 'var(--fc-json-status-err, #d33)';
  }

  private handleInput() {
    const txt = this.textarea.value;
    let valid = true; let parsed: any = null;
    let errorPos: number | null = null; let errorMsg: string | null = null;
    try { parsed = JSON.parse(txt || 'null'); } catch (err: any) {
      valid = false;
      const msg = String(err?.message || 'Invalid JSON');
      const m = msg.match(/position (\d+)/i);
      if (m) errorPos = parseInt(m[1],10);
      errorMsg = msg;
    }
    if (valid) {
      this.setStatus('Valid JSON', true);
      // Only emit onChange if JSON parses to something different (shallow ref change ok)
      this.opts.onChange(parsed);
    } else {
      if (errorPos != null) {
        const lc = this.indexToLineCol(txt, errorPos);
        this.setStatus(`Error Ln ${lc.line}, Col ${lc.col} (pos ${errorPos})`, false);
      } else if (errorMsg) {
        this.setStatus(errorMsg, false);
      } else {
        this.setStatus('Invalid JSON', false);
      }
    }
    if (valid !== this.lastValid) { this.opts.onValidity?.(valid); this.lastValid = valid; }
    this.refreshHighlight(txt);
    this.formatBtn.disabled = !valid;
  }

  private refreshHighlight(txt: string) {
    if (!this.highlightEnabled) {
      this.highlightPane.textContent = '';
      return;
    }
    if (txt.length < 20000) this.highlightPane.innerHTML = this.highlightJson(txt); else this.highlightPane.textContent = txt;
  }

  private indexToLineCol(text: string, index: number) {
    let line = 1, col = 1;
    for (let i=0; i<index && i<text.length; i++) {
      if (text[i] === '\n') { line++; col = 1; } else { col++; }
    }
    return { line, col };
  }

  private escapeHtml(s: string) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c]); }

  private highlightJson(source: string): string {
    // Simple tokenizer: strings, numbers, booleans, null, punctuation
    const esc = this.escapeHtml(source);
    return esc
      .replace(/(&quot;.*?&quot;)(\s*:)?/g, (m, g1, g2) => `<span class="j-str">${g1}</span>${g2?'<span class="j-punc">'+g2+'</span>': ''}`)
      .replace(/\b(true|false)\b/g, '<span class="j-bool">$1</span>')
      .replace(/\b(null)\b/g, '<span class="j-null">$1</span>')
      .replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="j-num">$1</span>')
      .replace(/([{}\[\],])/g, '<span class="j-punc">$1</span>');
  }

  private format() {
    try {
      const parsed = JSON.parse(this.textarea.value || 'null');
      const formatted = JSON.stringify(parsed, null, 2);
      this.textarea.value = formatted;
      this.handleInput();
    } catch { /* ignore format when invalid */ }
  }

  private toggleHighlight() {
    this.highlightEnabled = !this.highlightEnabled;
    this.applyHighlightMode();
  }

  private applyHighlightMode() {
    if (this.highlightEnabled) {
      this.root.classList.add('with-highlight');
      this.highlightBtn.textContent = 'HL On';
      this.refreshHighlight(this.textarea.value);
      this.textarea.classList.add('hl-active');
    } else {
      this.root.classList.remove('with-highlight');
      this.highlightBtn.textContent = 'HL Off';
      this.textarea.classList.remove('hl-active');
    }
  }
}
