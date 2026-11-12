import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import "monaco-editor/languages/definitions/python/register.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import "monaco-editor/features/find/register.js";
import "monaco-editor/features/clipboard/register.js";
import "monaco-editor/features/format/register.js";
import "monaco-editor/editor/browser/coreCommands.js";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
export function StudioEditor({
  code,
  onChange,
  language,
  theme,
  fontSize,
  readOnly = false,
}: {
  code: string;
  onChange: (value: string) => void;
  language: string;
  theme: string;
  fontSize: number;
  readOnly?: boolean;
}) {
  return (
    <Editor
      height="440px"
      language={language}
      theme={theme}
      value={code}
      onChange={(v) => onChange(v || "")}
      loading={<p className="st-editor-loading">Opening code editor…</p>}
      options={{
        fontSize,
        fontFamily: "JetBrains Mono, monospace",
        minimap: { enabled: false },
        padding: { top: 20 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        readOnly,
        ariaLabel: "Interview code editor",
        wordWrap: "on",
      }}
      onMount={(editor) => {
        editor.addAction({
          id: "studio-format",
          label: "Format document",
          keybindings: [
            monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
          ],
          run: () => {
            void editor.getAction("editor.action.formatDocument")?.run();
          },
        });
      }}
    />
  );
}
