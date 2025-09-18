// Simple media popup for inserting YouTube/video by URL
class WysiwygMediaPopup {
  el: HTMLElement;
  private onSubmit: (url: string) => void;
  private onCancel: () => void;
  constructor(onSubmit: (url: string) => void, onCancel: () => void, initialUrl?: string) {
    this.el = document.createElement('div');
    this.el.className = 'fc-wys-media-popup fc-theme';
    this.el.innerHTML = `
      <label>Media URL: <input type="url" class="fc-wys-media-url" value="${initialUrl||''}" placeholder="YouTube or video URL" /></label>
      <div class="fc-wys-popup-actions">
        <button type="button" class="fc-wys-btn fc-wys-media-ok primary">OK</button>
        <button type="button" class="fc-wys-btn fc-wys-media-cancel">Cancel</button>
      </div>
    `;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
    (this.el.querySelector('.fc-wys-media-ok') as HTMLButtonElement).onclick = () => {
      const url = (this.el.querySelector('.fc-wys-media-url') as HTMLInputElement).value.trim();
      if (url) this.onSubmit(url);
    };
    (this.el.querySelector('.fc-wys-media-cancel') as HTMLButtonElement).onclick = () => this.onCancel();
  }
}
// Simple image popup for inserting image by URL
class WysiwygImagePopup {
  el: HTMLElement;
  private onSubmit: (url: string, alt?: string) => void;
  private onCancel: () => void;
  constructor(onSubmit: (url: string, alt?: string) => void, onCancel: () => void, initialUrl?: string, initialAlt?: string) {
    this.el = document.createElement('div');
    this.el.className = 'fc-wys-image-popup fc-theme';
    this.el.innerHTML = `
      <label>Image URL: <input type="url" class="fc-wys-img-url" value="${initialUrl||''}" placeholder="https://..." /></label>
      <label>Alt Text: <input type="text" class="fc-wys-img-alt" value="${initialAlt||''}" placeholder="Description" /></label>
      <div class="fc-wys-popup-actions">
        <button type="button" class="fc-wys-btn fc-wys-img-ok primary">OK</button>
        <button type="button" class="fc-wys-btn fc-wys-img-cancel">Cancel</button>
      </div>
    `;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
    (this.el.querySelector('.fc-wys-img-ok') as HTMLButtonElement).onclick = () => {
      const url = (this.el.querySelector('.fc-wys-img-url') as HTMLInputElement).value.trim();
      const alt = (this.el.querySelector('.fc-wys-img-alt') as HTMLInputElement).value.trim();
      if (url) this.onSubmit(url, alt);
    };
    (this.el.querySelector('.fc-wys-img-cancel') as HTMLButtonElement).onclick = () => this.onCancel();
  }
}
// Simple link popup for inserting/editing links
class WysiwygLinkPopup {
  el: HTMLElement;
  private onSubmit: (url: string, text?: string) => void;
  private onCancel: () => void;
  constructor(onSubmit: (url: string, text?: string) => void, onCancel: () => void, initialUrl?: string, initialText?: string) {
    this.el = document.createElement('div');
    this.el.className = 'fc-wys-link-popup fc-theme';
    this.el.innerHTML = `
      <label>URL: <input type="url" class="fc-wys-link-url" value="${initialUrl||''}" placeholder="https://..." /></label>
      <label>Text: <input type="text" class="fc-wys-link-text" value="${initialText||''}" placeholder="Link text" /></label>
      <div class="fc-wys-popup-actions">
        <button type="button" class="fc-wys-btn fc-wys-link-ok primary">OK</button>
        <button type="button" class="fc-wys-btn fc-wys-link-cancel">Cancel</button>
      </div>
    `;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
    (this.el.querySelector('.fc-wys-link-ok') as HTMLButtonElement).onclick = () => {
      const url = (this.el.querySelector('.fc-wys-link-url') as HTMLInputElement).value.trim();
      const text = (this.el.querySelector('.fc-wys-link-text') as HTMLInputElement).value.trim();
      if (url) this.onSubmit(url, text);
    };
    (this.el.querySelector('.fc-wys-link-cancel') as HTMLButtonElement).onclick = () => this.onCancel();
  }
}
export interface WysiwygEditorOptions {
  value: string;
  onSave(html: string): void;
  onCancel(): void;
}

// Very lightweight WYSIWYG editor: bold, italic, underline, unordered list.
// Uses contenteditable DIV and (deprecated) execCommand for simplicity.

// Modular toolbar component
class WysiwygToolbar {
  el: HTMLElement;
  constructor(onCmd: (cmd: string) => void, onSave: () => void, onCancel: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'fc-wys-toolbar fc-theme';
    this.el.innerHTML = `
      <button type="button" data-cmd="bold" title="Bold" class="fc-wys-btn"><span class="fc-wys-icn"><svg width="18" height="18" viewBox="0 0 18 18"><text x="3" y="14" font-weight="bold" font-size="14">B</text></svg></span></button>
      <button type="button" data-cmd="italic" title="Italic" class="fc-wys-btn"><span class="fc-wys-icn"><svg width="18" height="18" viewBox="0 0 18 18"><text x="5" y="14" font-style="italic" font-size="14">I</text></svg></span></button>
      <button type="button" data-cmd="underline" title="Underline" class="fc-wys-btn"><span class="fc-wys-icn"><svg width="18" height="18" viewBox="0 0 18 18"><text x="3" y="14" font-size="14">U</text><line x1="3" y1="16" x2="15" y2="16" stroke="currentColor" stroke-width="2"/></svg></span></button>
      <button type="button" data-cmd="insertUnorderedList" title="Bullet List" class="fc-wys-btn"><span class="fc-wys-icn"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="5" cy="9" r="2"/><rect x="9" y="8" width="6" height="2" rx="1"/></svg></span></button>
      <button type="button" data-cmd="link" title="Link" class="fc-wys-btn"><span class="fc-wys-icn"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M6 9a3 3 0 0 1 3-3h2a3 3 0 1 1 0 6h-2a3 3 0 1 1-3-3z" fill="none" stroke="currentColor" stroke-width="2"/></svg></span></button>
      <button type="button" data-cmd="image" title="Image" class="fc-wys-btn"><span class="fc-wys-icn"><svg width="18" height="18" viewBox="0 0 18 18"><rect x="2" y="4" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="8" r="2"/><path d="M2 14l4-4 3 3 5-5" stroke="currentColor" stroke-width="2" fill="none"/></svg></span></button>
      <button type="button" data-cmd="media" title="Media" class="fc-wys-btn"><span class="fc-wys-icn"><svg width="18" height="18" viewBox="0 0 18 18"><rect x="3" y="5" width="12" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="8,8 12,9 8,10" fill="currentColor"/></svg></span></button>
      <span class="fc-wys-spacer"></span>
      <button type="button" class="fc-wys-btn fc-wys-save" title="Save"><span class="fc-wys-icn"><svg width="18" height="18" viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="5,9 8,12 13,7" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>Save</button>
      <button type="button" class="fc-wys-btn fc-wys-cancel" title="Cancel"><span class="fc-wys-icn"><svg width="18" height="18" viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="6" y1="6" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><line x1="12" y1="6" x2="6" y2="12" stroke="currentColor" stroke-width="2"/></svg></span>Cancel</button>
    `;
    this.el.querySelectorAll('[data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = (btn as HTMLElement).dataset.cmd!;
        onCmd(cmd);
      });
    });
    (this.el.querySelector('.fc-wys-save') as HTMLButtonElement).addEventListener('click', onSave);
    (this.el.querySelector('.fc-wys-cancel') as HTMLButtonElement).addEventListener('click', onCancel);
  }
}

export class WysiwygEditor {
  root: HTMLElement;
  private area: HTMLDivElement;
  private opts: WysiwygEditorOptions;
  private toolbar: WysiwygToolbar;
    private popupContainer: HTMLElement;
    private activePopup: HTMLElement|null = null;
    private static IMAGE_BLOCK_CLASS = 'fc-wys-img-block';
    private static MEDIA_BLOCK_CLASS = 'fc-wys-media-block';
    private savedRange: Range | null = null;
  constructor(opts: WysiwygEditorOptions) {
    this.opts = opts;
    this.root = document.createElement('div');
    this.root.className = 'fc-wys-editor fc-theme';
    this.toolbar = new WysiwygToolbar(
      (cmd) => this.handleCmd(cmd),
      () => this.opts.onSave(this.cleanHtml(this.area.innerHTML)),
      () => this.opts.onCancel()
    );
    this.root.appendChild(this.toolbar.el);
    this.area = document.createElement('div');
    this.area.className = 'fc-wys-area';
    this.area.setAttribute('contenteditable', 'true');
    this.area.innerHTML = opts.value || '<p></p>';
    this.root.appendChild(this.area);
      this.popupContainer = document.createElement('div');
      this.popupContainer.className = 'fc-wys-popup-container';
      this.root.appendChild(this.popupContainer);
    this.attach();
  }

  focus() { this.area.focus(); }

  private handleCmd(cmd: string) {
    if (cmd === 'link') {
      this.captureSelection();
      this.openLinkPopup();
    } else if (cmd === 'image') {
      this.captureSelection();
      this.openImagePopup();
    } else if (cmd === 'media') {
      this.captureSelection();
      this.openMediaPopup();
    } else {
      this.exec(cmd);
    }
    this.area.focus();
  }
  private openMediaPopup() {
    if (this.activePopup) return;
    const popup = new WysiwygMediaPopup(
      (url) => {
        this.restoreSelection();
        this.insertMediaBlock(url);
        this.closePopup();
      },
      () => this.closePopup()
    );
    this.activePopup = popup.el;
    this.popupContainer.appendChild(popup.el);
    (popup.el.querySelector('.fc-wys-media-url') as HTMLInputElement).focus();
  }

  private insertMediaBlock(url: string) {
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0) range = sel.getRangeAt(0);
    if (!range) {
      // fallback: append at end
      range = document.createRange();
      const end = this.area.lastChild || this.area;
      range.selectNodeContents(end instanceof Text ? this.area : end);
      range.collapse(false);
    }
    range.deleteContents();
    const block = document.createElement('div');
    block.className = WysiwygEditor.MEDIA_BLOCK_CLASS;
    block.contentEditable = 'false';
    block.style.width = '100%';
    block.style.margin = '16px 0';
    let embedHtml = '';
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (ytMatch) {
      const vid = ytMatch[1];
      embedHtml = `<iframe width="100%" height="360" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe>`;
    } else if (/\.(mp4|webm|ogg)$/i.test(url)) {
      embedHtml = `<video src="${url}" controls style="width:100%;height:auto;"></video>`;
    } else {
      embedHtml = `<a href="${url}" target="_blank">${url}</a>`;
    }
    block.innerHTML = embedHtml;
    range.insertNode(block);
    // Move cursor after block
    range.setStartAfter(block);
    range.collapse(true);
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    this.area.focus();
  }
  private openImagePopup() {
    if (this.activePopup) return;
    const popup = new WysiwygImagePopup(
      (url, alt) => {
        this.restoreSelection();
        this.insertImageBlock(url, alt);
        this.closePopup();
      },
      () => this.closePopup()
    );
    this.activePopup = popup.el;
    this.popupContainer.appendChild(popup.el);
    (popup.el.querySelector('.fc-wys-img-url') as HTMLInputElement).focus();
  }

  private insertImageBlock(url: string, alt?: string) {
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0) range = sel.getRangeAt(0);
    if (!range) {
      range = document.createRange();
      const end = this.area.lastChild || this.area;
      range.selectNodeContents(end instanceof Text ? this.area : end);
      range.collapse(false);
    }
    range.deleteContents();
    // Remove any adjacent nodes before/after
    const block = document.createElement('div');
    block.className = WysiwygEditor.IMAGE_BLOCK_CLASS;
    block.contentEditable = 'false';
    block.style.width = '100%';
    block.style.margin = '16px 0';
    block.innerHTML = `<img src="${url}" alt="${alt||''}" style="width:100%;height:auto;display:block;" />`;
    range.insertNode(block);
    // Move cursor after block
    range.setStartAfter(block);
    range.collapse(true);
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    this.area.focus();
  }
  private openLinkPopup() {
    if (this.activePopup) return;
    // Try to get selected text and link
    let initialUrl = '';
    let initialText = '';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const container = range.startContainer.parentElement;
      if (container && container.tagName === 'A') {
        initialUrl = (container as HTMLAnchorElement).href;
        initialText = container.textContent || '';
      } else {
        initialText = sel.toString();
      }
    }
    const popup = new WysiwygLinkPopup(
      (url, text) => {
        this.restoreSelection();
        this.insertLink(url, text);
        this.closePopup();
      },
      () => this.closePopup(),
      initialUrl,
      initialText
    );
    this.activePopup = popup.el;
    this.popupContainer.appendChild(popup.el);
    (popup.el.querySelector('.fc-wys-link-url') as HTMLInputElement).focus();
  }

  private closePopup() {
    if (this.activePopup) {
      this.popupContainer.removeChild(this.activePopup);
      this.activePopup = null;
    }
  }

  private insertLink(url: string, text?: string) {
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0) range = sel.getRangeAt(0);
    if (!range) {
      range = document.createRange();
      const end = this.area.lastChild || this.area;
      range.selectNodeContents(end instanceof Text ? this.area : end);
      range.collapse(false);
    }
    range.deleteContents();
    const a = document.createElement('a');
    a.href = url;
    a.textContent = text || url;
    a.target = '_blank';
    range.insertNode(a);
    // Move cursor after link
    range.setStartAfter(a);
    range.collapse(true);
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    this.area.focus();
  }

  private exec(cmd: string) {
    try { (document as any).execCommand?.(cmd, false); } catch {}
  }

  private attach() {
    this.area.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this.opts.onCancel(); }
      else if (e.key === 's' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); this.opts.onSave(this.cleanHtml(this.area.innerHTML)); }
    });
    // Paste handler for link, image, and media
    this.area.addEventListener('paste', (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain')?.trim();
      const items = e.clipboardData?.items;
      // Image paste (from file or URL)
      if (items) {
        for (let i=0; i<items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                this.insertImageBlock(reader.result as string);
              };
              reader.readAsDataURL(file);
            }
            return;
          }
        }
      }
      // Paste image URL
      if (text && /^https?:\/\/.+\.(png|jpe?g|gif|svg|webp)$/i.test(text)) {
        e.preventDefault();
        this.insertImageBlock(text);
        return;
      }
      // Paste YouTube or video link
      if (text && /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/.test(text)) {
        e.preventDefault();
        this.insertMediaBlock(text);
        return;
      }
      if (text && /\.(mp4|webm|ogg)$/i.test(text)) {
        e.preventDefault();
        this.insertMediaBlock(text);
        return;
      }
      // Paste link
      if (text && /^https?:\/\//.test(text)) {
        e.preventDefault();
        this.insertLink(text);
      }
    });
  }

  private captureSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      // Only store if inside editor
      if (this.area.contains(r.startContainer)) {
        this.savedRange = r.cloneRange();
      }
    }
  }

  private restoreSelection() {
    if (!this.savedRange) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(this.savedRange);
    }
    this.savedRange = null;
  }

  private cleanHtml(html: string): string {
    // Basic cleanup: remove leading/trailing whitespace and ensure paragraph wrapper when empty
    const trimmed = html.trim();
    return trimmed || '<p></p>';
  }
}
