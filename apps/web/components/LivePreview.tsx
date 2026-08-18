"use client";

import { useMemo } from "react";
import type { FileNode } from "../types";

type LivePreviewProps = {
  files: FileNode[];
};

export function LivePreview({ files }: LivePreviewProps) {
  const srcDoc = useMemo(() => buildPreviewDocument(files), [files]);

  return (
    <section className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-neutral-950">
      <div className="flex h-9 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-3">
        <h2 className="text-xs font-semibold uppercase text-neutral-300">Preview</h2>
        <span className="text-xs text-emerald-300">Live</span>
      </div>
      <iframe
        className="h-full w-full flex-1 bg-white"
        title="Live preview"
        sandbox="allow-forms allow-modals allow-scripts"
        srcDoc={srcDoc}
      />
    </section>
  );
}

const buildPreviewDocument = (tree: FileNode[]) => {
  const files = flatten(tree);
  const html = files
    .filter((file) => file.type === "file" && (file.language === "html" || file.name.endsWith(".html")))
    .map((file) => file.content ?? "")
    .join("\n");
  const css = files
    .filter((file) => file.type === "file" && (file.language === "css" || file.name.endsWith(".css")))
    .map((file) => file.content ?? "")
    .join("\n");
  const js = files
    .filter(
      (file) =>
        file.type === "file" &&
        (file.language === "javascript" || file.name.endsWith(".js") || file.name.endsWith(".mjs")),
    )
    .map((file) => file.content ?? "")
    .join("\n")
    .replaceAll("</script>", "<\\/script>");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${css}</style>
  </head>
  <body>
    ${html || "<main style=\"font-family: system-ui; padding: 24px; color: #222;\">Create an HTML file to preview.</main>"}
    <script>${js}</script>
  </body>
</html>`;
};

const flatten = (nodes: FileNode[]): FileNode[] => {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
};
