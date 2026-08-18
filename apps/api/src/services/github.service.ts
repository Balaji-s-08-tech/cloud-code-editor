import { randomUUID } from "node:crypto";
import { Octokit } from "@octokit/rest";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../errors/AppError.js";
import { fileService } from "./file.service.js";
import { projectService } from "./project.service.js";

type PushInput = {
  repoOwner: string;
  repoName: string;
  branch: string;
  commitMessage: string;
};

const requireGithubEnv = () => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_REDIRECT_URI) {
    throw new AppError(500, "GitHub OAuth environment variables are not configured.", "GITHUB_ENV_MISSING");
  }
};

export const githubService = {
  getOAuthUrl(state?: string) {
    requireGithubEnv();
    const oauthState = state ?? randomUUID();

    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID!,
      redirect_uri: env.GITHUB_REDIRECT_URI!,
      scope: "repo read:user user:email",
      state: oauthState,
    });

    return {
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
      state: oauthState,
    };
  },

  async exchangeCode(userId: string, code: string) {
    requireGithubEnv();

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        redirect_uri: env.GITHUB_REDIRECT_URI,
        code,
      }),
    });

    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new AppError(
        400,
        tokenPayload.error_description ?? "GitHub OAuth exchange failed.",
        "GITHUB_OAUTH_FAILED",
        tokenPayload,
      );
    }

    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenPayload.access_token}`,
        "User-Agent": "cloud-code-editor-mvp",
      },
    });

    const githubUser = (await githubUserResponse.json()) as {
      id?: number;
      login?: string;
      avatar_url?: string;
      html_url?: string;
    };

    if (!githubUserResponse.ok || !githubUser.id || !githubUser.login) {
      throw new AppError(400, "Unable to read GitHub user profile.", "GITHUB_PROFILE_FAILED", githubUser);
    }

    const { data, error } = await supabaseAdmin
      .from("github_connections")
      .upsert(
        {
          user_id: userId,
          github_user_id: String(githubUser.id),
          username: githubUser.login,
          avatar_url: githubUser.avatar_url ?? null,
          access_token: tokenPayload.access_token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("github_user_id,username,avatar_url,created_at,updated_at")
      .single();

    if (error) {
      throw new AppError(400, error.message, "GITHUB_CONNECTION_SAVE_FAILED");
    }

    return data;
  },

  async pushProject(userId: string, projectId: string, input: PushInput) {
    const { data: connection, error } = await supabaseAdmin
      .from("github_connections")
      .select("access_token,username")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(400, error.message, "GITHUB_CONNECTION_FETCH_FAILED");
    }

    if (!connection) {
      throw new AppError(400, "Connect GitHub before pushing a project.", "GITHUB_NOT_CONNECTED");
    }

    const files = await fileService.getPushableFiles(userId, projectId);

    if (files.length === 0) {
      throw new AppError(400, "Project has no files to push.", "GITHUB_PUSH_EMPTY_PROJECT");
    }

    const octokit = new Octokit({
      auth: connection.access_token,
      userAgent: "cloud-code-editor-mvp",
    });

    const { data: ref } = await octokit.git.getRef({
      owner: input.repoOwner,
      repo: input.repoName,
      ref: `heads/${input.branch}`,
    });

    const latestCommitSha = ref.object.sha;
    const { data: latestCommit } = await octokit.git.getCommit({
      owner: input.repoOwner,
      repo: input.repoName,
      commit_sha: latestCommitSha,
    });

    const { data: tree } = await octokit.git.createTree({
      owner: input.repoOwner,
      repo: input.repoName,
      base_tree: latestCommit.tree.sha,
      tree: files.map((file) => ({
        path: file.path,
        mode: "100644",
        type: "blob",
        content: file.content,
      })),
    });

    const { data: commit } = await octokit.git.createCommit({
      owner: input.repoOwner,
      repo: input.repoName,
      message: input.commitMessage,
      tree: tree.sha,
      parents: [latestCommitSha],
    });

    await octokit.git.updateRef({
      owner: input.repoOwner,
      repo: input.repoName,
      ref: `heads/${input.branch}`,
      sha: commit.sha,
    });

    await projectService.updateGithubTarget(userId, projectId, {
      repoOwner: input.repoOwner,
      repoName: input.repoName,
      branch: input.branch,
    });

    return {
      repository: `${input.repoOwner}/${input.repoName}`,
      branch: input.branch,
      commitSha: commit.sha,
      pushedFiles: files.length,
      commitUrl: commit.html_url,
    };
  },
};
