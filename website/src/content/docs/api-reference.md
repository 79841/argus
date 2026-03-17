---
title: Argus API Reference
description: Argus API Reference
---

Argus exposes a set of HTTP API endpoints via Next.js API Routes. All endpoints are unauthenticated and intended for local use only.

**Base URL:** `http://localhost:3000`

---

## Table of Contents

1. [Data Collection](#1-data-collection)
   - [POST /api/ingest](#post-apiingest)
   - [POST /api/ingest/tool-detail](#post-apiingesttool-detail)
   - [POST /v1/logs](#post-v1logs)
   - [POST /v1/metrics](#post-v1metrics)
   - [POST /v1/traces](#post-v1traces)
2. [Dashboard Data](#2-dashboard-data)
   - [GET /api/overview](#get-apioverview)
   - [GET /api/daily](#get-apidaily)
   - [GET /api/sessions](#get-apisessions)
   - [GET /api/sessions/:id](#get-apisessionsid)
   - [GET /api/sessions/active](#get-apisessionsactive)
   - [GET /api/models](#get-apimodels)
   - [GET /api/efficiency](#get-apiefficiency)
   - [GET /api/tools](#get-apitools)
   - [GET /api/tools/registered](#get-apitoolsregistered)
   - [GET /api/projects](#get-apiprojects)
   - [GET /api/projects/:name](#get-apiprojectsname)
   - [GET /api/insights](#get-apiinsights)
   - [GET /api/suggestions](#get-apisuggestions)
3. [Configuration](#3-configuration)
   - [GET /api/config](#get-apiconfig)
   - [POST /api/config](#post-apiconfig)
   - [GET /api/config-history](#get-apiconfig-history)
   - [GET /api/config-history/compare](#get-apiconfig-historycompare)
   - [GET /api/settings/limits](#get-apisettingslimits)
   - [POST /api/settings/limits](#post-apisettingslimits)
   - [POST /api/pricing-sync](#post-apipricing-sync)
4. [System](#4-system)
   - [GET /api/health](#get-apihealth)
   - [POST /api/seed](#post-apiseed)
   - [GET /api/ingest-status](#get-apiingest-status)
   - [GET /api/daily-costs](#get-apidaily-costs)
   - [GET /api/screenshot](#get-apiscreenshot)

---

## 1. Data Collection

### POST /api/ingest

Receives OTLP JSON log data from AI coding agents and stores it in SQLite. This is the primary ingestion endpoint.

The endpoint automatically detects the agent type (Claude Code, Codex CLI, Gemini CLI) from the `service.name` resource attribute. It also extracts orchestration tool details (MCP servers, Skills, Agents) from Claude Code `tool_result` events.

**Request Body**

OTLP `ExportLogsServiceRequest` JSON format:

```json
{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          { "key": "service.name", "value": { "stringValue": "claude-code" } },
          { "key": "project.name", "value": { "stringValue": "my-project" } }
        ]
      },
      "scopeLogs": [
        {
          "logRecords": [
            {
              "timeUnixNano": "1700000000000000000",
              "severityText": "INFO",
              "attributes": [
                { "key": "event.name", "value": { "stringValue": "claude_code.api_request" } },
                { "key": "model", "value": { "stringValue": "claude-sonnet-4-20250514" } },
                { "key": "cost_usd", "value": { "doubleValue": 0.05 } },
                { "key": "input_tokens", "value": { "intValue": "5000" } },
                { "key": "output_tokens", "value": { "intValue": "1200" } }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Response**

```json
{ "accepted": 42 }
```

| Field | Type | Description |
|-------|------|-------------|
| accepted | number | Number of log records successfully ingested |

**Error Response** (400)

```json
{ "error": "Error message" }
```

---

### POST /api/ingest/tool-detail

Manually inserts a single tool detail record (for tracking individual MCP tool calls, skills, or agents).

**Request Body**

```json
{
  "session_id": "abc-123",
  "tool_name": "mcp:linear",
  "detail_name": "mcp__linear__save_issue",
  "detail_type": "mcp",
  "duration_ms": 450,
  "success": true,
  "project_name": "argus",
  "agent_type": "claude",
  "metadata": { "key": "value" }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| session_id | string | `""` | Session identifier |
| tool_name | string | `""` | Parent tool name (e.g., `mcp:linear`, `Agent`, `Skill`) |
| detail_name | string | `""` | Specific tool/skill/agent name |
| detail_type | string | `""` | One of `mcp`, `skill`, `agent` |
| duration_ms | number | `0` | Execution duration in milliseconds |
| success | boolean | `null` | Whether the tool call succeeded |
| project_name | string | `""` | Project name |
| agent_type | string | `"claude"` | Agent type (`claude`, `codex`, `gemini`) |
| metadata | object | `{}` | Additional key-value metadata |

**Response**

```json
{ "accepted": 1 }
```

---

### POST /v1/logs

OTLP standard log ingestion endpoint. Accepts both JSON and Protobuf (`application/x-protobuf`) formats. Internally proxies to `POST /api/ingest` after decoding.

Claude Code sends telemetry directly to this endpoint when configured with:
```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000
```

**Request Body**

Same OTLP `ExportLogsServiceRequest` format as `/api/ingest`, in either JSON or Protobuf encoding.

**Response**

```json
{ "accepted": 42 }
```

---

### POST /v1/metrics

OTLP standard metrics ingestion endpoint. Accepts both JSON and Protobuf formats. Processes Gemini CLI tool duration/session metrics and Claude Code productivity metrics (lines of code, commits, pull requests, active time).

**Request Body**

OTLP `ExportMetricsServiceRequest` format.

**Supported Metrics**

| Metric Name | Agent | Mapped Event |
|-------------|-------|--------------|
| `gemini_cli.tool.duration` | gemini | `tool_result` |
| `gemini_cli.tool_call.duration` | gemini | `tool_result` |
| `gemini_cli.session.count` | gemini | `session_start` |
| `gemini_cli.conversation.count` | gemini | `session_start` |
| `claude_code.lines_of_code.count` | claude | `lines_of_code` |
| `claude_code.commit.count` | claude | `commit_count` |
| `claude_code.pull_request.count` | claude | `pull_request_count` |
| `claude_code.active_time.total` | claude | `active_time` |

**Response**

```json
{ "accepted": 5 }
```

---

### POST /v1/traces

OTLP standard traces endpoint. Accepts and discards all data (Argus only processes logs and metrics).

**Response**

```json
{}
```

---

## 2. Dashboard Data

### GET /api/overview

Returns today's summary statistics, with optional date range filtering.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| agent_type | string | `"all"` | Agent filter (`all`, `claude`, `codex`, `gemini`) |
| project | string | `"all"` | Project filter |
| from | string | -- | Start date (`YYYY-MM-DD`). Requires `to`. |
| to | string | -- | End date (`YYYY-MM-DD`). Requires `from`. |

**Response**

```json
{
  "total_sessions": 5,
  "total_cost": 12.34,
  "total_requests": 100,
  "total_input_tokens": 500000,
  "total_output_tokens": 50000,
  "total_cache_read_tokens": 200000,
  "cache_hit_rate": 0.285,
  "all_time_cost": 388.88,
  "all_time_tokens": 479700000,
  "delta": {
    "cost_delta_pct": 15.2,
    "sessions_delta_pct": -10.0,
    "requests_delta_pct": 5.5,
    "cache_rate_delta_pct": null
  },
  "agent_summaries": [
    {
      "agent_type": "claude",
      "today_cost": 8.50,
      "today_requests": 60,
      "last_active": "2026-03-17T14:30:00.000Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| total_sessions | number | Distinct session count |
| total_cost | number | Total cost in USD |
| total_requests | number | Total API request count |
| total_input_tokens | number | Total input tokens |
| total_output_tokens | number | Total output tokens |
| total_cache_read_tokens | number | Total cache read tokens |
| cache_hit_rate | number | Cache hit ratio (0-1) |
| all_time_cost | number | Cumulative all-time cost |
| all_time_tokens | number | Cumulative all-time tokens |
| delta | OverviewDelta | Day-over-day percentage changes (null if no previous data) |
| agent_summaries | AgentTodaySummary[] | Per-agent today summary |

---

### GET /api/daily

Returns daily aggregated statistics for the specified period.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| agent_type | string | `"all"` | Agent filter (`all`, `claude`, `codex`, `gemini`) |
| days | number | `30` | Number of days to look back |
| project | string | `"all"` | Project filter |
| from | string | -- | Start date (`YYYY-MM-DD`) |
| to | string | -- | End date (`YYYY-MM-DD`) |

**Response**

```json
[
  {
    "date": "2026-03-15",
    "agent_type": "claude",
    "sessions": 3,
    "cost": 5.42,
    "input_tokens": 250000,
    "output_tokens": 30000,
    "cache_read_tokens": 100000
  }
]
```

---

### GET /api/sessions

Returns a list of sessions with aggregated metrics.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| agent_type | string | `"all"` | Agent filter |
| project | string | `"all"` | Project filter |
| from | string | -- | Start date (`YYYY-MM-DD`) |
| to | string | -- | End date (`YYYY-MM-DD`) |
| limit | number | `100` | Maximum number of sessions to return |

**Response**

```json
[
  {
    "session_id": "abc-123-def",
    "agent_type": "claude",
    "model": "claude-sonnet-4-20250514",
    "started_at": "2026-03-17T10:00:00.000Z",
    "cost": 2.15,
    "input_tokens": 120000,
    "output_tokens": 15000,
    "cache_read_tokens": 50000,
    "duration_ms": 180000,
    "request_count": 12,
    "project_name": "argus"
  }
]
```

---

### GET /api/sessions/:id

Returns detailed events for a specific session. Optionally includes a session summary.

**Path Parameters**

| Name | Type | Description |
|------|------|-------------|
| id | string | Session ID |

**Query Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| summary | string | -- | Set to `"true"` to include session summary |

**Response (default)**

```json
[
  {
    "timestamp": "2026-03-17T10:00:00.000Z",
    "event_name": "api_request",
    "prompt_id": "prompt-1",
    "model": "claude-sonnet-4-20250514",
    "input_tokens": 10000,
    "output_tokens": 1500,
    "cache_read_tokens": 5000,
    "cost_usd": 0.05,
    "duration_ms": 3200,
    "tool_name": "",
    "tool_success": null
  }
]
```

**Response (summary=true)**

```json
{
  "summary": {
    "session_id": "abc-123",
    "agent_type": "claude",
    "model": "claude-sonnet-4-20250514",
    "total_cost": 2.15,
    "input_tokens": 120000,
    "output_tokens": 15000,
    "cache_read_tokens": 50000,
    "duration_ms": 180000,
    "request_count": 12,
    "tool_count": 25,
    "project_name": "argus",
    "started_at": "2026-03-17T10:00:00.000Z"
  },
  "events": [ ... ]
}
```

---

### GET /api/sessions/active

Returns sessions that had API requests within the last 5 minutes.

**Parameters**

None.

**Response**

```json
{
  "sessions": [
    {
      "session_id": "abc-123",
      "agent_type": "claude",
      "model": "claude-sonnet-4-20250514",
      "last_event": "2026-03-17T14:28:00.000Z",
      "cost": 1.20,
      "event_count": 8
    }
  ]
}
```

---

### GET /api/models

Returns model usage breakdown with request counts and costs.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| agent_type | string | `"all"` | Agent filter |
| project | string | `"all"` | Project filter |
| from | string | -- | Start date (`YYYY-MM-DD`) |
| to | string | -- | End date (`YYYY-MM-DD`) |

**Response**

```json
[
  {
    "model": "claude-sonnet-4-20250514",
    "agent_type": "claude",
    "request_count": 150,
    "cost": 8.50
  }
]
```

---

### GET /api/efficiency

Returns per-agent efficiency metrics (daily breakdown + period comparison).

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| days | number | `7` | Number of days to analyze |
| project | string | `"all"` | Project filter |
| from | string | -- | Start date (`YYYY-MM-DD`) |
| to | string | -- | End date (`YYYY-MM-DD`) |

**Response**

```json
{
  "data": [
    {
      "agent_type": "claude",
      "date": "2026-03-15",
      "total_input": 250000,
      "total_output": 30000,
      "total_requests": 45,
      "total_cache_read": 100000,
      "cache_hit_rate": 0.285,
      "cost": 5.42,
      "total_duration_ms": 120000
    }
  ],
  "comparison": {
    "current": [
      {
        "agent_type": "claude",
        "total_input": 1500000,
        "total_output": 200000,
        "total_requests": 300,
        "total_cache_read": 600000,
        "cost": 35.00,
        "total_duration_ms": 800000
      }
    ],
    "previous": [ ... ]
  }
}
```

---

### GET /api/tools

Returns tool usage statistics. When `detail=true`, includes categorized tool details (Built-in / Orchestration / MCP), daily trends, and individual tool breakdowns.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| agent_type | string | `"all"` | Agent filter |
| days | number | `7` | Number of days to look back |
| project | string | `"all"` | Project filter |
| detail | string | -- | Set to `"true"` for detailed breakdown |
| from | string | -- | Start date (`YYYY-MM-DD`) |
| to | string | -- | End date (`YYYY-MM-DD`) |

**Response (default)**

```json
{
  "tools": [
    {
      "tool_name": "Read",
      "invocation_count": 250,
      "success_count": 245,
      "fail_count": 5,
      "avg_duration_ms": 120.5
    }
  ]
}
```

**Response (detail=true)**

```json
{
  "tools": [
    {
      "tool_name": "Read",
      "category": "Built-in",
      "invocation_count": 250,
      "success_count": 245,
      "fail_count": 5,
      "avg_duration_ms": 120.5,
      "total_duration_ms": 30125,
      "prompt_count": 80,
      "total_tokens": 5000000,
      "total_cost": 15.20
    }
  ],
  "daily": [
    {
      "date": "2026-03-15",
      "tool_name": "Read",
      "count": 40
    }
  ],
  "individual": [
    {
      "tool_name": "mcp:linear",
      "detail_name": "linear",
      "detail_type": "mcp",
      "agent_type": "claude",
      "invocation_count": 15,
      "success_count": 14,
      "fail_count": 1,
      "avg_duration_ms": 800.0,
      "last_used": "2026-03-17T14:00:00.000Z"
    }
  ]
}
```

Tool categories:
- **Built-in**: Standard agent tools (Read, Edit, Bash, etc.)
- **Orchestration**: Agent and Skill invocations
- **MCP**: Tools prefixed with `mcp`

---

### GET /api/tools/registered

Scans the project filesystem and returns registered tools (agents, skills, MCP servers, hooks) from Claude Code configuration files.

**Parameters**

None.

**Response**

```json
{
  "tools": [
    {
      "name": "plan-writer",
      "type": "agent",
      "scope": "project",
      "filePath": "/path/to/.claude/agents/plan-writer.md"
    },
    {
      "name": "linear-server",
      "type": "mcp",
      "scope": "project",
      "filePath": "/path/to/.mcp.json"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| name | string | Tool name |
| type | string | `agent`, `skill`, `mcp`, or `hook` |
| scope | string | `project` or `global` |
| filePath | string | Absolute path to the configuration file |

---

### GET /api/projects

Returns project-level analytics. Behavior varies based on query parameters.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| agent_type | string | -- | Agent filter (triggers cost view) |
| from | string | -- | Start date (`YYYY-MM-DD`) |
| to | string | -- | End date (`YYYY-MM-DD`) |
| view | string | -- | Set to `"comparison"` for comparison view |

**Response (no parameters -- project list)**

```json
[
  {
    "project_name": "argus",
    "session_count": 25,
    "total_cost": 45.60
  }
]
```

**Response (view=comparison)**

```json
[
  {
    "project_name": "argus",
    "total_cost": 45.60,
    "session_count": 25,
    "request_count": 300,
    "top_model": "claude-sonnet-4-20250514",
    "last_activity": "2026-03-17T14:00:00.000Z"
  }
]
```

**Response (with agent_type, from, or to)**

```json
[
  {
    "project_name": "argus",
    "session_count": 10,
    "total_cost": 12.30
  }
]
```

---

### GET /api/projects/:name

Returns detailed statistics and daily cost trend for a specific project.

**Path Parameters**

| Name | Type | Description |
|------|------|-------------|
| name | string | URL-encoded project name |

**Response**

```json
{
  "stats": {
    "project_name": "argus",
    "total_cost": 45.60,
    "total_sessions": 25,
    "total_requests": 300,
    "total_input_tokens": 15000000,
    "total_output_tokens": 2000000,
    "total_cache_read_tokens": 5000000,
    "cache_hit_rate": 0.25,
    "first_activity": "2026-03-01T08:00:00.000Z",
    "last_activity": "2026-03-17T14:00:00.000Z",
    "top_model": "claude-sonnet-4-20250514",
    "agent_breakdown": [
      { "agent_type": "claude", "cost": 40.00, "sessions": 20 },
      { "agent_type": "codex", "cost": 5.60, "sessions": 5 }
    ]
  },
  "daily": [
    {
      "date": "2026-03-15",
      "project_name": "argus",
      "cost": 3.20
    }
  ]
}
```

---

### GET /api/insights

Returns cost insights including high-cost sessions, model cost efficiency, and budget status.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| days | number | `7` | Number of days to analyze |
| limit | number | `10` | Maximum number of high-cost sessions |

**Response**

```json
{
  "highCostSessions": [
    {
      "session_id": "abc-123",
      "agent_type": "claude",
      "model": "claude-opus-4-20250514",
      "total_cost": 8.50,
      "request_count": 25,
      "tool_call_count": 40,
      "input_tokens": 500000,
      "output_tokens": 60000,
      "cache_read_tokens": 0,
      "duration_ms": 300000,
      "project_name": "argus",
      "started_at": "2026-03-17T10:00:00.000Z",
      "causes": ["expensive_model", "many_tool_calls", "no_cache"]
    }
  ],
  "modelEfficiency": [
    {
      "model": "claude-sonnet-4-20250514",
      "agent_type": "claude",
      "request_count": 200,
      "total_cost": 15.00,
      "avg_cost_per_request": 0.075,
      "avg_input_tokens": 15000,
      "avg_output_tokens": 2000,
      "avg_duration_ms": 3500,
      "cost_per_1k_tokens": 0.0044
    }
  ],
  "budgetStatus": [
    {
      "agent_type": "claude",
      "daily_cost_limit": 50.00,
      "monthly_cost_limit": 1000.00,
      "daily_spent": 12.34,
      "daily_usage_pct": 24.68
    }
  ]
}
```

**High-cost session causes:**
- `expensive_model` -- Uses a high-cost model (Opus, o3, GPT-5.4)
- `many_tool_calls` -- 15+ tool calls in the session
- `many_requests` -- 10+ API requests in the session
- `no_cache` -- Zero cache read tokens with >10k input tokens

---

### GET /api/suggestions

Returns AI-generated optimization suggestions based on usage metrics.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| days | number | `7` | Number of days of data to analyze |

**Response**

```json
{
  "suggestions": [
    {
      "id": "low_cache_rate",
      "severity": "warning",
      "category": "cache",
      "titleKey": "suggestion.lowCache.title",
      "descriptionKey": "suggestion.lowCache.description",
      "metric": "28%",
      "targetKey": "suggestion.lowCache.target",
      "actionKey": "suggestion.lowCache.action",
      "params": { "rate": "28%" }
    }
  ],
  "metrics": {
    "overallCacheRate": 0.28,
    "avgCostPerSession": 1.50,
    "expensiveModelRatio": 0.15,
    "toolFailRate": 0.03,
    "avgSessionDurationMs": 120000,
    "totalDailyCost": 12.34,
    "topFailingTools": [
      { "name": "Bash", "failRate": 0.08 }
    ],
    "modelUsageBreakdown": [
      { "model": "claude-sonnet-4-20250514", "cost": 10.00, "ratio": 0.65 }
    ]
  }
}
```

| Severity | Description |
|----------|-------------|
| `info` | Informational suggestion |
| `warning` | Actionable optimization opportunity |
| `critical` | Significant cost or performance issue |

| Category | Description |
|----------|-------------|
| `cost` | Cost optimization |
| `cache` | Cache utilization |
| `tools` | Tool failure rate |
| `performance` | Session performance |

---

## 3. Configuration

### GET /api/config

Lists all detected agent configuration files, or reads the content of a specific file.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| path | string | -- | File path to read (omit to list all files) |

**Response (list mode -- no path parameter)**

```json
{
  "files": [
    {
      "path": "CLAUDE.md",
      "agent": "claude",
      "scope": "project",
      "exists": true
    },
    {
      "path": "~/.claude/settings.json",
      "agent": "claude",
      "scope": "user",
      "exists": true
    }
  ]
}
```

**Detected files:**

| Agent | Project Files | User Files |
|-------|--------------|------------|
| Claude | `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`, `.claude/agents/*.md`, `.claude/skills/*/SKILL.md` | `~/.claude/settings.json` |
| Codex | `codex.md`, `AGENTS.md` | `~/.codex/config.toml`, `~/.codex/instructions.md` |
| Gemini | `GEMINI.md` | `~/.gemini/settings.json` |

**Response (read mode -- with path parameter)**

```json
{
  "path": "CLAUDE.md",
  "content": "# Argus\n...",
  "scope": "project"
}
```

**Error (404)**

```json
{ "error": "File not found", "content": "" }
```

**Error (400)**

```json
{ "error": "Invalid file path" }
```

---

### POST /api/config

Writes content to a configuration file. Creates parent directories if needed.

**Request Body**

```json
{
  "path": ".claude/settings.json",
  "content": "{ \"permissions\": {} }"
}
```

| Field | Type | Description |
|-------|------|-------------|
| path | string | Relative file path (project) or `~/...` (user) |
| content | string | File content to write |

**Response**

```json
{ "success": true, "path": ".claude/settings.json" }
```

Path traversal (`..`) is rejected with a 400 error.

---

### GET /api/config-history

Returns Git commit history for tracked agent configuration files.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| days | number | `30` | Number of days of history to scan |

**Response**

```json
[
  {
    "date": "2026-03-15",
    "agent_type": "claude",
    "file_path": "CLAUDE.md",
    "commit_hash": "a1b2c3d",
    "commit_message": "docs: update CLAUDE.md",
    "diff": "@@ -1,3 +1,5 @@\n+New line"
  }
]
```

---

### GET /api/config-history/compare

Compares performance metrics before and after a configuration change date.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| date | string | **(required)** | Change date (`YYYY-MM-DD`) |
| days | number | `7` | Number of days before/after to compare |

**Response**

```json
{
  "before": {
    "avg_cost": 0.08,
    "cache_rate": 0.25,
    "tool_fail_rate": 0.05,
    "request_count": 200
  },
  "after": {
    "avg_cost": 0.06,
    "cache_rate": 0.35,
    "tool_fail_rate": 0.03,
    "request_count": 180
  }
}
```

**Error (400)**

```json
{ "error": "date parameter is required" }
```

---

### GET /api/settings/limits

Returns per-agent cost limits.

**Response**

```json
{
  "limits": [
    {
      "agent_type": "claude",
      "daily_cost_limit": 50.00,
      "monthly_cost_limit": 1000.00
    }
  ]
}
```

---

### POST /api/settings/limits

Upserts per-agent cost limits (insert or update on conflict).

**Request Body**

```json
{
  "limits": [
    {
      "agent_type": "claude",
      "daily_cost_limit": 50.00,
      "monthly_cost_limit": 1000.00
    },
    {
      "agent_type": "codex",
      "daily_cost_limit": 30.00,
      "monthly_cost_limit": 500.00
    }
  ]
}
```

**Response**

```json
{ "ok": true }
```

---

### POST /api/pricing-sync

Syncs token pricing data from the LiteLLM pricing database into the local `pricing_model` table.

**Parameters**

None.

**Response**

```json
{ "synced": 15 }
```

| Field | Type | Description |
|-------|------|-------------|
| synced | number | Number of pricing records updated |

---

## 4. System

### GET /api/health

Simple health check endpoint.

**Parameters**

None.

**Response**

```json
{
  "status": "ok",
  "timestamp": "2026-03-17T14:30:00.000Z"
}
```

---

### POST /api/seed

Seeds the database with randomized test data for all three agents (Claude Code, Codex CLI, Gemini CLI) over the last 7 days. Includes API requests, user prompts, tool results, and orchestration tool details.

**Parameters**

None.

**Response**

```json
{ "seeded": 2500 }
```

| Field | Type | Description |
|-------|------|-------------|
| seeded | number | Number of agent_log records created |

---

### GET /api/ingest-status

Returns ingestion status per agent type -- last received timestamp and event counts.

**Parameters**

None.

**Response**

```json
{
  "agents": [
    {
      "agent_type": "claude",
      "last_received": "2026-03-17T14:28:00.000Z",
      "today_count": 150,
      "total_count": 5000
    }
  ]
}
```

---

### GET /api/daily-costs

Returns today's cost totals per agent type.

**Parameters**

None.

**Response**

```json
{
  "costs": [
    {
      "agent_type": "claude",
      "daily_cost": 8.50
    },
    {
      "agent_type": "codex",
      "daily_cost": 2.30
    }
  ]
}
```

---

### GET /api/screenshot

Captures a screenshot of the dashboard using headless Chrome. Requires Google Chrome installed on macOS.

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| path | string | `"/"` | Dashboard page path to capture |
| width | string | `"1280"` | Viewport width in pixels |
| height | string | `"800"` | Viewport height in pixels |

**Response**

Binary PNG image with `Content-Type: image/png`.

**Error (500)**

```json
{ "error": "Chrome not found" }
```
```json
{ "error": "Screenshot capture failed" }
```

---

## Common Error Responses

Most endpoints return a 500 error on internal failures:

```json
{ "error": "Internal server error" }
```

Ingestion endpoints (`/api/ingest`, `/v1/logs`, `/v1/metrics`) return 400 on parse errors:

```json
{ "error": "Error message describing the parse failure" }
```
