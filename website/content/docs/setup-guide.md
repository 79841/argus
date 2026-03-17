---
title: "Argus Setup Guide"
description: "Configure AI coding agents to send telemetry to Argus"
---

Argus collects OpenTelemetry (OTLP) telemetry from AI coding agents and visualizes usage in a local dashboard. This guide covers installation and per-agent configuration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Dashboard Installation](#dashboard-installation)
- [Claude Code Setup](#claude-code-setup)
- [Codex CLI Setup](#codex-cli-setup)
- [Gemini CLI Setup](#gemini-cli-setup)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- At least one supported AI coding agent:
  - [Claude Code](https://code.claude.com)
  - [Codex CLI](https://github.com/openai/codex)
  - [Gemini CLI](https://github.com/google-gemini/gemini-cli)

---

## Installation

### Desktop App (Recommended)

Download the latest installer from [Releases](https://github.com/79841/argus/releases):

| Platform | File | Instructions |
|----------|------|-------------|
| **macOS** (Apple Silicon) | `Argus-x.x.x-arm64.dmg` | Open DMG → drag Argus to Applications → launch |
| **Windows** | `Argus Setup x.x.x.exe` | Run the installer → launch from Start Menu |

After launching, Argus runs as a **tray-resident app** and automatically starts an OTLP receiver on `http://localhost:3000`. The SQLite database is created automatically — no manual setup needed.

### From Source (Contributors)

Requires **Node.js 20+** and **pnpm**.

```bash
git clone https://github.com/79841/argus.git
cd argus/dashboard
pnpm install
pnpm dev              # Web mode: http://localhost:3000
pnpm electron:dev     # Desktop mode with Electron
```

| Variable | Default | Description |
|----------|---------|-------------|
| `ARGUS_DB_PATH` | `../argus.db` | Path to the SQLite database file |

### OTLP receive endpoints

Argus exposes two endpoints for telemetry ingestion:

| Endpoint | Description |
|----------|-------------|
| `POST /v1/logs` | Standard OTLP path (accepts JSON and Protobuf) |
| `POST /api/ingest` | Internal processing route |

Agents send data to `/v1/logs`, which proxies to `/api/ingest` after format conversion.

---

## Claude Code Setup

### Step 1: Set environment variables

Add the following to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000
```

Reload your shell or run `source ~/.zshrc`.

Alternatively, set them in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:3000"
  }
}
```

### Step 2: Set project name (optional)

To tag telemetry with a project name, add `OTEL_RESOURCE_ATTRIBUTES` in your project's `.claude/settings.json`:

```json
{
  "env": {
    "OTEL_RESOURCE_ATTRIBUTES": "project.name=my-project"
  }
}
```

This enables per-project filtering in the dashboard.

### Step 3: Enable tool detail tracking (optional)

To track MCP server/tool names, skill names, and sub-agent details:

```json
{
  "env": {
    "OTEL_LOG_TOOL_DETAILS": "1"
  }
}
```

> **Note**: When enabled, MCP server names, MCP tool names, skill names, and sub-agent descriptions are included in telemetry. Without this, only built-in tool names (Read, Edit, Bash, etc.) are recorded.

### Step 4: Verify

1. Make sure the Argus dashboard is running on port 3000.
2. Start Claude Code in any project.
3. Send a prompt and wait for a response.
4. Check the Argus dashboard -- new session data should appear within seconds.

### Claude Code event types

| Event | Description |
|-------|-------------|
| `api_request` | API request with model, tokens, cost, duration |
| `user_prompt` | User prompt submission |
| `tool_result` | Tool execution result |
| `tool_decision` | Tool approval/rejection |
| `api_error` | API error |

---

## Codex CLI Setup

### Step 1: Configure OTLP export

Edit `~/.codex/config.toml` and add an `[otel]` section:

```toml
[otel]
exporter = { otlp-http = { endpoint = "http://localhost:3000/v1/logs", protocol = "json" } }
```

### Step 2: Enable prompt logging (optional)

To include user prompt content in telemetry:

```toml
[otel]
exporter = { otlp-http = { endpoint = "http://localhost:3000/v1/logs", protocol = "json" } }
log_user_prompt = true
```

### Step 3: Verify

1. Make sure the Argus dashboard is running on port 3000.
2. Start Codex CLI: `codex`
3. Send a prompt and wait for a response.
4. Check the Argus dashboard for new session data.

### Codex CLI event types

| Event | Description |
|-------|-------------|
| `api_request` | API request (normalized from `codex.sse_event`) |
| `session_start` | Session start (from `codex.conversation_starts`) |
| `user_prompt` | User prompt |
| `tool_result` | Tool execution result |
| `tool_decision` | Tool approval/rejection |
| `api_error` | API error |

> **Note**: Codex CLI does not send `cost_usd`. Argus calculates cost using its built-in pricing model table.

---

## Gemini CLI Setup

### Step 1: Configure telemetry

**Option A: settings.json**

Edit `~/.gemini/settings.json`:

```json
{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpEndpoint": "http://localhost:3000",
    "otlpProtocol": "http"
  }
}
```

**Option B: Environment variables**

```bash
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:3000
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http
```

### Step 2: Set project name (optional)

Use `direnv` or set the environment variable directly:

```bash
echo 'export OTEL_RESOURCE_ATTRIBUTES="project.name=my-project"' > .envrc
direnv allow
```

Or set it directly before launching Gemini CLI:

```bash
export OTEL_RESOURCE_ATTRIBUTES="project.name=my-project"
```

### Step 3: Verify

1. Make sure the Argus dashboard is running on port 3000.
2. Start Gemini CLI: `gemini`
3. Send a prompt and wait for a response.
4. Check the Argus dashboard for new session data.

### Gemini CLI event types

| Event | Description |
|-------|-------------|
| `api_request` | API response (normalized from `gemini_cli.api_response`) |
| `session_start` | Session config (from `gemini_cli.config`) |
| `user_prompt` | User prompt |
| `tool_result` | Tool call result (from `gemini_cli.tool_call`) |
| `api_error` | API error |

> **Note**: Gemini CLI does not send `cost_usd`. Argus calculates cost using its built-in pricing model table.

---

## Verification

### Health check

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "2026-03-17T12:00:00.000Z" }
```

### Seed test data

To populate the dashboard with sample data for testing:

```bash
curl -X POST http://localhost:3000/api/seed
```

This inserts sample sessions for all three agents (Claude Code, Codex CLI, Gemini CLI).

### Manual OTLP test

Send a minimal OTLP log record to verify ingestion:

```bash
curl -X POST http://localhost:3000/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "resourceLogs": [{
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "claude-code"}}
        ]
      },
      "scopeLogs": [{
        "logRecords": [{
          "timeUnixNano": "1710000000000000000",
          "severityText": "INFO",
          "body": {"stringValue": ""},
          "attributes": [
            {"key": "event.name", "value": {"stringValue": "claude_code.api_request"}},
            {"key": "session.id", "value": {"stringValue": "test-session-001"}},
            {"key": "model", "value": {"stringValue": "claude-sonnet-4-6"}},
            {"key": "input_tokens", "value": {"intValue": "100"}},
            {"key": "output_tokens", "value": {"intValue": "50"}},
            {"key": "cost_usd", "value": {"doubleValue": 0.001}}
          ]
        }]
      }]
    }]
  }'
```

Expected response:

```json
{ "accepted": 1 }
```

---

## Troubleshooting

### No data appearing in the dashboard

1. **Check the dashboard is running**: `curl http://localhost:3000/api/health`
2. **Check the port**: All agents must point to the same port where Argus is running (default: 3000).
3. **Check the protocol**: Claude Code requires `http/json`. Codex CLI requires `protocol = "json"`. Gemini CLI requires `otlpProtocol: "http"`.
4. **Check environment variables are loaded**: Run `env | grep OTEL` or `env | grep CLAUDE_CODE` to confirm.

### Claude Code telemetry not sending

- Ensure `CLAUDE_CODE_ENABLE_TELEMETRY=1` is set. Without this, all telemetry is disabled.
- Ensure `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is NOT set to `1`, as it disables telemetry.
- If using `settings.json`, make sure the variables are under the `"env"` key.

### Codex CLI telemetry not sending

- Verify `~/.codex/config.toml` exists and has the `[otel]` section.
- The endpoint must include the full path: `http://localhost:3000/v1/logs`.

### Gemini CLI telemetry not sending

- Verify `~/.gemini/settings.json` has `"enabled": true` in the telemetry section.
- Set `"target": "local"` (not `"gcp"`).
- Set `"otlpProtocol": "http"` (not `"grpc"`, which is the default).

### Database issues

- The SQLite database is created automatically at `../argus.db` relative to the `dashboard/` directory.
- To use a custom path, set `ARGUS_DB_PATH=/path/to/argus.db`.
- If the database becomes corrupted, delete the `.db`, `.db-shm`, and `.db-wal` files and restart the dashboard. A fresh database will be created automatically.

### Port conflicts

If port 3000 is already in use:

```bash
# Start on a different port
PORT=3001 pnpm dev
```

Then update all agent configurations to point to the new port.
