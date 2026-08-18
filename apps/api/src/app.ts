import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { allowedOrigins, env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { aiRoutes } from "./routes/ai.routes.js";
import { githubRoutes } from "./routes/github.routes.js";
import { projectRoutes } from "./routes/project.routes.js";

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "cloud-code-editor-api" });
});

app.use("/api/projects", requireAuth, projectRoutes);
app.use("/api/github", requireAuth, githubRoutes);
app.use("/api/ai", requireAuth, aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
