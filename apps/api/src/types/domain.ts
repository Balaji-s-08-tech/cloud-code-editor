export type FileType = "file" | "folder";

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  github_repo_owner: string | null;
  github_repo_name: string | null;
  github_branch: string | null;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  type: FileType;
  language: string | null;
  content: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type FileTreeNode = FileRow & {
  children: FileTreeNode[];
};

export type PushableFile = {
  path: string;
  content: string;
};
