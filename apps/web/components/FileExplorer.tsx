"use client";

import { useMemo, useState } from "react";
import type { FileNode, FileType } from "../types";

type FileExplorerProps = {
  tree: FileNode[];
  selectedFileId: string | null;
  onSelectFile: (file: FileNode) => void;
  onCreateNode: (type: FileType, parentId: string | null) => void;
  onDeleteNode: (file: FileNode) => void;
};

export function FileExplorer({ tree, selectedFileId, onSelectFile, onCreateNode, onDeleteNode }: FileExplorerProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-neutral-800 bg-neutral-900">
      <div className="flex h-11 items-center justify-between border-b border-neutral-800 px-3">
        <h2 className="text-sm font-semibold text-neutral-100">Files</h2>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:border-emerald-400 hover:text-emerald-200"
            type="button"
            onClick={() => onCreateNode("file", null)}
          >
            File
          </button>
          <button
            className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:border-emerald-400 hover:text-emerald-200"
            type="button"
            onClick={() => onCreateNode("folder", null)}
          >
            Folder
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto py-2">
        {tree.length === 0 ? (
          <p className="px-3 py-2 text-sm text-neutral-400">Create a file or folder.</p>
        ) : (
          tree.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              selectedFileId={selectedFileId}
              onSelectFile={onSelectFile}
              onCreateNode={onCreateNode}
              onDeleteNode={onDeleteNode}
            />
          ))
        )}
      </div>
    </aside>
  );
}

type TreeRowProps = Omit<FileExplorerProps, "tree"> & {
  node: FileNode;
  depth: number;
};

function TreeRow({ node, depth, selectedFileId, onSelectFile, onCreateNode, onDeleteNode }: TreeRowProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isFolder = node.type === "folder";
  const isSelected = node.id === selectedFileId;
  const indentStyle = useMemo(() => ({ paddingLeft: `${depth * 14 + 10}px` }), [depth]);

  return (
    <div>
      <div
        className={`group flex h-8 items-center gap-2 pr-2 text-sm ${
          isSelected ? "bg-emerald-500/15 text-emerald-100" : "text-neutral-300 hover:bg-neutral-800"
        }`}
        style={indentStyle}
      >
        <button
          className="h-6 w-5 shrink-0 rounded-md text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100"
          type="button"
          onClick={() => (isFolder ? setIsOpen((value) => !value) : onSelectFile(node))}
          aria-label={isFolder ? "Toggle folder" : "Open file"}
        >
          {isFolder ? (isOpen ? "v" : ">") : "-"}
        </button>

        <button
          className="min-w-0 flex-1 truncate text-left"
          type="button"
          onClick={() => (isFolder ? setIsOpen((value) => !value) : onSelectFile(node))}
        >
          {node.name}
        </button>

        {isFolder ? (
          <>
            <button
              className="hidden h-6 w-6 rounded-md text-xs text-neutral-400 hover:bg-neutral-700 hover:text-emerald-200 group-hover:block"
              type="button"
              onClick={() => onCreateNode("file", node.id)}
              aria-label="New file"
            >
              F
            </button>
            <button
              className="hidden h-6 w-6 rounded-md text-xs text-neutral-400 hover:bg-neutral-700 hover:text-emerald-200 group-hover:block"
              type="button"
              onClick={() => onCreateNode("folder", node.id)}
              aria-label="New folder"
            >
              D
            </button>
          </>
        ) : null}

        <button
          className="hidden h-6 w-6 rounded-md text-xs text-neutral-400 hover:bg-rose-500/20 hover:text-rose-200 group-hover:block"
          type="button"
          onClick={() => onDeleteNode(node)}
          aria-label="Delete"
        >
          X
        </button>
      </div>

      {isFolder && isOpen
        ? node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFileId={selectedFileId}
              onSelectFile={onSelectFile}
              onCreateNode={onCreateNode}
              onDeleteNode={onDeleteNode}
            />
          ))
        : null}
    </div>
  );
}
