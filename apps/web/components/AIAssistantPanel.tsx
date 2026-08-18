"use client";

import { FormEvent, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { FileNode } from "../types";

type AIAssistantPanelProps = {
  file: FileNode | null;
  code: string;
  selectedCode: string;
  onApplyCode: (code: string) => void;
  onAppendCode: (code: string) => void;
};

type ApplyMode = "replace" | "append" | null;

export function AIAssistantPanel({ file, code, selectedCode, onApplyCode, onAppendCode }: AIAssistantPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [model, setModel] = useState("");
  const [applyMode, setApplyMode] = useState<ApplyMode>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const language = file?.language ?? inferLanguage(file?.name ?? "");
  const selectedSummary = useMemo(() => {
    if (!selectedCode.trim()) return "No selection";
    return `${selectedCode.trim().split(/\s+/).length} words selected`;
  }, [selectedCode]);

  const runExplain = async () => {
    const target = selectedCode.trim() || code.trim();
    if (!target) return;

    await runRequest(async () => {
      const response = await api.explainCode({
        code: target,
        language,
        fileName: file?.name,
      });
      setApplyMode(null);
      return response;
    });
  };

  const runFix = async () => {
    if (!code.trim()) return;

    await runRequest(async () => {
      const response = await api.fixCode({
        code,
        language,
        fileName: file?.name,
      });
      setApplyMode("replace");
      return response;
    });
  };

  const runGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) return;

    await runRequest(async () => {
      const response = await api.generateCode({
        prompt,
        context: code,
        language,
        fileName: file?.name,
      });
      setApplyMode("append");
      return response;
    });
  };

  const runRequest = async (
    request: () => Promise<{
      result: string;
      model: string;
    }>,
  ) => {
    setIsLoading(true);
    setError("");
    setResult("");
    setModel("");

    try {
      const response = await request();
      setResult(response.result);
      setModel(response.model);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "AI request failed.");
      setApplyMode(null);
    } finally {
      setIsLoading(false);
    }
  };

  const applyResult = () => {
    if (!result || !applyMode) return;

    if (applyMode === "replace") {
      onApplyCode(result);
      return;
    }

    onAppendCode(result);
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-neutral-950">
      <div className="border-b border-neutral-800 bg-neutral-900 px-3 py-3">
        <h2 className="text-sm font-semibold text-neutral-100">AI Assistant</h2>
        <p className="mt-1 text-xs text-neutral-400">{file ? `${file.name} - ${selectedSummary}` : "Open a file first"}</p>
      </div>

      <div className="flex gap-2 border-b border-neutral-800 p-3">
        <button
          className="flex-1 rounded-md border border-neutral-700 px-2 py-2 text-xs text-neutral-100 hover:border-emerald-400 disabled:cursor-not-allowed disabled:text-neutral-600"
          type="button"
          disabled={!file || isLoading}
          onClick={runExplain}
        >
          Explain Code
        </button>
        <button
          className="flex-1 rounded-md border border-neutral-700 px-2 py-2 text-xs text-neutral-100 hover:border-emerald-400 disabled:cursor-not-allowed disabled:text-neutral-600"
          type="button"
          disabled={!file || isLoading}
          onClick={runFix}
        >
          Fix Code
        </button>
      </div>

      <form className="border-b border-neutral-800 p-3" onSubmit={runGenerate}>
        <label className="block text-xs text-neutral-400" htmlFor="ai-prompt">
          Ask AI
        </label>
        <textarea
          id="ai-prompt"
          className="mt-2 h-24 w-full resize-none rounded-md border border-neutral-700 bg-neutral-900 p-2 text-sm text-neutral-100 outline-none focus:border-emerald-400"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Generate a debounce helper, refactor this function, add validation..."
        />
        <button
          className="mt-2 w-full rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
          type="submit"
          disabled={!file || isLoading || !prompt.trim()}
        >
          {isLoading ? "Thinking..." : "Ask AI"}
        </button>
      </form>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {error ? <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}
        {!error && !result && !isLoading ? (
          <p className="text-sm text-neutral-400">Select code to explain, fix the current file, or ask for generated code.</p>
        ) : null}
        {isLoading ? <p className="text-sm text-neutral-400">Working on it...</p> : null}
        {result ? (
          <div>
            <pre className="whitespace-pre-wrap break-words rounded-md border border-neutral-800 bg-neutral-900 p-3 text-sm leading-6 text-neutral-100">
              {result}
            </pre>
            <div className="mt-3 flex items-center gap-2">
              {applyMode ? (
                <button
                  className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-400"
                  type="button"
                  onClick={applyResult}
                >
                  {applyMode === "replace" ? "Apply Fix" : "Append Code"}
                </button>
              ) : null}
              {model ? <span className="text-xs text-neutral-500">{model}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
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
    case "mjs":
      return "javascript";
    case "ts":
      return "typescript";
    case "json":
      return "json";
    default:
      return "plaintext";
  }
};
