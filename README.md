# TriageRAG Enterprise (Private Incident & Support Resolution Copilot)

TriageRAG Enterprise is an air-gapped, privacy-preserving incident intelligence platform designed for DevOps, SREs, and engineering support teams. It indexes historical post-mortems and resolutions using PostgreSQL with `pgvector` and local Ollama embeddings, featuring multi-tenancy, RBAC, PII redaction, dynamic integrations, and production observability.

---

## Key Enterprise Capabilities

1. **Authentication, SSO & Multi-Tenant Data Isolation**:
   - Organization-level tenancy (`organizations` table) with strict SQL isolation.
   - User account & identity management (`users` table) with role badges (`Admin` vs `Member`).
   - One-click account switcher in header to test cross-tenant isolation and role-based permissions.

2. **Role-Based Access Control (RBAC)**:
   - **Admin**: Full control over incident post-mortems (including deletion), team member invitations, webhook configurations, and audit trail inspection.
   - **Member**: Incident diagnosis, copilot triage, and post-mortem ingestion.

3. **Security & Data Protection**:
   - **Zero-Trust PII & Secret Scrubbing Pipeline**: Automatically masks API keys (`sk_live_...`), JWT tokens (`eyJ...`), Bearer headers, database connection URIs with passwords, and credit card numbers before embedding or storing.
   - **Prompt Injection Defense**: Detects and rejects adversarial overrides or jailbreak attempts.
   - **Zero-Tolerance Hallucination Guardrail**: Refuses to speculate if no past ticket exceeds the similarity threshold (`> 0.55`).

4. **Advanced RAG Architecture**:
   - **Dynamic Model Selection**: Select between `qwen3.5:4b` (Fast Local), `llama3.1:8b` (Deep SRE), or `deepseek-r1:7b` (Chain-of-Thought Reasoning).
   - **HNSW Indexing on pgvector**: Sub-millisecond vector cosine distance similarity (`<=>`).
   - **Inline Citations**: Direct inline badge citations `[TKT-XXXX]` linking to verifiable post-mortem records.

5. **Real-World Integrations**:
   - **Slack Webhooks**: Dispatches incident alerts to `#prod-triage` channels when new incidents are ingested or critical triage occurs.
   - **Microsoft Teams & Discord**: Webhook alert dispatch.
   - **PagerDuty Ingress**: Integrates with high-severity alert queues.
   - **Live Webhook Tester**: In-app ping tester with latency and status feedback.

6. **Production Observability & Telemetry**:
   - Live KPI dashboard tracking Total Seeded Post-Mortems, Average Retrieval Match %, P95 Retrieval Latency, and Satisfaction %.
   - Response evaluation system (👍 / 👎 feedback buttons) with telemetry logs.
   - Category coverage breakdown charts.

7. **Immutable Audit Trail**:
   - Complete audit logging of all user activities (`TICKET_INGEST`, `CHAT_QUERY`, `PII_SCRUBBED`, `INTEGRATION_UPDATE`, `MEMBER_INVITED`) with actor, role, IP address, and timestamp.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS v4)
- **Database & ORM:** PostgreSQL 16 (`pgvector` extension) + `drizzle-orm` + `postgres` driver + `drizzle-kit`
- **AI & Embeddings:**
  - `ollama-ai-provider-v2` + `ai` SDK
  - Embedding Model: `nomic-embed-text` (768 dimensions)
  - Chat Models: `qwen3.5:4b`, `llama3.1:8b`, `deepseek-r1:7b`
- **Icons:** `lucide-react`

---

## Running Locally

1. **Start Ollama & PostgreSQL**:
   Ensure Ollama is running with `nomic-embed-text` and `qwen3.5:4b`:
   ```bash
   ollama pull nomic-embed-text
   ollama pull qwen3.5:4b
   ```

2. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:4000](http://localhost:4000) in your browser.
