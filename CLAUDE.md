# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup (installs deps, generates Prisma client, runs migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Build for production

npm run build

# Run all tests
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Lint
npm run lint

# Reset database (destructive)
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate && npx prisma migrate dev
```

The dev server requires `NODE_OPTIONS='--require ./node-compat.cjs'` (already set in package.json scripts). Do not strip this.

## Architecture

UIGen is a Next.js 15 (App Router) app where users describe React components in chat and see them rendered live. No component files are written to disk — everything lives in an in-memory `VirtualFileSystem`.

### Request flow

1. User types a prompt → `ChatInterface` calls `POST /api/chat` with the current message history and serialized file system nodes.
2. The API route reconstructs a `VirtualFileSystem`, calls `streamText` (Vercel AI SDK) with two tools — `str_replace_editor` and `file_manager` — and streams the response back.
3. On the client, `ChatContext` processes streamed tool calls via `FileSystemContext.handleToolCall`, which applies mutations (create/replace/insert/rename/delete) to the in-memory VFS.
4. `PreviewFrame` watches `refreshTrigger` from `FileSystemContext`. On each change it calls `createImportMap` + `createPreviewHTML` (in `src/lib/transform/jsx-transformer.ts`) and writes the result to an `<iframe srcdoc>`.

### Key modules

- **`src/lib/file-system.ts`** — `VirtualFileSystem` class: tree of `FileNode` objects backed by a `Map<path, FileNode>`. Supports CRUD, rename, serialize/deserialize. The singleton `fileSystem` export is unused in production; always construct a fresh instance per request on the server.
- **`src/lib/transform/jsx-transformer.ts`** — Transforms `.jsx/.tsx/.ts/.js` files via `@babel/standalone` and builds an ES module import map (blob URLs). Third-party packages not present in the VFS are resolved to `https://esm.sh/<pkg>`. Missing local imports get placeholder stub modules so the preview doesn't crash.
- **`src/lib/contexts/file-system-context.tsx`** — Client context that owns the live VFS instance and exposes `handleToolCall` (maps tool call args → VFS mutations).
- **`src/lib/contexts/chat-context.tsx`** — Client context that manages message history and calls the chat API route.
- **`src/lib/provider.ts`** — Returns a real `anthropic(MODEL)` when `ANTHROPIC_API_KEY` is set; otherwise returns `MockLanguageModel` (a scripted 4-step demo). Model is hardcoded to `claude-haiku-4-5`.
- **`src/lib/auth.ts`** — JWT-based sessions stored in an `httpOnly` cookie (`auth-token`). Server-only. Uses `jose`.
- **`src/lib/anon-work-tracker.ts`** — Saves anonymous session work to `sessionStorage` so it can be claimed on sign-up.
- **`src/middleware.ts`** — Protects `/api/projects` and `/api/filesystem` routes; `/api/chat` is intentionally unprotected.
- **`src/actions/`** — Next.js Server Actions for project CRUD (create, get, get-all).

### Database (Prisma + SQLite)

Schema at `prisma/schema.prisma`. Two models:
- `User` — email/password (bcrypt).
- `Project` — belongs to optional `User`; stores `messages` (JSON string) and `data` (serialized VFS JSON string).

Prisma client is generated to `src/generated/prisma/`. Import it via `src/lib/prisma.ts`.

### Preview rendering

The preview iframe uses ES module import maps. The entry point is always `/App.jsx` (or the first `.jsx/.tsx` found). Tailwind is loaded via CDN (`https://cdn.tailwindcss.com`) inside the iframe. The `@/` alias in generated component code maps to the VFS root `/`.

### AI tool protocol

The system prompt (`src/lib/prompts/generation.tsx`) instructs Claude to:
- Always create `/App.jsx` as the entry point.
- Use `@/` import aliases for local files (e.g., `import Foo from '@/components/Foo'`).
- Use Tailwind for styling (no inline styles).
- Never create HTML files.

Two tools are registered per request:
- `str_replace_editor` — commands: `create`, `str_replace`, `insert`.
- `file_manager` — commands: `rename`, `delete`.

### Testing

Tests use Vitest + jsdom + React Testing Library. Test files live next to source in `__tests__/` subdirectories. No mocking of the database — tests exercise the VFS and transformer logic directly.
