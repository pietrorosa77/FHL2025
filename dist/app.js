"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/types.ts
  var initialState = () => ({
    blocks: {},
    connections: {},
    selection: {},
    multiSelect: [],
    viewport: { scale: 1, offset: { x: 0, y: 0 }, bounds: { minScale: 0.25, maxScale: 3 } },
    connectionStyle: "bezier",
    grid: { enabled: true, size: 20, snap: true },
    historyVersion: 0
  });
  var uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 10)}`;
  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  // src/JsonEditor.ts
  var JsonEditor = class {
    constructor(opts) {
      __publicField(this, "root");
      __publicField(this, "textarea");
      __publicField(this, "highlightPane");
      __publicField(this, "lastValid", true);
      __publicField(this, "opts");
      __publicField(this, "toolbar");
      __publicField(this, "highlightEnabled", true);
      __publicField(this, "formatBtn");
      __publicField(this, "highlightBtn");
      __publicField(this, "statusEl");
      var _a;
      this.opts = opts;
      this.root = document.createElement("div");
      this.root.className = "fc-json-editor";
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
      this.textarea = this.root.querySelector(".fc-json-editor-input");
      this.highlightPane = this.root.querySelector(".fc-json-editor-highlight");
      this.toolbar = this.root.querySelector(".fc-json-editor-toolbar");
      this.statusEl = this.root.querySelector(".fc-json-editor-status");
      this.formatBtn = this.toolbar.querySelector(".fmt");
      this.highlightBtn = this.toolbar.querySelector(".toggle-hl");
      this.textarea.value = JSON.stringify((_a = opts.value) != null ? _a : {}, null, 2);
      this.textarea.addEventListener("input", () => this.handleInput());
      this.textarea.addEventListener("scroll", () => this.syncScroll());
      this.formatBtn.addEventListener("click", () => this.format());
      this.highlightBtn.addEventListener("click", () => this.toggleHighlight());
      this.handleInput();
      if (opts.height) {
        this.root.querySelector(".fc-json-editor-stack").style.height = opts.height + "px";
      }
      if (this.textarea.value.length > 2e4) {
        this.highlightEnabled = false;
        this.applyHighlightMode();
      } else {
        this.root.classList.add("with-highlight");
      }
    }
    focus() {
      this.textarea.focus();
    }
    getValueRaw() {
      return this.textarea.value;
    }
    syncScroll() {
      this.highlightPane.scrollTop = this.textarea.scrollTop;
      this.highlightPane.scrollLeft = this.textarea.scrollLeft;
    }
    setStatus(msg, ok) {
      const status = this.root.querySelector(".fc-json-editor-status");
      status.textContent = msg;
      status.style.color = ok ? "var(--fc-json-status-ok, var(--accent-color, #2d8f2d))" : "var(--fc-json-status-err, #d33)";
    }
    handleInput() {
      var _a, _b;
      const txt = this.textarea.value;
      let valid = true;
      let parsed = null;
      let errorPos = null;
      let errorMsg = null;
      try {
        parsed = JSON.parse(txt || "null");
      } catch (err) {
        valid = false;
        const msg = String((err == null ? void 0 : err.message) || "Invalid JSON");
        const m = msg.match(/position (\d+)/i);
        if (m) errorPos = parseInt(m[1], 10);
        errorMsg = msg;
      }
      if (valid) {
        this.setStatus("Valid JSON", true);
        this.opts.onChange(parsed);
      } else {
        if (errorPos != null) {
          const lc = this.indexToLineCol(txt, errorPos);
          this.setStatus(`Error Ln ${lc.line}, Col ${lc.col} (pos ${errorPos})`, false);
        } else if (errorMsg) {
          this.setStatus(errorMsg, false);
        } else {
          this.setStatus("Invalid JSON", false);
        }
      }
      if (valid !== this.lastValid) {
        (_b = (_a = this.opts).onValidity) == null ? void 0 : _b.call(_a, valid);
        this.lastValid = valid;
      }
      this.refreshHighlight(txt);
      this.formatBtn.disabled = !valid;
    }
    refreshHighlight(txt) {
      if (!this.highlightEnabled) {
        this.highlightPane.textContent = "";
        return;
      }
      if (txt.length < 2e4) this.highlightPane.innerHTML = this.highlightJson(txt);
      else this.highlightPane.textContent = txt;
    }
    indexToLineCol(text, index) {
      let line = 1, col = 1;
      for (let i = 0; i < index && i < text.length; i++) {
        if (text[i] === "\n") {
          line++;
          col = 1;
        } else {
          col++;
        }
      }
      return { line, col };
    }
    escapeHtml(s) {
      return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    }
    highlightJson(source) {
      const esc = this.escapeHtml(source);
      return esc.replace(/(&quot;.*?&quot;)(\s*:)?/g, (m, g1, g2) => `<span class="j-str">${g1}</span>${g2 ? '<span class="j-punc">' + g2 + "</span>" : ""}`).replace(/\b(true|false)\b/g, '<span class="j-bool">$1</span>').replace(/\b(null)\b/g, '<span class="j-null">$1</span>').replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="j-num">$1</span>').replace(/([{}\[\],])/g, '<span class="j-punc">$1</span>');
    }
    format() {
      try {
        const parsed = JSON.parse(this.textarea.value || "null");
        const formatted = JSON.stringify(parsed, null, 2);
        this.textarea.value = formatted;
        this.handleInput();
      } catch (e) {
      }
    }
    toggleHighlight() {
      this.highlightEnabled = !this.highlightEnabled;
      this.applyHighlightMode();
    }
    applyHighlightMode() {
      if (this.highlightEnabled) {
        this.root.classList.add("with-highlight");
        this.highlightBtn.textContent = "HL On";
        this.refreshHighlight(this.textarea.value);
        this.textarea.classList.add("hl-active");
      } else {
        this.root.classList.remove("with-highlight");
        this.highlightBtn.textContent = "HL Off";
        this.textarea.classList.remove("hl-active");
      }
    }
  };

  // src/WysiwygEditor.ts
  var WysiwygMediaPopup = class {
    constructor(onSubmit, onCancel, initialUrl) {
      __publicField(this, "el");
      __publicField(this, "onSubmit");
      __publicField(this, "onCancel");
      this.el = document.createElement("div");
      this.el.className = "fc-wys-media-popup fc-theme";
      this.el.innerHTML = `
      <label>Media URL: <input type="url" class="fc-wys-media-url" value="${initialUrl || ""}" placeholder="YouTube or video URL" /></label>
      <div class="fc-wys-popup-actions">
        <button type="button" class="fc-wys-btn fc-wys-media-ok primary">OK</button>
        <button type="button" class="fc-wys-btn fc-wys-media-cancel">Cancel</button>
      </div>
    `;
      this.onSubmit = onSubmit;
      this.onCancel = onCancel;
      this.el.querySelector(".fc-wys-media-ok").onclick = () => {
        const url = this.el.querySelector(".fc-wys-media-url").value.trim();
        if (url) this.onSubmit(url);
      };
      this.el.querySelector(".fc-wys-media-cancel").onclick = () => this.onCancel();
    }
  };
  var WysiwygImagePopup = class {
    constructor(onSubmit, onCancel, initialUrl, initialAlt) {
      __publicField(this, "el");
      __publicField(this, "onSubmit");
      __publicField(this, "onCancel");
      this.el = document.createElement("div");
      this.el.className = "fc-wys-image-popup fc-theme";
      this.el.innerHTML = `
      <label>Image URL: <input type="url" class="fc-wys-img-url" value="${initialUrl || ""}" placeholder="https://..." /></label>
      <label>Alt Text: <input type="text" class="fc-wys-img-alt" value="${initialAlt || ""}" placeholder="Description" /></label>
      <div class="fc-wys-popup-actions">
        <button type="button" class="fc-wys-btn fc-wys-img-ok primary">OK</button>
        <button type="button" class="fc-wys-btn fc-wys-img-cancel">Cancel</button>
      </div>
    `;
      this.onSubmit = onSubmit;
      this.onCancel = onCancel;
      this.el.querySelector(".fc-wys-img-ok").onclick = () => {
        const url = this.el.querySelector(".fc-wys-img-url").value.trim();
        const alt = this.el.querySelector(".fc-wys-img-alt").value.trim();
        if (url) this.onSubmit(url, alt);
      };
      this.el.querySelector(".fc-wys-img-cancel").onclick = () => this.onCancel();
    }
  };
  var WysiwygLinkPopup = class {
    constructor(onSubmit, onCancel, initialUrl, initialText) {
      __publicField(this, "el");
      __publicField(this, "onSubmit");
      __publicField(this, "onCancel");
      this.el = document.createElement("div");
      this.el.className = "fc-wys-link-popup fc-theme";
      this.el.innerHTML = `
      <label>URL: <input type="url" class="fc-wys-link-url" value="${initialUrl || ""}" placeholder="https://..." /></label>
      <label>Text: <input type="text" class="fc-wys-link-text" value="${initialText || ""}" placeholder="Link text" /></label>
      <div class="fc-wys-popup-actions">
        <button type="button" class="fc-wys-btn fc-wys-link-ok primary">OK</button>
        <button type="button" class="fc-wys-btn fc-wys-link-cancel">Cancel</button>
      </div>
    `;
      this.onSubmit = onSubmit;
      this.onCancel = onCancel;
      this.el.querySelector(".fc-wys-link-ok").onclick = () => {
        const url = this.el.querySelector(".fc-wys-link-url").value.trim();
        const text = this.el.querySelector(".fc-wys-link-text").value.trim();
        if (url) this.onSubmit(url, text);
      };
      this.el.querySelector(".fc-wys-link-cancel").onclick = () => this.onCancel();
    }
  };
  var WysiwygToolbar = class {
    constructor(onCmd, onSave, onCancel) {
      __publicField(this, "el");
      this.el = document.createElement("div");
      this.el.className = "fc-wys-toolbar fc-theme";
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
      this.el.querySelectorAll("[data-cmd]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const cmd = btn.dataset.cmd;
          onCmd(cmd);
        });
      });
      this.el.querySelector(".fc-wys-save").addEventListener("click", onSave);
      this.el.querySelector(".fc-wys-cancel").addEventListener("click", onCancel);
    }
  };
  var _WysiwygEditor = class _WysiwygEditor {
    constructor(opts) {
      __publicField(this, "root");
      __publicField(this, "area");
      __publicField(this, "opts");
      __publicField(this, "toolbar");
      __publicField(this, "popupContainer");
      __publicField(this, "activePopup", null);
      __publicField(this, "savedRange", null);
      this.opts = opts;
      this.root = document.createElement("div");
      this.root.className = "fc-wys-editor fc-theme";
      this.toolbar = new WysiwygToolbar(
        (cmd) => this.handleCmd(cmd),
        () => this.opts.onSave(this.cleanHtml(this.area.innerHTML)),
        () => this.opts.onCancel()
      );
      this.root.appendChild(this.toolbar.el);
      this.area = document.createElement("div");
      this.area.className = "fc-wys-area";
      this.area.setAttribute("contenteditable", "true");
      this.area.innerHTML = opts.value || "<p></p>";
      this.root.appendChild(this.area);
      this.popupContainer = document.createElement("div");
      this.popupContainer.className = "fc-wys-popup-container";
      this.root.appendChild(this.popupContainer);
      this.attach();
    }
    focus() {
      this.area.focus();
    }
    handleCmd(cmd) {
      if (cmd === "link") {
        this.captureSelection();
        this.openLinkPopup();
      } else if (cmd === "image") {
        this.captureSelection();
        this.openImagePopup();
      } else if (cmd === "media") {
        this.captureSelection();
        this.openMediaPopup();
      } else {
        this.exec(cmd);
      }
      this.area.focus();
    }
    openMediaPopup() {
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
      popup.el.querySelector(".fc-wys-media-url").focus();
    }
    insertMediaBlock(url) {
      const sel = window.getSelection();
      let range = null;
      if (sel && sel.rangeCount > 0) range = sel.getRangeAt(0);
      if (!range) {
        range = document.createRange();
        const end = this.area.lastChild || this.area;
        range.selectNodeContents(end instanceof Text ? this.area : end);
        range.collapse(false);
      }
      range.deleteContents();
      const block = document.createElement("div");
      block.className = _WysiwygEditor.MEDIA_BLOCK_CLASS;
      block.contentEditable = "false";
      block.style.width = "100%";
      block.style.margin = "16px 0";
      let embedHtml = "";
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
      range.setStartAfter(block);
      range.collapse(true);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      this.area.focus();
    }
    openImagePopup() {
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
      popup.el.querySelector(".fc-wys-img-url").focus();
    }
    insertImageBlock(url, alt) {
      const sel = window.getSelection();
      let range = null;
      if (sel && sel.rangeCount > 0) range = sel.getRangeAt(0);
      if (!range) {
        range = document.createRange();
        const end = this.area.lastChild || this.area;
        range.selectNodeContents(end instanceof Text ? this.area : end);
        range.collapse(false);
      }
      range.deleteContents();
      const block = document.createElement("div");
      block.className = _WysiwygEditor.IMAGE_BLOCK_CLASS;
      block.contentEditable = "false";
      block.style.width = "100%";
      block.style.margin = "16px 0";
      block.innerHTML = `<img src="${url}" alt="${alt || ""}" style="width:100%;height:auto;display:block;" />`;
      range.insertNode(block);
      range.setStartAfter(block);
      range.collapse(true);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      this.area.focus();
    }
    openLinkPopup() {
      if (this.activePopup) return;
      let initialUrl = "";
      let initialText = "";
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const container = range.startContainer.parentElement;
        if (container && container.tagName === "A") {
          initialUrl = container.href;
          initialText = container.textContent || "";
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
      popup.el.querySelector(".fc-wys-link-url").focus();
    }
    closePopup() {
      if (this.activePopup) {
        this.popupContainer.removeChild(this.activePopup);
        this.activePopup = null;
      }
    }
    insertLink(url, text) {
      const sel = window.getSelection();
      let range = null;
      if (sel && sel.rangeCount > 0) range = sel.getRangeAt(0);
      if (!range) {
        range = document.createRange();
        const end = this.area.lastChild || this.area;
        range.selectNodeContents(end instanceof Text ? this.area : end);
        range.collapse(false);
      }
      range.deleteContents();
      const a = document.createElement("a");
      a.href = url;
      a.textContent = text || url;
      a.target = "_blank";
      range.insertNode(a);
      range.setStartAfter(a);
      range.collapse(true);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      this.area.focus();
    }
    exec(cmd) {
      var _a;
      try {
        (_a = document.execCommand) == null ? void 0 : _a.call(document, cmd, false);
      } catch (e) {
      }
    }
    attach() {
      this.area.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          this.opts.onCancel();
        } else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          this.opts.onSave(this.cleanHtml(this.area.innerHTML));
        }
      });
      this.area.addEventListener("paste", (e) => {
        var _a, _b, _c;
        const text = (_b = (_a = e.clipboardData) == null ? void 0 : _a.getData("text/plain")) == null ? void 0 : _b.trim();
        const items = (_c = e.clipboardData) == null ? void 0 : _c.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith("image/")) {
              e.preventDefault();
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  this.insertImageBlock(reader.result);
                };
                reader.readAsDataURL(file);
              }
              return;
            }
          }
        }
        if (text && /^https?:\/\/.+\.(png|jpe?g|gif|svg|webp)$/i.test(text)) {
          e.preventDefault();
          this.insertImageBlock(text);
          return;
        }
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
        if (text && /^https?:\/\//.test(text)) {
          e.preventDefault();
          this.insertLink(text);
        }
      });
    }
    captureSelection() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        if (this.area.contains(r.startContainer)) {
          this.savedRange = r.cloneRange();
        }
      }
    }
    restoreSelection() {
      if (!this.savedRange) return;
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(this.savedRange);
      }
      this.savedRange = null;
    }
    cleanHtml(html) {
      const trimmed = html.trim();
      return trimmed || "<p></p>";
    }
  };
  __publicField(_WysiwygEditor, "IMAGE_BLOCK_CLASS", "fc-wys-img-block");
  __publicField(_WysiwygEditor, "MEDIA_BLOCK_CLASS", "fc-wys-media-block");
  var WysiwygEditor = _WysiwygEditor;

  // src/BlockManager.ts
  var BlockManager = class {
    constructor(root, deps) {
      __publicField(this, "root");
      __publicField(this, "deps");
      __publicField(this, "rafDragging", false);
      __publicField(this, "dragRafHandle", null);
      __publicField(this, "dragContext", null);
      __publicField(this, "resizeObserver");
      __publicField(this, "observed", /* @__PURE__ */ new Set());
      __publicField(this, "onPointerMove", (e) => {
        if (!this.dragContext) return;
        if (!this.rafDragging) {
          this.rafDragging = true;
          this.dragRafHandle = requestAnimationFrame(() => {
            this.rafDragging = false;
            const ctx = this.dragContext;
            if (!ctx) return;
            const state = this.deps.getState();
            const blk = state.blocks[ctx.id];
            if (!blk) return;
            const canvasRect = this.root.getBoundingClientRect();
            const vp = state.viewport;
            const localX = (e.clientX - canvasRect.left) / vp.scale;
            const localY = (e.clientY - canvasRect.top) / vp.scale;
            const canvasW = this.root.clientWidth || parseInt(this.root.getAttribute("data-test-width") || "0", 10) || 1200;
            const canvasH = this.root.clientHeight || parseInt(this.root.getAttribute("data-test-height") || "0", 10) || 800;
            const originalPrimary = ctx.initialPositions[ctx.id];
            let dx = localX - ctx.offset.x - originalPrimary.x;
            let dy = localY - ctx.offset.y - originalPrimary.y;
            const ids = Object.keys(ctx.initialPositions);
            if (ids.length > 1) {
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              for (const bid of ids) {
                const ip = ctx.initialPositions[bid];
                const b = state.blocks[bid];
                if (!b) continue;
                const nx = ip.x + dx;
                const ny = ip.y + dy;
                if (nx < minX) minX = nx;
                if (ny < minY) minY = ny;
                if (nx + b.size.width > maxX) maxX = nx + b.size.width;
                if (ny + b.size.height > maxY) maxY = ny + b.size.height;
              }
              if (minX < 0) dx += -minX;
              if (minY < 0) dy += -minY;
              if (maxX > canvasW) dx += canvasW - maxX;
              if (maxY > canvasH) dy += canvasH - maxY;
            } else {
              let newX = originalPrimary.x + dx;
              let newY = originalPrimary.y + dy;
              let maxX = canvasW - blk.size.width;
              if (maxX < 0) maxX = 0;
              let maxY = canvasH - blk.size.height;
              if (maxY < 0) maxY = 0;
              if (newX < 0) newX = 0;
              else if (newX > maxX) newX = maxX;
              if (newY < 0) newY = 0;
              else if (newY > maxY) newY = maxY;
              dx = newX - originalPrimary.x;
              dy = newY - originalPrimary.y;
            }
            const changes = ids.map((bid) => {
              const ip = ctx.initialPositions[bid];
              return { id: bid, position: { x: ip.x + dx, y: ip.y + dy } };
            });
            this.deps.dispatch({ type: changes.length === 1 ? "MOVE_BLOCK" : "MULTIDRAG_BLOCKS", ...changes.length === 1 ? { id: changes[0].id, position: changes[0].position } : { changes } });
            for (const ch of changes) {
              const el2 = document.getElementById(ch.id);
              if (el2) {
                el2.style.left = ch.position.x + "px";
                el2.style.top = ch.position.y + "px";
              }
            }
          });
        }
      });
      __publicField(this, "onPointerUp", () => {
        var _a, _b;
        if (this.dragContext) {
          const id = this.dragContext.id;
          (_a = document.getElementById(id)) == null ? void 0 : _a.classList.remove("dragging");
          const blk = this.deps.getState().blocks[id];
          if (blk) (_b = this.deps.bus) == null ? void 0 : _b.emit("block:drag:end", { id, position: blk.position });
        }
        window.removeEventListener("pointermove", this.onPointerMove);
        if (this.dragRafHandle !== null) {
          cancelAnimationFrame(this.dragRafHandle);
          this.dragRafHandle = null;
          this.rafDragging = false;
        }
        this.dragContext = null;
      });
      this.root = root;
      this.deps = deps;
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const el = entry.target;
          const id = el.id;
          if (!id || !this.observed.has(id)) continue;
          const state = this.deps.getState();
          const blk = state.blocks[id];
          if (!blk) continue;
          const newW = Math.round(entry.contentRect.width);
          const newH = Math.round(entry.contentRect.height);
          if (newW !== blk.size.width || newH !== blk.size.height) {
            this.deps.dispatch({ type: "UPDATE_BLOCK", id, patch: { size: { width: newW, height: newH } } });
          }
        }
      });
    }
    createBlock(kind, position) {
      const block = {
        id: uid("blk"),
        kind,
        position,
        size: { width: 170, height: 100 },
        title: kind.charAt(0).toUpperCase() + kind.slice(1),
        descriptionHtml: "<p>Description...</p>",
        properties: {}
      };
      this.deps.dispatch({ type: "ADD_BLOCK", block });
      this.renderBlock(block);
      queueMicrotask(() => {
        var _a, _b;
        return (_b = (_a = this.deps).undoCommit) == null ? void 0 : _b.call(_a);
      });
    }
    renderAll() {
      this.root.querySelectorAll(".fc-block").forEach((el) => el.remove());
      const { blocks } = this.deps.getState();
      Object.values(blocks).forEach((b) => this.renderBlock(b));
    }
    renderBlock(block) {
      let el = document.getElementById(block.id);
      if (!el) {
        el = document.createElement("div");
        el.id = block.id;
        el.className = "fc-block";
        el.dataset.type = block.kind;
        el.innerHTML = `
				<div class="fc-block-header">
					<div class="fc-block-title"></div>
					<div class="fc-block-actions">
						<button class="fc-icon-btn fc-props-btn" title="Edit block" aria-label="Edit block">\u2699</button>
						<button class="fc-icon-btn fc-del-btn" title="Delete block" aria-label="Delete block">\u2715</button>
					</div>
				</div>
				<div class="fc-block-desc"></div>
				<div class="fc-anchor" title="Drag to connect"></div>
			`;
        this.root.appendChild(el);
        this.attachBlockEvents(el, block.id);
      }
      el.style.left = block.position.x + "px";
      el.style.top = block.position.y + "px";
      el.querySelector(".fc-block-title").textContent = block.title;
      el.querySelector(".fc-block-desc").innerHTML = block.descriptionHtml;
      if (!this.observed.has(block.id)) {
        this.resizeObserver.observe(el);
        this.observed.add(block.id);
      }
    }
    updateBlock(block) {
      this.renderBlock(block);
    }
    removeBlock(id) {
      const el = document.getElementById(id);
      if (el) {
        this.resizeObserver.unobserve(el);
        this.observed.delete(id);
        el.remove();
      }
    }
    attachBlockEvents(el, id) {
      const titleEl = el.querySelector(".fc-block-title");
      const descEl = el.querySelector(".fc-block-desc");
      const propsBtn = el.querySelector(".fc-props-btn");
      const delBtn = el.querySelector(".fc-del-btn");
      el.addEventListener("mousedown", (e) => {
        if (e.target.closest(".fc-anchor")) return;
        const state = this.deps.getState();
        const multi = state.multiSelect;
        const toggle = e.ctrlKey || e.metaKey;
        if (multi && multi.length > 1 && !toggle && !e.shiftKey) {
          return;
        }
        const additive = e.shiftKey;
        this.selectBlock(id, additive, toggle);
      });
      el.addEventListener("pointerdown", (e) => {
        var _a, _b, _c;
        if (e.target.isContentEditable) return;
        if (e.target.closest("button")) return;
        if (e.target.closest(".fc-anchor")) return;
        const rect = el.getBoundingClientRect();
        const state = this.deps.getState();
        let selected = state.multiSelect && state.multiSelect.length ? state.multiSelect : [id];
        if (!selected.includes(id)) selected = [id];
        const initialPositions = {};
        selected.forEach((bid) => {
          const b = state.blocks[bid];
          if (b) initialPositions[bid] = { ...b.position };
        });
        this.dragContext = { id, offset: { x: e.clientX - rect.left, y: e.clientY - rect.top }, initialPositions };
        el.classList.add("dragging");
        (_b = (_a = this.deps).undoBegin) == null ? void 0 : _b.call(_a, "move-block");
        (_c = this.deps.bus) == null ? void 0 : _c.emit("block:drag:start", { id });
        window.addEventListener("pointermove", this.onPointerMove);
        window.addEventListener("pointerup", this.onPointerUp, { once: true });
      });
      titleEl.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.beginEdit(titleEl, "title", id);
      });
      descEl.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.beginEdit(descEl, "descriptionHtml", id, true);
      });
      propsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openPropertiesEditor(id);
      });
      delBtn.addEventListener("click", (e) => {
        var _a, _b, _c, _d;
        e.stopPropagation();
        (_b = (_a = this.deps).undoBegin) == null ? void 0 : _b.call(_a, "delete-block");
        this.deps.dispatch({ type: "DELETE_BLOCK", id });
        this.removeBlock(id);
        (_d = (_c = this.deps).undoCommit) == null ? void 0 : _d.call(_c);
      });
    }
    selectBlock(id, additive = false, toggle = false) {
      const state = this.deps.getState();
      let current = state.multiSelect || [];
      if (!additive && !toggle) {
        current = [id];
      } else if (toggle) {
        if (current.includes(id)) current = current.filter((b) => b !== id);
        else current = [...current, id];
      } else if (additive) {
        if (!current.includes(id)) current = [...current, id];
      }
      this.deps.dispatch({ type: "SELECT_BLOCK", id });
      this.deps.dispatch({ type: "SET_MULTI_SELECT", ids: current });
      this.root.querySelectorAll(".fc-block").forEach((b) => b.classList.remove("selected"));
      current.forEach((bid) => {
        var _a;
        return (_a = document.getElementById(bid)) == null ? void 0 : _a.classList.add("selected");
      });
    }
    openPropertiesEditor(id) {
      var _a, _b, _c;
      const state = this.deps.getState();
      const blk = state.blocks[id];
      if (!blk) return;
      const popup = document.createElement("div");
      popup.className = "fc-props-popup fade-in";
      popup.innerHTML = `
			<div class="fc-props-header">Block Properties <button class="fc-close fc-btn">\u2715</button></div>
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
      (_a = popup.querySelector(".fc-close")) == null ? void 0 : _a.addEventListener("click", close);
      (_b = popup.querySelector(".fc-cancel")) == null ? void 0 : _b.addEventListener("click", close);
      const saveBtn = popup.querySelector(".fc-save");
      let currentValue = blk.properties;
      const host = popup.querySelector(".fc-json-editor-host");
      const editor = new JsonEditor({
        value: blk.properties,
        onChange: (v) => {
          currentValue = v;
        },
        onValidity: (valid) => {
          saveBtn.disabled = !valid;
        }
      });
      host.appendChild(editor.root);
      setTimeout(() => editor.focus(), 30);
      (_c = popup.querySelector(".fc-save")) == null ? void 0 : _c.addEventListener("click", () => {
        var _a2, _b2, _c2, _d;
        if (saveBtn.disabled) return;
        (_b2 = (_a2 = this.deps).undoBegin) == null ? void 0 : _b2.call(_a2, "edit-properties");
        this.deps.dispatch({ type: "UPDATE_BLOCK", id, patch: { properties: currentValue } });
        (_d = (_c2 = this.deps).undoCommit) == null ? void 0 : _d.call(_c2);
        close();
      });
    }
    beginEdit(el, field, id, rich = false) {
      if (el.querySelector(".fc-wys-editor")) return;
      if (field === "descriptionHtml" && rich) {
        const original2 = el.innerHTML;
        const editor = new WysiwygEditor({
          value: original2,
          onSave: (html) => {
            this.deps.dispatch({ type: "UPDATE_BLOCK", id, patch: { descriptionHtml: html } });
            el.innerHTML = html;
          },
          onCancel: () => {
            el.innerHTML = original2;
          }
        });
        el.innerHTML = "";
        el.appendChild(editor.root);
        setTimeout(() => editor.focus(), 20);
        const finalize = () => {
          const current = el.querySelector(".fc-wys-editor");
          if (current) {
            if (current.parentElement === el) {
            }
          }
        };
        editor.root.addEventListener("click", (e) => {
          const t = e.target;
          if (t.classList.contains("fc-wys-save") || t.classList.contains("fc-wys-cancel")) {
            setTimeout(finalize, 0);
          }
        });
        return;
      }
      if (el.isContentEditable) return;
      const original = field === "title" ? el.textContent || "" : el.innerHTML;
      el.contentEditable = "true";
      el.classList.add("editing");
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const finish = (cancel) => {
        var _a, _b, _c, _d;
        el.contentEditable = "false";
        el.classList.remove("editing");
        if (!cancel) {
          (_b = (_a = this.deps).undoBegin) == null ? void 0 : _b.call(_a, "edit-block");
          if (field === "title") {
            this.deps.dispatch({ type: "UPDATE_BLOCK", id, patch: { title: el.textContent || "" } });
          } else {
            this.deps.dispatch({ type: "UPDATE_BLOCK", id, patch: { descriptionHtml: el.innerHTML } });
          }
          (_d = (_c = this.deps).undoCommit) == null ? void 0 : _d.call(_c);
        } else {
          if (field === "title") el.textContent = original;
          else el.innerHTML = original;
        }
      };
      const keyHandler = (ev) => {
        if (ev.key === "Enter" && field === "title") {
          ev.preventDefault();
          finish(false);
          cleanup();
        } else if (ev.key === "Escape") {
          ev.preventDefault();
          finish(true);
          cleanup();
        } else if (ev.key === "Enter" && field !== "title" && !ev.shiftKey) {
          ev.preventDefault();
          finish(false);
          cleanup();
        }
      };
      const blurHandler = () => {
        finish(false);
        cleanup();
      };
      const cleanup = () => {
        el.removeEventListener("keydown", keyHandler);
        el.removeEventListener("blur", blurHandler);
      };
      el.addEventListener("keydown", keyHandler);
      el.addEventListener("blur", blurHandler, { once: true });
    }
  };

  // src/ConnectionManager.ts
  var ConnectionManager = class {
    constructor(root, deps) {
      __publicField(this, "svg");
      __publicField(this, "deps");
      __publicField(this, "root");
      __publicField(this, "hoverConn", null);
      this.root = root;
      this.deps = deps;
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.svg.classList.add("fc-svg-layer");
      this.root.appendChild(this.svg);
    }
    renderAll() {
      this.svg.innerHTML = "";
      const { connections } = this.deps.getState();
      Object.values(connections).forEach((c) => this.renderConnection(c));
    }
    getSourceAnchor(b) {
      const el = document.getElementById(b.id);
      if (el) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        return { x: b.position.x + w, y: b.position.y + h / 2 };
      }
      return { x: b.position.x + b.size.width, y: b.position.y + b.size.height / 2 };
    }
    getTargetAnchor(b) {
      const el = document.getElementById(b.id);
      if (el) {
        const h = el.offsetHeight;
        return { x: b.position.x, y: b.position.y + h / 2 };
      }
      return { x: b.position.x, y: b.position.y + b.size.height / 2 };
    }
    renderConnection(conn) {
      var _a, _b;
      const state = this.deps.getState();
      const src = state.blocks[conn.source];
      const tgt = state.blocks[conn.target];
      if (!src || !tgt) return;
      const sp = this.getSourceAnchor(src);
      const tp = this.getTargetAnchor(tgt);
      let g = this.svg.querySelector(`[data-id="${conn.id}"]`);
      let path;
      let trash;
      let labelDiv;
      let fObj;
      const mid = { x: (sp.x + tp.x) / 2, y: (sp.y + tp.y) / 2 };
      if (!g) {
        g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.classList.add("fc-conn");
        g.dataset.id = conn.id;
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add("fc-conn-path");
        g.appendChild(path);
        this.addDirectionMarkers(g, sp, tp, conn.style);
        trash = document.createElementNS("http://www.w3.org/2000/svg", "g");
        trash.classList.add("fc-conn-trash");
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("width", "16");
        rect.setAttribute("height", "16");
        rect.setAttribute("rx", "3");
        const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line1.setAttribute("x1", "4");
        line1.setAttribute("y1", "4");
        line1.setAttribute("x2", "12");
        line1.setAttribute("y2", "12");
        line1.setAttribute("stroke", "#ccc");
        const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line2.setAttribute("x1", "12");
        line2.setAttribute("y1", "4");
        line2.setAttribute("x2", "4");
        line2.setAttribute("y2", "12");
        line2.setAttribute("stroke", "#ccc");
        trash.appendChild(rect);
        trash.appendChild(line1);
        trash.appendChild(line2);
        g.appendChild(trash);
        fObj = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        fObj.setAttribute("width", "140");
        fObj.setAttribute("height", "34");
        labelDiv = document.createElement("div");
        labelDiv.className = "fc-conn-label fade";
        labelDiv.textContent = (_a = conn.label) != null ? _a : conn.id;
        fObj.appendChild(labelDiv);
        g.appendChild(fObj);
        labelDiv.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          this.beginLabelEdit(labelDiv, conn.id, labelDiv.textContent || conn.id);
        });
        labelDiv.addEventListener("mouseenter", () => labelDiv.classList.add("hover"));
        labelDiv.addEventListener("mouseleave", () => labelDiv.classList.remove("hover"));
        g.addEventListener("mouseenter", () => path.classList.add("hover"));
        g.addEventListener("mouseleave", () => path.classList.remove("hover"));
        trash.addEventListener("click", (e) => {
          e.stopPropagation();
          this.deleteConnection(conn.id);
        });
        path.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectConnection(conn.id);
        });
        this.svg.appendChild(g);
      } else {
        path = g.querySelector(".fc-conn-path");
        trash = g.querySelector(".fc-conn-trash");
        fObj = g.querySelector("foreignObject");
        labelDiv = fObj.querySelector(".fc-conn-label");
        labelDiv.textContent = (_b = conn.label) != null ? _b : conn.id;
      }
      path.setAttribute("d", this.buildPath(sp, tp, conn.style));
      trash.setAttribute("transform", `translate(${mid.x - 8}, ${mid.y - 8})`);
      this.updateLabelPosition(fObj, mid);
    }
    updateLabelPosition(fObj, mid) {
      const labelOffsetX = -50;
      const labelOffsetY = -28;
      fObj.setAttribute("x", String(mid.x + labelOffsetX));
      fObj.setAttribute("y", String(mid.y + labelOffsetY));
    }
    beginLabelEdit(el, id, original) {
      if (el.isContentEditable) return;
      el.setAttribute("contenteditable", "true");
      el.classList.add("editing");
      el.classList.remove("fade");
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const finish = (cancel) => {
        el.contentEditable = "false";
        el.classList.remove("editing");
        el.classList.add("fade");
        if (!cancel) {
          this.deps.dispatch({ type: "UPDATE_CONNECTION", id, patch: { label: el.textContent || "" } });
        } else {
          el.textContent = original;
        }
      };
      const keyHandler = (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          finish(false);
          cleanup();
        } else if (ev.key === "Escape") {
          ev.preventDefault();
          finish(true);
          cleanup();
        }
      };
      const blurHandler = () => {
        finish(false);
        cleanup();
      };
      const cleanup = () => {
        el.removeEventListener("keydown", keyHandler);
        el.removeEventListener("blur", blurHandler);
      };
      el.addEventListener("keydown", keyHandler);
      el.addEventListener("blur", blurHandler, { once: true });
    }
    addDirectionMarkers(group, sp, tp, style) {
      const markers = 3;
      for (let i = 1; i <= markers; i++) {
        const t = i / (markers + 1);
        const p = this.pointOnPath(sp, tp, style, t);
        const nxt = this.pointOnPath(sp, tp, style, Math.min(t + 0.01, 1));
        const poly = this.buildDirectionPolygon(p, nxt, 9);
        group.appendChild(poly);
      }
      const head = this.buildDirectionPolygon({ x: tp.x, y: tp.y }, tp, 12, true, sp);
      group.appendChild(head);
    }
    pointOnPath(sp, tp, style, t) {
      if (style === "orthogonal") {
        const midX = (sp.x + tp.x) / 2;
        const seg1 = Math.abs(midX - sp.x);
        const seg2 = Math.abs(tp.y - sp.y);
        const seg3 = Math.abs(tp.x - midX);
        const total = seg1 + seg2 + seg3;
        let d = t * total;
        if (d <= seg1) {
          return { x: sp.x + (midX - sp.x) * (d / seg1), y: sp.y };
        }
        d -= seg1;
        if (d <= seg2) {
          return { x: midX, y: sp.y + (tp.y - sp.y) * (d / seg2) };
        }
        d -= seg2;
        return { x: midX + (tp.x - midX) * (d / seg3), y: tp.y };
      }
      const dx = (tp.x - sp.x) * 0.5;
      const c1 = { x: sp.x + dx, y: sp.y };
      const c2 = { x: tp.x - dx, y: tp.y };
      const u = 1 - t;
      const x = u * u * u * sp.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * tp.x;
      const y = u * u * u * sp.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * tp.y;
      return { x, y };
    }
    buildDirectionPolygon(p, nxt, size, solidHead = false, src) {
      const angle = Math.atan2(nxt.y - p.y, nxt.x - p.x);
      const len = size;
      const w = len * 0.6;
      const tipX = p.x + Math.cos(angle) * len;
      const tipY = p.y + Math.sin(angle) * len;
      const leftX = p.x + Math.cos(angle + Math.PI / 2) * w / 2;
      const leftY = p.y + Math.sin(angle + Math.PI / 2) * w / 2;
      const rightX = p.x + Math.cos(angle - Math.PI / 2) * w / 2;
      const rightY = p.y + Math.sin(angle - Math.PI / 2) * w / 2;
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.classList.add("fc-conn-dir");
      poly.setAttribute("points", `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`);
      if (solidHead) poly.classList.add("fc-conn-arrow");
      return poly;
    }
    buildPath(sp, tp, style) {
      if (style === "orthogonal") {
        const midX = (sp.x + tp.x) / 2;
        return `M ${sp.x} ${sp.y} L ${midX} ${sp.y} L ${midX} ${tp.y} L ${tp.x} ${tp.y}`;
      }
      const dx = (tp.x - sp.x) * 0.5;
      const c1x = sp.x + dx;
      const c2x = tp.x - dx;
      return `M ${sp.x} ${sp.y} C ${c1x} ${sp.y}, ${c2x} ${tp.y}, ${tp.x} ${tp.y}`;
    }
    buildArrow(sp, tp) {
      const angle = Math.atan2(tp.y - sp.y, tp.x - sp.x);
      const size = 10;
      const ax = tp.x - Math.cos(angle) * 12;
      const ay = tp.y - Math.sin(angle) * 12;
      const p1x = ax + Math.cos(angle + Math.PI / 2) * size * 0.4;
      const p1y = ay + Math.sin(angle + Math.PI / 2) * size * 0.4;
      const p2x = ax + Math.cos(angle - Math.PI / 2) * size * 0.4;
      const p2y = ay + Math.sin(angle - Math.PI / 2) * size * 0.4;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("fc-conn-arrow");
      path.setAttribute("d", `M ${tp.x} ${tp.y} L ${p1x} ${p1y} L ${p2x} ${p2y} Z`);
      return path;
    }
    addConnection(source, target) {
      var _a;
      if (source === target) return;
      const state = this.deps.getState();
      if (Object.values(state.connections).some((c) => c.source === source && c.target === target)) return;
      const newId = uid("conn");
      const conn = { id: newId, source, target, style: state.connectionStyle, label: newId };
      this.deps.dispatch({ type: "ADD_CONNECTION", connection: conn });
      (_a = this.deps.bus) == null ? void 0 : _a.emit("connection:added", { id: conn.id, sourceId: source, targetId: target });
      return conn.id;
    }
    deleteConnection(id) {
      this.deps.dispatch({ type: "DELETE_CONNECTION", id });
    }
    updateConnectionsForBlock(blockId) {
      const state = this.deps.getState();
      const related = Object.values(state.connections).filter((c) => c.source === blockId || c.target === blockId);
      related.forEach((c) => {
        var _a;
        return (_a = this.svg.querySelector(`[data-id="${c.id}"]`)) == null ? void 0 : _a.remove();
      });
      related.forEach((c) => this.renderConnection(c));
    }
    selectConnection(id) {
      var _a;
      const state = this.deps.getState();
      if (!state.connections[id]) return;
      this.deps.dispatch({ type: "SELECT_CONNECTION", id });
      this.svg.querySelectorAll(".fc-conn").forEach((g) => g.classList.remove("selected"));
      (_a = this.svg.querySelector(`[data-id="${id}"]`)) == null ? void 0 : _a.classList.add("selected");
    }
  };

  // src/toolbar/SaveLoadManager.ts
  var SaveLoadManager = class {
    constructor(deps) {
      this.deps = deps;
    }
    buildDataMenuItems(closeMenus) {
      return [
        { label: "Save Chart", action: () => this.openSaveDialog(closeMenus) },
        { label: "Load Chart", action: () => this.openLoadDialog(closeMenus) },
        { label: "---", action: () => {
        } },
        { label: "Export JSON", action: () => {
          closeMenus();
          this.deps.exportJSON();
        } },
        { label: "Import JSON", action: () => {
          closeMenus();
          this.deps.importJSON();
        } },
        { label: "Clear All", action: () => {
          if (confirm("Clear all blocks and connections?")) {
            this.deps.clearAll();
          }
        }, danger: true }
      ];
    }
    openSaveDialog(closeMenus) {
      var _a, _b;
      closeMenus();
      const backdrop = document.createElement("div");
      backdrop.className = "backdrop";
      const modal = document.createElement("div");
      modal.className = "fc-theme-modal fade-in";
      const applyResponsiveSize = () => {
        const vw = window.innerWidth;
        const target = Math.min(780, Math.max(480, Math.floor(vw * 0.9)));
        modal.style.width = target + "px";
        modal.style.maxHeight = Math.min(window.innerHeight * 0.9, 720) + "px";
      };
      applyResponsiveSize();
      window.addEventListener("resize", applyResponsiveSize, { once: true });
      modal.innerHTML = `<h2>Save Chart</h2><div class="body">
      <div class="hint">Provide a name to save the current chart locally. Existing names require confirmation to overwrite.</div>
      <input type="text" class="chart-name" placeholder="chart-name" style="padding:6px 8px; font-size:13px; border:1px solid var(--fc-border-strong); background:var(--fc-bg); color:var(--fc-text); border-radius:4px;" />
      <div class="err" style="display:none"></div>
    </div>
    <div class="actions">
      <button class="fc-btn" data-act="cancel">Cancel</button>
      <button class="fc-btn primary" data-act="save">Save</button>
    </div>`;
      const remove = () => {
        backdrop.remove();
        modal.remove();
      };
      backdrop.addEventListener("click", remove);
      document.body.appendChild(backdrop);
      document.body.appendChild(modal);
      const nameInput = modal.querySelector(".chart-name");
      const errEl = modal.querySelector(".err");
      (_a = modal.querySelector('[data-act="cancel"]')) == null ? void 0 : _a.addEventListener("click", remove);
      (_b = modal.querySelector('[data-act="save"]')) == null ? void 0 : _b.addEventListener("click", () => {
        errEl.style.display = "none";
        const name = (nameInput.value || "").trim();
        if (!name) {
          errEl.textContent = "Name required";
          errEl.style.display = "block";
          return;
        }
        try {
          const app = window.flowchartApp;
          if (!app) throw new Error("App missing");
          const state = app.store.getState();
          const wrapper = { savedAt: (/* @__PURE__ */ new Date()).toISOString(), state };
          const key = "fc-saved-charts";
          const existingRaw = localStorage.getItem(key);
          let list = existingRaw ? JSON.parse(existingRaw) : [];
          const already = list.find((x) => x.name === name);
          if (already) {
            if (!confirm(`Overwrite existing chart "${name}"?`)) {
              return;
            }
            list = list.filter((x) => x.name !== name);
          } else {
            list = list.filter((x) => x.name !== name);
          }
          list.push({ name, ...wrapper });
          localStorage.setItem(key, JSON.stringify(list));
          this.deps.updateStatus("Saved chart: " + name);
          remove();
        } catch (e) {
          errEl.textContent = "Error: " + e.message;
          errEl.style.display = "block";
        }
      });
      nameInput.focus();
    }
    openLoadDialog(closeMenus) {
      var _a;
      closeMenus();
      const key = "fc-saved-charts";
      let list = [];
      try {
        const raw = localStorage.getItem(key);
        if (raw) list = JSON.parse(raw);
      } catch (e) {
      }
      const backdrop = document.createElement("div");
      backdrop.className = "backdrop";
      const modal = document.createElement("div");
      modal.className = "fc-theme-modal fade-in";
      modal.innerHTML = `<h2>Load Chart</h2><div class="body">
      <div class="hint">Select a chart to load. Current unsaved changes will be lost.</div>
      <div class="toolbar-row" style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:4px 0 6px;">
        <div style="display:flex; gap:6px;">
          <button class="fc-btn small" data-sort="date">Sort: Date</button>
          <button class="fc-btn small" data-sort="name">Sort: Name</button>
        </div>
        <input type="text" placeholder="Search..." class="chart-search" style="flex:1 1 160px; min-width:140px; padding:4px 6px; font-size:12px; border:1px solid var(--fc-border-strong); background:var(--fc-bg); color:var(--fc-text); border-radius:4px;" />
      </div>
      <div class="chart-list" style="display:flex; flex-direction:column; gap:8px; transition:all .15s ease;"></div>
      <div class="pager" style="display:none; justify-content:space-between; align-items:center; margin-top:10px; gap:12px;">
        <button class="fc-btn small" data-page="prev" disabled>Prev</button>
        <div class="page-info" style="font-size:11px; opacity:.75;">Page 1</div>
        <button class="fc-btn small" data-page="next" disabled>Next</button>
      </div>
      <div class="err" style="display:none"></div>
    </div>
    <div class="actions">
      <button class="fc-btn" data-act="close">Close</button>
    </div>`;
      const remove = () => {
        backdrop.remove();
        modal.remove();
      };
      backdrop.addEventListener("click", remove);
      document.body.appendChild(backdrop);
      document.body.appendChild(modal);
      (_a = modal.querySelector('[data-act="close"]')) == null ? void 0 : _a.addEventListener("click", remove);
      const listEl = modal.querySelector(".chart-list");
      const errEl = modal.querySelector(".err");
      const searchInput = modal.querySelector(".chart-search");
      const pagerEl = modal.querySelector(".pager");
      const prevBtn = pagerEl.querySelector('[data-page="prev"]');
      const nextBtn = pagerEl.querySelector('[data-page="next"]');
      const pageInfo = pagerEl.querySelector(".page-info");
      let sortMode = "date";
      let filterText = "";
      let page = 1;
      const pageSize = 24;
      const validateState = (obj) => {
        if (!obj || typeof obj !== "object") return "State not an object";
        if (!obj.blocks || typeof obj.blocks !== "object") return "Missing blocks map";
        if (!obj.connections || typeof obj.connections !== "object") return "Missing connections map";
        for (const [id, b] of Object.entries(obj.blocks)) {
          if (!b || typeof b !== "object") return "Invalid block entry";
          if (b.id !== id) return "Block id mismatch";
          if (typeof b.kind !== "string") return "Block kind missing";
          if (!b.position || typeof b.position.x !== "number" || typeof b.position.y !== "number") return "Block position invalid";
          if (!b.size || typeof b.size.width !== "number" || typeof b.size.height !== "number") return "Block size invalid";
        }
        for (const [id, c] of Object.entries(obj.connections)) {
          if (!c || typeof c !== "object") return "Invalid connection entry";
          if (c.id !== id) return "Connection id mismatch";
          if (typeof c.source !== "string" || typeof c.target !== "string") return "Connection endpoints invalid";
        }
        return null;
      };
      const buildRows = (entries) => {
        listEl.innerHTML = "";
        if (entries.length === 0) {
          listEl.innerHTML = '<div style="opacity:.7;font-size:12px;">No saved charts.</div>';
          return;
        }
        const many = entries.length > 12 && window.innerWidth > 900;
        if (many) {
          listEl.style.display = "grid";
          listEl.style.gridTemplateColumns = "1fr 1fr";
        } else {
          listEl.style.display = "flex";
          listEl.style.flexDirection = "column";
        }
        entries.forEach((entry) => {
          const row = document.createElement("div");
          row.className = "fc-menu-item";
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.gap = "8px";
          row.style.height = "auto";
          const loadBtn = document.createElement("button");
          loadBtn.className = "fc-btn small";
          loadBtn.textContent = "Load";
          const delBtn = document.createElement("button");
          delBtn.className = "fc-btn small danger";
          delBtn.textContent = "\u2715";
          const meta = document.createElement("div");
          meta.style.display = "flex";
          meta.style.flexDirection = "column";
          meta.style.alignItems = "flex-start";
          meta.style.flex = "1 1 auto";
          const time = new Date(entry.savedAt).toLocaleString();
          meta.innerHTML = `<span style="font-size:12px;">${entry.name}</span><span style="opacity:.6;font-size:10px;">${time}</span>`;
          loadBtn.addEventListener("click", (ev) => {
            var _a2, _b, _c, _d, _e, _f;
            ev.stopPropagation();
            try {
              const app = window.flowchartApp;
              if (!app) throw new Error("App missing");
              const err = validateState(entry.state);
              if (err) {
                alert("Invalid saved chart: " + err);
                return;
              }
              app.store.dispatch({ type: "BULK_SET_STATE", state: entry.state });
              (_a2 = app["blockManager"]) == null ? void 0 : _a2.renderAll();
              (_b = app["connectionManager"]) == null ? void 0 : _b.renderAll();
              (_c = app["applyViewport"]) == null ? void 0 : _c.call(app);
              (_d = app["applyGridOverlay"]) == null ? void 0 : _d.call(app);
              (_e = app["undoBegin"]) == null ? void 0 : _e.call(app, "load-chart");
              (_f = app["undoCommit"]) == null ? void 0 : _f.call(app);
              this.deps.updateStatus("Loaded chart: " + entry.name);
              remove();
            } catch (e) {
              alert("Failed to load chart: " + e.message);
            }
          });
          delBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            if (!confirm(`Delete saved chart "${entry.name}"? This cannot be undone.`)) return;
            list = list.filter((x) => x !== entry);
            try {
              localStorage.setItem(key, JSON.stringify(list));
            } catch (e) {
            }
            render();
          });
          row.appendChild(loadBtn);
          row.appendChild(meta);
          row.appendChild(delBtn);
          listEl.appendChild(row);
        });
      };
      const filterAndSlice = () => {
        if (list.length === 0) {
          buildRows([]);
          pagerEl.style.display = "none";
          return;
        }
        if (sortMode === "date") list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        else list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        const filtered = filterText ? list.filter((e) => (e.name || "").toLowerCase().includes(filterText)) : list.slice();
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        if (page > totalPages) page = totalPages;
        const start = (page - 1) * pageSize;
        const pageEntries = filtered.slice(start, start + pageSize);
        buildRows(pageEntries);
        if (filtered.length > pageSize) {
          pagerEl.style.display = "flex";
          prevBtn.disabled = page === 1;
          nextBtn.disabled = page === totalPages;
          pageInfo.textContent = `Page ${page} / ${totalPages} (${filtered.length} items)`;
        } else {
          pagerEl.style.display = "none";
        }
      };
      const render = () => {
        filterAndSlice();
      };
      modal.querySelectorAll("[data-sort]").forEach((btn) => {
        btn.addEventListener("click", () => {
          sortMode = btn.getAttribute("data-sort") === "name" ? "name" : "date";
          page = 1;
          render();
        });
      });
      const doFilter = () => {
        filterText = (searchInput.value || "").trim().toLowerCase();
        page = 1;
        render();
      };
      let filterTimer;
      searchInput.addEventListener("input", () => {
        clearTimeout(filterTimer);
        filterTimer = setTimeout(doFilter, 160);
      });
      prevBtn.addEventListener("click", () => {
        if (page > 1) {
          page--;
          render();
        }
      });
      nextBtn.addEventListener("click", () => {
        page++;
        render();
      });
      render();
    }
  };

  // src/toolbar/ThemeMenu.ts
  var ThemeMenu = class {
    constructor(deps) {
      this.deps = deps;
      __publicField(this, "currentMenu", null);
    }
    open(btn, closeMenus) {
      var _a;
      if (btn.getAttribute("data-open") === "true") {
        this.closeMenu(closeMenus);
        return;
      }
      closeMenus();
      const menu = document.createElement("div");
      menu.className = "fc-menu";
      menu.dataset.menu = "theme";
      this.currentMenu = menu;
      const themes = [
        "dark",
        "light",
        "high-contrast",
        "blue",
        "green",
        "purple",
        "light-blue",
        "light-green",
        "light-orange",
        "light-gray",
        "light-contrast"
      ];
      const tm = (_a = window.flowchartApp) == null ? void 0 : _a.themeManager;
      themes.forEach((name) => {
        const item = document.createElement("button");
        item.className = "fc-menu-item theme-item";
        const sw = document.createElement("div");
        sw.className = "fc-theme-swatch";
        const stack = document.createElement("div");
        stack.className = "fc-theme-swatch-stack";
        const a = document.createElement("span");
        const b = document.createElement("span");
        let pv;
        if (tm && tm.ensurePreviewForBuiltin) {
          pv = tm.ensurePreviewForBuiltin(name);
          a.style.background = pv.bg;
          b.style.background = pv.accent;
        } else {
          a.style.background = "#ffffff";
          b.style.background = "#4ea1ff";
        }
        stack.appendChild(a);
        stack.appendChild(b);
        sw.appendChild(stack);
        const labelWrap = document.createElement("div");
        labelWrap.className = "label-wrap";
        labelWrap.innerHTML = `<span>${name}</span>`;
        item.appendChild(sw);
        item.appendChild(labelWrap);
        item.addEventListener("click", () => {
          this.deps.setTheme(name);
          this.deps.updateStatus("Theme: " + name);
          this.closeMenu(closeMenus);
        });
        menu.appendChild(item);
      });
      const sep = document.createElement("div");
      sep.className = "fc-menu-group-sep";
      menu.appendChild(sep);
      const customBtn = document.createElement("button");
      customBtn.className = "fc-menu-item";
      customBtn.textContent = "Add Custom Theme";
      customBtn.addEventListener("click", () => {
        this.closeMenu(closeMenus);
        this.openCustomThemeModal();
      });
      menu.appendChild(customBtn);
      document.body.appendChild(menu);
      const rect = btn.getBoundingClientRect();
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      let top = rect.top - menu.offsetHeight - 8;
      let left = rect.left - menu.offsetWidth + rect.width;
      if (top < 0) top = rect.bottom + 8;
      if (left + menu.offsetWidth > vpW - 4) left = vpW - menu.offsetWidth - 4;
      if (left < 4) left = 4;
      if (top + menu.offsetHeight > vpH - 4) top = Math.max(4, vpH - menu.offsetHeight - 4);
      menu.style.top = top + "px";
      menu.style.left = left + "px";
      btn.setAttribute("data-open", "true");
      const onPointerDown = (e) => {
        if (!this.currentMenu) return;
        if (!e.target.closest(".fc-menu") && !e.target.closest('[data-menu-btn="theme"]')) {
          this.closeMenu(closeMenus);
          window.removeEventListener("pointerdown", onPointerDown, true);
          window.removeEventListener("keydown", onKeyDown, true);
        }
      };
      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          this.closeMenu(closeMenus);
          window.removeEventListener("pointerdown", onPointerDown, true);
          window.removeEventListener("keydown", onKeyDown, true);
        }
      };
      window.addEventListener("pointerdown", onPointerDown, true);
      window.addEventListener("keydown", onKeyDown, true);
    }
    openCustomThemeModal() {
      var _a, _b;
      const backdrop = document.createElement("div");
      backdrop.className = "backdrop";
      const modal = document.createElement("div");
      modal.className = "fc-theme-modal fade-in";
      modal.innerHTML = `<h2>Custom Theme</h2><div class="body">
      <div class="hint">Paste JSON mapping of CSS variables to values. Only keys starting with <code>--fc-</code> are applied.</div>
      <input type="text" placeholder="theme-name" class="name" style="padding:6px 8px; font-size:13px; border:1px solid var(--fc-border-strong); background:var(--fc-bg); color:var(--fc-text); border-radius:4px;" />
      <textarea class="vars" placeholder='{"--fc-bg":"#ffffff","--fc-accent":"#2563eb","--fc-text":"#111827"}'></textarea>
      <div class="err" style="display:none"></div>
    </div>
    <div class="actions">
      <button class="fc-btn" data-act="cancel">Cancel</button>
      <button class="fc-btn primary" data-act="save">Save Theme</button>
    </div>`;
      const remove = () => {
        backdrop.remove();
        modal.remove();
      };
      backdrop.addEventListener("click", remove);
      document.body.appendChild(backdrop);
      document.body.appendChild(modal);
      const nameInput = modal.querySelector(".name");
      const textarea = modal.querySelector(".vars");
      const errEl = modal.querySelector(".err");
      (_a = modal.querySelector('[data-act="cancel"]')) == null ? void 0 : _a.addEventListener("click", remove);
      (_b = modal.querySelector('[data-act="save"]')) == null ? void 0 : _b.addEventListener("click", () => {
        var _a2, _b2;
        errEl.style.display = "none";
        const name = (nameInput.value || "").trim();
        if (!name) {
          errEl.textContent = "Name required";
          errEl.style.display = "block";
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(textarea.value || "{}");
        } catch (e) {
          errEl.textContent = "Invalid JSON: " + e.message;
          errEl.style.display = "block";
          return;
        }
        const filtered = {};
        Object.entries(parsed).forEach(([k, v]) => {
          if (k.startsWith("--fc-") && typeof v === "string") filtered[k] = v;
        });
        if (Object.keys(filtered).length === 0) {
          errEl.textContent = "No valid --fc- variables found.";
          errEl.style.display = "block";
          return;
        }
        if ((_b2 = (_a2 = window.flowchartApp) == null ? void 0 : _a2.themeManager) == null ? void 0 : _b2.registerCustom) {
          window.flowchartApp.themeManager.registerCustom(name, filtered);
        }
        this.deps.setTheme(name);
        this.deps.updateStatus("Theme: " + name + " (custom)");
        remove();
      });
    }
    closeMenu(closeMenus) {
      if (this.currentMenu) {
        this.currentMenu.remove();
        this.currentMenu = null;
      }
      closeMenus();
    }
  };

  // src/toolbar/ArrangeMenu.ts
  var ArrangeMenu = class {
    constructor(deps) {
      this.deps = deps;
    }
    buildItems() {
      return [
        { label: "Align Left", action: () => this.deps.arrange("align-left") },
        { label: "Align Center", action: () => this.deps.arrange("align-center") },
        { label: "Align Right", action: () => this.deps.arrange("align-right") },
        { label: "Align Top", action: () => this.deps.arrange("align-top") },
        { label: "Align Middle", action: () => this.deps.arrange("align-middle") },
        { label: "Align Bottom", action: () => this.deps.arrange("align-bottom") },
        { label: "---", action: () => {
        } },
        { label: "Distribute Horizontal", action: () => this.deps.arrange("dist-h") },
        { label: "Distribute Vertical", action: () => this.deps.arrange("dist-v") }
      ];
    }
  };

  // src/toolbar/ConnectionStyleMenu.ts
  var ConnectionStyleMenu = class {
    constructor(deps) {
      this.deps = deps;
    }
    buildItems() {
      return [
        { label: "Bezier", action: () => {
          this.deps.setConnectionStyle("bezier");
          this.deps.updateStatus("Style: bezier");
        } },
        { label: "Orthogonal", action: () => {
          this.deps.setConnectionStyle("orthogonal");
          this.deps.updateStatus("Style: orthogonal");
        } }
      ];
    }
  };

  // src/Toolbar.ts
  var Toolbar = class {
    constructor(container, deps) {
      __publicField(this, "deps");
      __publicField(this, "root");
      __publicField(this, "openMenus", {});
      // Extracted feature modules
      __publicField(this, "saveLoad");
      __publicField(this, "themeMenu");
      __publicField(this, "arrangeMenu");
      __publicField(this, "styleMenu");
      this.deps = deps;
      this.root = document.createElement("div");
      this.root.className = "fc-toolbar";
      this.root.innerHTML = `
      <button title="Undo" data-act="undo">\u21BA</button>
      <button title="Redo" data-act="redo">\u21BB</button>
      <button title="Add Block" data-menu-btn="add">\u2795</button>
      <button title="Connection Style" data-menu-btn="style">\u{1F9EC}</button>
      <button title="Data" data-menu-btn="data">\u{1F5C2}</button>
      <button title="Theme" data-menu-btn="theme">\u{1F3A8}</button>
      <button title="Grid" data-act="grid">#</button>
  <button title="Arrange" data-menu-btn="arrange">\u{1F4D0}</button>
  <button title="Reset View" data-act="resetView">\u{1F9ED}</button>
  <button title="Minimap" data-act="minimap">\u{1F5FA}</button>
    `;
      container.appendChild(this.root);
      this.saveLoad = new SaveLoadManager(deps);
      this.themeMenu = new ThemeMenu(deps);
      this.arrangeMenu = new ArrangeMenu(deps);
      this.styleMenu = new ConnectionStyleMenu(deps);
      this.attachEvents();
    }
    getElement() {
      return this.root;
    }
    attachEvents() {
      window.addEventListener("pointerdown", (e) => {
        if (!e.target.closest(".fc-toolbar") && !e.target.closest(".fc-menu")) {
          this.closeAllMenus();
        }
      });
      this.root.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        e.stopPropagation();
        e.preventDefault();
        if (btn.dataset.act) {
          switch (btn.dataset.act) {
            case "resetView":
              this.deps.resetView();
              this.closeAllMenus();
              return;
            case "undo":
              this.deps.undo();
              return;
            case "redo":
              this.deps.redo();
              return;
            case "grid":
              this.deps.toggleGrid();
              btn.classList.toggle("active", this.deps.gridEnabled());
              return;
            case "minimap":
              this.deps.toggleMinimap();
              btn.classList.toggle("active", this.deps.minimapEnabled());
              return;
          }
        }
        if (!btn.dataset.menuBtn) return;
        switch (btn.dataset.menuBtn) {
          case "add":
            return this.toggleMenu("add", btn, [
              { label: "Start", action: () => this.deps.createBlock("start", this.deps.randomPosition()) },
              { label: "Process", action: () => this.deps.createBlock("process", this.deps.randomPosition()) },
              { label: "Decision", action: () => this.deps.createBlock("decision", this.deps.randomPosition()) },
              { label: "I/O", action: () => this.deps.createBlock("io", this.deps.randomPosition()) },
              { label: "End", action: () => this.deps.createBlock("end", this.deps.randomPosition()) }
            ]);
          case "style":
            return this.toggleMenu("style", btn, this.styleMenu.buildItems());
          case "data":
            return this.toggleMenu("data", btn, this.saveLoad.buildDataMenuItems(() => this.closeAllMenus()));
          case "theme":
            return this.themeMenu.open(btn, () => this.closeAllMenus());
          case "arrange":
            return this.toggleMenu("arrange", btn, this.arrangeMenu.buildItems());
        }
      });
    }
    buildMenu(id, items) {
      const menu = document.createElement("div");
      menu.className = "fc-menu";
      menu.dataset.menu = id;
      items.forEach((it) => {
        if (it.label === "---") {
          const sep = document.createElement("div");
          sep.className = "fc-menu-group-sep";
          menu.appendChild(sep);
          return;
        }
        const btn = document.createElement("button");
        btn.className = "fc-menu-item" + (it.danger ? " danger" : "");
        btn.textContent = it.label;
        btn.addEventListener("click", () => {
          it.action();
          this.closeAllMenus();
        });
        menu.appendChild(btn);
      });
      return menu;
    }
    positionMenu(menu, anchorBtn) {
      const rect = anchorBtn.getBoundingClientRect();
      menu.style.top = rect.top - menu.offsetHeight - 8 + "px";
      menu.style.left = rect.left - menu.offsetWidth + rect.width + "px";
      if (parseFloat(menu.style.top) < 0) menu.style.top = rect.bottom + 8 + "px";
    }
    toggleMenu(key, btn, items) {
      if (this.openMenus[key]) {
        this.closeAllMenus();
        return;
      }
      this.closeAllMenus();
      const m = this.buildMenu(key, items);
      document.body.appendChild(m);
      this.positionMenu(m, btn);
      this.openMenus[key] = m;
      btn.setAttribute("data-open", "true");
    }
    // Feature modules now own theme modal & save/load dialogs.
    closeAllMenus() {
      Object.values(this.openMenus).forEach((m) => m.remove());
      Object.keys(this.openMenus).forEach((k) => delete this.openMenus[k]);
      this.root.querySelectorAll('[data-open="true"]').forEach((b) => b.removeAttribute("data-open"));
    }
  };

  // src/AutoCreatePopup.ts
  var AutoCreatePopup = class {
    constructor(deps) {
      __publicField(this, "deps");
      this.deps = deps;
    }
    show(sourceId, at) {
      var _a, _b;
      const kinds = [
        { kind: "process", label: "Process" },
        { kind: "decision", label: "Decision" },
        { kind: "io", label: "I/O" },
        { kind: "end", label: "End" }
      ];
      const popup = document.createElement("div");
      popup.className = "fc-auto-popup fade-in";
      popup.innerHTML = `
      <div class="fc-auto-header">Create block?<button class="fc-close" aria-label="Close">\u2715</button></div>
      <div class="fc-auto-body">
        <p style="margin:0 0 6px; font-size:12px; opacity:.8;">Add a new block here and connect from source.</p>
        <div class="fc-auto-list"></div>
        <div class="fc-auto-actions">
          <button class="fc-btn fc-cancel">Cancel</button>
        </div>
      </div>
    `;
      document.body.appendChild(popup);
      const list = popup.querySelector(".fc-auto-list");
      kinds.forEach((k) => {
        const btn = document.createElement("button");
        btn.className = "fc-btn kind";
        btn.textContent = k.label;
        btn.addEventListener("click", () => {
          const newPos = { x: at.x, y: at.y - 40 };
          this.deps.createBlock(k.kind, newPos);
          const blocks = this.deps.getBlocks();
          let newBlockId = null;
          for (const bId of Object.keys(blocks)) {
            const b = blocks[bId];
            if (Math.abs(b.position.x - newPos.x) < 2 && Math.abs(b.position.y - newPos.y) < 2) {
              newBlockId = bId;
            }
          }
          if (newBlockId) {
            this.deps.addConnection(sourceId, newBlockId);
          }
          popup.remove();
        });
        list.appendChild(btn);
      });
      (_a = popup.querySelector(".fc-cancel")) == null ? void 0 : _a.addEventListener("click", () => popup.remove());
      (_b = popup.querySelector(".fc-close")) == null ? void 0 : _b.addEventListener("click", () => popup.remove());
    }
  };

  // src/config.ts
  var DEFAULT_CANVAS_WIDTH = 4e3;
  var DEFAULT_CANVAS_HEIGHT = 4e3;
  var StaticCanvasDimensions = class {
    getCanvasWidth() {
      return DEFAULT_CANVAS_WIDTH;
    }
    getCanvasHeight() {
      return DEFAULT_CANVAS_HEIGHT;
    }
  };
  var defaultCanvasDimensions = new StaticCanvasDimensions();

  // src/reducer.ts
  function reducer(state, action) {
    var _a, _b, _c, _d, _e;
    switch (action.type) {
      case "ADD_BLOCK": {
        return { ...state, blocks: { ...state.blocks, [action.block.id]: action.block }, historyVersion: state.historyVersion + 1 };
      }
      case "UPDATE_BLOCK": {
        const existing = state.blocks[action.id];
        if (!existing) return state;
        return { ...state, blocks: { ...state.blocks, [action.id]: { ...existing, ...action.patch } }, historyVersion: state.historyVersion + 1 };
      }
      case "MOVE_BLOCK": {
        const blk = state.blocks[action.id];
        if (!blk) return state;
        let pos = action.position;
        if (((_a = state.grid) == null ? void 0 : _a.enabled) && state.grid.snap) {
          const size = state.grid.size || 20;
          pos = { x: Math.round(pos.x / size) * size, y: Math.round(pos.y / size) * size };
        }
        const CANVAS_W = DEFAULT_CANVAS_WIDTH;
        const CANVAS_H = DEFAULT_CANVAS_HEIGHT;
        let maxX = CANVAS_W - blk.size.width;
        if (maxX < 0) maxX = 0;
        let maxY = CANVAS_H - blk.size.height;
        if (maxY < 0) maxY = 0;
        if (pos.x < 0) pos = { ...pos, x: 0 };
        else if (pos.x > maxX) pos = { ...pos, x: maxX };
        if (pos.y < 0) pos = { ...pos, y: 0 };
        else if (pos.y > maxY) pos = { ...pos, y: maxY };
        if (blk.position.x === pos.x && blk.position.y === pos.y) return state;
        return { ...state, blocks: { ...state.blocks, [action.id]: { ...blk, position: pos } }, historyVersion: state.historyVersion + 1 };
      }
      case "DELETE_BLOCK": {
        if (!state.blocks[action.id]) return state;
        const { [action.id]: _, ...rest } = state.blocks;
        const filteredConns = {};
        Object.values(state.connections).forEach((c) => {
          if (c.source !== action.id && c.target !== action.id) filteredConns[c.id] = c;
        });
        const ms = state.multiSelect ? state.multiSelect.filter((id) => id !== action.id) : [];
        return { ...state, blocks: rest, connections: filteredConns, selection: {}, multiSelect: ms, historyVersion: state.historyVersion + 1 };
      }
      case "ADD_CONNECTION": {
        return { ...state, connections: { ...state.connections, [action.connection.id]: action.connection }, historyVersion: state.historyVersion + 1 };
      }
      case "UPDATE_CONNECTION": {
        const existing = state.connections[action.id];
        if (!existing) return state;
        return { ...state, connections: { ...state.connections, [action.id]: { ...existing, ...action.patch } }, historyVersion: state.historyVersion + 1 };
      }
      case "DELETE_CONNECTION": {
        const { [action.id]: __, ...rest } = state.connections;
        return { ...state, connections: rest, selection: state.selection.connectionId === action.id ? {} : state.selection, historyVersion: state.historyVersion + 1 };
      }
      case "SET_CONNECTION_STYLE": {
        if (state.connectionStyle === action.style) return state;
        const updatedConns = {};
        Object.values(state.connections).forEach((c) => {
          updatedConns[c.id] = { ...c, style: action.style };
        });
        return { ...state, connectionStyle: action.style, connections: updatedConns, historyVersion: state.historyVersion + 1 };
      }
      case "START_CONNECTION_DRAFT": {
        return { ...state, connectionDraft: { sourceBlock: action.sourceBlock, currentPoint: action.point } };
      }
      case "UPDATE_CONNECTION_DRAFT": {
        if (!state.connectionDraft) return state;
        return { ...state, connectionDraft: { ...state.connectionDraft, currentPoint: action.point } };
      }
      case "CANCEL_CONNECTION_DRAFT": {
        const { connectionDraft, ...rest } = state;
        return { ...rest };
      }
      case "SELECT_BLOCK": {
        return { ...state, selection: { blockId: action.id } };
      }
      case "SELECT_CONNECTION": {
        return { ...state, selection: { connectionId: action.id } };
      }
      case "SET_MULTI_SELECT": {
        return { ...state, multiSelect: [...action.ids] };
      }
      case "SET_VIEWPORT": {
        return { ...state, viewport: { ...state.viewport, ...action.viewport } };
      }
      case "SET_GRID": {
        const current = state.grid || { enabled: false, size: 20, snap: true };
        return { ...state, grid: { enabled: (_b = action.grid.enabled) != null ? _b : current.enabled, size: (_c = action.grid.size) != null ? _c : current.size, snap: (_d = action.grid.snap) != null ? _d : current.snap } };
      }
      case "INCREMENT_HISTORY": {
        return { ...state, historyVersion: state.historyVersion + 1 };
      }
      case "BULK_SET_STATE": {
        return { ...state, ...action.state };
      }
      case "MULTIDRAG_BLOCKS": {
        if (!action.changes.length) return state;
        const CANVAS_W = DEFAULT_CANVAS_WIDTH;
        const CANVAS_H = DEFAULT_CANVAS_HEIGHT;
        const updated = { ...state.blocks };
        const snapped = [];
        for (const ch of action.changes) {
          const blk = updated[ch.id];
          if (!blk) continue;
          let pos = ch.position;
          if (((_e = state.grid) == null ? void 0 : _e.enabled) && state.grid.snap) {
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
        if (minX < 0) adjustX = -minX;
        if (minY < 0) adjustY = -minY;
        if (maxX + adjustX > CANVAS_W) adjustX += CANVAS_W - (maxX + adjustX);
        if (maxY + adjustY > CANVAS_H) adjustY += CANVAS_H - (maxY + adjustY);
        let changed = false;
        for (const s of snapped) {
          const blk = updated[s.id];
          if (!blk) continue;
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

  // src/Store.ts
  var Store = class {
    constructor() {
      __publicField(this, "state", initialState());
      __publicField(this, "listeners", /* @__PURE__ */ new Set());
    }
    dispatch(action) {
      this.state = reducer(this.state, action);
      this.listeners.forEach((l) => l());
    }
    getState() {
      return this.state;
    }
    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }
    replaceState(next) {
      this.state = next;
      this.listeners.forEach((l) => l());
    }
  };

  // src/EventBus.ts
  var EventBus = class {
    constructor() {
      __publicField(this, "handlers", {});
    }
    on(evt, handler) {
      var _a;
      ((_a = this.handlers)[evt] || (_a[evt] = /* @__PURE__ */ new Set())).add(handler);
      return () => this.off(evt, handler);
    }
    off(evt, handler) {
      var _a;
      (_a = this.handlers[evt]) == null ? void 0 : _a.delete(handler);
    }
    emit(evt, payload) {
      var _a;
      (_a = this.handlers[evt]) == null ? void 0 : _a.forEach((h) => h(payload));
    }
  };

  // src/ViewportController.ts
  var ViewportController = class {
    constructor(canvas, store, bus) {
      __publicField(this, "canvas");
      __publicField(this, "store");
      __publicField(this, "panOrigin", null);
      __publicField(this, "isPanning", false);
      __publicField(this, "raf", false);
      __publicField(this, "bus");
      __publicField(this, "pinchStartDistance", null);
      this.canvas = canvas;
      this.store = store;
      this.bus = bus;
    }
    startPan(clientX, clientY) {
      this.isPanning = true;
      this.panOrigin = { x: clientX, y: clientY };
      this.canvas.classList.add("grabbing");
    }
    endPan() {
      this.isPanning = false;
      this.panOrigin = null;
      this.canvas.classList.remove("grabbing");
    }
    handlePointerMove(e) {
      if (!this.isPanning || !this.panOrigin) return;
      const st = this.store.getState();
      const dx = e.clientX - this.panOrigin.x;
      const dy = e.clientY - this.panOrigin.y;
      this.panOrigin = { x: e.clientX, y: e.clientY };
      this.store.dispatch({ type: "SET_VIEWPORT", viewport: { offset: { x: st.viewport.offset.x + dx, y: st.viewport.offset.y + dy } } });
      this.apply();
    }
    wheelZoom(e, screenToLocal) {
      if (!e.ctrlKey) return false;
      e.preventDefault();
      const st = this.store.getState();
      const before = screenToLocal(e.clientX, e.clientY);
      const scale = clamp(st.viewport.scale * (e.deltaY < 0 ? 1.1 : 0.9), st.viewport.bounds.minScale, st.viewport.bounds.maxScale);
      this.store.dispatch({ type: "SET_VIEWPORT", viewport: { scale } });
      const after = screenToLocal(e.clientX, e.clientY);
      const v = this.store.getState().viewport;
      const adjust = { x: v.offset.x + (after.x - before.x) * scale, y: v.offset.y + (after.y - before.y) * scale };
      this.store.dispatch({ type: "SET_VIEWPORT", viewport: { offset: adjust } });
      this.apply();
      return true;
    }
    touchStart(e) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.pinchStartDistance = Math.hypot(dx, dy);
      }
    }
    touchMove(e, screenToLocal) {
      if (e.touches.length === 2 && this.pinchStartDistance) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const st = this.store.getState();
        const scale = clamp(st.viewport.scale * (dist / this.pinchStartDistance), st.viewport.bounds.minScale, st.viewport.bounds.maxScale);
        this.pinchStartDistance = dist;
        this.store.dispatch({ type: "SET_VIEWPORT", viewport: { scale } });
        this.apply();
      }
    }
    apply() {
      var _a;
      const { viewport } = this.store.getState();
      this.canvas.style.transform = `translate(${viewport.offset.x}px, ${viewport.offset.y}px) scale(${viewport.scale})`;
      (_a = this.bus) == null ? void 0 : _a.emit("viewport:change", { scale: viewport.scale, offset: { x: viewport.offset.x, y: viewport.offset.y } });
    }
  };

  // src/ConnectionDraftController.ts
  var ConnectionDraftController = class {
    constructor(canvas, store, bus, connectionManager) {
      __publicField(this, "store");
      __publicField(this, "bus");
      __publicField(this, "connectionManager");
      __publicField(this, "canvas");
      __publicField(this, "draftLine", null);
      this.canvas = canvas;
      this.store = store;
      this.bus = bus;
      this.connectionManager = connectionManager;
    }
    startDraft(sourceBlockId, startPoint) {
      this.store.dispatch({ type: "START_CONNECTION_DRAFT", sourceBlock: sourceBlockId, point: startPoint });
      this.ensureDraftPath();
      this.bus.emit("connection:draft:start", { sourceId: sourceBlockId });
    }
    updateDraft(currentPoint) {
      const st = this.store.getState();
      if (!st.connectionDraft || !this.draftLine) return;
      this.store.dispatch({ type: "UPDATE_CONNECTION_DRAFT", point: currentPoint });
      const refreshed = this.store.getState();
      const srcBlk = refreshed.blocks[refreshed.connectionDraft.sourceBlock];
      if (!srcBlk) return;
      const srcEl = document.getElementById(srcBlk.id);
      const w = srcEl ? srcEl.offsetWidth : srcBlk.size.width;
      const h = srcEl ? srcEl.offsetHeight : srcBlk.size.height;
      const start = { x: srcBlk.position.x + w, y: srcBlk.position.y + h / 2 };
      const style = refreshed.connectionStyle;
      if (style === "orthogonal") {
        const midX = (start.x + currentPoint.x) / 2;
        this.draftLine.setAttribute("d", `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${currentPoint.y} L ${currentPoint.x} ${currentPoint.y}`);
      } else {
        const dx = (currentPoint.x - start.x) * 0.5;
        const c1x = start.x + dx;
        const c2x = currentPoint.x - dx;
        this.draftLine.setAttribute("d", `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${currentPoint.y}, ${currentPoint.x} ${currentPoint.y}`);
      }
    }
    completeDraft(targetBlockId) {
      const st = this.store.getState();
      if (!st.connectionDraft) return;
      const sourceId = st.connectionDraft.sourceBlock;
      if (targetBlockId && targetBlockId !== sourceId) {
        const id = this.connectionManager.addConnection(sourceId, targetBlockId);
        if (id) {
          this.bus.emit("connection:draft:end", { sourceId, canceled: false, targetId: targetBlockId });
        } else {
          this.bus.emit("connection:draft:end", { sourceId, canceled: true });
        }
      } else {
        this.bus.emit("connection:draft:end", { sourceId, canceled: true });
      }
      this.cleanup();
    }
    cancelDraft() {
      const st = this.store.getState();
      if (!st.connectionDraft) return;
      const sourceId = st.connectionDraft.sourceBlock;
      this.bus.emit("connection:draft:end", { sourceId, canceled: true });
      this.cleanup();
    }
    ensureDraftPath() {
      if (!this.draftLine) {
        const svg = this.connectionManager["svg"];
        this.draftLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.draftLine.setAttribute("stroke", "#4ea1ff");
        this.draftLine.setAttribute("stroke-width", "2");
        this.draftLine.setAttribute("fill", "none");
        svg.appendChild(this.draftLine);
      }
    }
    cleanup() {
      var _a;
      this.store.dispatch({ type: "CANCEL_CONNECTION_DRAFT" });
      (_a = this.draftLine) == null ? void 0 : _a.remove();
      this.draftLine = null;
    }
  };

  // src/UndoManager.ts
  var UndoManager = class {
    constructor(store) {
      __publicField(this, "store");
      __publicField(this, "undoStack", []);
      __publicField(this, "redoStack", []);
      __publicField(this, "opBaseline", null);
      __publicField(this, "opLabel", "");
      this.store = store;
    }
    // Operation lifecycle -----------------------------------------------------
    begin(label) {
      if (this.opBaseline) return;
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
      this.opBaseline = null;
      this.opLabel = "";
    }
    cancel() {
      this.opBaseline = null;
      this.opLabel = "";
    }
    // Equality on structural slices only
    statesEqual(a, b) {
      return JSON.stringify({ blocks: a.blocks, connections: a.connections, viewport: a.viewport, grid: a.grid, style: a.connectionStyle }) === JSON.stringify({ blocks: b.blocks, connections: b.connections, viewport: b.viewport, grid: b.grid, style: b.connectionStyle });
    }
    // Legacy method shims (for tests/external code not yet migrated) ---------
    captureIfChanged() {
    }
    forceCapture() {
      if (!this.opBaseline) {
        this.begin("legacy");
        this.commitIfChanged();
      }
    }
    captureCurrent() {
      this.commitIfChanged();
    }
    // Traversal ---------------------------------------------------------------
    undo() {
      if (this.opBaseline) {
        this.cancel();
      }
      if (this.undoStack.length === 0) return false;
      const snapshot = this.undoStack.pop();
      const current = structuredClone(this.store.getState());
      this.redoStack.push({ state: current, meta: { label: snapshot.meta.label } });
      this.store.replaceState(structuredClone(snapshot.state));
      this.emitDebug();
      return true;
    }
    redo() {
      if (this.opBaseline) {
        this.cancel();
      }
      if (this.redoStack.length === 0) return false;
      const snapshot = this.redoStack.pop();
      const current = structuredClone(this.store.getState());
      this.undoStack.push({ state: current, meta: { label: snapshot.meta.label } });
      this.store.replaceState(structuredClone(snapshot.state));
      this.emitDebug();
      return true;
    }
    run(label, fn) {
      this.begin(label);
      try {
        fn();
      } finally {
        this.commitIfChanged();
      }
    }
    // Debug ------------------------------------------------------------------
    getDebugStacks() {
      var _a, _b;
      return {
        undoDepth: this.undoStack.length,
        redoDepth: this.redoStack.length,
        opActive: !!this.opBaseline,
        opLabel: this.opLabel,
        lastUndoLabel: (_a = this.undoStack[this.undoStack.length - 1]) == null ? void 0 : _a.meta.label,
        lastRedoLabel: (_b = this.redoStack[this.redoStack.length - 1]) == null ? void 0 : _b.meta.label
      };
    }
    emitDebug() {
      window.dispatchEvent(new CustomEvent("fc:undo:debug", { detail: this.getDebugStacks() }));
    }
  };

  // src/layout.ts
  function buildLayout(root, toolbar) {
    root.innerHTML = "";
    root.appendChild(toolbar);
    const workspaceWrapper = document.createElement("div");
    workspaceWrapper.className = "fc-workspace-wrapper";
    const canvas = document.createElement("div");
    canvas.className = "fc-canvas";
    workspaceWrapper.appendChild(canvas);
    root.appendChild(workspaceWrapper);
    const status = document.createElement("div");
    status.className = "fc-status";
    status.id = "fc-status";
    status.textContent = "Ready";
    root.appendChild(status);
    return { root, canvas, status };
  }

  // src/GridManager.ts
  var GridManager = class {
    constructor(store, canvas, bus) {
      this.store = store;
      this.canvas = canvas;
      __publicField(this, "farThreshold", 0.55);
      // below this scale hide minor lines
      __publicField(this, "bus");
      var _a;
      this.bus = bus;
      (_a = this.bus) == null ? void 0 : _a.on("viewport:change", ({ scale }) => this.updateZoomClass(scale));
    }
    apply() {
      var _a;
      const st = this.store.getState();
      if ((_a = st.grid) == null ? void 0 : _a.enabled) this.canvas.classList.add("with-grid");
      else this.canvas.classList.remove("with-grid");
      this.updateZoomClass(this.store.getState().viewport.scale);
    }
    toggle() {
      var _a;
      const st = this.store.getState();
      const enabled = !((_a = st.grid) == null ? void 0 : _a.enabled);
      this.store.dispatch({ type: "SET_GRID", grid: { enabled } });
      this.apply();
      this.persist();
      return enabled;
    }
    restore() {
      const grid = localStorage.getItem("fc-grid");
      if (grid) {
        try {
          const parsed = JSON.parse(grid);
          this.store.dispatch({ type: "SET_GRID", grid: parsed });
          this.apply();
        } catch (e) {
        }
      }
    }
    persist() {
      const g = this.store.getState().grid;
      try {
        localStorage.setItem("fc-grid", JSON.stringify({ enabled: g == null ? void 0 : g.enabled, size: g == null ? void 0 : g.size, snap: g == null ? void 0 : g.snap }));
      } catch (e) {
      }
    }
    updateZoomClass(scale) {
      var _a;
      if (!((_a = this.store.getState().grid) == null ? void 0 : _a.enabled)) {
        this.canvas.classList.remove("grid-zoom-far");
        return;
      }
      if (scale <= this.farThreshold) this.canvas.classList.add("grid-zoom-far");
      else this.canvas.classList.remove("grid-zoom-far");
    }
  };

  // src/ThemeManager.ts
  var CUSTOM_KEY = "fc-custom-themes";
  var PREVIEW_KEY = "fc-theme-previews";
  var ThemeManager = class {
    constructor() {
      __publicField(this, "customThemes", []);
      __publicField(this, "previews", {});
      this.loadCustom();
      this.loadPreviews();
    }
    restore() {
      const saved = localStorage.getItem("fc-theme");
      if (saved) document.documentElement.setAttribute("data-theme", saved);
    }
    persist(theme) {
      try {
        localStorage.setItem("fc-theme", theme);
      } catch (e) {
      }
    }
    set(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      this.persist(theme);
    }
    listThemes(builtin) {
      return [...builtin, ...this.customThemes.map((t) => t.name)];
    }
    getCustomTheme(name) {
      return this.customThemes.find((t) => t.name === name);
    }
    registerCustom(name, vars) {
      const existing = this.customThemes.find((t) => t.name === name);
      if (existing) existing.vars = vars;
      else this.customThemes.push({ name, vars });
      this.applyCustomThemeStyle(name, vars);
      this.saveCustom();
      this.generatePreview(name, vars);
      this.savePreviews();
    }
    removeCustom(name) {
      this.customThemes = this.customThemes.filter((t) => t.name !== name);
      const styleEl = document.getElementById("fc-theme-custom-" + name);
      if (styleEl) styleEl.remove();
      this.saveCustom();
      delete this.previews[name];
      this.savePreviews();
    }
    applyCustomThemeStyle(name, vars) {
      let styleEl = document.getElementById("fc-theme-custom-" + name);
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "fc-theme-custom-" + name;
        document.head.appendChild(styleEl);
      }
      const lines = Object.entries(vars).filter(([k]) => k.startsWith("--fc-")).map(([k, v]) => `  ${k}: ${v};`).join("\n");
      styleEl.textContent = `:root[data-theme="${name}"] {
${lines}
}`;
    }
    loadCustom() {
      try {
        const raw = localStorage.getItem(CUSTOM_KEY);
        if (raw) {
          this.customThemes = JSON.parse(raw);
          this.customThemes.forEach((t) => this.applyCustomThemeStyle(t.name, t.vars));
        }
      } catch (e) {
      }
    }
    saveCustom() {
      try {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(this.customThemes));
      } catch (e) {
      }
    }
    getPreview(name) {
      return this.previews[name];
    }
    ensurePreviewForBuiltin(name) {
      if (this.previews[name]) return this.previews[name];
      const el = document.createElement("div");
      el.setAttribute("data-theme", name);
      const prev = document.documentElement.getAttribute("data-theme");
      document.documentElement.setAttribute("data-theme", name);
      const cs = getComputedStyle(document.documentElement);
      const bg = cs.getPropertyValue("--fc-bg").trim() || "#ffffff";
      const accent = cs.getPropertyValue("--fc-accent").trim() || "#4ea1ff";
      const text = cs.getPropertyValue("--fc-text").trim() || "#222222";
      if (prev) document.documentElement.setAttribute("data-theme", prev);
      else document.documentElement.removeAttribute("data-theme");
      this.previews[name] = { bg, accent, text };
      this.savePreviews();
      return this.previews[name];
    }
    generatePreview(name, vars) {
      const bg = vars["--fc-bg"] || "#ffffff";
      const accent = vars["--fc-accent"] || "#8888ff";
      const text = vars["--fc-text"] || "#222222";
      this.previews[name] = { bg, accent, text };
    }
    loadPreviews() {
      try {
        const raw = localStorage.getItem(PREVIEW_KEY);
        if (raw) this.previews = JSON.parse(raw);
      } catch (e) {
      }
    }
    savePreviews() {
      try {
        localStorage.setItem(PREVIEW_KEY, JSON.stringify(this.previews));
      } catch (e) {
      }
    }
  };

  // src/FileIO.ts
  var FileIO = class {
    constructor(store, statusCb) {
      this.store = store;
      this.statusCb = statusCb;
    }
    exportJSON() {
      const data = JSON.stringify(this.store.getState(), null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "flowchart.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
      this.statusCb("Exported JSON");
    }
    importJSON() {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = ".json";
      inp.onchange = () => {
        var _a;
        const file = (_a = inp.files) == null ? void 0 : _a[0];
        if (!file) return;
        file.text().then((t) => {
          try {
            const parsed = JSON.parse(t);
            this.store.dispatch({ type: "BULK_SET_STATE", state: parsed });
            this.statusCb("Imported");
          } catch (e) {
            alert("Invalid JSON");
          }
        });
      };
      inp.click();
    }
  };

  // src/HotkeysManager.ts
  var HotkeysManager = class {
    constructor(undo, redo) {
      this.undo = undo;
      this.redo = redo;
    }
    attach() {
      window.addEventListener("keydown", (e) => {
        if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "z") {
          e.preventDefault();
          this.undo();
        } else if (e.ctrlKey && e.key.toLowerCase() === "y" || e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z") {
          e.preventDefault();
          this.redo();
        }
      });
    }
  };

  // src/UndoDebugPanel.ts
  var UndoDebugPanel = class {
    constructor() {
      __publicField(this, "root");
      this.root = document.createElement("div");
      this.root.className = "fc-undo-debug";
      this.root.style.cssText = [
        "position:fixed",
        "bottom:8px",
        "right:8px",
        "z-index:9999",
        "font:11px/1.4 monospace",
        "background:var(--fc-bg-alt,rgba(0,0,0,0.7))",
        "color:var(--fc-text,#fff)",
        "padding:6px 8px",
        "border:1px solid var(--fc-border,#444)",
        "border-radius:4px",
        "max-width:220px",
        "box-shadow:0 2px 6px rgba(0,0,0,0.4)"
      ].join(";");
      this.root.innerHTML = '<strong style="font-weight:600;">Undo Debug</strong><div class="fc-ud-body"></div><div class="fc-ud-actions" style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;"></div>';
      const actions = this.root.querySelector(".fc-ud-actions");
      const btnDump = document.createElement("button");
      btnDump.textContent = "Dump";
      btnDump.style.cssText = "flex:1;cursor:pointer;padding:2px 4px;font-size:11px;";
      btnDump.addEventListener("click", () => {
        var _a, _b, _c;
        const detail = (_c = (_b = (_a = window.flowchartApp) == null ? void 0 : _a.undoManager) == null ? void 0 : _b.getDebugStacks) == null ? void 0 : _c.call(_b);
        console.log("[UndoDebug dump]", detail);
      });
      const btnForce = document.createElement("button");
      btnForce.textContent = "ForceCap";
      btnForce.style.cssText = "flex:1;cursor:pointer;padding:2px 4px;font-size:11px;";
      btnForce.addEventListener("click", () => {
        var _a, _b, _c;
        (_c = (_b = (_a = window.flowchartApp) == null ? void 0 : _a.undoManager) == null ? void 0 : _b.forceCapture) == null ? void 0 : _c.call(_b);
      });
      const btnClear = document.createElement("button");
      btnClear.textContent = "Clear";
      btnClear.style.cssText = "flex:1;cursor:pointer;padding:2px 4px;font-size:11px;";
      btnClear.addEventListener("click", () => {
        var _a, _b, _c;
        const um = (_a = window.flowchartApp) == null ? void 0 : _a.undoManager;
        if (!um) return;
        if (confirm("Clear undo/redo stacks?")) {
          um["undoStack"] = [];
          um["redoStack"] = [];
          um["lastVersion"] = ((_c = (_b = window.flowchartApp) == null ? void 0 : _b.store) == null ? void 0 : _c.getState().historyVersion) || 0;
          window.dispatchEvent(new CustomEvent("fc:undo:debug", { detail: um.getDebugStacks() }));
        }
      });
      actions.append(btnDump, btnForce, btnClear);
      document.body.appendChild(this.root);
      window.addEventListener("fc:undo:debug", (e) => this.render(e.detail));
      setTimeout(() => {
        var _a;
        const um = (_a = window.flowchartApp) == null ? void 0 : _a.undoManager;
        if (um) this.render(um.getDebugStacks());
      }, 50);
    }
    render(detail) {
      var _a, _b;
      const body = this.root.querySelector(".fc-ud-body");
      if (!body) return;
      body.innerHTML = `
      <div>undoDepth: ${detail.undoDepth}</div>
      <div>redoDepth: ${detail.redoDepth}</div>
      <div>lastVersion: ${detail.lastVersion}</div>
      <div>topUndo: ${(_a = detail.topUndo) != null ? _a : "-"}</div>
      <div>topRedo: ${(_b = detail.topRedo) != null ? _b : "-"}</div>
    `;
    }
  };

  // src/MinimapManager.ts
  var MinimapManager = class {
    constructor(container, deps) {
      __publicField(this, "deps");
      __publicField(this, "root");
      __publicField(this, "canvas");
      __publicField(this, "ctx");
      __publicField(this, "width", 200);
      __publicField(this, "height", 200);
      __publicField(this, "scaleX", this.width / DEFAULT_CANVAS_WIDTH);
      __publicField(this, "scaleY", this.height / DEFAULT_CANVAS_HEIGHT);
      __publicField(this, "draggingView", false);
      __publicField(this, "dragOffset", null);
      __publicField(this, "rafPending", false);
      this.deps = deps;
      this.root = document.createElement("div");
      this.root.className = "fc-minimap";
      this.root.style.position = "fixed";
      this.root.style.left = "12px";
      this.root.style.bottom = "12px";
      this.root.style.width = this.width + "px";
      this.root.style.height = this.height + "px";
      this.root.style.border = "1px solid var(--fc-border-strong)";
      this.root.style.background = "rgba(0,0,0,0.35)";
      this.root.style.backdropFilter = "blur(2px)";
      this.root.style.cursor = "pointer";
      this.root.style.borderRadius = "4px";
      this.root.style.zIndex = "2000";
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
      this.root.appendChild(this.canvas);
      container.appendChild(this.root);
      const ctx = this.canvas.getContext("2d");
      this.ctx = ctx || {
        clearRect() {
        },
        fillRect() {
        },
        strokeRect() {
        },
        beginPath() {
        },
        moveTo() {
        },
        lineTo() {
        },
        stroke() {
        },
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1
      };
      this.attachEvents();
      this.render();
    }
    attachEvents() {
      this.canvas.addEventListener("mousedown", (e) => {
        const vpRect = this.viewportRect();
        const mx = e.offsetX;
        const my = e.offsetY;
        if (mx >= vpRect.x && my >= vpRect.y && mx <= vpRect.x + vpRect.w && my <= vpRect.y + vpRect.h) {
          this.draggingView = true;
          this.dragOffset = { dx: mx - vpRect.x, dy: my - vpRect.y };
        } else {
          this.centerMainAt(mx, my);
        }
      });
      window.addEventListener("mousemove", (e) => {
        var _a, _b;
        if (!this.draggingView) return;
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const newX = mx - (((_a = this.dragOffset) == null ? void 0 : _a.dx) || 0);
        const newY = my - (((_b = this.dragOffset) == null ? void 0 : _b.dy) || 0);
        this.panViewportToRectOrigin(newX, newY);
      });
      window.addEventListener("mouseup", () => {
        this.draggingView = false;
        this.dragOffset = null;
      });
    }
    state() {
      return this.deps.store.getState();
    }
    viewportRect() {
      const st = this.state();
      const rootEl = document.querySelector(".fc-canvas") || { clientWidth: 1200, clientHeight: 800 };
      const logicalW = rootEl.clientWidth / st.viewport.scale;
      const logicalH = rootEl.clientHeight / st.viewport.scale;
      const vx = st.viewport.offset.x * this.scaleX;
      const vy = st.viewport.offset.y * this.scaleY;
      const vw = logicalW * this.scaleX;
      const vh = logicalH * this.scaleY;
      return { x: vx, y: vy, w: vw, h: vh };
    }
    centerMainAt(mx, my) {
      const st = this.state();
      const rootEl = document.querySelector(".fc-canvas") || { clientWidth: 1200, clientHeight: 800 };
      const logicalW = rootEl.clientWidth / st.viewport.scale;
      const logicalH = rootEl.clientHeight / st.viewport.scale;
      const targetLogicalX = mx / this.scaleX - logicalW / 2;
      const targetLogicalY = my / this.scaleY - logicalH / 2;
      this.deps.store.dispatch({ type: "SET_VIEWPORT", viewport: { offset: { x: targetLogicalX, y: targetLogicalY } } });
      this.deps.applyViewport();
      this.requestRender();
    }
    panViewportToRectOrigin(miniX, miniY) {
      const st = this.state();
      const rootEl = document.querySelector(".fc-canvas") || { clientWidth: 1200, clientHeight: 800 };
      const logicalW = rootEl.clientWidth / st.viewport.scale;
      const logicalH = rootEl.clientHeight / st.viewport.scale;
      const targetLogicalX = miniX / this.scaleX;
      const targetLogicalY = miniY / this.scaleY;
      this.deps.store.dispatch({ type: "SET_VIEWPORT", viewport: { offset: { x: targetLogicalX, y: targetLogicalY } } });
      this.deps.applyViewport();
      this.requestRender();
    }
    requestRender() {
      if (this.rafPending) return;
      this.rafPending = true;
      requestAnimationFrame(() => {
        this.rafPending = false;
        this.render();
      });
    }
    render() {
      const st = this.state();
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = "rgba(255,255,255,0.05)";
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.lineWidth = 1;
      for (const blk of Object.values(st.blocks)) {
        const x = blk.position.x * this.scaleX;
        const y = blk.position.y * this.scaleY;
        const w = blk.size.width * this.scaleX;
        const h = blk.size.height * this.scaleY;
        this.ctx.fillStyle = blk.id === st.selection.blockId ? "rgba(80,160,255,0.9)" : "rgba(255,255,255,0.7)";
        this.ctx.fillRect(x, y, Math.max(2, w), Math.max(2, h));
        this.ctx.strokeStyle = "rgba(0,0,0,0.4)";
        this.ctx.strokeRect(x + 0.5, y + 0.5, Math.max(2, w) - 1, Math.max(2, h) - 1);
      }
      const vp = this.viewportRect();
      this.ctx.strokeStyle = "rgba(255,200,0,0.9)";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(vp.x + 0.5, vp.y + 0.5, vp.w, vp.h);
    }
    notifyStateChange(prev, next) {
      if (prev.blocks !== next.blocks || prev.viewport !== next.viewport || prev.selection !== next.selection) {
        this.requestRender();
      }
    }
    setVisible(on) {
      this.root.style.display = on ? "block" : "none";
    }
    isVisible() {
      return this.root.style.display !== "none";
    }
    getElement() {
      return this.root;
    }
  };

  // src/core/FlowchartApp.ts
  var FlowchartApp = class {
    constructor(root, deps) {
      __publicField(this, "store", new Store());
      __publicField(this, "root");
      __publicField(this, "canvas");
      __publicField(this, "blockManager");
      __publicField(this, "connectionManager");
      __publicField(this, "draftController");
      __publicField(this, "viewportController");
      __publicField(this, "bus", new EventBus());
      __publicField(this, "undoManager", new UndoManager(this.store));
      __publicField(this, "viewportEl");
      __publicField(this, "rafPointer", false);
      __publicField(this, "contentBounds", { minX: 0, minY: 0, maxX: 0, maxY: 0 });
      __publicField(this, "dragMoveActive", false);
      __publicField(this, "marqueeEl", null);
      __publicField(this, "marqueeStart", null);
      __publicField(this, "marqueeActive", false);
      __publicField(this, "minimap");
      __publicField(this, "minimapEnabled", true);
      __publicField(this, "themeManager");
      __publicField(this, "gridManager");
      __publicField(this, "fileIO");
      __publicField(this, "hotkeys");
      __publicField(this, "popup", new AutoCreatePopup({
        createBlock: (k, pos) => this.blockManager.createBlock(k, pos),
        addConnection: (s, t) => this.connectionManager.addConnection(s, t),
        getBlocks: () => this.store.getState().blocks
      }));
      this.root = root;
      try {
        const raw = localStorage.getItem("fc-minimap-enabled");
        if (raw === "0") this.minimapEnabled = false;
        else if (raw === "1") this.minimapEnabled = true;
        localStorage.setItem("fc-minimap-enabled", this.minimapEnabled ? "1" : "0");
      } catch (e) {
      }
      const toolbarContainer = document.createElement("div");
      const layout = buildLayout(root, toolbarContainer);
      this.canvas = layout.canvas;
      this.viewportEl = layout.canvas;
      this.blockManager = new BlockManager(this.canvas, { dispatch: (a) => this.store.dispatch(a), getState: () => this.store.getState(), bus: this.bus });
      this.connectionManager = new ConnectionManager(this.canvas, { dispatch: (a) => this.store.dispatch(a), getState: () => this.store.getState(), bus: this.bus });
      this.draftController = new ConnectionDraftController(this.canvas, this.store, this.bus, this.connectionManager);
      this.viewportController = new ViewportController(this.canvas, this.store, this.bus);
      this.enhanceDispatch();
      this.attachGlobalEvents();
      this.themeManager = (deps == null ? void 0 : deps.themeManager) || new ThemeManager();
      this.themeManager.restore();
      this.gridManager = (deps == null ? void 0 : deps.gridManager) || new GridManager(this.store, this.canvas, this.bus);
      this.gridManager.restore();
      this.fileIO = (deps == null ? void 0 : deps.fileIO) || new FileIO(this.store, (m) => this.updateStatus(m));
      new Toolbar(toolbarContainer, {
        createBlock: (k, pos) => this.undoManager.run("add-block", () => this.blockManager.createBlock(k, pos)),
        setConnectionStyle: (style) => this.undoManager.run("set-conn-style", () => {
          this.store.dispatch({ type: "SET_CONNECTION_STYLE", style });
          this.connectionManager.renderAll();
        }),
        exportJSON: () => this.fileIO.exportJSON(),
        importJSON: () => this.undoManager.run("import-json", () => this.fileIO.importJSON()),
        clearAll: () => this.undoManager.run("clear-all", () => {
          this.store.dispatch({ type: "BULK_SET_STATE", state: initialState() });
          this.blockManager.renderAll();
          this.connectionManager.renderAll();
        }),
        setTheme: (theme) => {
          this.themeManager.set(theme);
        },
        resetView: () => this.undoManager.run("reset-view", () => {
          this.store.dispatch({ type: "SET_VIEWPORT", viewport: { scale: 1, offset: { x: 0, y: 0 } } });
          this.applyViewport();
        }),
        randomPosition: () => this.randomPosition(),
        updateStatus: (m) => this.updateStatus(m),
        undo: () => this.undo(),
        redo: () => this.redo(),
        toggleGrid: () => this.undoManager.run("toggle-grid", () => {
          const on = this.gridManager.toggle();
          this.updateStatus("Grid " + (on ? "on" : "off"));
        }),
        gridEnabled: () => {
          var _a;
          return !!((_a = this.store.getState().grid) == null ? void 0 : _a.enabled);
        },
        arrange: (kind) => this.runArrange(kind),
        toggleMinimap: () => this.toggleMinimap(),
        minimapEnabled: () => this.minimapEnabled
      });
      this.render();
      this.minimap = new MinimapManager(this.root, { store: this.store, applyViewport: () => this.applyViewport() });
      this.minimap.setVisible(this.minimapEnabled);
      this.themeManager = this.themeManager;
      if (this.undoManager.forceCapture) {
        this.undoManager.forceCapture();
      }
    }
    enhanceDispatch() {
      const original = this.store.dispatch.bind(this.store);
      this.store.dispatch = (action) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const isMove = action.type === "MOVE_BLOCK" || action.type === "MULTIDRAG_BLOCKS";
        if (isMove) {
          if (!this.dragMoveActive) {
            (_b = (_a = this.undoManager).begin) == null ? void 0 : _b.call(_a, "move-block");
            this.dragMoveActive = true;
          }
          original(action);
        } else {
          original(action);
          (_d = (_c = this.undoManager).commitIfChanged) == null ? void 0 : _d.call(_c);
          this.dragMoveActive = false;
        }
        const after = this.store.getState();
        (_e = this.minimap) == null ? void 0 : _e.notifyStateChange(this._prevState || after, after);
        this._prevState = after;
        switch (action.type) {
          case "MOVE_BLOCK":
            this.connectionManager.updateConnectionsForBlock(action.id);
            const blk = after.blocks[action.id];
            const el = document.getElementById(action.id);
            if (blk && el) {
              el.style.left = blk.position.x + "px";
              el.style.top = blk.position.y + "px";
            }
            break;
          case "MULTIDRAG_BLOCKS":
            for (const ch of action.changes) {
              this.connectionManager.updateConnectionsForBlock(ch.id);
              const blk2 = after.blocks[ch.id];
              const el2 = document.getElementById(ch.id);
              if (blk2 && el2) {
                el2.style.left = blk2.position.x + "px";
                el2.style.top = blk2.position.y + "px";
              }
            }
            break;
          case "UPDATE_BLOCK":
            if (((_f = action.patch) == null ? void 0 : _f.size) || ((_g = action.patch) == null ? void 0 : _g.position)) this.connectionManager.updateConnectionsForBlock(action.id);
            break;
          case "ADD_CONNECTION":
          case "DELETE_CONNECTION":
          case "SET_CONNECTION_STYLE":
            this.connectionManager.renderAll();
            break;
          case "ADD_BLOCK":
          case "DELETE_BLOCK":
            this.connectionManager.renderAll();
            if (action.type === "DELETE_BLOCK") {
              const el3 = document.getElementById(action.id);
              if (el3) el3.remove();
            }
            break;
        }
        this.updateStatus(`Blocks: ${Object.keys(after.blocks).length} Conns: ${Object.keys(after.connections).length} Zoom: ${(after.viewport.scale * 100).toFixed(0)}%`);
      };
      this.bus.on("block:drag:end", () => {
        var _a, _b;
        if (this.dragMoveActive) {
          (_b = (_a = this.undoManager).commitIfChanged) == null ? void 0 : _b.call(_a);
        }
        this.dragMoveActive = false;
      });
    }
    toggleMinimap() {
      this.minimapEnabled = !this.minimapEnabled;
      if (this.minimap) this.minimap.setVisible(this.minimapEnabled);
      try {
        localStorage.setItem("fc-minimap-enabled", this.minimapEnabled ? "1" : "0");
      } catch (e) {
      }
      this.updateStatus("Minimap " + (this.minimapEnabled ? "on" : "off"));
    }
    randomPosition() {
      return { x: 80 + Math.random() * 400, y: 80 + Math.random() * 300 };
    }
    attachGlobalEvents() {
      this.canvas.addEventListener("pointerdown", (e) => {
        const anchor = e.target.closest(".fc-anchor");
        if (anchor) {
          const blockEl = anchor.parentElement;
          const id = blockEl.id;
          const blk = this.store.getState().blocks[id];
          if (blk) {
            const w = blockEl.offsetWidth;
            const h = blockEl.offsetHeight;
            const startPoint = { x: blk.position.x + w, y: blk.position.y + h / 2 };
            this.draftController.startDraft(id, startPoint);
          }
          e.stopPropagation();
        } else if (e.target === this.canvas) {
          if (e.shiftKey) {
            const pt = this.screenToLocal(e.clientX, e.clientY);
            this.startMarquee(pt);
          } else {
            this.viewportController.startPan(e.clientX, e.clientY);
          }
        }
      });
      window.addEventListener("pointermove", (e) => {
        if (!this.rafPointer) {
          this.rafPointer = true;
          requestAnimationFrame(() => {
            this.rafPointer = false;
            this.onPointerMove(e);
          });
        }
      });
      window.addEventListener("pointerup", (e) => this.onPointerUp(e));
      this.canvas.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
      this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
      this.canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
      window.addEventListener("keydown", (e) => {
        if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !e.target.isContentEditable) {
          const st = this.store.getState();
          if (st.multiSelect && st.multiSelect.length > 1) {
            e.preventDefault();
            this.handleMultiDelete();
          }
        }
        if ((e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey)) {
          const target = e.target;
          if (target && (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
          const blocks = this.store.getState().blocks;
          const ids = Object.keys(blocks);
          if (ids.length) {
            e.preventDefault();
            this.store.dispatch({ type: "SET_MULTI_SELECT", ids });
            this.store.dispatch({ type: "SELECT_BLOCK", id: ids[0] });
            this.applySelectionHighlight(ids);
          }
        }
      });
    }
    onPointerMove(e) {
      this.viewportController.handlePointerMove(e);
      const st = this.store.getState();
      if (this.marqueeActive && this.marqueeStart) {
        const cur = this.screenToLocal(e.clientX, e.clientY);
        this.updateMarquee(cur);
      }
      if (st.connectionDraft) {
        const pt = this.pointerToLocal(e);
        this.draftController.updateDraft(pt);
      }
    }
    onPointerUp(e) {
      this.viewportController.endPan();
      const st = this.store.getState();
      if (this.marqueeActive) {
        this.finishMarquee();
      }
      if (st.connectionDraft) {
        const targetBlock = e.target.closest(".fc-block");
        if (targetBlock && targetBlock.id !== st.connectionDraft.sourceBlock) {
          this.draftController.completeDraft(targetBlock.id);
        } else if (!targetBlock) {
          const dropPoint = this.pointerToLocal(e);
          this.showCreateBlockPopup(st.connectionDraft.sourceBlock, dropPoint);
        } else {
          this.draftController.cancelDraft();
        }
      }
    }
    showCreateBlockPopup(sourceId, at) {
      this.draftController.cancelDraft();
      this.popup.show(sourceId, at);
    }
    onWheel(e) {
      this.viewportController.wheelZoom(e, (x, y) => this.screenToLocal(x, y));
    }
    onTouchStart(e) {
      this.viewportController.touchStart(e);
    }
    onTouchMove(e) {
      this.viewportController.touchMove(e, (x, y) => this.screenToLocal(x, y));
    }
    applyViewport() {
      this.viewportController.apply();
    }
    pointerToLocal(e) {
      return this.screenToLocal(e.clientX, e.clientY);
    }
    screenToLocal(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const st = this.store.getState();
      return { x: (clientX - rect.left) / st.viewport.scale, y: (clientY - rect.top) / st.viewport.scale };
    }
    updateStatus(msg) {
      const el = document.getElementById("fc-status");
      if (!el) return;
      try {
        const st = this.store.getState();
        const count = st.multiSelect ? st.multiSelect.length : st.selection.blockId ? 1 : 0;
        if (count > 0) {
          el.textContent = msg + " Selected: " + count;
        } else {
          el.textContent = msg;
        }
      } catch (e) {
        el.textContent = msg;
      }
    }
    runArrange(kind) {
      const st = this.store.getState();
      const ids = st.multiSelect && st.multiSelect.length ? st.multiSelect : st.selection.blockId ? [st.selection.blockId] : [];
      if (ids.length < 2) {
        this.updateStatus("Arrange requires \u22652 blocks");
        return;
      }
      const blocks = ids.map((id) => st.blocks[id]).filter(Boolean);
      if (blocks.length < 2) return;
      const changes = [];
      const xs = blocks.map((b) => b.position.x);
      const ys = blocks.map((b) => b.position.y);
      const left = Math.min(...xs);
      const right = Math.max(...blocks.map((b) => b.position.x + b.size.width));
      const top = Math.min(...ys);
      const bottom = Math.max(...blocks.map((b) => b.position.y + b.size.height));
      const centerX = (left + right) / 2;
      const middleY = (top + bottom) / 2;
      const byId = {};
      blocks.forEach((b) => byId[b.id] = b);
      const applyPosition = (id, x, y) => {
        const b = byId[id];
        if (!b) return;
        if (b.position.x !== x || b.position.y !== y) changes.push({ id, position: { x, y } });
      };
      if (kind.startsWith("align-")) {
        for (const b of blocks) {
          switch (kind) {
            case "align-left":
              applyPosition(b.id, left, b.position.y);
              break;
            case "align-right":
              applyPosition(b.id, right - b.size.width, b.position.y);
              break;
            case "align-center":
              applyPosition(b.id, Math.round(centerX - b.size.width / 2), b.position.y);
              break;
            case "align-top":
              applyPosition(b.id, b.position.x, top);
              break;
            case "align-bottom":
              applyPosition(b.id, b.position.x, bottom - b.size.height);
              break;
            case "align-middle":
              applyPosition(b.id, b.position.x, Math.round(middleY - b.size.height / 2));
              break;
          }
        }
      } else if (kind === "dist-h" || kind === "dist-v") {
        if (kind === "dist-h") {
          const ordered = [...blocks].sort((a, b) => a.position.x - b.position.x);
          const first = ordered[0];
          const last = ordered[ordered.length - 1];
          const spanTotal = last.position.x + last.size.width - first.position.x;
          if (ordered.length > 2 && spanTotal > 0) {
            const totalWidths = ordered.reduce((s, b) => s + b.size.width, 0);
            const gaps = ordered.length - 1;
            const freeSpace = spanTotal - totalWidths;
            const gapSize = freeSpace / gaps;
            let cursor = first.position.x + first.size.width + gapSize;
            for (let i = 1; i < ordered.length - 1; i++) {
              const b = ordered[i];
              applyPosition(b.id, Math.round(cursor), b.position.y);
              cursor += b.size.width + gapSize;
            }
          }
        } else {
          const ordered = [...blocks].sort((a, b) => a.position.y - b.position.y);
          const first = ordered[0];
          const last = ordered[ordered.length - 1];
          const spanTotal = last.position.y + last.size.height - first.position.y;
          if (ordered.length > 2 && spanTotal > 0) {
            const totalHeights = ordered.reduce((s, b) => s + b.size.height, 0);
            const gaps = ordered.length - 1;
            const freeSpace = spanTotal - totalHeights;
            const gapSize = freeSpace / gaps;
            let cursor = first.position.y + first.size.height + gapSize;
            for (let i = 1; i < ordered.length - 1; i++) {
              const b = ordered[i];
              applyPosition(b.id, b.position.x, Math.round(cursor));
              cursor += b.size.height + gapSize;
            }
          }
        }
      }
      if (!changes.length) {
        this.updateStatus("Arrange: no changes");
        return;
      }
      const existingMap = {};
      blocks.forEach((b) => existingMap[b.id] = { x: b.position.x, y: b.position.y });
      const changedSet = new Set(changes.map((c) => c.id));
      const fullChanges = ids.map((id) => changedSet.has(id) ? changes.find((c) => c.id === id) : { id, position: { ...existingMap[id] } });
      this.undoManager.run("arrange-blocks", () => {
        if (fullChanges.length === 1) {
          this.store.dispatch({ type: "MOVE_BLOCK", id: fullChanges[0].id, position: fullChanges[0].position });
        } else {
          this.store.dispatch({ type: "MULTIDRAG_BLOCKS", changes: fullChanges });
        }
      });
      this.applySelectionHighlight(ids);
    }
    startMarquee(start) {
      this.cancelMarquee();
      this.marqueeStart = start;
      this.marqueeActive = true;
      this.marqueeEl = document.createElement("div");
      this.marqueeEl.className = "fc-marquee";
      this.canvas.appendChild(this.marqueeEl);
    }
    updateMarquee(current) {
      if (!this.marqueeEl || !this.marqueeStart) return;
      const x1 = Math.min(this.marqueeStart.x, current.x);
      const y1 = Math.min(this.marqueeStart.y, current.y);
      const x2 = Math.max(this.marqueeStart.x, current.x);
      const y2 = Math.max(this.marqueeStart.y, current.y);
      this.marqueeEl.style.left = x1 + "px";
      this.marqueeEl.style.top = y1 + "px";
      this.marqueeEl.style.width = x2 - x1 + "px";
      this.marqueeEl.style.height = y2 - y1 + "px";
      const st = this.store.getState();
      const ids = [];
      for (const blk of Object.values(st.blocks)) {
        const bx1 = blk.position.x;
        const by1 = blk.position.y;
        const bx2 = bx1 + blk.size.width;
        const by2 = by1 + blk.size.height;
        if (bx1 >= x1 && by1 >= y1 && bx2 <= x2 && by2 <= y2) ids.push(blk.id);
      }
      this.store.dispatch({ type: "SET_MULTI_SELECT", ids });
      this.store.dispatch({ type: "SELECT_BLOCK", id: ids[0] });
      this.applySelectionHighlight(ids);
    }
    finishMarquee() {
      this.marqueeActive = false;
      this.marqueeStart = null;
      if (this.marqueeEl) {
        this.marqueeEl.remove();
        this.marqueeEl = null;
      }
    }
    cancelMarquee() {
      if (this.marqueeEl) {
        this.marqueeEl.remove();
      }
      this.marqueeEl = null;
      this.marqueeActive = false;
      this.marqueeStart = null;
    }
    applySelectionHighlight(ids) {
      this.canvas.querySelectorAll(".fc-block").forEach((el) => el.classList.remove("selected"));
      ids.forEach((id) => {
        var _a;
        return (_a = document.getElementById(id)) == null ? void 0 : _a.classList.add("selected");
      });
    }
    handleMultiDelete() {
      const st = this.store.getState();
      const ids = st.multiSelect && st.multiSelect.length ? [...st.multiSelect] : [];
      if (!ids.length) return;
      this.undoManager.run("delete-block", () => {
        for (const id of ids) {
          this.store.dispatch({ type: "DELETE_BLOCK", id });
        }
        const fragRemovals = [];
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (el) fragRemovals.push(el);
        });
        if (fragRemovals.length) {
          fragRemovals.forEach((el) => el.remove());
        }
      });
    }
    render() {
      this.applyGridOverlay();
    }
    applyGridOverlay() {
      this.gridManager.apply();
    }
    undo() {
      if (this.store.getState().connectionDraft) {
        this.draftController.cancelDraft();
      }
      if (this.undoManager.undo()) {
        this.afterHistoryChange();
      }
    }
    redo() {
      if (this.store.getState().connectionDraft) {
        this.draftController.cancelDraft();
      }
      if (this.undoManager.redo()) {
        this.afterHistoryChange();
      }
    }
    toggleGrid() {
      const on = this.gridManager.toggle();
      this.updateStatus("Grid " + (on ? "on" : "off"));
    }
    afterHistoryChange() {
      this.blockManager.renderAll();
      this.connectionManager.renderAll();
      this.applyViewport();
      this.applyGridOverlay();
      const st = this.store.getState();
      this.updateStatus(`Blocks: ${Object.keys(st.blocks).length} Conns: ${Object.keys(st.connections).length} Zoom: ${(st.viewport.scale * 100).toFixed(0)}%`);
    }
    undoBegin(label) {
      this.undoManager.begin(label);
    }
    undoCommit() {
      this.undoManager.commitIfChanged();
    }
    undoCancel() {
      this.undoManager.cancel();
    }
    attachHotkeys() {
      this.hotkeys = new HotkeysManager(() => this.undo(), () => this.redo());
      this.hotkeys.attach();
    }
  };
  function bootstrap() {
    document.addEventListener("DOMContentLoaded", () => {
      var _a;
      const root = document.getElementById("app");
      if (!root) return;
      const app = new FlowchartApp(root);
      (_a = app["attachHotkeys"]) == null ? void 0 : _a.call(app);
      window.flowchartApp = app;
      if (new URLSearchParams(location.search).get("undoDebug") === "1") {
        new UndoDebugPanel();
      }
    });
  }

  // src/app.ts
  bootstrap();
})();
//# sourceMappingURL=app.js.map
