# 통합 텔레메트리 스펙 — 데이터 구조, 정규화, 사용 방향성

## 1. 에이전트 비교 요약

### 시그널 지원

| 시그널 | Claude Code | Codex CLI | Gemini CLI |
|--------|-------------|-----------|------------|
| Logs (이벤트) | O | O | O |
| Traces (스팬) | X | O | O |
| Metrics (시계열) | O | O | O |
| **Argus 수집 대상** | **Logs** | **Logs** | **Logs** |

> Argus은 현재 **Logs만 수집**. Traces/Metrics는 향후 확장 가능.

### 설정 방식

| 항목 | Claude Code | Codex CLI | Gemini CLI |
|------|-------------|-----------|------------|
| 설정 위치 | 환경변수 / `settings.json` | `~/.codex/config.toml` | `~/.gemini/settings.json` / 환경변수 |
| 활성화 키 | `CLAUDE_CODE_ENABLE_TELEMETRY=1` | `exporter = "otlp-http"` | `GEMINI_TELEMETRY_ENABLED=1` |
| 기본 프로토콜 | `http/json` (설정 가능) | `binary` (protobuf) | `grpc` |
| Argus 권장 | `http/json` → `:3000` | `json` → `:3000/v1/logs` | `http` → `:3000` |

### 이벤트 접두사

| 에이전트 | 접두사 | 예시 |
|----------|--------|------|
| Claude Code | `claude_code.*` | `claude_code.api_request` |
| Codex CLI | `codex.*` | `codex.sse_event` |
| Gemini CLI | `gemini_cli.*` | `gemini_cli.api_response` |

## 2. 정규화 매핑 (원본 → Argus)

### 이벤트 이름 정규화

| Argus 정규화 이름 | Claude Code 원본 | Codex CLI 원본 | Gemini CLI 원본 |
|-------------------|------------------|----------------|-----------------|
| `api_request` | `claude_code.api_request` | `codex.sse_event` (kind=response.completed) 또는 `codex.websocket_event` (kind=response.completed) | `gemini_cli.api_response` |
| `user_prompt` | `claude_code.user_prompt` | `codex.user_prompt` | `gemini_cli.user_prompt` |
| `tool_result` | `claude_code.tool_result` | `codex.tool_result` | `gemini_cli.tool_call` |
| `tool_decision` | `claude_code.tool_decision` | `codex.tool_decision` | — (tool_call에 decision 포함) |
| `api_error` | `claude_code.api_error` | `codex.sse_event` (kind=error/failed) 또는 `codex.websocket_event` (kind=error/failed) | `gemini_cli.api_error` |
| `session_start` | — | `codex.conversation_starts` | `gemini_cli.config` |
| (skip) | — | `codex.api_request`, `codex.websocket_request` | `gemini_cli.api_request` |
| `file_operation` | — | — | `gemini_cli.file_operation` |

### 속성 키 정규화

#### 세션 ID

| Argus 컬럼 | Claude Code | Codex CLI | Gemini CLI |
|-------------|-------------|-----------|------------|
| `session_id` | `session.id` | `conversation.id` | `session.id` |

#### 토큰 (api_request 이벤트)

| Argus 컬럼 | Claude Code | Codex CLI | Gemini CLI |
|-------------|-------------|-----------|------------|
| `input_tokens` | `input_tokens` | `input_token_count` | `input_token_count` |
| `output_tokens` | `output_tokens` | `output_token_count` | `output_token_count` |
| `cache_read_tokens` | `cache_read_tokens` | `cached_token_count` | `cached_content_token_count` |
| `cache_creation_tokens` | `cache_creation_tokens` | — | — |
| (미수집) | — | `reasoning_token_count` | `thoughts_token_count` |
| (미수집) | — | `tool_token_count` | `tool_token_count` |

#### 비용

| Argus 컬럼 | Claude Code | Codex CLI | Gemini CLI |
|-------------|-------------|-----------|------------|
| `cost_usd` | `cost_usd` (직접 제공) | 없음 (계산 필요) | 없음 (계산 필요) |

> Codex/Gemini는 `pricing_model` 테이블과 토큰 수로 비용 계산

#### 도구 관련

| Argus 컬럼 | Claude Code | Codex CLI | Gemini CLI |
|-------------|-------------|-----------|------------|
| `tool_name` | `tool_name` | `tool_name` | `function_name` |
| `tool_success` | `success` ("true"/"false") | `success` ("true"/"false") | `success` (boolean) |
| `duration_ms` | `duration_ms` | `duration_ms` | `duration_ms` |

#### MCP 도구 감지

| 에이전트 | MCP 감지 방법 |
|----------|--------------|
| Claude Code | `tool_name`이 `mcp__`로 시작, `mcp_server_scope` 속성, `tool_parameters` JSON에 `mcp_server_name` |
| Codex CLI | `mcp_server` 속성이 비어있지 않음, 트레이스의 `tool_origin = "mcp"` |
| Gemini CLI | `tool_type = "mcp"`, `mcp_server_name` 속성, 도구 이름이 `mcp`로 시작 |

#### 에이전트 감지 (`service.name`)

| 에이전트 | `service.name` |
|----------|----------------|
| Claude Code | `claude-code` |
| Codex CLI | `codex-cli` |
| Gemini CLI | `gemini-cli` |

## 3. SQLite 스키마 매핑

### agent_logs 테이블

```
┌─────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Argus 컬럼          │ Claude Code          │ Codex CLI            │ Gemini CLI           │
├─────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
│ timestamp           │ timeUnixNano →       │ event.timestamp      │ timeUnixNano →       │
│                     │ ISO 8601             │ (RFC3339)            │ ISO 8601             │
│ agent_type          │ "claude"             │ "codex"              │ "gemini"             │
│ service_name        │ "claude-code"        │ "codex-cli"          │ "gemini-cli"         │
│ event_name          │ 접두사 제거           │ sse/ws 정규화         │ 이름 변환             │
│ session_id          │ session.id           │ conversation.id      │ session.id           │
│ prompt_id           │ prompt.id            │ —                    │ prompt_id            │
│ model               │ model                │ model                │ model                │
│ input_tokens        │ input_tokens         │ input_token_count    │ input_token_count    │
│ output_tokens       │ output_tokens        │ output_token_count   │ output_token_count   │
│ cache_read_tokens   │ cache_read_tokens    │ cached_token_count   │ cached_content_      │
│                     │                      │                      │ token_count          │
│ cache_creation_     │ cache_creation_      │ —                    │ —                    │
│ tokens              │ tokens               │                      │                      │
│ cost_usd            │ cost_usd             │ 계산 (pricing_model) │ 계산 (pricing_model) │
│ duration_ms         │ duration_ms          │ duration_ms          │ duration_ms          │
│ speed               │ speed                │ "normal"             │ "normal"             │
│ tool_name           │ tool_name            │ tool_name            │ function_name        │
│ tool_success        │ success              │ success              │ success              │
│ severity_text       │ severityText         │ severityText         │ severityText         │
│ body                │ body                 │ body                 │ body                 │
│ project_name        │ — (미제공)           │ arguments.workdir    │ — (미제공)           │
│ resource_attributes │ resource JSON        │ resource JSON        │ resource JSON        │
│ log_attributes      │ attributes JSON      │ attributes JSON      │ attributes JSON      │
└─────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

### 현재 미수집 데이터

| 데이터 | 에이전트 | 설명 | 향후 활용 |
|--------|----------|------|-----------|
| `reasoning_token_count` | Codex | 추론 토큰 | 효율성 분석 (M3) |
| `thoughts_token_count` | Gemini | 사고 토큰 | 효율성 분석 (M3) |
| `tool_token_count` | Codex, Gemini | 도구 토큰 | 도구 비용 분석 |
| `event.sequence` | Claude Code | 이벤트 순서 | 세션 리플레이 |
| `call_id` | Codex | 도구 호출 ID | 결정-결과 연결 |
| `tool_parameters` | Claude Code | 도구 파라미터 JSON | 도구 상세 분석 |
| `tool_result_size_bytes` | Claude Code | 도구 결과 크기 | 성능 분석 |
| `attempt` | Claude Code, Codex | 재시도 횟수 | 안정성 분석 |
| `file_operation` | Gemini | 파일 변경 추적 | 코드 변경 분석 |

## 4. OTLP 수신 데이터 흐름

```
Agent (Claude/Codex/Gemini)
    │
    │ POST /v1/logs (OTLP JSON)
    ▼
Next.js Middleware (rewrite)
    │ /v1/logs → /api/ingest
    ▼
/api/ingest (route.ts)
    │
    ├─ 1. resourceLogs 파싱
    │     └─ resource.attributes에서 service.name 추출 → agent_type 결정
    │
    ├─ 2. scopeLogs.logRecords 반복
    │     ├─ event.name 추출 → normalizeEventName()
    │     ├─ 속성 키 정규화 (에이전트별 키 차이 흡수)
    │     └─ 비용 계산 (Codex/Gemini: pricing_model 조회)
    │
    ├─ 3. agent_logs INSERT
    │
    └─ 4. tool_details INSERT (MCP 도구만)
```

## 5. 사용 방향성

### 5.1 대시보드 지표별 데이터 소스

| 대시보드 지표 | 소스 이벤트 | 소스 속성 | 비고 |
|--------------|------------|-----------|------|
| **오늘의 세션 수** | `api_request` | `DISTINCT session_id` | |
| **오늘의 비용** | `api_request` | `SUM(cost_usd)` | |
| **토큰 사용량** | `api_request` | `SUM(input_tokens + output_tokens)` | |
| **일별 추이** | `api_request` | `GROUP BY date(timestamp)` | |
| **모델별 비율** | `api_request` | `GROUP BY model` | |
| **에이전트별 비교** | `api_request` | `GROUP BY agent_type` | |
| **도구 사용 빈도** | `tool_result` | `GROUP BY tool_name` | |
| **도구 성공률** | `tool_result` | `AVG(tool_success)` | |
| **도구 평균 시간** | `tool_result` | `AVG(duration_ms)` | |
| **캐시 효율** | `api_request` | `cache_read / (input + cache_read)` | M3 |
| **프로젝트별 비용** | `api_request` | `GROUP BY project_name` | |

### 5.2 현재 구현 vs 개선 포인트

#### 이미 구현된 것 (현재 ingest)

- [x] 3개 에이전트 이벤트 정규화 (`normalizeEventName`)
- [x] 토큰 키 차이 흡수 (`getTokenAttr`)
- [x] 세션 ID 키 차이 흡수 (`getSessionId`)
- [x] 비용 자동 계산 (`calculateCost` for Codex/Gemini)
- [x] MCP 도구 자동 추출 (Codex, Gemini)
- [x] Codex 프로젝트명 추출 (`arguments.workdir`)

#### 개선 가능한 것

| 개선 항목 | 현재 상태 | 개선 방안 | 우선순위 |
|-----------|-----------|-----------|----------|
| **reasoning/thinking 토큰** | 미수집 | agent_logs에 `reasoning_tokens` 컬럼 추가 | 중 |
| **tool_token_count** | 미수집 | 도구 비용 분석용 별도 컬럼 | 낮음 |
| **event.sequence** | 미수집 | 세션 리플레이 기능용 | 낮음 |
| **call_id 연결** | 미수집 | tool_decision ↔ tool_result 매칭 | 중 |
| **tool_parameters** | 미수집 | 도구 상세 분석 (bash 명령어, 파일 경로) | 중 |
| **attempt (재시도)** | 미수집 | API 안정성 모니터링 | 낮음 |
| **file_operation** | 미수집 | Gemini 코드 변경량 추적 | 중 |
| **prompt.id 활용** | 저장만 | 프롬프트별 비용/도구 사용 상관관계 분석 | 높음 |
| **Codex prompt.id** | 없음 | Codex는 prompt.id를 제공하지 않음 — 시간 기반 그룹핑 필요 | 높음 |
| **GenAI 시맨틱 이벤트** | 무시 | Gemini의 `gen_ai.*` 이벤트 중복 필터링 필요 | 낮음 |

### 5.3 향후 확장 방향

#### Phase 1: 현재 (Logs Only)

```
Agent → POST /v1/logs → /api/ingest → SQLite
```

- 이벤트 기반 분석 (세션, 비용, 토큰, 도구)
- 모든 에이전트 통합 뷰

#### Phase 2: Metrics 수집 추가

```
Agent → POST /v1/metrics → /api/metrics → SQLite (metrics 테이블)
```

추가 가치:
- Claude Code: `lines_of_code.count`, `commit.count`, `pr.count`, `active_time.total`
- Codex: `turn.e2e_duration_ms`, `turn.ttft.duration_ms`
- Gemini: `file.operation.count`, `lines.changed`

#### Phase 3: Traces 수집 추가

```
Agent → POST /v1/traces → /api/traces → SQLite (traces 테이블)
```

추가 가치:
- 프롬프트 → API 호출 → 도구 실행의 전체 흐름 시각화
- 병목 구간 식별 (어떤 도구가 느린지)
- Codex의 안전한 트레이스 (민감 정보 제외)

### 5.4 에이전트별 고유 인사이트

| 에이전트 | 고유 데이터 | 인사이트 |
|----------|-----------|----------|
| Claude Code | `speed` (fast/normal) | Fast Mode 사용 비율, Fast vs Normal 비용 비교 |
| Claude Code | `tool_parameters.git_commit_id` | 커밋과 세션 연결 |
| Claude Code | `tool_parameters.skill_name` | 스킬 사용 패턴 |
| Claude Code | `event.sequence` | 프롬프트 내 이벤트 순서 분석 |
| Codex | `reasoning_token_count` | 추론 비용 비중 분석 |
| Codex | `mcp_server`, `mcp_server_origin` | MCP 서버별 성능 비교 |
| Codex | `arguments.workdir` | 프로젝트 자동 감지 |
| Gemini | `thoughts_token_count` | 사고 토큰 비용 비중 |
| Gemini | `file_operation` | 파일 변경 패턴 (언어별, 작업별) |
| Gemini | `decision` = `"auto_accept"` | 자동 승인 비율 |
| Gemini | `tool_type` | Native vs MCP 도구 사용 비율 |

### 5.5 Argus 수신 설정 가이드 (통합)

```bash
# === Claude Code ===
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9845
# 선택: 상세 수집
export OTEL_LOG_TOOL_DETAILS=1
export OTEL_LOG_USER_PROMPTS=1
```

```toml
# === Codex CLI (~/.codex/config.toml) ===
[otel]
exporter = "otlp-http"
log_user_prompt = true

[otel.exporter.otlp-http]
endpoint = "http://localhost:9845/v1/logs"
protocol = "json"
```

```json
// === Gemini CLI (~/.gemini/settings.json) ===
{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpEndpoint": "http://localhost:9845",
    "otlpProtocol": "http",
    "logPrompts": true
  }
}
```

## 6. 데이터 구조 상세

### 6.1 OTLP JSON 최상위 구조 (모든 에이전트 공통)

```typescript
type OtlpLogsRequest = {
  resourceLogs: Array<{
    resource: {
      attributes: Array<{
        key: string
        value: { stringValue?: string; intValue?: string | number; doubleValue?: number; boolValue?: boolean }
      }>
    }
    scopeLogs: Array<{
      scope?: { name?: string }
      logRecords: Array<{
        timeUnixNano?: string          // 나노초 타임스탬프 (문자열)
        observedTimeUnixNano?: string   // 관측 시간
        severityText?: string           // "INFO", "ERROR" 등
        severityNumber?: number         // OTel severity 번호
        body?: AnyValue                 // 이벤트 본문
        attributes?: KeyValue[]         // 이벤트 속성
      }>
    }>
  }>
}
```

### 6.2 에이전트별 핵심 이벤트 속성 타입 차이

```
                    Claude Code         Codex CLI           Gemini CLI
                    ───────────         ─────────           ──────────
cost_usd            number (직접)       X (계산 필요)       X (계산 필요)
success             "true"/"false"      "true"/"false"      true/false (boolean)
duration_ms         number              string (u128)       number
tokens              number              i64                 number
session_id key      "session.id"        "conversation.id"   "session.id"
prompt_id key       "prompt.id"         X (없음)            "prompt_id"
tool_name key       "tool_name"         "tool_name"         "function_name"
```

### 6.3 pricing_model 데이터

현재 시드된 가격 모델:

| 에이전트 | 모델 | input/MTok | output/MTok | cache_read/MTok |
|----------|------|------------|-------------|-----------------|
| Claude | claude-sonnet-4-6 | $3.0 | $15.0 | $0.30 |
| Claude | claude-opus-4-6 | $15.0 | $75.0 | $1.50 |
| Claude | claude-haiku-4-5 | $0.8 | $4.0 | $0.08 |
| Codex | gpt-4.1 | $2.0 | $8.0 | $0.50 |
| Codex | gpt-4.1-mini | $0.4 | $1.6 | $0.10 |
| Codex | o4-mini | $1.1 | $4.4 | $0.275 |
| Gemini | gemini-2.5-pro | $1.25 | $10.0 | $0.3125 |
| Gemini | gemini-2.5-flash | $0.15 | $0.6 | $0.0375 |
| Gemini | gemini-2.0-flash | $0.1 | $0.4 | $0.025 |

> 가격은 변경될 수 있음. `pricing_model` 테이블의 `effective_date`로 시점별 관리.
