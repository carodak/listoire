import { appPath } from "../../contracts/app-path.ts";
export interface AcePosition {
  row: number;
  column: number;
}
export interface AceRange {
  start: AcePosition;
  end: AcePosition;
}
export interface AceEditor {
  getValue(): string;
  setValue(value: string, cursor?: number): void;
  insert(value: string): void;
  focus(): void;
  destroy(): void;
  resize(): void;
  scrollToLine(line: number, center: boolean, animate: boolean): void;
  gotoLine(line: number, column?: number): void;
  getCursorPosition(): AcePosition;
  getSelectedText(): string;
  getSelectionRange(): AceRange;
  execCommand(name: string): void;
  find(text: string): void;
  searchBox?: { show: (query: string, replace: boolean) => void; searchInput: HTMLInputElement };
  highlight(line: number | null): void;
  setOptions(options: Record<string, unknown>): void;
  on(event: string, callback: () => void): void;
  selection: { setRange(range: AceRange): void; selectWord(): void };
  session: {
    setMode(mode: unknown): void;
    getLine(row: number): string;
    setUndoManager(manager: unknown): void;
    setAnnotations(
      annotations: { row: number; column: number; text: string; type: string }[],
    ): void;
    addMarker(range: AceRange, css: string, type: string): number;
    removeMarker(id: number): void;
  };
}

interface Ace {
  require(name: "ace/ext/searchbox"): {
    SearchBox: new (editor: AceEditor) => { hide: () => void };
  };
  require(name: "ace/range"): {
    Range: new (startRow: number, startCol: number, endRow: number, endCol: number) => AceRange;
  };
  edit(element: HTMLElement): AceEditor;
  config: { set(key: string, value: string): void };
}
declare global {
  interface Window {
    ace: Ace;
    ListoireInkMode: new () => unknown;
  }
}
let loading: Promise<Ace> | undefined;
function script(file: string) {
  return new Promise<void>((resolve, reject) => {
    const element = document.createElement("script");
    element.src = appPath(`editor/vendor/${file}`);
    element.onload = () => resolve();
    element.onerror = () => {
      element.remove();
      reject(new Error(`Could not load ${file}. Reload Story Editor.`));
    };
    document.head.append(element);
  });
}
export function loadAce() {
  loading ??= script("ace.js")
    .then(() => script("ink-mode.js"))
    .then(() => script("ext-searchbox.js"))
    .then(() => {
      window.ace.config.set("basePath", appPath("editor/vendor"));
      const theme = document.createElement("link");
      theme.rel = "stylesheet";
      theme.href = appPath("editor/vendor/ink-theme.css");
      document.head.append(theme);
      return window.ace;
    })
    .catch((error) => {
      loading = undefined;
      throw error;
    });
  return loading;
}
