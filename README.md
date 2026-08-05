# MaxCanva

An interactive, sketch-style editor for creating and testing multi-screen UI prototypes.

## 🎬 Demo

<video src="./demo/maxcanva-demo.mp4" controls width="100%">
  Your Markdown viewer does not support embedded videos.
</video>

### [▶ Watch the full software demo](./demo/maxcanva-demo.mp4)

## Run locally

### Requirements

- [Node.js](https://nodejs.org/) `20.19+` or `22.12+`
- npm
- A [Supabase](https://supabase.com/) project

### 1. Install the dependencies

From the repository root:

```bash
npm install
```

### 2. Configure the server

Create your local environment file:

```bash
cp server/.env.example server/.env
```

At minimum, set these values in `server/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-server-only-secret-key
JWT_SECRET=replace-with-a-long-random-secret
```

Never expose `SUPABASE_SECRET_KEY` in the client or commit `server/.env`.

### 3. Create the database tables

In the Supabase SQL editor, run these migrations in order:

1. [`server/supabase/migrations/001_auth_users.sql`](./server/supabase/migrations/001_auth_users.sql)
2. [`server/supabase/migrations/002_ai_runs.sql`](./server/supabase/migrations/002_ai_runs.sql)

### 4. Start the application

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

The command starts both services:

- React client: `http://localhost:5173`
- Express API: `http://localhost:3001`

## Optional AI configuration

To enable **Create with AI**, add a Google AI Studio key to `server/.env`:

```env
GOOGLE_API_KEY=your-google-api-key
GEMINI_MODEL=gemini-3.6-flash
```

An OpenRouter key can also be configured as an optional fallback. See [`server/.env.example`](./server/.env.example) for all available settings.

## Useful commands

```bash
npm run dev        # Start the client and server
npm run build      # Type-check and build the application
npm run typecheck  # Type-check all workspaces
npm test --workspace server
```

## Project structure

```text
client/  React, Vite, Zustand and React Konva editor
server/  Express API, authentication, persistence and AI workflow
shared/  TypeScript contracts shared by the client and server
```
