import { IThemeManager } from './interfaces.js';

interface StoredCustomTheme { name: string; vars: Record<string,string>; }

const CUSTOM_KEY = 'fc-custom-themes';
const PREVIEW_KEY = 'fc-theme-previews';

export class ThemeManager implements IThemeManager {
  private customThemes: StoredCustomTheme[] = [];
  private previews: Record<string, { bg:string; accent:string; text:string }> = {};

  constructor() {
    this.loadCustom();
    this.loadPreviews();
  }

  restore() {
    const saved = localStorage.getItem('fc-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }
  persist(theme: string) {
    try { localStorage.setItem('fc-theme', theme); } catch {}
  }
  set(theme: string) {
    document.documentElement.setAttribute('data-theme', theme);
    this.persist(theme);
  }

  listThemes(builtin: string[]): string[] {
    return [...builtin, ...this.customThemes.map(t => t.name)];
  }

  getCustomTheme(name: string) { return this.customThemes.find(t => t.name === name); }

  registerCustom(name: string, vars: Record<string,string>) {
    // Merge or add
    const existing = this.customThemes.find(t => t.name === name);
    if (existing) existing.vars = vars; else this.customThemes.push({ name, vars });
    this.applyCustomThemeStyle(name, vars);
    this.saveCustom();
    this.generatePreview(name, vars);
    this.savePreviews();
  }

  removeCustom(name: string) {
    this.customThemes = this.customThemes.filter(t => t.name !== name);
    const styleEl = document.getElementById('fc-theme-custom-'+name);
    if (styleEl) styleEl.remove();
    this.saveCustom();
    delete this.previews[name];
    this.savePreviews();
  }

  private applyCustomThemeStyle(name: string, vars: Record<string,string>) {
    let styleEl = document.getElementById('fc-theme-custom-'+name) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'fc-theme-custom-'+name;
      document.head.appendChild(styleEl);
    }
    const lines = Object.entries(vars)
      .filter(([k])=> k.startsWith('--fc-'))
      .map(([k,v])=> `  ${k}: ${v};`)
      .join('\n');
    styleEl.textContent = `:root[data-theme="${name}"] {\n${lines}\n}`;
  }

  private loadCustom() {
    try { const raw = localStorage.getItem(CUSTOM_KEY); if (raw) { this.customThemes = JSON.parse(raw); this.customThemes.forEach(t=> this.applyCustomThemeStyle(t.name, t.vars)); } } catch {}
  }
  private saveCustom() { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(this.customThemes)); } catch {}
  }

  getPreview(name: string) { return this.previews[name]; }

  ensurePreviewForBuiltin(name: string) {
    if (this.previews[name]) return this.previews[name];
    // Create a temp element with data-theme attr to read computed vars without switching global theme
    const el = document.createElement('div');
    el.setAttribute('data-theme', name);
    // Clone root variable context by applying attribute temporarily to a shadow root container
    // Simpler: temporarily set on html, read, then revert
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', name);
    const cs = getComputedStyle(document.documentElement);
    const bg = cs.getPropertyValue('--fc-bg').trim() || '#ffffff';
    const accent = cs.getPropertyValue('--fc-accent').trim() || '#4ea1ff';
    const text = cs.getPropertyValue('--fc-text').trim() || '#222222';
    if (prev) document.documentElement.setAttribute('data-theme', prev); else document.documentElement.removeAttribute('data-theme');
    this.previews[name] = { bg, accent, text };
    this.savePreviews();
    return this.previews[name];
  }

  private generatePreview(name: string, vars: Record<string,string>) {
    const bg = vars['--fc-bg'] || '#ffffff';
    const accent = vars['--fc-accent'] || '#8888ff';
    const text = vars['--fc-text'] || '#222222';
    this.previews[name] = { bg, accent, text };
  }
  private loadPreviews() { try { const raw = localStorage.getItem(PREVIEW_KEY); if (raw) this.previews = JSON.parse(raw); } catch {}
  }
  private savePreviews() { try { localStorage.setItem(PREVIEW_KEY, JSON.stringify(this.previews)); } catch {}
  }
}
