import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../errors/AppError.js";
import type { FileRow, FileTreeNode, PushableFile } from "../types/domain.js";
import { projectService } from "./project.service.js";

const FILE_COLUMNS = "id,project_id,parent_id,name,type,language,content,version,created_at,updated_at";

type CreateNodeInput = {
  name: string;
  type: "file" | "folder";
  parentId?: string | null;
  language?: string | null;
  content?: string;
};

type UpdateNodeInput = {
  name?: string;
  parentId?: string | null;
  language?: string | null;
  content?: string;
};

type AutosaveInput = {
  files: Array<{ id: string; content: string }>;
};

const sortTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
  return nodes
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    })
    .map((node) => ({
      ...node,
      children: sortTree(node.children),
    }));
};

const buildFileTree = (rows: FileRow[]): FileTreeNode[] => {
  const byId = new Map<string, FileTreeNode>();
  const roots: FileTreeNode[] = [];

  for (const row of rows) {
    byId.set(row.id, { ...row, children: [] });
  }

  for (const row of rows) {
    const node = byId.get(row.id);
    if (!node) continue;

    if (row.parent_id && byId.has(row.parent_id)) {
      byId.get(row.parent_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return sortTree(roots);
};

const buildPath = (row: FileRow, byId: Map<string, FileRow>): string => {
  const parts = [row.name];
  let current = row;

  while (current.parent_id) {
    const parent = byId.get(current.parent_id);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }

  return parts.join("/");
};

export const fileService = {
  async listTree(userId: string, projectId: string): Promise<FileTreeNode[]> {
    await projectService.getProject(userId, projectId);

    const { data, error } = await supabaseAdmin
      .from("files")
      .select(FILE_COLUMNS)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new AppError(400, error.message, "FILE_TREE_FAILED");
    }

    return buildFileTree(data);
  },

  async createNode(userId: string, projectId: string, input: CreateNodeInput): Promise<FileRow> {
    await projectService.getProject(userId, projectId);
    await this.ensureParentIsFolder(projectId, input.parentId ?? null);

    const isFolder = input.type === "folder";

    const { data, error } = await supabaseAdmin
      .from("files")
      .insert({
        project_id: projectId,
        parent_id: input.parentId ?? null,
        name: input.name,
        type: input.type,
        language: isFolder ? null : input.language ?? inferLanguage(input.name),
        content: isFolder ? null : input.content ?? "",
      })
      .select(FILE_COLUMNS)
      .single();

    if (error) {
      throw new AppError(400, error.message, "FILE_CREATE_FAILED");
    }

    return data;
  },

  async updateNode(userId: string, projectId: string, fileId: string, input: UpdateNodeInput): Promise<FileRow> {
    await projectService.getProject(userId, projectId);
    const existing = await this.getNode(projectId, fileId);

    if (input.parentId !== undefined) {
      await this.ensureValidMove(projectId, fileId, input.parentId);
    }

    if (input.content !== undefined && existing.type === "folder") {
      throw new AppError(400, "Folders cannot store editable content.", "FOLDER_CONTENT_INVALID");
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) patch.name = input.name;
    if (input.parentId !== undefined) patch.parent_id = input.parentId;
    if (input.language !== undefined) patch.language = existing.type === "folder" ? null : input.language;
    if (input.content !== undefined) {
      patch.content = input.content;
      patch.version = existing.version + 1;
    }

    const { data, error } = await supabaseAdmin
      .from("files")
      .update(patch)
      .eq("project_id", projectId)
      .eq("id", fileId)
      .select(FILE_COLUMNS)
      .single();

    if (error) {
      throw new AppError(400, error.message, "FILE_UPDATE_FAILED");
    }

    return data;
  },

  async deleteNode(userId: string, projectId: string, fileId: string): Promise<void> {
    await projectService.getProject(userId, projectId);
    await this.getNode(projectId, fileId);

    const { error } = await supabaseAdmin
      .from("files")
      .delete()
      .eq("project_id", projectId)
      .eq("id", fileId);

    if (error) {
      throw new AppError(400, error.message, "FILE_DELETE_FAILED");
    }
  },

  async autosave(userId: string, projectId: string, input: AutosaveInput) {
    await projectService.getProject(userId, projectId);

    const ids = input.files.map((file) => file.id);
    const { data: existingRows, error: fetchError } = await supabaseAdmin
      .from("files")
      .select("id,type,version")
      .eq("project_id", projectId)
      .in("id", ids);

    if (fetchError) {
      throw new AppError(400, fetchError.message, "AUTOSAVE_FETCH_FAILED");
    }

    const existingById = new Map(existingRows.map((row) => [row.id, row]));

    const updates = await Promise.all(
      input.files.map(async (file) => {
        const existing = existingById.get(file.id);

        if (!existing) {
          throw new AppError(404, `File not found: ${file.id}`, "FILE_NOT_FOUND");
        }

        if (existing.type !== "file") {
          throw new AppError(400, `Cannot autosave a folder: ${file.id}`, "AUTOSAVE_FOLDER_INVALID");
        }

        const { data, error } = await supabaseAdmin
          .from("files")
          .update({
            content: file.content,
            version: existing.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("project_id", projectId)
          .eq("id", file.id)
          .select("id,version,updated_at")
          .single();

        if (error) {
          throw new AppError(400, error.message, "AUTOSAVE_UPDATE_FAILED");
        }

        return data;
      }),
    );

    return { saved: updates };
  },

  async getPushableFiles(userId: string, projectId: string): Promise<PushableFile[]> {
    await projectService.getProject(userId, projectId);

    const { data, error } = await supabaseAdmin
      .from("files")
      .select(FILE_COLUMNS)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new AppError(400, error.message, "FILE_LIST_FAILED");
    }

    const byId = new Map<string, FileRow>(data.map((row) => [row.id, row]));

    return data
      .filter((row) => row.type === "file")
      .map((row) => ({
        path: buildPath(row, byId),
        content: row.content ?? "",
      }));
  },

  async getNode(projectId: string, fileId: string): Promise<FileRow> {
    const { data, error } = await supabaseAdmin
      .from("files")
      .select(FILE_COLUMNS)
      .eq("project_id", projectId)
      .eq("id", fileId)
      .maybeSingle();

    if (error) {
      throw new AppError(400, error.message, "FILE_FETCH_FAILED");
    }

    if (!data) {
      throw new AppError(404, "File or folder not found.", "FILE_NOT_FOUND");
    }

    return data;
  },

  async ensureParentIsFolder(projectId: string, parentId: string | null): Promise<void> {
    if (!parentId) return;

    const parent = await this.getNode(projectId, parentId);

    if (parent.type !== "folder") {
      throw new AppError(400, "Parent must be a folder.", "PARENT_NOT_FOLDER");
    }
  },

  async ensureValidMove(projectId: string, fileId: string, parentId: string | null): Promise<void> {
    if (!parentId) return;
    if (parentId === fileId) {
      throw new AppError(400, "A node cannot be moved into itself.", "INVALID_TREE_MOVE");
    }

    const { data, error } = await supabaseAdmin
      .from("files")
      .select("id,parent_id,type")
      .eq("project_id", projectId);

    if (error) {
      throw new AppError(400, error.message, "TREE_VALIDATE_FAILED");
    }

    const byId = new Map(data.map((row) => [row.id, row]));
    const parent = byId.get(parentId);

    if (!parent || parent.type !== "folder") {
      throw new AppError(400, "Parent must be a folder.", "PARENT_NOT_FOLDER");
    }

    let cursor: typeof parent | undefined = parent;

    while (cursor) {
      if (cursor.id === fileId) {
        throw new AppError(400, "A folder cannot be moved into its own child.", "INVALID_TREE_MOVE");
      }

      cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
    }
  },
};

const inferLanguage = (name: string): string => {
  const extension = name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "html":
      return "html";
    case "css":
      return "css";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "ts":
      return "typescript";
    case "json":
      return "json";
    default:
      return "plaintext";
  }
};
