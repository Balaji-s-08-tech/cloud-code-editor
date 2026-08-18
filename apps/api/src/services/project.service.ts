import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../errors/AppError.js";
import type { ProjectRow } from "../types/domain.js";

const PROJECT_COLUMNS =
  "id,user_id,name,description,github_repo_owner,github_repo_name,github_branch,created_at,updated_at";

type CreateProjectInput = {
  name: string;
  description?: string;
};

export const projectService = {
  async createProject(userId: string, input: CreateProjectInput): Promise<ProjectRow> {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description ?? null,
      })
      .select(PROJECT_COLUMNS)
      .single();

    if (error) {
      throw new AppError(400, error.message, "PROJECT_CREATE_FAILED");
    }

    return data;
  },

  async listProjects(userId: string): Promise<ProjectRow[]> {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new AppError(400, error.message, "PROJECT_LIST_FAILED");
    }

    return data;
  },

  async getProject(userId: string, projectId: string): Promise<ProjectRow> {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("user_id", userId)
      .eq("id", projectId)
      .maybeSingle();

    if (error) {
      throw new AppError(400, error.message, "PROJECT_FETCH_FAILED");
    }

    if (!data) {
      throw new AppError(404, "Project not found.", "PROJECT_NOT_FOUND");
    }

    return data;
  },

  async deleteProject(userId: string, projectId: string): Promise<void> {
    await this.getProject(userId, projectId);

    const { error } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("user_id", userId)
      .eq("id", projectId);

    if (error) {
      throw new AppError(400, error.message, "PROJECT_DELETE_FAILED");
    }
  },

  async updateGithubTarget(
    userId: string,
    projectId: string,
    target: { repoOwner: string; repoName: string; branch: string },
  ): Promise<ProjectRow> {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .update({
        github_repo_owner: target.repoOwner,
        github_repo_name: target.repoName,
        github_branch: target.branch,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("id", projectId)
      .select(PROJECT_COLUMNS)
      .single();

    if (error) {
      throw new AppError(400, error.message, "PROJECT_GITHUB_UPDATE_FAILED");
    }

    return data;
  },
};
