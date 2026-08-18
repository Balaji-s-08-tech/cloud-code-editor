import type { CreateNodeInput, FileNode, Project } from "../types";
import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

const getAccessToken = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error("Sign in before calling the API.");
  }

  return data.session.access_token;
};

const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `API request failed with ${response.status}`);
  }

  return payload as T;
};

export const api = {
  async listProjects() {
    const payload = await apiFetch<{ projects: Project[] }>("/api/projects");
    return payload.projects;
  },

  async createProject(input: { name: string; description?: string }) {
    const payload = await apiFetch<{ project: Project }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return payload.project;
  },

  async deleteProject(projectId: string) {
    await apiFetch<void>(`/api/projects/${projectId}`, { method: "DELETE" });
  },

  async getFileTree(projectId: string) {
    const payload = await apiFetch<{ tree: FileNode[] }>(`/api/projects/${projectId}/files/tree`);
    return payload.tree;
  },

  async createNode(projectId: string, input: CreateNodeInput) {
    const payload = await apiFetch<{ file: FileNode }>(`/api/projects/${projectId}/files`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return payload.file;
  },

  async updateNode(projectId: string, fileId: string, input: Partial<CreateNodeInput>) {
    const payload = await apiFetch<{ file: FileNode }>(`/api/projects/${projectId}/files/${fileId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return payload.file;
  },

  async deleteNode(projectId: string, fileId: string) {
    await apiFetch<void>(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
  },

  async autosave(projectId: string, files: Array<{ id: string; content: string }>) {
    return apiFetch<{ saved: Array<{ id: string; version: number; updated_at: string }> }>(
      `/api/projects/${projectId}/files/autosave`,
      {
        method: "POST",
        body: JSON.stringify({ files }),
      },
    );
  },

  async getGithubOAuthUrl() {
    return apiFetch<{ url: string; state: string }>("/api/github/oauth-url");
  },

  async exchangeGithubCode(code: string) {
    return apiFetch<{ connection: { username: string; avatar_url: string | null } }>("/api/github/callback", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  async pushProject(
    projectId: string,
    input: { repoOwner: string; repoName: string; branch: string; commitMessage: string },
  ) {
    return apiFetch<{
      repository: string;
      branch: string;
      commitSha: string;
      pushedFiles: number;
      commitUrl: string;
    }>(`/api/projects/${projectId}/github/push`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async explainCode(input: { code: string; language?: string; fileName?: string }) {
    return apiFetch<{ result: string; model: string; responseId: string }>("/api/ai/explain", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async fixCode(input: { code: string; language?: string; fileName?: string }) {
    return apiFetch<{ result: string; model: string; responseId: string }>("/api/ai/fix", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async generateCode(input: { prompt: string; context?: string; language?: string; fileName?: string }) {
    return apiFetch<{ result: string; model: string; responseId: string }>("/api/ai/generate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
