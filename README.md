# Cloud Code Editor MVP

A production-minded MVP for a browser-based, cloud-synced code editor that runs on desktop web and mobile browsers, with a path to packaged desktop and mobile apps later.

## What Is Included

- Next.js App Router frontend with Tailwind CSS and Monaco Editor
- Node.js and Express REST API
- Supabase Auth and PostgreSQL schema
- Project and file tree management
- Debounced autosave
- HTML, CSS, and JavaScript live preview in an iframe
- Basic GitHub OAuth connection and push-to-repository flow
- Progressive Web App installability and offline shell support
- Tauri desktop app scaffold
- AI coding assistant endpoints and editor panel

## Folder Structure

```txt
cloud-code-editor-mvp/
  apps/
    api/
      src/
        config/          Environment and Supabase admin client
        controllers/     HTTP request and response handlers
        errors/          AppError for typed API failures
        middleware/      Auth, validation, async, and error middleware
        routes/          REST route definitions
        schemas/         Zod request validation schemas
        services/        Business logic and data access
        types/           Shared backend domain types
      .env.example
      package.json
      tsconfig.json
    web/
      app/               Next.js App Router pages
      components/        Editor shell, explorer, Monaco, preview, auth
      lib/               Supabase browser client and API client
      types/             Frontend domain types
      .env.example
      package.json
      tailwind.config.ts
      tsconfig.json
  docs/
    API.md
    ARCHITECTURE.md
    CROSS_PLATFORM_UPGRADE.md
  supabase/
    schema.sql
  src-tauri/
    tauri.conf.json
    Cargo.toml
  package.json
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Supabase project

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Enable email/password auth in Supabase Authentication settings.
5. Copy these values:
   - Project URL
   - anon public key
   - service role key

The service role key is backend-only. Never expose it to the browser.

### 3. Configure environment files

Create `apps/api/.env`:

```bash
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/settings/github/callback
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
```

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Configure GitHub OAuth

1. Go to GitHub Developer settings.
2. Create an OAuth app.
3. Set Homepage URL to `http://localhost:3000`.
4. Set Authorization callback URL to `http://localhost:3000/settings/github/callback`.
5. Add the client ID and client secret to `apps/api/.env`.

For production, replace the callback URL with your deployed frontend URL.

### 5. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

The API runs on `http://localhost:4000`.

For PWA, Tauri, and AI assistant setup, see `docs/CROSS_PLATFORM_UPGRADE.md`.

## Core API Surface

All `/api/*` routes require:

```txt
Authorization: Bearer <supabase-access-token>
```

Key endpoints:

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `GET /api/projects/:projectId/files/tree`
- `POST /api/projects/:projectId/files`
- `PATCH /api/projects/:projectId/files/:fileId`
- `DELETE /api/projects/:projectId/files/:fileId`
- `POST /api/projects/:projectId/files/autosave`
- `GET /api/github/oauth-url`
- `POST /api/github/callback`
- `POST /api/projects/:projectId/github/push`

See `docs/API.md` for request and response examples.

## Live Preview

The frontend flattens the file tree, gathers `.html`, `.css`, and `.js` files, and builds a single `srcDoc` document for an iframe. Every editor change updates local state immediately, so the iframe refreshes as the user types. Autosave is debounced separately so preview stays fast without waiting for the network.

## 7-10 Day Shipping Plan

### Day 1: Foundation

- Create Supabase project.
- Run schema.
- Configure environment files.
- Verify auth sign-up and sign-in.
- Run API and web app locally.

### Day 2: Project and File APIs

- Test project create/list/delete.
- Test file create/update/delete/tree.
- Confirm Supabase rows are scoped by `user_id`.
- Add API smoke tests if desired.

### Day 3: Editor Shell

- Polish responsive panel behavior.
- Verify Monaco loads on desktop and mobile browsers.
- Confirm syntax highlighting for HTML, CSS, and JavaScript.

### Day 4: Autosave and State

- Tune autosave debounce.
- Add visible save error recovery.
- Add optimistic file create/delete states if needed.

### Day 5: Live Preview

- Harden iframe sandbox rules.
- Add preview console capture if needed.
- Test projects with multiple HTML, CSS, and JS files.

### Day 6: GitHub Integration

- Configure OAuth app.
- Connect GitHub.
- Push to a test repository branch.
- Handle missing repository, missing branch, and permission errors.

### Day 7: QA Pass

- Test in Chrome, Safari mobile, and Android Chrome.
- Test slow network and token expiry.
- Verify large file behavior within MVP limits.

### Days 8-10: Production Readiness

- Add rate limiting to the API.
- Add request logging and error reporting.
- Move GitHub tokens to Supabase Vault or another secret store.
- Add automated tests for service methods and API routes.
- Deploy frontend and backend.

## Production Notes

- The API uses the Supabase service role key, then filters every project and file operation by authenticated `user_id`.
- RLS policies are still included for defense in depth and future direct Supabase reads.
- The GitHub access token is stored in `github_connections` for MVP simplicity. Before real production launch, store it encrypted using Supabase Vault, a KMS, or a dedicated secret store.
- The current GitHub push assumes the repository and branch already exist.
- File content is capped at 500 KB per file at the API boundary. Raise this only after adding better editor and network handling.
