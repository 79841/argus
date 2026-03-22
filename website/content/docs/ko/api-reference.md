---
title: "API 레퍼런스"
description: "Argus 대시보드 HTTP API 엔드포인트"
---

Argus는 Next.js API Routes를 통해 HTTP API 엔드포인트를 제공합니다. 모든 엔드포인트는 인증 없이 로컬 전용으로 사용하도록 설계되었습니다.

**Base URL:** `http://localhost:9845`

---

## 목차

1. [데이터 수집](#1-데이터-수집)
   - [POST /api/ingest](#post-apiingest)
   - [POST /api/ingest/tool-detail](#post-apiingesttool-detail)
   - [POST /v1/logs](#post-v1logs)
   - [POST /v1/metrics](#post-v1metrics)
   - [POST /v1/traces](#post-v1traces)
2. [대시보드 데이터](#2-대시보드-데이터)
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
3. [설정](#3-설정)
   - [GET /api/config](#get-apiconfig)
   - [POST /api/config](#post-apiconfig)
   - [GET /api/config-history](#get-apiconfig-history)
   - [GET /api/config-history/compare](#get-apiconfig-historycompare)
   - [GET /api/settings/limits](#get-apisettingslimits)
   - [POST /api/settings/limits](#post-apisettingslimits)
   - [POST /api/pricing-sync](#post-apipricing-sync)
4. [시스템](#4-시스템)
   - [GET /api/health](#get-apihealth)
   - [POST /api/seed](#post-apiseed)
   - [GET /api/ingest-status](#get-apiingest-status)
   - [GET /api/daily-costs](#get-apidaily-costs)
   - [GET /api/screenshot](#get-apiscreenshot)

---

## 1. 데이터 수집

### POST /api/ingest

AI 코딩 에이전트에서 OTLP JSON 로그 데이터를 수신하여 SQLite에 저장합니다. 주요 수집 엔드포인트입니다.

이 엔드포인트는 `service.name` 리소스 속성에서 에이전트 유형(Claude Code, Codex CLI, Gemini CLI)을 자동 감지합니다. 또한 Claude Code `tool_result` 이벤트에서 오케스트레이션 도구 상세(MCP 서버, Skills, Agents)를 추출합니다.

**요청 본문**

OTLP `ExportLogsServiceRequest` JSON 형식:

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

**응답**

```json
{ "accepted": 42 }
```

| 필드 | 타입 | 설명 |
|------|------|------|
| accepted | number | 성공적으로 수집된 로그 레코드 수 |

**오류 응답** (400)

```json
{ "error": "Error message" }
```

---

### POST /api/ingest/tool-detail

단일 도구 상세 레코드를 수동 삽입합니다 (개별 MCP 도구 호출, 스킬, 에이전트 추적용).

**요청 본문**

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

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| session_id | string | `""` | 세션 식별자 |
| tool_name | string | `""` | 상위 도구 이름 (예: `mcp:linear`, `Agent`, `Skill`) |
| detail_name | string | `""` | 구체적인 도구/스킬/에이전트 이름 |
| detail_type | string | `""` | `mcp`, `skill`, `agent` 중 하나 |
| duration_ms | number | `0` | 실행 소요 시간 (밀리초) |
| success | boolean | `null` | 도구 호출 성공 여부 |
| project_name | string | `""` | 프로젝트 이름 |
| agent_type | string | `"claude"` | 에이전트 유형 (`claude`, `codex`, `gemini`) |
| metadata | object | `{}` | 추가 키-값 메타데이터 |

**응답**

```json
{ "accepted": 1 }
```

---

### POST /v1/logs

OTLP 표준 로그 수집 엔드포인트입니다. JSON과 Protobuf (`application/x-protobuf`) 형식을 모두 지원합니다. 디코딩 후 내부적으로 `POST /api/ingest`로 프록시합니다.

Claude Code는 다음과 같이 설정하면 이 엔드포인트로 직접 텔레메트리를 전송합니다:
```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9845
```

**요청 본문**

`/api/ingest`와 동일한 OTLP `ExportLogsServiceRequest` 형식 (JSON 또는 Protobuf 인코딩).

**응답**

```json
{ "accepted": 42 }
```

---

### POST /v1/metrics

OTLP 표준 메트릭 수집 엔드포인트입니다. JSON과 Protobuf 형식을 모두 지원합니다. Gemini CLI 도구 소요 시간/세션 메트릭과 Claude Code 생산성 메트릭(코드 라인 수, 커밋, 풀 리퀘스트, 활동 시간)을 처리합니다.

**요청 본문**

OTLP `ExportMetricsServiceRequest` 형식.

**지원 메트릭**

| 메트릭 이름 | 에이전트 | 매핑 이벤트 |
|-------------|----------|-------------|
| `gemini_cli.tool.duration` | gemini | `tool_result` |
| `gemini_cli.tool_call.duration` | gemini | `tool_result` |
| `gemini_cli.session.count` | gemini | `session_start` |
| `gemini_cli.conversation.count` | gemini | `session_start` |
| `claude_code.lines_of_code.count` | claude | `lines_of_code` |
| `claude_code.commit.count` | claude | `commit_count` |
| `claude_code.pull_request.count` | claude | `pull_request_count` |
| `claude_code.active_time.total` | claude | `active_time` |

**응답**

```json
{ "accepted": 5 }
```

---

### POST /v1/traces

OTLP 표준 트레이스 엔드포인트입니다. 모든 데이터를 수신하고 폐기합니다 (Argus는 로그와 메트릭만 처리합니다).

**응답**

```json
{}
```

---

## 2. 대시보드 데이터

### GET /api/overview

오늘의 요약 통계를 반환하며, 선택적으로 날짜 범위 필터링을 지원합니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| agent_type | string | `"all"` | 에이전트 필터 (`all`, `claude`, `codex`, `gemini`) |
| project | string | `"all"` | 프로젝트 필터 |
| from | string | -- | 시작 날짜 (`YYYY-MM-DD`). `to`와 함께 사용. |
| to | string | -- | 종료 날짜 (`YYYY-MM-DD`). `from`과 함께 사용. |

**응답**

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

| 필드 | 타입 | 설명 |
|------|------|------|
| total_sessions | number | 고유 세션 수 |
| total_cost | number | 총 비용 (USD) |
| total_requests | number | 총 API 요청 수 |
| total_input_tokens | number | 총 입력 토큰 |
| total_output_tokens | number | 총 출력 토큰 |
| total_cache_read_tokens | number | 총 캐시 읽기 토큰 |
| cache_hit_rate | number | 캐시 히트 비율 (0-1) |
| all_time_cost | number | 누적 전체 비용 |
| all_time_tokens | number | 누적 전체 토큰 |
| delta | OverviewDelta | 일별 변화율 (이전 데이터 없으면 null) |
| agent_summaries | AgentTodaySummary[] | 에이전트별 오늘 요약 |

---

### GET /api/daily

지정된 기간의 일별 집계 통계를 반환합니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| agent_type | string | `"all"` | 에이전트 필터 (`all`, `claude`, `codex`, `gemini`) |
| days | number | `30` | 조회할 일수 |
| project | string | `"all"` | 프로젝트 필터 |
| from | string | -- | 시작 날짜 (`YYYY-MM-DD`) |
| to | string | -- | 종료 날짜 (`YYYY-MM-DD`) |

**응답**

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

집계된 지표와 함께 세션 목록을 반환합니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| agent_type | string | `"all"` | 에이전트 필터 |
| project | string | `"all"` | 프로젝트 필터 |
| from | string | -- | 시작 날짜 (`YYYY-MM-DD`) |
| to | string | -- | 종료 날짜 (`YYYY-MM-DD`) |
| limit | number | `100` | 반환할 최대 세션 수 |

**응답**

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

특정 세션의 상세 이벤트를 반환합니다. 선택적으로 세션 요약을 포함합니다.

**경로 파라미터**

| 이름 | 타입 | 설명 |
|------|------|------|
| id | string | 세션 ID |

**쿼리 파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| summary | string | -- | `"true"`로 설정하면 세션 요약 포함 |

**응답 (기본)**

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

**응답 (summary=true)**

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
  "events": []
}
```

---

### GET /api/sessions/active

최근 5분 내에 API 요청이 있는 세션을 반환합니다.

**파라미터**

없음.

**응답**

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

모델 사용량 분석을 요청 수 및 비용과 함께 반환합니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| agent_type | string | `"all"` | 에이전트 필터 |
| project | string | `"all"` | 프로젝트 필터 |
| from | string | -- | 시작 날짜 (`YYYY-MM-DD`) |
| to | string | -- | 종료 날짜 (`YYYY-MM-DD`) |

**응답**

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

에이전트별 효율성 지표를 반환합니다 (일별 분석 + 기간 비교).

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| days | number | `7` | 분석할 일수 |
| project | string | `"all"` | 프로젝트 필터 |
| from | string | -- | 시작 날짜 (`YYYY-MM-DD`) |
| to | string | -- | 종료 날짜 (`YYYY-MM-DD`) |

**응답**

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
    "previous": []
  }
}
```

---

### GET /api/tools

도구 사용 통계를 반환합니다. `detail=true`일 때 카테고리별 도구 상세(Built-in / Orchestration / MCP), 일별 추이, 개별 도구 분석을 포함합니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| agent_type | string | `"all"` | 에이전트 필터 |
| days | number | `7` | 조회할 일수 |
| project | string | `"all"` | 프로젝트 필터 |
| detail | string | -- | `"true"`로 설정하면 상세 분석 포함 |
| from | string | -- | 시작 날짜 (`YYYY-MM-DD`) |
| to | string | -- | 종료 날짜 (`YYYY-MM-DD`) |

**응답 (기본)**

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

**응답 (detail=true)**

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

도구 카테고리:
- **Built-in**: 표준 에이전트 도구 (Read, Edit, Bash 등)
- **Orchestration**: Agent 및 Skill 호출
- **MCP**: `mcp` 접두사가 있는 도구

---

### GET /api/tools/registered

프로젝트 파일시스템을 스캔하여 Claude Code 설정 파일에서 등록된 도구(에이전트, 스킬, MCP 서버, 훅)를 반환합니다.

**파라미터**

없음.

**응답**

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

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 도구 이름 |
| type | string | `agent`, `skill`, `mcp`, 또는 `hook` |
| scope | string | `project` 또는 `global` |
| filePath | string | 설정 파일의 절대 경로 |

---

### GET /api/projects

프로젝트별 분석을 반환합니다. 쿼리 파라미터에 따라 동작이 달라집니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| agent_type | string | -- | 에이전트 필터 (비용 뷰 트리거) |
| from | string | -- | 시작 날짜 (`YYYY-MM-DD`) |
| to | string | -- | 종료 날짜 (`YYYY-MM-DD`) |
| view | string | -- | `"comparison"`으로 설정하면 비교 뷰 |

**응답 (파라미터 없음 -- 프로젝트 목록)**

```json
[
  {
    "project_name": "argus",
    "session_count": 25,
    "total_cost": 45.60
  }
]
```

**응답 (view=comparison)**

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

**응답 (agent_type, from, to 포함)**

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

특정 프로젝트의 상세 통계와 일별 비용 추이를 반환합니다.

**경로 파라미터**

| 이름 | 타입 | 설명 |
|------|------|------|
| name | string | URL 인코딩된 프로젝트 이름 |

**응답**

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

고비용 세션, 모델 비용 효율성, 예산 상태를 포함한 비용 인사이트를 반환합니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| days | number | `7` | 분석할 일수 |
| limit | number | `10` | 고비용 세션 최대 수 |

**응답**

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

**고비용 세션 원인:**
- `expensive_model` -- 고가 모델 사용 (Opus, o3, GPT-5.4)
- `many_tool_calls` -- 세션 내 15회 이상 도구 호출
- `many_requests` -- 세션 내 10회 이상 API 요청
- `no_cache` -- 입력 토큰 10K 이상인데 캐시 읽기 토큰 0

---

### GET /api/suggestions

사용량 지표를 기반으로 AI 생성 최적화 제안을 반환합니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| days | number | `7` | 분석할 데이터 일수 |

**응답**

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

| 심각도 | 설명 |
|--------|------|
| `info` | 정보성 제안 |
| `warning` | 실행 가능한 최적화 기회 |
| `critical` | 중대한 비용 또는 성능 문제 |

| 카테고리 | 설명 |
|----------|------|
| `cost` | 비용 최적화 |
| `cache` | 캐시 활용 |
| `tools` | 도구 실패율 |
| `performance` | 세션 성능 |

---

## 3. 설정

### GET /api/config

감지된 모든 에이전트 설정 파일을 나열하거나, 특정 파일의 내용을 읽습니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| path | string | -- | 읽을 파일 경로 (생략하면 모든 파일 나열) |

**응답 (목록 모드 -- path 파라미터 없음)**

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

**감지 파일:**

| 에이전트 | 프로젝트 파일 | 사용자 파일 |
|----------|--------------|------------|
| Claude | `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`, `.claude/agents/*.md`, `.claude/skills/*/SKILL.md` | `~/.claude/settings.json` |
| Codex | `codex.md`, `AGENTS.md` | `~/.codex/config.toml`, `~/.codex/instructions.md` |
| Gemini | `GEMINI.md` | `~/.gemini/settings.json` |

**응답 (읽기 모드 -- path 파라미터 포함)**

```json
{
  "path": "CLAUDE.md",
  "content": "# Argus\n...",
  "scope": "project"
}
```

**오류 (404)**

```json
{ "error": "File not found", "content": "" }
```

**오류 (400)**

```json
{ "error": "Invalid file path" }
```

---

### POST /api/config

설정 파일에 내용을 씁니다. 필요 시 상위 디렉토리를 생성합니다.

**요청 본문**

```json
{
  "path": ".claude/settings.json",
  "content": "{ \"permissions\": {} }"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| path | string | 상대 파일 경로 (프로젝트) 또는 `~/...` (사용자) |
| content | string | 작성할 파일 내용 |

**응답**

```json
{ "success": true, "path": ".claude/settings.json" }
```

경로 탐색 (`..`)은 400 오류로 거부됩니다.

---

### GET /api/config-history

추적되는 에이전트 설정 파일의 Git 커밋 이력을 반환합니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| days | number | `30` | 스캔할 이력 일수 |

**응답**

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

설정 변경 날짜 전후의 성능 지표를 비교합니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| date | string | **(필수)** | 변경 날짜 (`YYYY-MM-DD`) |
| days | number | `7` | 비교할 전후 일수 |

**응답**

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

**오류 (400)**

```json
{ "error": "date parameter is required" }
```

---

### GET /api/settings/limits

에이전트별 비용 한도를 반환합니다.

**응답**

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

에이전트별 비용 한도를 업서트합니다 (삽입 또는 충돌 시 업데이트).

**요청 본문**

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

**응답**

```json
{ "ok": true }
```

---

### POST /api/pricing-sync

LiteLLM 가격 데이터베이스에서 토큰 가격 데이터를 로컬 `pricing_model` 테이블로 동기화합니다.

**파라미터**

없음.

**응답**

```json
{ "synced": 15 }
```

| 필드 | 타입 | 설명 |
|------|------|------|
| synced | number | 업데이트된 가격 레코드 수 |

---

## 4. 시스템

### GET /api/health

간단한 헬스 체크 엔드포인트입니다.

**파라미터**

없음.

**응답**

```json
{
  "status": "ok",
  "timestamp": "2026-03-17T14:30:00.000Z"
}
```

---

### POST /api/seed

최근 7일간 세 에이전트(Claude Code, Codex CLI, Gemini CLI)의 랜덤 테스트 데이터를 데이터베이스에 시드합니다. API 요청, 사용자 프롬프트, 도구 결과, 오케스트레이션 도구 상세를 포함합니다.

**파라미터**

없음.

**응답**

```json
{ "seeded": 2500 }
```

| 필드 | 타입 | 설명 |
|------|------|------|
| seeded | number | 생성된 agent_log 레코드 수 |

---

### GET /api/ingest-status

에이전트 유형별 수집 상태를 반환합니다 -- 마지막 수신 타임스탬프와 이벤트 수.

**파라미터**

없음.

**응답**

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

에이전트 유형별 오늘의 비용 합계를 반환합니다.

**파라미터**

없음.

**응답**

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

헤드리스 Chrome을 사용하여 대시보드 스크린샷을 캡처합니다. macOS에 Google Chrome이 설치되어 있어야 합니다.

**파라미터**

| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| path | string | `"/"` | 캡처할 대시보드 페이지 경로 |
| width | string | `"1280"` | 뷰포트 너비 (픽셀) |
| height | string | `"800"` | 뷰포트 높이 (픽셀) |

**응답**

`Content-Type: image/png`의 바이너리 PNG 이미지.

**오류 (500)**

```json
{ "error": "Chrome not found" }
```

```json
{ "error": "Screenshot capture failed" }
```

---

## 공통 오류 응답

대부분의 엔드포인트는 내부 오류 시 500을 반환합니다:

```json
{ "error": "Internal server error" }
```

수집 엔드포인트(`/api/ingest`, `/v1/logs`, `/v1/metrics`)는 파싱 오류 시 400을 반환합니다:

```json
{ "error": "Error message describing the parse failure" }
```
