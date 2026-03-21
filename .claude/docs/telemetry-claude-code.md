# Claude Code OTel 텔레메트리 스펙

> 출처: [공식 모니터링 문서](https://code.claude.com/docs/en/monitoring-usage), [설정 문서](https://code.claude.com/docs/en/settings), [ROI 가이드](https://github.com/anthropics/claude-code-monitoring-guide)

## 1. 텔레메트리 활성화

```bash
# 필수
export CLAUDE_CODE_ENABLE_TELEMETRY=1

# 로그(이벤트) 내보내기
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9845

# 메트릭 내보내기 (선택)
export OTEL_METRICS_EXPORTER=otlp
```

### 프라이버시 제어

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `OTEL_LOG_USER_PROMPTS` | 비활성 | `1`로 설정 시 프롬프트 내용 포함 |
| `OTEL_LOG_TOOL_DETAILS` | 비활성 | `1`로 설정 시 MCP 서버/도구 이름, 스킬 이름 포함 |

### 메트릭 카디널리티 제어

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `OTEL_METRICS_INCLUDE_SESSION_ID` | `true` | 메트릭에 session.id 포함 |
| `OTEL_METRICS_INCLUDE_VERSION` | `false` | 메트릭에 app.version 포함 |
| `OTEL_METRICS_INCLUDE_ACCOUNT_UUID` | `true` | 메트릭에 user.account_uuid 포함 |

### 내보내기 주기

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `OTEL_METRIC_EXPORT_INTERVAL` | 60000ms | 메트릭 내보내기 간격 |
| `OTEL_LOGS_EXPORT_INTERVAL` | 5000ms | 로그 내보내기 간격 |

### settings.json 설정 (대안)

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:9845"
  }
}
```

## 2. 프로토콜

| 프로토콜 | 포트 (관례) | 설명 |
|----------|-------------|------|
| `grpc` | 4317 | gRPC OTLP (바이너리 protobuf) |
| `http/json` | 4318 | HTTP OTLP (JSON 인코딩) |
| `http/protobuf` | 4318 | HTTP OTLP (protobuf 인코딩) |

HTTP 경로:
- 로그: `POST /v1/logs`
- 메트릭: `POST /v1/metrics`

시그널별 프로토콜/엔드포인트 개별 오버라이드 가능:
- `OTEL_EXPORTER_OTLP_LOGS_PROTOCOL`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`
- `OTEL_EXPORTER_OTLP_METRICS_PROTOCOL`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`

Temporality 기본값: `delta` (`OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE`)

## 3. Resource Attributes

| 속성 | 값 | 설명 |
|------|-----|------|
| `service.name` | `claude-code` | 고정 |
| `service.version` | 예: `1.0.17` | 현재 Claude Code 버전 |
| `os.type` | `linux`, `darwin`, `windows` | OS 유형 |
| `os.version` | OS 버전 문자열 | |
| `host.arch` | `amd64`, `arm64` | 호스트 아키텍처 |
| `wsl.version` | WSL 버전 | WSL 환경에서만 |

Meter 이름: `com.anthropic.claude_code`

## 4. Standard Attributes (모든 이벤트/메트릭 공통)

| 속성 | 타입 | 설명 |
|------|------|------|
| `session.id` | string (UUID) | 고유 세션 식별자 |
| `app.version` | string | Claude Code 버전 |
| `organization.id` | string (UUID) | 조직 UUID |
| `user.account_uuid` | string (UUID) | 계정 UUID |
| `user.id` | string | 익명 디바이스/설치 식별자 |
| `user.email` | string | 사용자 이메일 (OAuth 인증 시) |
| `terminal.type` | string | 터미널 유형 (`iTerm.app`, `vscode`, `cursor`, `tmux`) |

## 5. 이벤트 (로그) — 5종

`OTEL_LOGS_EXPORTER`로 내보내기. `POST /v1/logs`로 전송.

### 이벤트 상관관계

| 속성 | 타입 | 설명 |
|------|------|------|
| `prompt.id` | string (UUID v4) | 프롬프트 상관관계 ID (메트릭에는 미포함) |
| `event.sequence` | number | 세션 내 이벤트 순서 (단조 증가) |

### 5.1 `claude_code.user_prompt`

사용자 프롬프트 제출 시 발생.

| 속성 | 타입 | 설명 |
|------|------|------|
| `event.name` | string | `"user_prompt"` |
| `event.timestamp` | string | ISO 8601 |
| `event.sequence` | number | 세션 내 순서 |
| `prompt_length` | number | 프롬프트 길이 |
| `prompt` | string | 프롬프트 내용 (`OTEL_LOG_USER_PROMPTS=1` 필요) |

### 5.2 `claude_code.api_request`

API 요청 완료 시 발생.

| 속성 | 타입 | 설명 |
|------|------|------|
| `event.name` | string | `"api_request"` |
| `event.timestamp` | string | ISO 8601 |
| `event.sequence` | number | 세션 내 순서 |
| `model` | string | 사용 모델 (예: `claude-sonnet-4-6`) |
| `cost_usd` | number | 예상 비용 (USD) |
| `duration_ms` | number | 요청 소요 시간 (ms) |
| `input_tokens` | number | 입력 토큰 수 |
| `output_tokens` | number | 출력 토큰 수 |
| `cache_read_tokens` | number | 캐시 읽기 토큰 수 |
| `cache_creation_tokens` | number | 캐시 생성 토큰 수 |
| `speed` | string | `"fast"` 또는 `"normal"` |

### 5.3 `claude_code.tool_result`

도구 실행 완료 시 발생.

| 속성 | 타입 | 설명 |
|------|------|------|
| `event.name` | string | `"tool_result"` |
| `event.timestamp` | string | ISO 8601 |
| `event.sequence` | number | 세션 내 순서 |
| `tool_name` | string | 도구 이름 (`Read`, `Edit`, `Bash`, `Write` 등) |
| `success` | string | `"true"` 또는 `"false"` |
| `duration_ms` | number | 실행 시간 (ms) |
| `error` | string | 에러 메시지 (실패 시) |
| `decision_type` | string | `"accept"` 또는 `"reject"` |
| `decision_source` | string | `"config"`, `"hook"`, `"user_permanent"`, `"user_temporary"`, `"user_abort"`, `"user_reject"` |
| `tool_result_size_bytes` | number | 도구 결과 크기 (bytes) |
| `mcp_server_scope` | string | MCP 서버 스코프 (MCP 도구) |
| `tool_parameters` | string (JSON) | 도구별 파라미터 (아래 상세) |

#### tool_parameters 상세

**Bash 도구**:
| 키 | 설명 |
|----|------|
| `bash_command` | 실행된 bash 명령어 |
| `full_command` | 전체 명령어 |
| `timeout` | 타임아웃 값 |
| `description` | 명령어 설명 |
| `dangerouslyDisableSandbox` | 샌드박스 비활성화 여부 |
| `git_commit_id` | `git commit` 성공 시 커밋 SHA |

**MCP 도구** (`OTEL_LOG_TOOL_DETAILS=1` 필요):
| 키 | 설명 |
|----|------|
| `mcp_server_name` | MCP 서버 이름 |
| `mcp_tool_name` | MCP 도구 이름 |

**Skill 도구** (`OTEL_LOG_TOOL_DETAILS=1` 필요):
| 키 | 설명 |
|----|------|
| `skill_name` | 스킬 이름 |

### 5.4 `claude_code.api_error`

API 요청 실패 시 발생.

| 속성 | 타입 | 설명 |
|------|------|------|
| `event.name` | string | `"api_error"` |
| `event.timestamp` | string | ISO 8601 |
| `event.sequence` | number | 세션 내 순서 |
| `model` | string | 사용 모델 |
| `error` | string | 에러 메시지 |
| `status_code` | string | HTTP 상태 코드 또는 `"undefined"` |
| `duration_ms` | number | 요청 소요 시간 (ms) |
| `attempt` | number | 시도 횟수 (재시도) |
| `speed` | string | `"fast"` 또는 `"normal"` |

### 5.5 `claude_code.tool_decision`

도구 권한 결정 시 발생.

| 속성 | 타입 | 설명 |
|------|------|------|
| `event.name` | string | `"tool_decision"` |
| `event.timestamp` | string | ISO 8601 |
| `event.sequence` | number | 세션 내 순서 |
| `tool_name` | string | 도구 이름 |
| `decision` | string | `"accept"` 또는 `"reject"` |
| `source` | string | `"config"`, `"hook"`, `"user_permanent"`, `"user_temporary"`, `"user_abort"`, `"user_reject"` |

## 6. 메트릭 — 8종

`OTEL_METRICS_EXPORTER`로 내보내기. 모두 COUNTER 타입.

| 메트릭 | 단위 | 추가 속성 |
|--------|------|-----------|
| `claude_code.session.count` | count | — |
| `claude_code.lines_of_code.count` | count | `type`(added/removed) |
| `claude_code.pull_request.count` | count | — |
| `claude_code.commit.count` | count | — |
| `claude_code.cost.usage` | USD | `model` |
| `claude_code.token.usage` | tokens | `type`(input/output/cacheRead/cacheCreation), `model` |
| `claude_code.code_edit_tool.decision` | count | `tool_name`, `decision`, `source`, `language` |
| `claude_code.active_time.total` | seconds | `type`(user/cli) |

## 7. OTLP JSON 페이로드 구조

### 로그/이벤트 (POST /v1/logs)

```json
{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "claude-code"}},
          {"key": "service.version", "value": {"stringValue": "1.0.17"}},
          {"key": "os.type", "value": {"stringValue": "darwin"}},
          {"key": "os.version", "value": {"stringValue": "24.6.0"}},
          {"key": "host.arch", "value": {"stringValue": "arm64"}}
        ]
      },
      "scopeLogs": [
        {
          "scope": {"name": "com.anthropic.claude_code"},
          "logRecords": [
            {
              "timeUnixNano": "1710000000000000000",
              "observedTimeUnixNano": "1710000000000000000",
              "severityText": "INFO",
              "severityNumber": 9,
              "body": {"stringValue": ""},
              "attributes": [
                {"key": "event.name", "value": {"stringValue": "claude_code.api_request"}},
                {"key": "event.timestamp", "value": {"stringValue": "2026-03-13T10:00:00.000Z"}},
                {"key": "event.sequence", "value": {"intValue": "1"}},
                {"key": "session.id", "value": {"stringValue": "abc-123-def"}},
                {"key": "prompt.id", "value": {"stringValue": "prompt-uuid-v4"}},
                {"key": "model", "value": {"stringValue": "claude-sonnet-4-6"}},
                {"key": "cost_usd", "value": {"doubleValue": 0.0234}},
                {"key": "duration_ms", "value": {"intValue": "1523"}},
                {"key": "input_tokens", "value": {"intValue": "1500"}},
                {"key": "output_tokens", "value": {"intValue": "350"}},
                {"key": "cache_read_tokens", "value": {"intValue": "800"}},
                {"key": "cache_creation_tokens", "value": {"intValue": "0"}},
                {"key": "speed", "value": {"stringValue": "normal"}}
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### AnyValue 타입

| 필드 | JSON 타입 | 설명 |
|------|-----------|------|
| `stringValue` | string | 문자열 |
| `intValue` | string/number | 정수 (문자열로 인코딩될 수 있음) |
| `doubleValue` | number | 부동소수점 |
| `boolValue` | boolean | 불리언 |
