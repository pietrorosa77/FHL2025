export interface IGridManager { apply(): void; toggle(): boolean; restore(): void; persist(): void; }
export interface IThemeManager { restore(): void; persist(theme: string): void; set(theme: string): void; }
export interface IFileIO { exportJSON(): void; importJSON(): void; }
export interface IHotkeysManager { attach(): void; }
export interface AppDependencies {
  gridManager: IGridManager;
  themeManager: IThemeManager;
  fileIO: IFileIO;
  hotkeysFactory: (undo: ()=>void, redo: ()=>void)=> IHotkeysManager;
}
