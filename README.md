# TriageRAG

TriageRAG helps support and operations teams look up how similar incidents were resolved. PostgreSQL stores incident reports and chat history. Ollama runs embeddings and local chat models. Gemini is available as an optional cloud model.

## Where to start in the code

| I want to understand… | Start here |
| --- | --- |
| Which page or API handles a request | [src/app](src/app) |
| How someone signs in or joins a workspace | [Accounts](src/features/accounts) |
| How a question becomes an answer with supporting incidents | [Chat request](src/features/chat/answer-request.ts) and [incident retrieval strategies](src/features/chat/retrieval) |
| How a conversation is saved and restored | [Conversation](src/features/chat/conversation) |
| How to add a chat model or provider | [Model catalog](src/features/chat/models/catalog.ts) and [provider registry](src/features/chat/models/registry.ts) |
| How incident reports are added or deleted | [Incidents](src/features/incidents) |
| How webhooks are set up and delivered | [Integrations](src/features/integrations) |
| How sensitive text is masked | [Privacy](src/features/privacy/redact.ts) |
| Where the data is stored | [Database schema](src/db/schema.ts) |

Routes in `src/app` connect URLs to features. Inside a feature, `ui/` contains what people see, `actions.ts` handles requests from those screens, and named files such as `history.ts` handle specific jobs. Shared navigation and the dashboard frame live in `src/components/layout`.

## Run locally

Prerequisites are Node.js, npm, PostgreSQL with pgvector installed, and Ollama.

```sh
npm ci
export DATABASE_URL='postgresql://localhost:5432/rag_triage'
createdb rag_triage
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS vector;'
npx drizzle-kit push
ollama pull nomic-embed-text
ollama pull qwen3.5:4b
ollama pull llama3.2:1b
npm run dev
```

For local development from another device, set `DEV_ALLOWED_ORIGIN` in your local environment to the development hostname or LAN IP, without a port or scheme.

Open [localhost:4000](http://localhost:4000) and register a workspace. In Knowledge Base, add an incident manually or choose **Import Excel** to download a template and upload up to 100 resolved incidents. Then start a new chat and ask a related question. Chats started with **New Triage Chat** save their history. Open **Account settings** from the sidebar profile card to edit your profile or change your password. Workspace administrators can also invite colleagues and manage roles under **Team**. The recipient enters the 24-hour code and chooses a password on the [invitation page](http://localhost:4000/invitation).

Chat uses PostgreSQL sessions and secure production cookies. Deploy behind HTTPS and apply request rate limits at the gateway for sign-in, registration, and chat. Webhooks are optional outbound connections. The current allowlist covers Slack incoming webhooks and legacy Teams connectors. Seeded placeholder URLs and the PagerDuty connector are simulated.

## Enable Gemini

Add `GOOGLE_GENERATIVE_AI_API_KEY=your_key_here` to your local `.env.local` and restart the app. Select **Gemini 3.5 Flash-Lite** in the chat composer. Keep the key on the server and out of version control. The app sends the redacted question, relevant follow-up context, and matching incident excerpts to Google only when Gemini is selected. Gemini mode searches incident text directly in PostgreSQL. To opt in to Gemini semantic indexing, set `GEMINI_INDEX_INCIDENTS=true`. This sends redacted incident text to Google and builds a separate embedding index in small batches while you chat. PostgreSQL keyword search remains available if Google embeddings are unavailable or find no close match. Gemini chat works with Ollama stopped. Local models continue to use the Ollama index.

For existing databases, run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/add-gemini-embeddings.sql` before starting the updated app. Existing incidents can be indexed without re-importing them.

## Add a chat model or provider

1. For another model from Ollama or Google, add its provider model ID, name, and menu description to `src/features/chat/models/catalog.ts`. The model picker, request validation, history, and observability use that catalog.
2. For a new provider, add its SDK factory and environment configuration under `src/features/chat/models/providers/`. Add a provider entry in `src/features/chat/models/registry.ts`, then register a model in the catalog. The registry controls availability, model creation, retrieval strategy, and recovery behavior. Reuse an existing retrieval strategy when possible.
3. For a provider that needs a separate embedding space, put the retrieval strategy under `src/features/chat/retrieval/`. Keep data sharing explicit and store incompatible vectors separately. Pass only public model metadata to the browser.

## Upgrade an existing database

With the app stopped, apply the additive account migration to the same database the app uses. This adds password and session storage and repairs ID counters from older demo seeds. If your app uses the default local database, set `DATABASE_URL` as shown above before running the command.

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/upgrade-accounts.sql
```

Previous sign-ins expire with this upgrade. Existing users and their workspace data remain in place. An operator can provision or reset a user's password individually. The example uses Zsh and keeps the password out of the command line and shell history.

```zsh
read -rs 'triage_password?New password: '
printf '\n'
printf '%s' "$triage_password" | node --import tsx scripts/set-account-password.ts user@example.com
unset triage_password
```

New chat audit events store retrieval metrics without query text. New chat history and feedback run through server-side redaction before writing. The migration leaves older rows and backups intact, including historical content stored before these rules were introduced. The app masks recognized patterns when opening historical chats and hides old query text from the audit view.

## Checks

```sh
npm run lint
npx tsc --noEmit --incremental false
node --import tsx --test tests/*.test.ts
npm run build
```

### Importing GitHub issues

For an existing database, apply `drizzle/add-github-incident-source.sql` with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/add-github-incident-source.sql`. Also apply `drizzle/add-github-connections.sql` to save repository settings. New database setups using the current schema already include both changes.

As a workspace admin, open **Integrations → GitHub Issues → Connect GitHub**. Enter the repository owner, repository name, and optionally one issue label. Public repositories require no credentials. For a private repository, create a GitHub fine-grained personal access token for the repository owner, choose only the target repository, and grant **Repository permissions → Issues → Read-only**. The connector uses the token in memory and does not save it. It needs no OAuth client secret or webhook secret.

Choose **Save connection and preview**, then import. Each workspace can save one repository and label filter. Re-enter the token when opening setup for a private repository. The connector checks up to 30 recently updated closed issues per run, or you can enter an issue number to preview one thread directly without the label filter. It accepts issues with a **Resolution**, **Fix applied**, or **How it was fixed** section in the issue description, or a documented fix in the latest page of comments from the issue author or repository team. For issues explicitly closed as Completed, a concrete fix reported by another participant can also qualify. Comment wording such as “Fixed by rolling back the deployment” also works. Repeat imports update changed records and skip unchanged ones. Imported records retain the original GitHub issue link and are visible to members of the workspace. Imports are initiated manually.

## Deploy a demo without a database

On a regular deployment, visitors can choose **Explore demo** on the sign-in page or open `/demo` directly. This public route can run alongside the regular workspace and uses only bundled samples.

To make the home page open the demo for everyone, set `DEMO_MODE=true` in Vercel and deploy. To try that setup locally, run `DEMO_MODE=true npm run dev`.

The demo offers a public chat with 56 fictional, read-only incidents. There is no sign-in, database migration, Ollama setup, or saved chat history. Visitors can browse and filter the sample knowledge base, read the plain-language RAG guide, open incident citations, and start a fresh chat. Workspace management and imports require the normal database-backed app.

Set `GOOGLE_GENERATIVE_AI_API_KEY` to enable chat. Gemini generates every demo chat reply and uses relevant sample incidents when available. The demo searches the sample records by text. The sample knowledge base and guide remain available without a key. For a public demo that uses your Gemini quota, apply a gateway rate limit to `POST /api/demo/chat`. In demo-only deployments, apply the same limit to the existing `POST /api/chat` demo endpoint.

Leave `DEMO_MODE` unset or set it to `false` for the normal app.
