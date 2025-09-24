# ChatGPT Clone (OpenAI Responses API)

This project implements a ChatGPT-style conversational app using the OpenAI Responses API. It mirrors the modern ChatGPT product experience (sidebar thread list, chat composer, configurable instructions) while showcasing:

- **Responses API** for primary completion flow
- **Connectors** support so you can bring in external knowledge bases
- **Tools** to execute custom server-side functions during a conversation
- **Persistent conversation threads** backed by Upstash Redis (or an in-memory fallback for quick local testing)

The app lives in the `chatgpt` directory and is optimized for deployment on Vercel.

## Quick Start

```bash
# from the chatgpt directory
npm install
npm run dev
```

Then open http://localhost:3000.

## Required Environment Variables

Create a `.env.local` file for local development (Vercel uses the same names in the dashboard):

```bash
OPENAI_API_KEY=sk-...
# Optional overrides
OPENAI_MODEL=gpt-4.1-mini
OPENAI_MODELS=gpt-4.1-mini,gpt-4.1,gpt-4.1-nano
# Semi-colon separated list in the format id|Label|Optional description
OPENAI_CONNECTORS=conn_123|Company Docs|Vector search over docs;conn_456|Notion|Access team workspace

# Upstash Redis (recommended for persistence across deploys & sessions)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

- **`OPENAI_MODELS`** controls the buttons in the model switcher. If omitted the UI shows the default model only.
- **`OPENAI_CONNECTORS`** lets you expose configured Connectors in a toggle list. The server automatically forwards selected connector IDs to `client.responses.create(...)`.
- If **`UPSTASH_REDIS_*`** are not provided, the app falls back to an in-memory store (conversations reset when the server restarts). For production, configure Upstash Redis or any REST-compatible Redis instance.

## Available Tools

Two example tools are wired into the model:

1. `get_current_time` — returns the current time (with optional timezone conversion).
2. `lookup_company_faq` — searches `data/company_faq.json` for internal answers.

You can extend `lib/tools.ts` with additional tools. Each entry defines the OpenAI tool schema **and** the handler that returns tool outputs. The API route automatically handles the tool-call → tool-output loop via `responses.submitToolOutputs`.

## Deployment (Vercel)

1. Push the project to a Git repository.
2. Create a new Vercel project and import this directory.
3. In *Project Settings → Environment Variables*, add the variables listed above.
4. Deploy. Vercel automatically runs `npm install` and `npm run build`.

### Vercel KV / Alternative Persistence

The project defaults to Upstash Redis via REST. If you prefer Vercel KV, provision an Upstash Redis database through Vercel, then copy the `UPSTASH_REDIS_*` secrets into the project settings. No code changes required.

## Project Structure

```
app/
  page.tsx                # ChatGPT interface (sidebar + chat area)
  api/                    # REST endpoints for threads, messages, config
components/               # UI building blocks (sidebar, composer, message list)
lib/
  api.ts                  # Client-side data helpers
  store.ts                # Thread persistence (Redis + in-memory fallback)
  tools.ts                # Tool definitions & handlers
config/connectors.ts      # Parses connector metadata from env
```

## Notes

- Thread titles auto-update based on the first user message.
- The message list renders Markdown (with GFM) just like ChatGPT.
- Tool calls and results show inline cards in the transcript to aid debugging.
- The UI stores the last opened thread ID in `localStorage` so users resume where they left off.

For questions or to extend the app (e.g., add streaming responses, authentication, or organization-specific tools), build on the provided API routes and components.
