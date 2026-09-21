# Smart Report Production SAP Hardening Design

## Objective

Upgrade the existing Smart Report application into a production-ready SAP reporting workspace connected exclusively through the existing MCP Server. Preserve working query definitions and server profiles while repairing incomplete features, unsafe behavior, inconsistent UX, and missing operational guardrails.

## Chosen Approach

Use progressive full-stack hardening instead of a full rewrite. The current React, Zustand, React Flow, AG Grid, FastAPI, SQLAlchemy, Pandas, and APScheduler boundaries remain, but unsafe implementations and tangled page flows are replaced behind compatible interfaces.

Alternatives rejected:

1. UI-only redesign: fast, but leaves hardcoded secrets, unsafe formulas, synchronous persistence, fragile SAP reads, and weak error handling.
2. Full rewrite: could produce cleaner architecture, but creates unnecessary migration risk for live MCP/SAP behavior and existing saved queries.

## Product Navigation and UX

The application keeps four independent workspaces: Query Studio, Cross-Server Compare, Schedules, and SAP Servers. Each workspace gets one contextual toolbar and a consistent content shell.

Query Studio follows a visible readiness sequence:

1. Select a healthy SAP server.
2. Add one or more SAP tables.
3. Review automatic joins and resolve warnings.
4. Select output fields and selection criteria.
5. Validate query safety.
6. Run the query.
7. Inspect, transform, save a variant, or export results.

Primary actions must remain visible without crowding the toolbar. Less-frequent controls move into contextual menus or panels. All destructive operations use application dialogs instead of browser `confirm()`. Every remote action has loading, success, empty, partial failure, and retry states. Production server execution requires an explicit in-product confirmation that identifies the target SID and client.

## SAP and MCP Boundary

FastAPI communicates with SAP only through a typed MCP adapter. The adapter reads the MCP URL and token exclusively from runtime configuration, maps requests to the MCP Server's custom SAP functions, applies per-call timeout and correlation IDs, and normalizes MCP errors into stable application error codes.

The application must not implement or advertise `RFC_READ_TABLE` chunking. The MCP Server owns SAP custom Function Module behavior, metadata access, and any row-width limitations. Server profile credentials remain encrypted in PostgreSQL and are decrypted only immediately before an MCP request.

## Query Safety

All executions are validated before reaching MCP. Validation covers disconnected tables, missing join fields, unsupported join types, malformed identifiers, unsupported filter operators, invalid row limits, and unsafe selection patterns. Query row limits have a conservative default and an administrator-controlled ceiling.

Custom formulas use a small expression grammar supporting numeric literals, parentheses, arithmetic operators, and whitelisted column references. Neither browser `Function` nor Python `eval` is permitted. Formula evaluation is authoritative in Pandas on the backend; the frontend may preview only through the same parser or backend preview endpoint.

## Data Processing and Export

Pandas remains mandatory for custom columns, diffing, masking, and deduplication. Export runs a fixed pipeline: normalize data, calculate formulas, deduplicate if requested, apply mandatory sensitive-field policy, then generate the Excel workbook. A caller cannot bypass masking for fields marked mandatory by policy.

Cross-server retrieval uses `asyncio.gather` with independent timeout/error reporting. A partial failure identifies the failed server without presenting incomplete results as a valid comparison. Composite keys must be explicit and unique enough for comparison; duplicate keys produce a validation error or an explicit aggregation choice.

## Persistence and Security

Remove all production endpoints, tokens, credentials, and encryption keys from source defaults. Startup fails clearly when required production configuration is absent or insecure. CORS uses an explicit allowlist. Encryption failures fail closed; ciphertext is never returned as a plaintext fallback.

Database access moves to SQLAlchemy's async engine and `AsyncSession`. CRUD endpoints use async transactions. Saved queries and variants retain backward-compatible JSON structure while gaining version fields for future migrations.

Add an execution audit record containing actor identity when available, server profile ID, query ID or definition hash, start/end timestamps, outcome, row count, and correlation ID. It must never contain SAP passwords or raw sensitive result rows.

## Schedules

Schedules validate cron syntax, query existence, server availability, destination, and masking policy before activation. Scheduler execution uses an isolated database session, records a run history, applies the same query/export pipeline as interactive execution, and retries transient MCP or Telegram failures with bounded backoff. It must not silently swallow exceptions.

## Frontend Architecture

Keep separate Zustand stores for application, Studio canvas, grid, and Compare state. Remote server state must not be silently duplicated across stores. Modules are lazy-loaded by workspace to reduce the current monolithic bundle. Formula parsing and server-side data are never trusted merely because they originated from the UI.

Shared UI primitives cover modal dialogs, confirmations, notices, skeleton/loading states, error panels, and empty states. Keyboard focus is trapped and restored for dialogs; icon buttons have accessible labels; normal control text is at least 14px; touch targets are at least 40px where practical.

## Error Model

API failures use a stable shape: `code`, `message`, `correlation_id`, `retryable`, and optional field-level `details`. Technical MCP traces stay in server logs. The UI presents an actionable explanation and correlation ID, preserving errors until dismissed rather than auto-hiding critical failures.

## Testing and Acceptance

Backend tests cover configuration rejection, encryption fail-closed behavior, formula parsing, query validation, MCP timeouts/errors, parallel compare, duplicate comparison keys, export masking, schedule validation, and API error contracts.

Frontend tests cover store transitions and the main journeys for Studio, Compare, Server Manager, variants, and scheduling. Production build must succeed with workspace-level code splitting and no source-map exposure of secrets. Existing saved queries must load without destructive migration.

Acceptance requires:

- No hardcoded production secrets or unsafe formula execution.
- No `RFC_READ_TABLE` assumption in application code or documentation.
- All four workspaces have coherent loading, empty, error, and success states.
- Query and compare execution are guarded, cancellable where supported, and safe for production servers.
- Masking is applied before every relevant export and scheduled delivery.
- Automated tests and production frontend build pass.

