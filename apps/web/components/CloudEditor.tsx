"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { FileNode, FileType, Project } from "../types";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { AuthPanel } from "./AuthPanel";
import { CodeEditor } from "./CodeEditor";
import { FileExplorer } from "./FileExplorer";
import { LivePreview } from "./LivePreview";

type MobilePanel = "files" | "editor" | "preview" | "ai";
type RightPanel = "preview" | "ai";
type SaveStatus = "Saved" | "Saving" | "Unsaved" | "Error";

export function CloudEditor() {
  const [session, setSession] = useState<Session | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("editor");
  const [rightPanel, setRightPanel] = useState<RightPanel>("ai");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("Saved");
  const [message, setMessage] = useState("");
  const lastSavedRef = useRef(new Map<string, string>());

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );
  const selectedFile = useMemo(() => findNode(tree, selectedFileId), [selectedFileId, tree]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsBooting(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsBooting(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const loadProjects = useCallback(async () => {
    const items = await api.listProjects();
    setProjects(items);
    setActiveProjectId((current) => {
      if (current && items.some((project) => project.id === current)) {
        return current;
      }

      return items[0]?.id ?? null;
    });
  }, []);

  const loadTree = useCallback(async (projectId: string) => {
    const nextTree = await api.getFileTree(projectId);
    setTree(nextTree);

    const files = flatten(nextTree).filter((node) => node.type === "file");
    lastSavedRef.current = new Map(files.map((file) => [file.id, file.content ?? ""]));

    const nextSelected = files[0] ?? null;
    setSelectedFileId(nextSelected?.id ?? null);
    setSelectedContent(nextSelected?.content ?? "");
    setSelectedCode("");
    setSaveStatus("Saved");
  }, []);

  useEffect(() => {
    if (!session) return;

    loadProjects().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load projects.");
    });
  }, [loadProjects, session]);

  useEffect(() => {
    if (!activeProjectId) {
      setTree([]);
      setSelectedFileId(null);
      setSelectedContent("");
      return;
    }

    loadTree(activeProjectId).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load files.");
    });
  }, [activeProjectId, loadTree]);

  const saveCurrentFile = useCallback(async () => {
    if (!activeProjectId || !selectedFileId) return;

    const lastSaved = lastSavedRef.current.get(selectedFileId) ?? "";
    if (selectedContent === lastSaved) return;

    setSaveStatus("Saving");
    await api.autosave(activeProjectId, [{ id: selectedFileId, content: selectedContent }]);
    lastSavedRef.current.set(selectedFileId, selectedContent);
    setSaveStatus("Saved");
  }, [activeProjectId, selectedContent, selectedFileId]);

  useEffect(() => {
    if (!activeProjectId || !selectedFileId) return;

    const lastSaved = lastSavedRef.current.get(selectedFileId) ?? "";
    if (selectedContent === lastSaved) return;

    setSaveStatus("Unsaved");

    const timer = window.setTimeout(() => {
      saveCurrentFile().catch((error) => {
        setSaveStatus("Error");
        setMessage(error instanceof Error ? error.message : "Autosave failed.");
      });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [activeProjectId, saveCurrentFile, selectedContent, selectedFileId]);

  const createStarterProject = async () => {
    const name = window.prompt("Project name", "Starter project");
    if (!name) return;

    setMessage("");
    const project = await api.createProject({ name });

    await Promise.all([
      api.createNode(project.id, {
        name: "index.html",
        type: "file",
        language: "html",
        content:
          '<main class="app"><h1>Hello from the cloud</h1><p id="message">Edit the files and watch this refresh.</p><button id="action">Run JS</button></main>',
      }),
      api.createNode(project.id, {
        name: "styles.css",
        type: "file",
        language: "css",
        content:
          "body { margin: 0; font-family: system-ui, sans-serif; background: #f6f7f9; color: #222; }\n.app { padding: 40px; }\nbutton { border: 0; border-radius: 6px; background: #16a34a; color: white; padding: 10px 14px; }",
      }),
      api.createNode(project.id, {
        name: "app.js",
        type: "file",
        language: "javascript",
        content:
          "document.getElementById('action')?.addEventListener('click', () => {\n  document.getElementById('message').textContent = 'JavaScript is running in the preview.';\n});",
      }),
    ]);

    setProjects((current) => [project, ...current]);
    setActiveProjectId(project.id);
    setMessage("Project created.");
  };

  const createNode = async (type: FileType, parentId: string | null) => {
    if (!activeProjectId) return;

    const defaultName = type === "folder" ? "src" : "index.html";
    const name = window.prompt(type === "folder" ? "Folder name" : "File name", defaultName);
    if (!name) return;

    setMessage("");
    await api.createNode(activeProjectId, {
      name,
      type,
      parentId,
      content: type === "file" ? starterContentFor(name) : undefined,
    });
    await loadTree(activeProjectId);
  };

  const deleteNode = async (file: FileNode) => {
    if (!activeProjectId) return;
    if (!window.confirm(`Delete ${file.name}?`)) return;

    setMessage("");
    await api.deleteNode(activeProjectId, file.id);
    await loadTree(activeProjectId);
  };

  const selectFile = async (file: FileNode) => {
    if (file.type !== "file") return;

    await saveCurrentFile().catch((error) => {
      setSaveStatus("Error");
      setMessage(error instanceof Error ? error.message : "Save failed.");
    });

    setSelectedFileId(file.id);
    setSelectedContent(file.content ?? "");
    setSelectedCode("");
    setMobilePanel("editor");
  };

  const updateEditorContent = (content: string) => {
    if (!selectedFileId) return;

    setSelectedContent(content);
    setTree((current) => updateContent(current, selectedFileId, content));
  };

  const appendEditorContent = (content: string) => {
    const separator = selectedContent.endsWith("\n") || !selectedContent ? "" : "\n";
    updateEditorContent(`${selectedContent}${separator}${content}`);
    setMobilePanel("editor");
  };

  const signOut = async () => {
    await saveCurrentFile().catch(() => undefined);
    await supabase.auth.signOut();
    setProjects([]);
    setActiveProjectId(null);
    setTree([]);
  };

  const connectGithub = async () => {
    setMessage("");
    const { url, state } = await api.getGithubOAuthUrl();
    window.sessionStorage.setItem("github_oauth_state", state);
    window.location.assign(url);
  };

  const pushToGithub = async () => {
    if (!activeProjectId) return;

    const repository = window.prompt("Repository", activeProject?.github_repo_owner && activeProject.github_repo_name
      ? `${activeProject.github_repo_owner}/${activeProject.github_repo_name}`
      : "owner/repo");
    if (!repository) return;

    const [repoOwner, repoName] = repository.split("/");
    if (!repoOwner || !repoName) {
      setMessage("Use owner/repo format.");
      return;
    }

    const branch = window.prompt("Branch", activeProject?.github_branch ?? "main") ?? "main";
    const commitMessage = window.prompt("Commit message", "Sync project from Cloud Code Editor") ?? "Sync project";

    await saveCurrentFile();
    const result = await api.pushProject(activeProjectId, {
      repoOwner,
      repoName,
      branch,
      commitMessage,
    });

    setMessage(`Pushed ${result.pushedFiles} files to ${result.repository} at ${result.commitSha.slice(0, 7)}.`);
  };

  if (isBooting) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-300">Loading</div>;
  }

  if (!session) {
    return <AuthPanel />;
  }

  return (
    <main className="h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <header className="flex h-14 items-center gap-3 border-b border-neutral-800 bg-neutral-950 px-3">
        <div className="min-w-0 flex-1">
          <select
            className="h-9 max-w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 outline-none focus:border-emerald-400"
            value={activeProjectId ?? ""}
            onChange={(event) => setActiveProjectId(event.target.value || null)}
          >
            {projects.length === 0 ? <option value="">No projects</option> : null}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <span className="hidden text-xs text-neutral-400 sm:inline">{saveStatus}</span>

        <button className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-400" type="button" onClick={createStarterProject}>
          New
        </button>
        <button className="hidden rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-emerald-400 hover:text-emerald-200 sm:block" type="button" onClick={connectGithub}>
          GitHub
        </button>
        <button className="hidden rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-emerald-400 hover:text-emerald-200 sm:block" type="button" onClick={pushToGithub}>
          Push
        </button>
        <button className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-rose-400 hover:text-rose-200" type="button" onClick={signOut}>
          Sign out
        </button>
      </header>

      {message ? (
        <div className="h-9 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {message}
        </div>
      ) : null}

      <nav className="grid h-11 grid-cols-3 border-b border-neutral-800 bg-neutral-950 lg:hidden">
        {(["files", "editor", "preview", "ai"] as const).map((panel) => (
          <button
            key={panel}
            className={`text-sm capitalize ${mobilePanel === panel ? "text-emerald-300" : "text-neutral-400"}`}
            type="button"
            onClick={() => setMobilePanel(panel)}
          >
            {panel}
          </button>
        ))}
      </nav>

      {projects.length === 0 ? (
        <section className="flex h-[calc(100vh-6.25rem)] items-center justify-center px-4 text-center lg:h-[calc(100vh-3.5rem)]">
          <div>
            <p className="mb-4 text-neutral-300">Create a project to open the editor.</p>
            <button className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-neutral-950 hover:bg-emerald-400" type="button" onClick={createStarterProject}>
              Create starter project
            </button>
          </div>
        </section>
      ) : (
        <section
          className={`grid ${
            message ? "h-[calc(100vh-7.75rem)] lg:h-[calc(100vh-5.75rem)]" : "h-[calc(100vh-6.25rem)] lg:h-[calc(100vh-3.5rem)]"
          } grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_minmax(340px,34vw)]`}
        >
          <div className={`${mobilePanel === "files" ? "block" : "hidden"} min-h-0 lg:block`}>
            <FileExplorer
              tree={tree}
              selectedFileId={selectedFileId}
              onSelectFile={selectFile}
              onCreateNode={createNode}
              onDeleteNode={deleteNode}
            />
          </div>
          <div className={`${mobilePanel === "editor" ? "block" : "hidden"} min-h-0 lg:block`}>
            <CodeEditor
              file={selectedFile}
              value={selectedContent}
              onChange={updateEditorContent}
              onSelectionChange={setSelectedCode}
            />
          </div>

          <div className="hidden min-h-0 border-l border-neutral-800 lg:flex lg:flex-col">
            <div className="grid h-10 grid-cols-2 border-b border-neutral-800 bg-neutral-900">
              {(["ai", "preview"] as const).map((panel) => (
                <button
                  key={panel}
                  className={`text-sm capitalize ${rightPanel === panel ? "text-emerald-300" : "text-neutral-400"}`}
                  type="button"
                  onClick={() => setRightPanel(panel)}
                >
                  {panel}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              {rightPanel === "ai" ? (
                <AIAssistantPanel
                  file={selectedFile}
                  code={selectedContent}
                  selectedCode={selectedCode}
                  onApplyCode={updateEditorContent}
                  onAppendCode={appendEditorContent}
                />
              ) : (
                <LivePreview files={tree} />
              )}
            </div>
          </div>

          <div className={`${mobilePanel === "preview" ? "block" : "hidden"} min-h-0 lg:hidden`}>
            <LivePreview files={tree} />
          </div>
          <div className={`${mobilePanel === "ai" ? "block" : "hidden"} min-h-0 lg:hidden`}>
            <AIAssistantPanel
              file={selectedFile}
              code={selectedContent}
              selectedCode={selectedCode}
              onApplyCode={updateEditorContent}
              onAppendCode={appendEditorContent}
            />
          </div>
        </section>
      )}
    </main>
  );
}

const flatten = (nodes: FileNode[]): FileNode[] => nodes.flatMap((node) => [node, ...flatten(node.children)]);

const findNode = (nodes: FileNode[], id: string | null): FileNode | null => {
  if (!id) return null;

  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }

  return null;
};

const updateContent = (nodes: FileNode[], fileId: string, content: string): FileNode[] => {
  return nodes.map((node) => {
    if (node.id === fileId) {
      return { ...node, content };
    }

    return { ...node, children: updateContent(node.children, fileId, content) };
  });
};

const starterContentFor = (name: string) => {
  if (name.endsWith(".html")) {
    return "<main><h1>New page</h1></main>";
  }

  if (name.endsWith(".css")) {
    return "body { font-family: system-ui, sans-serif; }";
  }

  if (name.endsWith(".js")) {
    return "console.log('Ready');";
  }

  return "";
};
