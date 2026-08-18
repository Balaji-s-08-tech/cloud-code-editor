import OpenAI from "openai";
import { env } from "./env.js";
import { AppError } from "../errors/AppError.js";

let client: OpenAI | null = null;

export const getOpenAIClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new AppError(500, "OPENAI_API_KEY is not configured.", "OPENAI_ENV_MISSING");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return client;
};
