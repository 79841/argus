# Gemini CLI OTel 텔레메트리 스펙

> 출처: [공식 텔레메트리 문서](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/telemetry.md), [GitHub 소스코드](https://github.com/google-gemini/gemini-cli/tree/main/packages/core/src/telemetry)

## 1. 텔레메트리 활성화

### settings.json (`~/.gemini/settings.json`)

```json
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

### 환경변수

| 설정 | 환경변수 | CLI 플래그 | 기본값 |
|------|----------|------------|--------|
| enabled | `GEMINI_TELEMETRY_ENABLED` | `--telemetry` | `false` |
| target | `GEMINI_TELEMETRY_TARGET` | `--telemetry-target` | `"local"` |
| otlpEndpoint | `GEMINI_TELEMETRY_OTLP_ENDPOINT` 또는 `OTEL_EXPORTER_OTLP_ENDPOINT` | `--telemetry-otlp-endpoint` | `http://localhost:4317` |
| otlpProtocol | `GEMINI_TELEMETRY_OTLP_PROTOCOL` | `--telemetry-otlp-protocol` | `"grpc"` |
| outfile | `GEMINI_TELEMETRY_OUTFILE` | `--telemetry-outfile` | — |
| logPrompts | `GEMINI_TELEMETRY_LOG_PROMPTS` | `--telemetry-log-prompts` | `true` |
| useCollector | `GEMINI_TELEMETRY_USE_COLLECTOR` | — | `false` |
| useCliAuth | `GEMINI_TELEMETRY_USE_CLI_AUTH` | — | `false` |

설정 우선순위: **CLI 플래그 > 환경변수 > settings.json**

### Argus 수신 설정 예시

```bash
export GEMINI_TELEMETRY_ENABLED=1
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:9845
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http
export GEMINI_TELEMETRY_LOG_PROMPTS=1
```

## 2. 프로토콜

| 프로토콜 | 설정값 | 설명 |
|----------|--------|------|
| gRPC | `"grpc"` | 기본값, 포트 4317 |
| HTTP | `"http"` | JSON 인코딩, 포트 4318 |

HTTP 모드 경로 (v0.34.0+):
- `POST /v1/logs`
- `POST /v1/traces`
- `POST /v1/metrics`

> **주의**: v0.34.0 이전 버전에서는 HTTP 모드 경로 버그 있음 (Issue #15581)

### 시그널 3가지

Gemini CLI는 **Logs + Metrics + Traces** 모두 전송. Logs가 가장 풍부한 데이터.

### 파일 출력 대안

`outfile` 설정 시 OTLP 전송 대신 JSON 파일에 기록.

## 3. Resource Attributes

| 속성 | 값 | 설명 |
|------|-----|------|
| `service.name` | `gemini-cli` | 고정 |
| `service.version` | Node.js 버전 | `process.version` |
| `session.id` | 세션 ID | 리소스 레벨에 포함 |

## 4. Common Attributes (모든 이벤트 공통)

| 속성 | 타입 | 설명 |
|------|------|------|
| `session.id` | string | 세션 ID |
| `installation.id` | string | 설치 고유 ID |
| `interactive` | boolean | 인터랙티브 모드 여부 |
| `user.email` | string? | Google 계정 |
| `auth_type` | string? | 인증 타입 |
| `experiments.ids` | string[]? | 실험 ID 배열 |

## 5. 이벤트 (로그) — Argus 수집 대상 6종 + 기타

### 5.1 `gemini_cli.config` — 세션 시작

시작 시 1회 발생. body: `"CLI configuration loaded."`

| 속성 | 타입 | 설명 |
|------|------|------|
| `model` | string | 모델 ID |
| `embedding_model` | string | 임베딩 모델 ID |
| `sandbox_enabled` | boolean | 샌드박스 활성화 |
| `core_tools_enabled` | string | 활성 코어 도구 (쉼표 구분) |
| `approval_mode` | string | 승인 모드 |
| `api_key_enabled` | boolean | API 키 사용 여부 |
| `vertex_ai_enabled` | boolean | Vertex AI 사용 여부 |
| `mcp_servers` | string | MCP 서버 이름 (쉼표 구분) |
| `mcp_servers_count` | number | MCP 서버 수 |
| `mcp_tools` | string | MCP 도구 이름 (쉼표 구분) |
| `mcp_tools_count` | number | MCP 도구 수 |
| `extensions` | string | 확장 이름 (쉼표 구분) |
| `extensions_count` | number | 확장 수 |
| `auth_type` | string | 인증 타입 |
| `output_format` | string | `"text"` 또는 `"json"` |
| `debug_mode` | boolean | 디버그 모드 |

### 5.2 `gemini_cli.user_prompt` — 사용자 프롬프트

| 속성 | 타입 | 설명 |
|------|------|------|
| `prompt_length` | number | 프롬프트 길이 |
| `prompt_id` | string | 프롬프트 상관관계 ID |
| `prompt` | string | 프롬프트 텍스트 (`logPrompts=true`일 때만) |
| `auth_type` | string | 인증 타입 |

### 5.3 `gemini_cli.api_request` — API 요청

| 속성 | 타입 | 설명 |
|------|------|------|
| `model` | string | 모델 ID |
| `prompt_id` | string | 프롬프트 ID |
| `request_text` | string | 요청 텍스트 |
| `role` | string | LLM 역할 |

> Argus에서는 **skip** (응답 이벤트에 더 풍부한 정보)

### 5.4 `gemini_cli.api_response` — API 응답 (핵심)

body: `"API response from {model}. Status: {status_code}. Duration: {duration_ms}ms."`

| 속성 | 타입 | 설명 |
|------|------|------|
| `model` | string | 모델 ID |
| `duration_ms` | number | 응답 시간 (ms) |
| `input_token_count` | number | 입력 토큰 |
| `output_token_count` | number | 출력 토큰 |
| `cached_content_token_count` | number | 캐시 토큰 |
| `thoughts_token_count` | number | 사고(thinking) 토큰 |
| `tool_token_count` | number | 도구 토큰 |
| `total_token_count` | number | 총 토큰 |
| `prompt_id` | string | 프롬프트 ID |
| `auth_type` | string | 인증 타입 |
| `status_code` | number | HTTP 상태 코드 |
| `finish_reasons` | string[] | 완료 이유 배열 |

### 5.5 `gemini_cli.tool_call` — 도구 호출

| 속성 | 타입 | 설명 |
|------|------|------|
| `function_name` | string | 함수 이름 |
| `function_args` | string (JSON) | 인자 (JSON 문자열) |
| `duration_ms` | number | 실행 시간 (ms) |
| `success` | boolean | 성공 여부 |
| `decision` | string | `"accept"`, `"reject"`, `"modify"`, `"auto_accept"` |
| `prompt_id` | string | 프롬프트 ID |
| `tool_type` | string | `"native"` 또는 `"mcp"` |
| `content_length` | number | 결과 콘텐츠 길이 |
| `mcp_server_name` | string | MCP 서버 이름 (MCP 도구일 때) |
| `extension_name` | string | 확장 이름 (MCP 도구일 때) |
| `extension_id` | string | 확장 ID (MCP 도구일 때) |
| `start_time` | number | 시작 시간 |
| `end_time` | number | 종료 시간 |
| `error` | string | 에러 메시지 (실패 시) |

### 5.6 `gemini_cli.api_error` — API 에러

| 속성 | 타입 | 설명 |
|------|------|------|
| `model` / `model_name` | string | 모델 ID |
| `error` / `error.message` | string | 에러 메시지 |
| `error_type` / `error.type` | string | 에러 유형 |
| `status_code` | number | HTTP 상태 코드 |
| `duration_ms` / `duration` | number | 응답 시간 |
| `prompt_id` | string | 프롬프트 ID |
| `auth_type` | string | 인증 타입 |

### 5.7 `gemini_cli.file_operation` — 파일 작업

| 속성 | 타입 | 설명 |
|------|------|------|
| `tool_name` | string | 도구 이름 |
| `operation` | string | `"create"`, `"read"`, `"update"` |
| `lines` | number | 줄 수 |
| `extension` | string | 파일 확장자 |
| `programming_language` | string | 프로그래밍 언어 |
| `mimetype` | string | MIME 타입 |

### 기타 이벤트 (Argus에서 skip)

| 이벤트 | 설명 |
|--------|------|
| `gemini_cli.tool_output_truncated` | 도구 출력 잘림 |
| `gemini_cli.tool_output_masking` | 도구 출력 마스킹 |
| `gemini_cli.malformed_json_response` | JSON 파싱 실패 |
| `gemini_cli.flash_fallback` | Flash 모델 전환 |
| `gemini_cli.chat_compression` | 채팅 압축 |
| `gemini_cli.model_routing` | 모델 라우팅 |
| `gemini_cli.slash_command` | 슬래시 명령 |
| `gemini_cli.conversation_finished` | 대화 종료 |
| `gemini_cli.rewind` | 되감기 |
| `gemini_cli.ide_connection` | IDE 연결 |
| `gemini_cli.extension_*` | 확장 설치/제거/활성화 |

### GenAI 시맨틱 컨벤션 이벤트

api_request/api_response와 함께 `gen_ai.client.inference.operation.details` 이벤트도 동시 발생:

| 속성 | 설명 |
|------|------|
| `gen_ai.request.model` | 요청 모델 |
| `gen_ai.response.model` | 응답 모델 |
| `gen_ai.usage.input_tokens` | 입력 토큰 |
| `gen_ai.usage.output_tokens` | 출력 토큰 |
| `gen_ai.input.messages` | 입력 메시지 (JSON) |
| `gen_ai.output.messages` | 출력 메시지 (JSON) |

> **주의**: 속성 키가 `gen_ai.*` 접두사 사용 — Claude Code의 `input_tokens`와 다름

## 6. 메트릭

### 주요 카운터

| 메트릭 | 단위 | 속성 |
|--------|------|------|
| `gemini_cli.session.count` | int | — |
| `gemini_cli.token.usage` | int | `model`, `type`(input/output/thought/cache/tool) |
| `gemini_cli.api.request.count` | int | `model`, `status_code`, `error_type` |
| `gemini_cli.tool.call.count` | int | `function_name`, `success`, `decision`, `tool_type` |
| `gemini_cli.file.operation.count` | int | `operation`, `extension`, `programming_language` |
| `gemini_cli.lines.changed` | int | `function_name`, `type`(added/removed) |

### 히스토그램

| 메트릭 | 단위 | 속성 |
|--------|------|------|
| `gemini_cli.tool.call.latency` | ms | `function_name` |
| `gemini_cli.api.request.latency` | ms | `model` |

### GenAI 시맨틱 메트릭

| 메트릭 | 단위 | 속성 |
|--------|------|------|
| `gen_ai.client.token.usage` | token (히스토그램) | `gen_ai.operation.name`, `gen_ai.token.type`, `gen_ai.request.model` |
| `gen_ai.client.operation.duration` | s (히스토그램) | `gen_ai.operation.name`, `gen_ai.request.model`, `error.type` |

## 7. Traces (Span)

Tracer name: `"gemini-cli"`, version: `"v1"`

### Span 속성

| 속성 | 값 | 설명 |
|------|-----|------|
| `gen_ai.operation.name` | string | 작업 유형 |
| `gen_ai.agent.name` | `"gemini-cli"` | 고정 |
| `gen_ai.conversation.id` | session ID | 세션 ID |
| `gen_ai.tool.name` | string | 도구 이름 |

### Operation 유형

| Operation | 설명 |
|-----------|------|
| `tool_call` | 도구 호출 |
| `llm_call` | LLM 호출 |
| `user_prompt` | 사용자 프롬프트 |
| `system_prompt` | 시스템 프롬프트 |
| `agent_call` | 에이전트 호출 |
| `schedule_tool_calls` | 도구 호출 스케줄링 |

## 8. OTLP JSON 페이로드 예시

### api_response

```json
{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "gemini-cli"}},
          {"key": "session.id", "value": {"stringValue": "session-xyz"}}
        ]
      },
      "scopeLogs": [
        {
          "logRecords": [
            {
              "timeUnixNano": "1710000000000000000",
              "severityText": "INFO",
              "body": {"stringValue": "API response from gemini-2.5-pro. Status: 200. Duration: 1800ms."},
              "attributes": [
                {"key": "event.name", "value": {"stringValue": "gemini_cli.api_response"}},
                {"key": "session.id", "value": {"stringValue": "session-xyz"}},
                {"key": "installation.id", "value": {"stringValue": "install-abc"}},
                {"key": "model", "value": {"stringValue": "gemini-2.5-pro"}},
                {"key": "duration_ms", "value": {"intValue": "1800"}},
                {"key": "input_token_count", "value": {"intValue": "1000"}},
                {"key": "output_token_count", "value": {"intValue": "300"}},
                {"key": "cached_content_token_count", "value": {"intValue": "500"}},
                {"key": "thoughts_token_count", "value": {"intValue": "0"}},
                {"key": "tool_token_count", "value": {"intValue": "0"}},
                {"key": "total_token_count", "value": {"intValue": "1800"}},
                {"key": "prompt_id", "value": {"stringValue": "prompt-123"}},
                {"key": "status_code", "value": {"intValue": "200"}},
                {"key": "auth_type", "value": {"stringValue": "api_key"}}
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### tool_call

```json
{
  "attributes": [
    {"key": "event.name", "value": {"stringValue": "gemini_cli.tool_call"}},
    {"key": "session.id", "value": {"stringValue": "session-xyz"}},
    {"key": "function_name", "value": {"stringValue": "read_file"}},
    {"key": "function_args", "value": {"stringValue": "{\"path\":\"/src/main.ts\"}"}},
    {"key": "duration_ms", "value": {"intValue": "50"}},
    {"key": "success", "value": {"boolValue": true}},
    {"key": "decision", "value": {"stringValue": "auto_accept"}},
    {"key": "prompt_id", "value": {"stringValue": "prompt-123"}},
    {"key": "tool_type", "value": {"stringValue": "native"}},
    {"key": "content_length", "value": {"intValue": "2048"}}
  ]
}
```

## 9. 주의사항

- **비용 정보 없음**: `cost_usd` 속성 없음 — `pricing_model` 테이블로 계산 필요
- **세션 ID**: `session.id` (Claude Code와 동일 키)
- **토큰 키 차이**: `input_token_count`/`output_token_count` (Claude Code는 `input_tokens`/`output_tokens`)
- **캐시 토큰 키**: `cached_content_token_count` (Claude Code는 `cache_read_tokens`)
- **추가 토큰**: `thoughts_token_count`, `tool_token_count` (Claude Code에 없음)
- **도구 이벤트명**: `gemini_cli.tool_call` (Claude Code는 `claude_code.tool_result`)
- **도구 이름 키**: `function_name` (Claude Code는 `tool_name`)
- **MCP 감지**: `tool_type = "mcp"` 또는 도구 이름이 `mcp`로 시작
- **GenAI 시맨틱**: `gen_ai.*` 접두사 이벤트가 동시 발생 — 중복 수집 주의
- **HTTP 경로 버그**: v0.34.0 이전 버전은 HTTP 모드에서 경로가 잘못됨
