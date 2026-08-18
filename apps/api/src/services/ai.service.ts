import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { getOpenAIClient } from "../config/openai.js";
import { AppError } from "../errors/AppError.js";

type CodeInput = {
  code: string;
  language?: string;
  fileName?: string;
};

type GenerateInput = {
  prompt: string;
  context?: string;
  language?: string;
  fileName?: string;
};

const baseInstructions = [
  "You are a senior coding assistant embedded in a cloud code editor.",
  "Be concise, practical, and specific.",
  "Respect the user's current language, framework, and file context.",
  "Do not invent files or dependencies unless the user asks.",
  "When returning code for fix or generate tasks, return only the code unless explicitly asked for explanation.",
].join("\n");

export const aiService = {
  async explain(userId: string, input: CodeInput) {
    return runAI(userId, {
      task: "explain",
      temperature: 0.2,
      maxOutputTokens: 1200,
      input: [
        "Explain this code for an intermediate developer.",
        "Use short sections: Purpose, How it works, Risks, Improvements.",
        formatContext(input),
      ].join("\n\n"),
    });
  },

  async fix(userId: string, input: CodeInput) {
    return runAI(userId, {
      task: "fix",
      temperature: 0.1,
      maxOutputTokens: 1800,
      input: [
        "Fix bugs and obvious correctness issues in this code.",
        "Preserve public behavior and style unless a change is required.",
        "Return only the corrected full code. Do not wrap it in markdown.",
        formatContext(input),
      ].join("\n\n"),
    });
  },

  async generate(userId: string, input: GenerateInput) {
    return runAI(userId, {
      task: "generate",
      temperature: 0.3,
      maxOutputTokens: 1800,
      input: [
        "Generate code for this request.",
        "Return only code unless the prompt explicitly asks for explanation.",
        `Prompt:\n${input.prompt}`,
        formatContext({
          code: input.context ?? "",
          language: input.language,
          fileName: input.fileName,
        }),
      ].join("\n\n"),
    });
  },
};

const runAI = async (
  userId: string,
  input: {
    task: "explain" | "fix" | "generate";
    input: string;
    temperature: number;
    maxOutputTokens: number;
  },
) => {
  const openai = getOpenAIClient();

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    instructions: baseInstructions,
    input: input.input,
    temperature: input.temperature,
    max_output_tokens: input.maxOutputTokens,
    store: false,
    safety_identifier: hashUserId(userId),
    metadata: {
      feature: "editor-ai-assistant",
      task: input.task,
    },
  });

  const result = (response.output_text ?? extractOutputText(response)).trim();

  if (!result) {
    throw new AppError(502, "AI response did not include text output.", "AI_EMPTY_RESPONSE");
  }

  return {
    result,
    model: response.model,
    responseId: response.id,
  };
};

const formatContext = (input: CodeInput) => {
  return [
    `File: ${input.fileName ?? "unknown"}`,
    `Language: ${input.language ?? "unknown"}`,
    "Code:",
    input.code || "(no current code)",
  ].join("\n");
};

const hashUserId = (userId: string) => {
  return createHash("sha256").update(userId).digest("hex").slice(0, 32);
};

const extractOutputText = (response: unknown) => {
  const maybeResponse = response as {
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  return (
    maybeResponse.output
      ?.flatMap((item) => item.content ?? [])
      .filter((content) => content.type === "output_text" && content.text)
      .map((content) => content.text)
      .join("\n") ?? ""
  );
};
