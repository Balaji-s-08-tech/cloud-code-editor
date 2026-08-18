"use client";

import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import type { FileNode } from "../types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((module) => module.default), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-neutral-400">Loading editor</div>,
});

type CodeEditorProps = {
  file: FileNode | null;
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (value: string) => void;
};

export function CodeEditor({ file, value, onChange, onSelectionChange }: CodeEditorProps) {
  const handleMount: OnMount = (editor) => {
    onSelectionChange?.("");

    editor.onDidChangeCursorSelection(() => {
      const model = editor.getModel();
      const selection = editor.getSelection();

      if (!model || !selection || selection.isEmpty()) {
        onSelectionChange?.("");
        return;
      }

      onSelectionChange?.(model.getValueInRange(selection));
    });
  };

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-950 text-sm text-neutral-400">
        Select a file to start editing.
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 bg-neutral-950">
      <div className="flex h-9 items-center border-b border-neutral-800 bg-neutral-900 px-3 text-xs text-neutral-300">
        <span className="truncate">{file.name}</span>
      </div>
      <div className="h-[calc(100%-2.25rem)]">
        <MonacoEditor
          height="100%"
          language={file.language ?? inferLanguage(file.name)}
          theme="vs-dark"
          value={value}
          onChange={(nextValue) => onChange(nextValue ?? "")}
          onMount={handleMount}
          options={{
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: false },
            padding: { top: 12 },
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}

const inferLanguage = (name: string) => {
  const extension = name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "html":
      return "html";
    case "css":
      return "css";
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "json":
      return "json";
    default:
      return "plaintext";
  }
};
