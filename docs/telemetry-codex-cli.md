# Codex CLI OTel 텔레메트리 스펙

> 출처: [공식 설정 문서](https://developers.openai.com/codex/config-reference/), [GitHub 소스코드](https://github.com/openai/codex/tree/main/codex-rs/otel), [OTel PR #2103](https://github.com/openai/codex/pull/2103)

## 1. 텔레메트리 활성화

Codex CLI는 `~/.codex/config.toml`의 `[otel]` 섹션으로 설정한다 (환경변수가 아닌 파일 기반).

```toml
[otel]
environment = "dev"           # dev | staging | prod
exporter = "otlp-http"        # none | otlp-http | otlp-grpc  (로그)
trace_exporter = "otlp-http"  # none | otlp-http | otlp-grpc  (트레이스)
metrics_exporter = "otlp-http" # none | statsig | otlp-http | otlp-grpc  (메트릭)
log_user_prompt = false        # true면 사용자 프롬프트 원문 포함

# Argus으로 전송하는 설정 예시
[otel.exporter.otlp-http]
endpoint = "http://localhost:3000/v1/logs"
protocol = "json"              # "binary" (protobuf) | "json"

[otel.trace_exporter.otlp-http]
endpoint = "http://localhost:3000/v1/traces"
protocol = "json"

[otel.metrics_exporter.otlp-http]
endpoint = "http://localhost:3000/v1/metrics"
protocol = "json"
```

### TLS 설정 (선택)

```toml
[otel.exporter.otlp-http.tls]
ca-certificate = "certs/otel-ca.pem"
client-certificate = "/etc/codex/certs/client.pem"
client-private-key = "/etc/codex/certs/client-key.pem"
```

### 환경변수 (리소스 속성 추가만)

```bash
export OTEL_RESOURCE_ATTRIBUTES="env=production,department=engineering"
```

## 2. 프로토콜

| 프로토콜 | 설정값 | 설명 |
|----------|--------|------|
| OTLP/HTTP (protobuf) | `otlp-http` + `protocol = "binary"` | 기본 |
| OTLP/HTTP (JSON) | `otlp-http` + `protocol = "json"` | Argus 호환 |
| OTLP/gRPC | `otlp-grpc` | gRPC |

HTTP 경로:
- 로그: `POST /v1/logs`
- 트레이스: `POST /v1/traces`
- 메트릭: `POST /v1/metrics`

## 3. Resource Attributes

| 속성 | 값 | 설명 |
|------|-----|------|
| `service.name` | `codex-cli` | 기본값 (설정 가능) |
| `service.version` | 예: `1.2.3` | `CARGO_PKG_VERSION` |
| `env` | `dev`/`staging`/`prod` | config.toml의 `environment` |
| `host.name` | 호스트명 | 로그에만 포함 |

## 4. Common Attributes (모든 이벤트 공통)

### 로그 이벤트 공통

| 속성 | 타입 | 설명 |
|------|------|------|
| `event.timestamp` | string (RFC3339) | 이벤트 발생 시각 |
| `event.name` | string | 이벤트 이름 |
| `conversation.id` | string | 대화 세션 ID (= session_id) |
| `app.version` | string | CLI 버전 |
| `auth_mode` | string? | `ApiKey` 또는 `Chatgpt` |
| `originator` | string | 호출 원점 (`codex_cli`, `codex_exec`) |
| `user.account_id` | string? | 계정 ID |
| `user.email` | string? | 계정 이메일 |
| `terminal.type` | string | 터미널 유형 |
| `model` | string | 모델 ID |
| `slug` | string | 모델 슬러그 |

### 트레이스 이벤트 공통

로그와 동일하지만 `user.account_id`, `user.email` 제외.

## 5. 이벤트 (로그) — 8종

### 5.1 `codex.conversation_starts`

대화 시작 시 1회 발생.

| 속성 | 타입 | 설명 |
|------|------|------|
| `provider_name` | string | API 프로바이더 이름 |
| `reasoning_effort` | string? | `low`/`medium`/`high` |
| `reasoning_summary` | string | 추론 요약 설정 |
| `context_window` | i64? | 컨텍스트 윈도우 크기 |
| `auto_compact_token_limit` | i64? | 자동 압축 토큰 한도 |
| `approval_policy` | string | 도구 승인 정책 |
| `sandbox_policy` | string | 샌드박스 정책 |
| `mcp_servers` | string | MCP 서버 목록 (쉼표 구분, 로그만) |
| `active_profile` | string? | 활성 프로필 (로그만) |
| `mcp_server_count` | i64 | MCP 서버 수 (트레이스만) |

### 5.2 `codex.api_request`

API 요청마다 발생. **토큰/비용 정보 없음** (sse_event에서 제공).

| 속성 | 타입 | 설명 |
|------|------|------|
| `attempt` | u64 | 재시도 번호 |
| `duration_ms` | u128 (string) | 요청 소요 시간 |
| `http.response.status_code` | u16? | HTTP 상태 코드 |
| `error.message` | string? | 오류 메시지 (실패 시) |

### 5.3 `codex.sse_event`

SSE 스트림 이벤트마다 발생. **`response.completed`일 때 토큰 정보 포함.**

| 속성 | 타입 | 설명 |
|------|------|------|
| `event.kind` | string | SSE 이벤트 종류 |
| `duration_ms` | u128 (string) | 소요 시간 |
| `error.message` | string? | 오류 시 |

**`event.kind = "response.completed"` 일 때 추가 속성:**

| 속성 | 타입 | 설명 |
|------|------|------|
| `input_token_count` | i64 | 입력 토큰 수 |
| `output_token_count` | i64 | 출력 토큰 수 |
| `cached_token_count` | i64? | 캐시된 토큰 수 |
| `reasoning_token_count` | i64? | 추론 토큰 수 |
| `tool_token_count` | i64 | 도구 토큰 수 |

### 5.4 `codex.websocket_request`

WebSocket 연결 요청마다 발생.

| 속성 | 타입 | 설명 |
|------|------|------|
| `duration_ms` | u128 (string) | 요청 소요 시간 |
| `success` | string | `"true"`/`"false"` |
| `error.message` | string? | 오류 시 |

### 5.5 `codex.websocket_event`

WebSocket 메시지마다 발생. **`response.completed`일 때 토큰 정보 포함** (sse_event과 동일 구조).

| 속성 | 타입 | 설명 |
|------|------|------|
| `event.kind` | string | 메시지 종류 |
| `duration_ms` | u128 (string) | 소요 시간 |
| `success` | string | `"true"`/`"false"` |
| `error.message` | string? | 오류 시 |

**`event.kind = "response.completed"` 일 때**: sse_event과 동일한 토큰 속성 포함.

### 5.6 `codex.user_prompt`

사용자 프롬프트 입력마다 발생.

| 속성 | 타입 | 채널 | 설명 |
|------|------|------|------|
| `prompt_length` | usize (string) | 로그+트레이스 | 프롬프트 문자 수 |
| `prompt` | string | 로그만 | 프롬프트 내용 (`log_user_prompt=false`면 `[REDACTED]`) |
| `text_input_count` | i64 | 트레이스만 | 텍스트 입력 개수 |
| `image_input_count` | i64 | 트레이스만 | 이미지 입력 개수 |

### 5.7 `codex.tool_decision`

도구 승인/거부 결정마다 발생 (로그만).

| 속성 | 타입 | 설명 |
|------|------|------|
| `tool_name` | string | 도구 이름 |
| `call_id` | string | 호출 ID |
| `decision` | string | `approved`/`approved_for_session`/`denied`/`abort` |
| `source` | string | `Config` 또는 `User` |

### 5.8 `codex.tool_result`

도구 실행 결과마다 발생.

**로그 속성:**

| 속성 | 타입 | 설명 |
|------|------|------|
| `tool_name` | string | 도구 이름 |
| `call_id` | string | 호출 ID |
| `arguments` | string | 도구 인자 (원문 JSON) |
| `duration_ms` | u128 (string) | 실행 시간 |
| `success` | string | `"true"`/`"false"` |
| `output` | string | 도구 출력 (원문) |
| `mcp_server` | string | MCP 서버 이름 (빈 문자열이면 빌트인) |
| `mcp_server_origin` | string | MCP 서버 원점 |

**트레이스 속성 (민감 정보 제외):**

| 속성 | 타입 | 설명 |
|------|------|------|
| `tool_name` | string | 도구 이름 |
| `call_id` | string | 호출 ID |
| `duration_ms` | u128 (string) | 실행 시간 |
| `success` | string | `"true"`/`"false"` |
| `arguments_length` | i64 | 인자 길이 |
| `output_length` | i64 | 출력 길이 |
| `output_line_count` | i64 | 출력 라인 수 |
| `tool_origin` | string | `"builtin"` 또는 `"mcp"` |
| `mcp_tool` | bool | MCP 도구 여부 |

## 6. 메트릭

### Counter + Histogram 쌍

| Counter | Histogram | 태그 |
|---------|-----------|------|
| `codex.api_request` | `codex.api_request.duration_ms` | `status`, `success` |
| `codex.sse_event` | `codex.sse_event.duration_ms` | `kind`, `success` |
| `codex.websocket.request` | `codex.websocket.request.duration_ms` | `success` |
| `codex.websocket.event` | `codex.websocket.event.duration_ms` | `kind`, `success` |
| `codex.tool.call` | `codex.tool.call.duration_ms` | `tool`, `success` |

### Turn-level 메트릭

| 메트릭 | 설명 |
|--------|------|
| `codex.turn.e2e_duration_ms` | 턴 전체 소요 시간 |
| `codex.turn.ttft.duration_ms` | Time to First Token |
| `codex.turn.ttfm.duration_ms` | Time to First Message |
| `codex.turn.token_usage` | 턴별 토큰 사용량 |
| `codex.thread.started` | 스레드 시작 카운터 |

### 메트릭 공통 태그

| 태그 | 설명 |
|------|------|
| `app.version` | CLI 버전 |
| `auth_mode` | 인증 방식 (`api_key`, `chatgpt`) |
| `model` | 모델 ID |
| `originator` | 호출 원점 |
| `service_name` | 서비스 이름 |

## 7. 로그 vs 트레이스 분리

Codex는 동일 이벤트를 **로그와 트레이스 두 채널로 분리** 전송한다:

| 채널 | 민감 정보 | 주요 차이 |
|------|-----------|-----------|
| 로그 (`OTEL_LOG_ONLY_TARGET`) | 포함 | 프롬프트 원문, 도구 출력, 계정 ID/이메일 |
| 트레이스 (`OTEL_TRACE_SAFE_TARGET`) | 제외 | 길이/카운트만 (출력 길이, 라인 수) |

## 8. OTLP JSON 페이로드 예시

### api_request (sse_event response.completed)

```json
{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "codex-cli"}},
          {"key": "service.version", "value": {"stringValue": "1.2.3"}},
          {"key": "env", "value": {"stringValue": "dev"}}
        ]
      },
      "scopeLogs": [
        {
          "logRecords": [
            {
              "timeUnixNano": "1710000000000000000",
              "severityText": "INFO",
              "body": {"stringValue": ""},
              "attributes": [
                {"key": "event.name", "value": {"stringValue": "codex.sse_event"}},
                {"key": "event.timestamp", "value": {"stringValue": "2026-03-13T10:00:00.000Z"}},
                {"key": "event.kind", "value": {"stringValue": "response.completed"}},
                {"key": "conversation.id", "value": {"stringValue": "thread-abc-123"}},
                {"key": "model", "value": {"stringValue": "gpt-4.1"}},
                {"key": "duration_ms", "value": {"intValue": "2340"}},
                {"key": "input_token_count", "value": {"intValue": "1200"}},
                {"key": "output_token_count", "value": {"intValue": "450"}},
                {"key": "cached_token_count", "value": {"intValue": "600"}},
                {"key": "reasoning_token_count", "value": {"intValue": "0"}},
                {"key": "tool_token_count", "value": {"intValue": "0"}}
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### tool_result

```json
{
  "attributes": [
    {"key": "event.name", "value": {"stringValue": "codex.tool_result"}},
    {"key": "event.timestamp", "value": {"stringValue": "2026-03-13T10:01:00.000Z"}},
    {"key": "conversation.id", "value": {"stringValue": "thread-abc-123"}},
    {"key": "tool_name", "value": {"stringValue": "shell"}},
    {"key": "call_id", "value": {"stringValue": "call_xyz"}},
    {"key": "arguments", "value": {"stringValue": "{\"command\":\"ls -la\",\"workdir\":\"/home/user/project\"}"}},
    {"key": "duration_ms", "value": {"intValue": "120"}},
    {"key": "success", "value": {"stringValue": "true"}},
    {"key": "mcp_server", "value": {"stringValue": ""}},
    {"key": "model", "value": {"stringValue": "gpt-4.1"}}
  ]
}
```

## 9. 주의사항

- **비용 정보 없음**: `cost_usd` 속성이 없어 `pricing_model` 테이블로 계산 필요
- **세션 ID 키**: `conversation.id` (Claude Code는 `session.id`)
- **토큰 키 차이**: `input_token_count`/`output_token_count` (Claude Code는 `input_tokens`/`output_tokens`)
- **추가 토큰 유형**: `reasoning_token_count`, `tool_token_count` (Claude Code에 없음)
- **이벤트 구조 차이**: `sse_event`/`websocket_event` 안에 `event.kind`로 실제 이벤트 구분
- **MCP 감지**: `mcp_server` 속성이 비어있지 않으면 MCP 도구
- **project 추출**: `arguments` JSON에서 `workdir` 파싱하여 프로젝트명 추출
