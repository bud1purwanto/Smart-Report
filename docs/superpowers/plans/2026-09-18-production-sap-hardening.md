# Smart Report Production SAP Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Smart Report safe, reliable, and usable for live SAP access through the existing MCP Server.

**Architecture:** Preserve the current React/FastAPI application while introducing a strict MCP adapter, async persistence, validated query/formula contracts, and consistent workspace UI states. Changes land in risk order so security and correctness precede visual polish.

**Tech Stack:** React 19, Zustand, React Flow, AG Grid, Vite, FastAPI, SQLAlchemy async, Pandas, APScheduler, pytest.

**Spec:** `docs/superpowers/specs/2026-09-18-production-sap-hardening-design.md`

## Global Constraints

- SAP communication goes exclusively through the existing MCP Server.
- No hardcoded credentials, gateway tokens, or encryption keys.
- No browser `Function`, JavaScript `eval`, or Python `eval` for formulas.
- Pandas is mandatory for formulas, masking, deduplication, and diffing.
- Existing saved query JSON must remain readable.
- Do not automatically push commits to any remote.

---

### Task 1: Establish regression baseline and security configuration

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/core/security.py`
- Create: `backend/tests/test_config_security.py`
- Create: `backend/.env.example`

**Interfaces:**
- Produces: validated `Settings`; `encrypt_password(str) -> str`; fail-closed `decrypt_password(str) -> str`.

- [ ] Write tests proving production settings reject placeholder secrets and decryption never returns ciphertext as plaintext.
- [ ] Run the focused tests and confirm they fail against the current defaults.
- [ ] Remove endpoint/token/key defaults, add environment validation, and make decryption fail closed.
- [ ] Add a redacted `.env.example` containing names and safe descriptions only.
- [ ] Run focused and full backend tests.

### Task 2: Replace the SAP connector with a typed MCP adapter

**Files:**
- Modify: `backend/app/services/sap_rfc.py`
- Modify: `backend/app/services/query_executor.py`
- Modify: `backend/app/api/metadata.py`
- Create: `backend/app/services/mcp_gateway.py`
- Create: `backend/tests/test_mcp_gateway.py`

**Interfaces:**
- Produces: `McpGateway.call(tool_name, arguments, server_profile, correlation_id)` and normalized `McpGatewayError`.
- Consumes: encrypted server profile credentials and runtime MCP settings.

- [ ] Write tests for headers, timeouts, malformed responses, remote errors, and correlation IDs.
- [ ] Confirm the tests fail against the current untyped connector.
- [ ] Implement the adapter and route metadata/query operations through custom MCP tools.
- [ ] Remove application-side `RFC_READ_TABLE` chunking and references.
- [ ] Run gateway, query executor, metadata, and full backend tests.

### Task 3: Harden query and formula validation

**Files:**
- Modify: `backend/app/schemas/query.py`
- Modify: `backend/app/services/abap_validator.py`
- Modify: `backend/app/services/pandas_engine.py`
- Modify: `backend/app/api/queries.py`
- Create: `backend/app/services/formula_engine.py`
- Create: `backend/tests/test_query_safety.py`
- Modify: `frontend/src/store/useGridStore.js`

**Interfaces:**
- Produces: `parse_formula(expression, allowed_columns)` and `evaluate_formula(df, expression)`.
- Consumes: validated query definitions and selected column names.

- [ ] Write tests for valid arithmetic and rejection of calls, attributes, imports, assignments, unknown columns, malformed filters, and excessive row counts.
- [ ] Confirm malicious formula tests fail against current `eval`/`Function` behavior.
- [ ] Implement the AST expression whitelist and Pandas evaluation.
- [ ] Remove all frontend dynamic function construction and use backend-computed results.
- [ ] Run formula, query, API, and full backend tests; run the frontend build.

### Task 4: Enforce the export and comparison pipelines

**Files:**
- Modify: `backend/app/services/pandas_engine.py`
- Modify: `backend/app/api/queries.py`
- Modify: `backend/app/api/compare.py`
- Modify: `backend/app/schemas/compare.py`
- Create: `backend/tests/test_export_compare_safety.py`

**Interfaces:**
- Produces: deterministic export pipeline and explicit comparison-key validation.

- [ ] Write tests proving sensitive fields are masked before export, deduplication order is deterministic, comparison calls overlap in time, and duplicate keys are rejected.
- [ ] Run focused tests and confirm the unsafe cases fail.
- [ ] Implement mandatory masking policy and normalized compare failures.
- [ ] Ensure partial server failure cannot return a successful diff.
- [ ] Run focused and full backend tests.

### Task 5: Introduce async persistence and audit records

**Files:**
- Modify: `backend/app/core/database.py`
- Modify: `backend/app/api/queries.py`
- Modify: `backend/app/api/servers.py`
- Modify: `backend/app/api/variants.py`
- Modify: `backend/app/api/schedules.py`
- Create: `backend/app/models/execution_audit.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `database/init.sql`
- Create: `backend/tests/test_async_persistence_audit.py`

**Interfaces:**
- Produces: `AsyncSession` dependency and execution audit repository.

- [ ] Add tests for async CRUD transactions and redacted audit records.
- [ ] Migrate the engine/session dependency and endpoints to async operations.
- [ ] Record query, compare, export, and schedule outcomes without result payloads or credentials.
- [ ] Run CRUD, API, and full backend tests.

### Task 6: Repair scheduler reliability

**Files:**
- Modify: `backend/app/tasks/scheduler.py`
- Modify: `backend/app/api/schedules.py`
- Modify: `backend/app/schemas/schedule.py`
- Create: `backend/app/models/schedule_run.py`
- Modify: `database/init.sql`
- Create: `backend/tests/test_scheduler.py`

**Interfaces:**
- Produces: validated schedule activation and persisted run outcome.

- [ ] Write tests for invalid cron, missing query/server, masking enforcement, transient retry, and terminal failure recording.
- [ ] Replace swallowed exceptions with structured run history and bounded retry.
- [ ] Reuse the interactive query/export pipeline.
- [ ] Run scheduler and full backend tests.

### Task 7: Build a consistent application shell and Studio workflow

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Navbar.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/features/canvas/VisualCanvas.jsx`
- Modify: `frontend/src/features/validator/AbapValidatorPanel.jsx`
- Create: `frontend/src/components/ui/ConfirmDialog.jsx`
- Create: `frontend/src/components/ui/AsyncState.jsx`
- Create: `frontend/src/features/canvas/QueryReadiness.jsx`

**Interfaces:**
- Produces: reusable confirmation and async-state components plus readiness state derived from canvas/server/validation.

- [ ] Add component/store tests for readiness transitions and production confirmation.
- [ ] Replace browser confirmation and scattered notifications with accessible UI primitives.
- [ ] Reduce toolbar density and surface the ordered Studio workflow.
- [ ] Add explicit unsaved-change, loading, empty, validation, MCP failure, and retry states.
- [ ] Verify keyboard focus behavior and run frontend tests/build.

### Task 8: Repair Compare, Server, Schedule, Variant, and AI UX

**Files:**
- Modify: `frontend/src/features/compare/CrossServerCompare.jsx`
- Modify: `frontend/src/features/servers/ServerManager.jsx`
- Modify: `frontend/src/features/schedule/ScheduleManager.jsx`
- Modify: `frontend/src/features/grid/VariantManagerModal.jsx`
- Modify: `frontend/src/features/chat/AiAssistantModal.jsx`
- Modify: `frontend/src/locales/translations.js`

**Interfaces:**
- Consumes: shared confirmation/error/loading primitives and normalized API errors.

- [ ] Add journey tests for each workspace's primary success and failure flow.
- [ ] Make partial compare failures explicit and require valid composite keys.
- [ ] Add connection-test detail, schedule validation feedback, variant dirty-state handling, and AI proposal review before apply.
- [ ] Complete Indonesian and English strings for all user-visible copy.
- [ ] Run frontend tests/build.

### Task 9: Add API error normalization and frontend cancellation

**Files:**
- Create: `backend/app/core/errors.py`
- Modify: `backend/main.py`
- Modify: `frontend/src/services/api.js`
- Modify: `frontend/src/store/useGridStore.js`
- Modify: `frontend/src/store/useCompareStore.js`
- Create: `backend/tests/test_error_contract.py`

**Interfaces:**
- Produces: `{code, message, correlation_id, retryable, details}` errors and abortable frontend requests.

- [ ] Write tests for validation, MCP timeout, authorization, and unknown error responses.
- [ ] Add FastAPI exception handlers and request correlation middleware.
- [ ] Add Axios error normalization, abort signals, and cancel actions for query/compare.
- [ ] Run API, store, and build verification.

### Task 10: Optimize delivery and finish documentation

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/vite.config.js`
- Modify: `README.md`
- Modify: `ARCHITECTURE_AND_FEATURES.md`
- Modify: `docs/ARCHITECTURE_AND_FEATURES.md`

**Interfaces:**
- Produces: lazy workspace chunks and accurate operator documentation.

- [ ] Lazy-load non-active workspaces and configure stable vendor chunks.
- [ ] Build and verify the initial bundle no longer contains all workspaces.
- [ ] Remove inaccurate `RFC_READ_TABLE`, sync-ORM, and unsupported feature claims.
- [ ] Document required MCP tool contract, environment variables, migrations, health checks, and rollback procedure.
- [ ] Run the complete backend suite and production frontend build; inspect `git diff` for secrets and generated artifacts.

