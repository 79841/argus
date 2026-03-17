---
title: Argus User Guide
description: Argus User Guide
---

Argus is a personal monitoring dashboard for AI coding agents (Claude Code, Codex CLI, Gemini CLI). It collects OpenTelemetry data from your agents and visualizes usage, cost, and efficiency in a unified local dashboard.

> **No authentication required.** Argus runs entirely on your local machine.

---

## Table of Contents

- [Common UI Elements](#common-ui-elements)
- [1. Overview (/)](#1-overview-)
- [2. Sessions (/sessions)](#2-sessions-sessions)
- [3. Usage (/usage)](#3-usage-usage)
- [4. Tools (/tools)](#4-tools-tools)
- [5. Projects (/projects)](#5-projects-projects)
- [6. Insights (/insights)](#6-insights-insights)
- [7. Rules (/rules)](#7-rules-rules)
- [8. Settings (/settings)](#8-settings-settings)

---

## Common UI Elements

### Sidebar Navigation

The left sidebar provides access to all pages. Each page is represented by an icon and label.

### FilterBar

A top bar present on most pages containing filters:

- **Agent Filter** -- Select "All", "Claude", "Codex", or "Gemini" to scope data to a specific agent.
- **Project Filter** -- Scope data to a specific project (derived from `OTEL_RESOURCE_ATTRIBUTES`).
- **Date Range Picker** -- Select a custom date range for the data displayed.

### Bottom Bar

A persistent footer at the bottom of every page showing:

- **Agent Status** -- Green/yellow/gray dot per agent indicating recency of last received data (< 1h / < 24h / older).
- **Active Sessions** -- Currently running sessions with agent name, model, and running cost.
- **Budget Progress** -- If daily cost limits are configured, shows a mini progress bar per agent.
- **All-Time Totals** -- Cumulative cost and token count across all agents.

### Theme and Language

- **Dark / Light / System** theme modes.
- **Korean / English** language toggle.
- **Agent Theme** -- Choose a primary accent color based on your preferred agent (Claude, Codex, or Gemini).

---

## 1. Overview (/)

The landing page provides a snapshot of today's activity across all agents.

<!-- Screenshot: overview-page.png -->

### KPI Cards (4)

| Card | Description |
|------|-------------|
| **Today Cost** | Total cost incurred today across all agents. Shows percentage change vs. yesterday (inverted: decrease is positive). |
| **Sessions** | Number of sessions started today. Shows percentage change vs. yesterday. |
| **Requests** | Total API requests made today. Shows percentage change vs. yesterday. |
| **Cache Hit Rate** | Ratio of cache-read tokens to total input tokens today. Shows change vs. yesterday. |

### Usage Heatmap

A GitHub-style contribution heatmap showing daily activity over the past 16 weeks (112 days). Each cell represents one day, with color intensity proportional to usage volume.

### Today by Agent

A summary card showing each agent's activity today:

- Agent name with color-coded dot
- Today's cost
- Number of requests
- Time since last activity (e.g., "5m ago")

### Recent Sessions

The 5 most recent sessions across all agents. Each entry shows:

- Agent dot and name
- Project name (if available)
- Model used
- Cost and duration

Click any session to navigate to the Sessions page with that session selected.

### Tips

- Use the Overview page as your daily check-in to spot unusual spending.
- The heatmap helps identify usage patterns over weeks and months.
- The delta percentages on KPI cards let you quickly compare today vs. yesterday.

---

## 2. Sessions (/sessions)

A master-detail view for exploring individual agent sessions.

<!-- Screenshot: sessions-page.png -->

### Filters

- **Agent Filter** -- Scope to a specific agent.
- **Project Filter** -- Scope to a specific project.
- **Date Range Picker** -- Default: last 7 days.
- **Search** -- Free-text search across session ID, project name, model, and agent type.
- **Sort** -- Sort sessions by Latest, Cost, or Tokens.

### Session List (Left Panel, 35%)

A scrollable list of sessions. Each entry shows:

- Agent color dot
- Model badges (shortened model names)
- Total session cost (prominent)
- Project name and duration
- Token count, cache hit rate, and relative time

The header displays the total count of sessions and their combined cost.

Click any session to load its details in the right panel. Hover to reveal an external link icon that opens the session in a dedicated page (if implemented).

### Session Detail (Right Panel, 65%)

When a session is selected, the detail panel shows:

#### Header
- Agent badge and model badges
- Truncated session ID

#### Summary Grid (6 metrics)

| Metric | Description |
|--------|-------------|
| **Cost** | Total cost of all API requests in this session |
| **Input** | Total input tokens |
| **Output** | Total output tokens |
| **Cache** | Cache-read tokens with hit rate percentage |
| **Duration** | Wall-clock time of the session |
| **Reqs / Tools** | Count of API requests and tool calls |

#### Model Cost Breakdown Chart

A visual breakdown of cost by model used in the session (via the `SessionModelCostChart` component).

#### Event Timeline

Two view modes via tabs:

- **List** -- Events grouped by prompt. Each prompt group is collapsible and shows:
  - Prompt number, start time, event count, and cost
  - Expanded view lists individual events with color-coded dots:
    - Blue: API Request (with model, input/output tokens, cache tokens, cost)
    - Green: Tool Result (with tool name, success/fail status)
    - Violet: User Prompt
    - Red: API Error or failed tool
  - Each event shows timestamp and duration

- **Waterfall** -- A visual waterfall/timeline chart of events (via the `TraceWaterfall` component), showing how events overlap in time.

### Tips

- Sort by "Cost" to quickly find your most expensive sessions.
- Use search to filter by model name (e.g., "opus" or "sonnet").
- The cache hit rate on each session card helps identify sessions that could benefit from better caching.
- Expand prompt groups in the List view to trace exactly which API call was expensive.

---

## 3. Usage (/usage)

A deep-dive analytics page with 5 tabs covering cost, tokens, models, efficiency, and config impact.

<!-- Screenshot: usage-page.png -->

### Filters

- **Agent Filter** -- Scope to a specific agent.
- **Project Filter** -- Scope to a specific project.
- **Date Range Picker** -- Default: last 30 days.

### Tab: Cost

#### KPI Cards (3)

| Card | Description |
|------|-------------|
| **Total Cost** | Sum of all costs in the selected range. Shows delta vs. previous equivalent period. |
| **Daily Average** | Total cost divided by number of days in range. |
| **Requests** | Total API request count in the range. |

#### Charts

- **Daily Cost Trend** -- Stacked area chart showing daily cost broken down by agent (Claude / Codex / Gemini).
- **Cost by Agent** -- Horizontal bar chart comparing total cost per agent.
- **Cost by Project** -- Horizontal bar chart showing cost per project (top 8).

### Tab: Tokens

#### KPI Cards (3)

| Card | Description |
|------|-------------|
| **Total Tokens** | Sum of input + output + cache-read tokens. |
| **Input / Output Ratio** | Percentage of input tokens relative to input + output. |
| **Cache Savings** | Total cache-read tokens (tokens served from cache instead of being processed). |

#### Charts

- **Daily Token Usage** -- Stacked bar chart showing input, output, and cache-read tokens per day.
- **Token Distribution by Agent** -- Horizontal stacked bar chart showing token breakdown per agent.

### Tab: Models

#### Model Usage Table

A table listing each model used, with columns:

| Column | Description |
|--------|-------------|
| Model | Full model ID |
| Agent | Which agent uses this model |
| Reqs | Number of API requests |
| Cost | Total cost |
| Avg/req | Average cost per request |

#### Charts

- **Cost by Model** -- Pie chart showing cost share per model.
- **Requests by Model** -- Horizontal bar chart showing request count per model (top 8).

### Tab: Efficiency

#### KPI Cards (3)

| Card | Description |
|------|-------------|
| **Cache Hit Rate** | cache_read / (cache_read + input) across all agents. |
| **Avg Response Time** | Average API request duration in seconds. |
| **Efficiency Score** | Composite score (0-100) combining cache rate, token efficiency, and speed. |

#### Charts

- **Efficiency Trend** -- Line chart showing efficiency score over time per agent.
- **Efficiency by Agent** -- Table comparing cache rate, token efficiency, average speed, and composite score per agent.

### Tab: Impact

Shows configuration change history and its potential impact on usage.

- **Scope Filter** -- Toggle between "All", "Project", or "User" scope to filter config changes.
- **Config Timeline** -- A timeline visualization of configuration file changes detected over the past 90 days, powered by the `ConfigTimeline` component.

### Tips

- Use the Cost tab's daily trend to spot spending spikes.
- Check the Efficiency tab regularly to ensure your cache hit rate is healthy (aim for > 50%).
- The Models tab helps identify expensive models -- consider switching to a cheaper model for routine tasks.
- The Impact tab shows when config changes were made, helping correlate changes with cost/efficiency shifts.

---

## 4. Tools (/tools)

Analyzes tool usage patterns across your AI coding agents.

<!-- Screenshot: tools-page.png -->

### Filters

- **Agent Filter** -- Scope to a specific agent.
- **Date Range** -- Quick-select buttons: 7d, 14d, 30d, 90d.

### KPI Cards (4)

| Card | Description |
|------|-------------|
| **Total Calls** | Total number of tool invocations in the selected period. |
| **Success Rate** | Percentage of tool calls that succeeded. |
| **Avg Duration** | Average execution time per tool call. |
| **Unique Tools** | Number of distinct tools used. |

### Tab: Overview

- **Top Tools** -- Horizontal bar chart showing the top 15 most-used tools with call counts. Tooltip shows success/fail breakdown and average duration.
- **Category Distribution** -- Treemap visualization showing tool usage by category (Built-in, Orchestration, MCP). Cell size is proportional to call count.

### Tab: Details

- **Tool Detail Table** -- A comprehensive table listing every tool with category, agent, call count, success/fail counts, success rate, and average duration.
- **Individual Tool Table** -- Detailed per-invocation records for skills, agents, and MCP tools.
- **Registered Tools Card** -- Shows tools that are registered/available for use.

### Tab: Trends

- **Daily Tool Trend** -- Stacked area chart showing daily usage for the top 8 tools.
- **Daily Total** -- Line chart showing total tool calls per day.

### Tips

- A low success rate for a specific tool may indicate a configuration issue or a bug in the tool.
- Use the Trends tab to see if tool usage is increasing over time -- this can predict cost growth.
- The Category Distribution treemap helps understand the balance between built-in tools, orchestration tools, and MCP integrations.

---

## 5. Projects (/projects)

Compare costs and activity across different projects (repositories/workspaces).

<!-- Screenshot: projects-page.png -->

### KPI Cards (3)

| Card | Description |
|------|-------------|
| **Total Projects** | Number of distinct projects with recorded activity. |
| **Total Cost** | Combined cost across all projects. |
| **Most Active** | The project with the highest session count. |

### Cost Comparison Chart

A horizontal bar chart comparing cost across up to 15 projects. Each bar is color-coded for visual distinction.

### Project Table

A clickable table listing all projects. Columns:

| Column | Description |
|--------|-------------|
| Project | Project name (click to view details) |
| Sessions | Number of sessions |
| Requests | Number of API requests |
| Cost | Total cost |
| Top Model | Most frequently used model |
| Last Active | Date of last activity |

Click any row to navigate to a project detail page.

### Tips

- Compare projects to identify which codebases consume the most AI resources.
- The "Top Model" column helps identify whether each project is using the most cost-effective model.

---

## 6. Insights (/insights)

AI-powered suggestions and cost analysis to help optimize your agent usage.

<!-- Screenshot: insights-page.png -->

### Filters

- **Date Range** -- Quick-select buttons: 7d, 14d, 30d, 90d.

### Suggestions

An intelligent suggestion engine that analyzes your usage patterns and provides actionable recommendations. Each suggestion card includes:

- **Severity** -- Critical (red), Warning (orange), or Info (blue) with corresponding icon.
- **Category badge** -- The area the suggestion relates to.
- **Current metric** -- Your current value for the metric in question.
- **Target** -- The recommended target value.
- **Action** -- Specific steps to take.

When no issues are detected, a green "All good" message is displayed.

### KPI Cards (3)

| Card | Description |
|------|-------------|
| **Top 10 Total** | Combined cost of the top 10 most expensive sessions. |
| **Avg Session Cost** | Average cost across the top 10 sessions. |
| **Top Cause** | The most common cause of high-cost sessions (e.g., "Expensive Model", "Many Tool Calls", "No Cache"). |

### Daily Budget Gauges

If daily cost limits are configured (in Settings), a gauge section shows:

- Progress bar per agent with spent vs. limit
- Red highlight when budget is exceeded

### High-Cost Sessions Table

A table of the top 10 most expensive sessions with columns:

| Column | Description |
|--------|-------------|
| Agent | Which agent ran the session |
| Model | Model(s) used |
| Cost | Total session cost |
| Reqs | Number of API requests |
| Tools | Number of tool calls |
| Causes | Color-coded badges explaining why the session was expensive (e.g., "Expensive Model", "Many Requests", "No Cache") |

### Model Cost Efficiency Table

Compares cost efficiency across models:

| Column | Description |
|--------|-------------|
| Model | Model name |
| Agent | Which agent uses it |
| Reqs | Request count |
| Total Cost | Total cost for this model |
| Avg/Req | Average cost per request |
| Per 1K Tok | Cost per 1,000 tokens |
| Avg Speed | Average response time |

### Tips

- Check Insights regularly (weekly) to catch cost optimization opportunities early.
- Pay attention to "Critical" severity suggestions -- they typically indicate significant savings potential.
- Use the "Causes" column in the High-Cost Sessions table to understand *why* sessions are expensive, not just *that* they are.
- The Model Efficiency table helps you choose the best price/performance model for your workflow.

---

## 7. Rules (/rules)

View and edit agent configuration files directly from the dashboard.

<!-- Screenshot: rules-page.png -->

### File Tree (Left Panel, 35%)

A hierarchical file browser organized by:

1. **Scope** -- "Project" (current project directory) or "User" (global user settings).
2. **Agent** -- Claude, Codex, or Gemini.
3. **Files** -- Individual configuration files with contextual icons:
   - `.mcp.json` -- MCP plugin icon
   - `.json` / `.toml` -- Settings gear icon
   - `agents/` / `skills/` -- Folder icon
   - Other markdown files -- Document icon

Collapsible groups let you expand/collapse scopes and agents.

### File Viewer/Editor (Right Panel, 65%)

When a file is selected:

#### Header
- Full file path
- Scope badge (Project / User)
- **Preview** and **Edit** mode toggle buttons

#### Preview Mode
- **Markdown files** -- Rendered with headings, code blocks, tables, lists, links, and inline formatting.
- **JSON files** -- Syntax-highlighted with color-coded keys, strings, numbers, and booleans.
- **TOML files** -- Syntax-highlighted with section headers, key-value pairs, and comments.
- **Other files** -- Displayed as plain text with monospace font.

#### Edit Mode
- A full-height textarea for editing the file content.
- **Save** button to persist changes back to disk.
- Success confirmation message after saving.

### Tips

- Use Rules to quickly review and tweak agent settings without leaving the dashboard.
- The preview mode for Markdown files makes it easy to read agent instructions and skill definitions.
- Edit mode lets you update MCP configurations, agent prompts, and other settings on the fly.

---

## 8. Settings (/settings)

Configure the Argus dashboard itself. Organized into 5 sections via a left sidebar.

<!-- Screenshot: settings-page.png -->

### General

| Setting | Description |
|---------|-------------|
| **Theme** | Choose Light, Dark, or System mode. |
| **Agent Theme** | Set the primary accent color to Claude (orange), Codex (green), or Gemini (blue). This changes the overall color accent of the dashboard. |
| **Language** | Toggle between Korean and English. |
| **Auto Refresh** | Set the dashboard to auto-refresh data at 30s, 1m, 5m intervals, or turn it off. |

### Agents

| Setting | Description |
|---------|-------------|
| **Cost Limits** | Configure daily and monthly cost limits per agent. *(Coming soon -- currently disabled.)* |
| **Collection Status** | Monitor whether each agent is actively sending telemetry. *(Coming soon.)* |

### Pricing

| Setting | Description |
|---------|-------------|
| **LiteLLM Pricing Sync** | Click "Sync Now" to fetch the latest token pricing data from LiteLLM's pricing database. This ensures cost calculations reflect current model pricing. |

### Setup

Step-by-step setup guides for each agent:

- **Claude Code** -- Environment variables for OTLP telemetry, project name configuration, and tool detail logging.
- **Codex** -- TOML configuration for OTLP HTTP exporter.
- **Gemini CLI** -- JSON or environment variable configuration for telemetry export.
- **Dashboard** -- How to install and run the Argus dashboard.
- **Supported Events** -- Reference list of event types (`api_request`, `user_prompt`, `tool_result`, `tool_decision`, `api_error`).

### Data

| Setting | Description |
|---------|-------------|
| **Export** | Export data as CSV/JSON. *(Coming soon.)* |
| **Data Cleanup** | Clean up old data. *(Coming soon.)* |
| **DB Statistics** | View database size and record counts. *(Coming soon.)* |

### Tips

- After first setup, visit Settings > Pricing and click "Sync Now" to ensure accurate cost tracking.
- Set Auto Refresh to 30s or 1m if you want the dashboard to update while you work.
- Use the Setup section as a reference when configuring a new agent -- it includes exact copy-paste commands.

---

## Quick Start Checklist

1. **Start the dashboard**: `cd dashboard && pnpm dev`
2. **Configure your agent** (see Settings > Setup for exact commands)
3. **Sync pricing**: Visit Settings > Pricing > Sync Now
4. **Seed test data** (optional): `POST http://localhost:3000/api/seed`
5. **Start coding** with your AI agent -- data will flow automatically
6. **Check Overview** to see today's activity
7. **Explore Sessions** to drill into individual conversations
8. **Review Insights** weekly to optimize your usage
