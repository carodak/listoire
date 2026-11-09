import { useEffect, useRef } from "react";
import type { AceEditor } from "./ace.ts";
import { loadAce } from "./ace.ts";

interface InkEditorProps {
  value: string;
  onChange: (script: string) => void;
  onReady: (editor: AceEditor) => void;
  onError: (error: unknown) => void;
  onCursor?: (row: number) => void;
}

export function InkEditor({ value, onChange, onReady, onError, onCursor }: InkEditorProps) {
  const element = useRef<HTMLDivElement>(null);
  const editor = useRef<AceEditor | null>(null);
  const latest = useRef({ value, onChange, onReady, onError, onCursor });
  useEffect(() => {
    latest.current = { value, onChange, onReady, onError, onCursor };
  }, [value, onChange, onReady, onError, onCursor]);
  const updating = useRef(false);
  useEffect(() => {
    let disposed = false;
    let resize: ResizeObserver | undefined;
    void loadAce()
      .then((ace) => {
        if (disposed) return;
        const instance = ace.edit(element.current!);
        editor.current = instance;
        resize = new ResizeObserver(() => instance.resize());
        resize.observe(element.current!);
        instance.setOptions({
          fontSize: 14,
          showPrintMargin: false,
          wrap: true,
          tabSize: 2,
          useWorker: false,
        });
        instance.session.setMode(new window.ListoireInkMode());
        instance.setValue(latest.current.value, -1);
        instance.session.setUndoManager({
          execute() {},
          undo() {},
          redo() {},
          reset() {},
          hasUndo: () => false,
          hasRedo: () => false,
        });
        instance.on("change", () => {
          if (!updating.current) latest.current.onChange(instance.getValue());
        });
        instance.on("changeSelection", () => {
          if (!updating.current) latest.current.onCursor?.(instance.getCursorPosition().row);
        });
        const Range = ace.require("ace/range").Range;
        let marker: number | undefined;
        instance.highlight = (line) => {
          if (marker !== undefined) instance.session.removeMarker(marker);
          marker = undefined;
          if (line === null) return;
          instance.scrollToLine(line, true, false);
          marker = instance.session.addMarker(
            new Range(line, 0, line, 1),
            "editor-media-highlight",
            "fullLine",
          );
        };
        const { SearchBox } = ace.require("ace/ext/searchbox");
        new SearchBox(instance).hide();
        latest.current.onReady(instance);
      })
      .catch((error) => latest.current.onError(error));
    return () => {
      disposed = true;
      resize?.disconnect();
      editor.current?.destroy();
      editor.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = editor.current;
    if (!instance || instance.getValue() === value) return;
    const cursor = instance.getCursorPosition();
    updating.current = true;
    instance.setValue(value, -1);
    instance.gotoLine(cursor.row + 1, cursor.column);
    updating.current = false;
    latest.current.onCursor?.(instance.getCursorPosition().row);
  }, [value]);
  return <div ref={element} className="ink-editor" aria-label="Ink script editor" />;
}
