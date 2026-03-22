---
title: "설정 가이드"
description: "AI 코딩 에이전트의 텔레메트리를 Argus로 전송하도록 설정"
---

Argus는 AI 코딩 에이전트에서 OpenTelemetry (OTLP) 텔레메트리를 수집하고 로컬 대시보드에서 사용량을 시각화합니다. 이 가이드는 설치와 에이전트별 설정을 다룹니다.

## 목차

- [사전 요구사항](#사전-요구사항)
- [설치](#설치)
- [Claude Code 설정](#claude-code-설정)
- [Codex CLI 설정](#codex-cli-설정)
- [Gemini CLI 설정](#gemini-cli-설정)
- [검증](#검증)
- [문제 해결](#문제-해결)

---

## 사전 요구사항

- 지원되는 AI 코딩 에이전트 중 최소 하나:
  - [Claude Code](https://code.claude.com)
  - [Codex CLI](https://github.com/openai/codex)
  - [Gemini CLI](https://github.com/google-gemini/gemini-cli)

---

## 설치

### 데스크톱 앱 (권장)

[Releases](https://github.com/79841/argus/releases)에서 최신 설치 파일을 다운로드하세요:

| 플랫폼 | 파일 | 설명 |
|--------|------|------|
| **macOS** (Apple Silicon) | `Argus-x.x.x-arm64.dmg` | DMG 열기 -> Argus를 Applications로 드래그 -> 실행 |
| **Windows** | `Argus Setup x.x.x.exe` | 설치 프로그램 실행 -> 시작 메뉴에서 실행 |

실행 후 Argus는 **트레이 상주 앱**으로 동작하며 자동으로 `http://localhost:9845`에서 OTLP 수신기를 시작합니다. SQLite 데이터베이스는 자동 생성되므로 수동 설정이 필요 없습니다.

### 소스에서 빌드 (기여자용)

**Node.js 20+**와 **pnpm**이 필요합니다.

```bash
git clone https://github.com/79841/argus.git
cd argus/dashboard
pnpm install
pnpm dev              # 웹 모드: http://localhost:9845
pnpm electron:dev     # Electron 데스크톱 모드
```

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `ARGUS_DB_PATH` | `../argus.db` | SQLite 데이터베이스 파일 경로 |

### OTLP 수신 엔드포인트

Argus는 텔레메트리 수집을 위해 두 개의 엔드포인트를 노출합니다:

| 엔드포인트 | 설명 |
|------------|------|
| `POST /v1/logs` | OTLP 표준 경로 (JSON과 Protobuf 수신) |
| `POST /api/ingest` | 내부 처리 라우트 |

에이전트는 `/v1/logs`로 데이터를 전송하며, 형식 변환 후 `/api/ingest`로 프록시됩니다.

---

## Claude Code 설정

### 1단계: 환경 변수 설정

셸 프로필(`~/.zshrc`, `~/.bashrc` 등)에 다음을 추가합니다:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9845
```

셸을 다시 로드하거나 `source ~/.zshrc`를 실행합니다.

또는 `~/.claude/settings.json`에 설정할 수 있습니다:

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:9845"
  }
}
```

### 2단계: 프로젝트 이름 설정 (선택)

텔레메트리에 프로젝트 이름을 태깅하려면 프로젝트의 `.claude/settings.json`에 `OTEL_RESOURCE_ATTRIBUTES`를 추가합니다:

```json
{
  "env": {
    "OTEL_RESOURCE_ATTRIBUTES": "project.name=my-project"
  }
}
```

대시보드에서 프로젝트별 필터링이 가능해집니다.

### 3단계: 도구 상세 추적 활성화 (선택)

MCP 서버/도구 이름, 스킬 이름, 서브 에이전트 상세를 추적하려면:

```json
{
  "env": {
    "OTEL_LOG_TOOL_DETAILS": "1"
  }
}
```

> **참고**: 활성화하면 MCP 서버 이름, MCP 도구 이름, 스킬 이름, 서브 에이전트 설명이 텔레메트리에 포함됩니다. 비활성화 시 빌트인 도구 이름(Read, Edit, Bash 등)만 기록됩니다.

### 4단계: 검증

1. Argus 대시보드가 포트 3000에서 실행 중인지 확인합니다.
2. 프로젝트에서 Claude Code를 시작합니다.
3. 프롬프트를 보내고 응답을 기다립니다.
4. Argus 대시보드를 확인합니다 -- 몇 초 내에 새 세션 데이터가 표시됩니다.

### Claude Code 이벤트 유형

| 이벤트 | 설명 |
|--------|------|
| `api_request` | 모델, 토큰, 비용, 소요 시간이 포함된 API 요청 |
| `user_prompt` | 사용자 프롬프트 제출 |
| `tool_result` | 도구 실행 결과 |
| `tool_decision` | 도구 승인/거부 |
| `api_error` | API 오류 |

---

## Codex CLI 설정

### 1단계: OTLP 내보내기 설정

`~/.codex/config.toml`을 편집하고 `[otel]` 섹션을 추가합니다:

```toml
[otel]
exporter = { otlp-http = { endpoint = "http://localhost:9845/v1/logs", protocol = "json" } }
```

### 2단계: 프롬프트 로깅 활성화 (선택)

텔레메트리에 사용자 프롬프트 내용을 포함하려면:

```toml
[otel]
exporter = { otlp-http = { endpoint = "http://localhost:9845/v1/logs", protocol = "json" } }
log_user_prompt = true
```

### 3단계: 검증

1. Argus 대시보드가 포트 3000에서 실행 중인지 확인합니다.
2. Codex CLI를 시작합니다: `codex`
3. 프롬프트를 보내고 응답을 기다립니다.
4. Argus 대시보드에서 새 세션 데이터를 확인합니다.

### Codex CLI 이벤트 유형

| 이벤트 | 설명 |
|--------|------|
| `api_request` | API 요청 (`codex.sse_event`에서 정규화) |
| `session_start` | 세션 시작 (`codex.conversation_starts`에서) |
| `user_prompt` | 사용자 프롬프트 |
| `tool_result` | 도구 실행 결과 |
| `tool_decision` | 도구 승인/거부 |
| `api_error` | API 오류 |

> **참고**: Codex CLI는 `cost_usd`를 전송하지 않습니다. Argus가 내장 가격 모델 테이블을 사용하여 비용을 계산합니다.

---

## Gemini CLI 설정

### 1단계: 텔레메트리 설정

**옵션 A: settings.json**

`~/.gemini/settings.json`을 편집합니다:

```json
{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpEndpoint": "http://localhost:9845",
    "otlpProtocol": "http"
  }
}
```

**옵션 B: 환경 변수**

```bash
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:9845
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http
```

### 2단계: 프로젝트 이름 설정 (선택)

`direnv`를 사용하거나 환경 변수를 직접 설정합니다:

```bash
echo 'export OTEL_RESOURCE_ATTRIBUTES="project.name=my-project"' > .envrc
direnv allow
```

또는 Gemini CLI 실행 전에 직접 설정합니다:

```bash
export OTEL_RESOURCE_ATTRIBUTES="project.name=my-project"
```

### 3단계: 검증

1. Argus 대시보드가 포트 3000에서 실행 중인지 확인합니다.
2. Gemini CLI를 시작합니다: `gemini`
3. 프롬프트를 보내고 응답을 기다립니다.
4. Argus 대시보드에서 새 세션 데이터를 확인합니다.

### Gemini CLI 이벤트 유형

| 이벤트 | 설명 |
|--------|------|
| `api_request` | API 응답 (`gemini_cli.api_response`에서 정규화) |
| `session_start` | 세션 설정 (`gemini_cli.config`에서) |
| `user_prompt` | 사용자 프롬프트 |
| `tool_result` | 도구 호출 결과 (`gemini_cli.tool_call`에서) |
| `api_error` | API 오류 |

> **참고**: Gemini CLI는 `cost_usd`를 전송하지 않습니다. Argus가 내장 가격 모델 테이블을 사용하여 비용을 계산합니다.

---

## 검증

### 헬스 체크

```bash
curl http://localhost:9845/api/health
```

예상 응답:

```json
{ "status": "ok", "timestamp": "2026-03-17T12:00:00.000Z" }
```

### 테스트 데이터 시드

테스트용 샘플 데이터로 대시보드를 채우려면:

```bash
curl -X POST http://localhost:9845/api/seed
```

세 에이전트(Claude Code, Codex CLI, Gemini CLI)의 샘플 세션이 삽입됩니다.

### 수동 OTLP 테스트

수집이 작동하는지 확인하기 위해 최소한의 OTLP 로그 레코드를 전송합니다:

```bash
curl -X POST http://localhost:9845/v1/logs \
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

예상 응답:

```json
{ "accepted": 1 }
```

---

## 문제 해결

### 대시보드에 데이터가 표시되지 않음

1. **대시보드 실행 확인**: `curl http://localhost:9845/api/health`
2. **포트 확인**: 모든 에이전트가 Argus가 실행 중인 동일한 포트를 가리켜야 합니다 (기본값: 3000).
3. **프로토콜 확인**: Claude Code는 `http/json` 필요. Codex CLI는 `protocol = "json"` 필요. Gemini CLI는 `otlpProtocol: "http"` 필요.
4. **환경 변수 로드 확인**: `env | grep OTEL` 또는 `env | grep CLAUDE_CODE`를 실행하여 확인합니다.

### Claude Code 텔레메트리가 전송되지 않음

- `CLAUDE_CODE_ENABLE_TELEMETRY=1`이 설정되어 있는지 확인합니다. 이 값 없이는 모든 텔레메트리가 비활성화됩니다.
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`이 `1`로 설정되어 있지 않은지 확인합니다. 텔레메트리가 비활성화됩니다.
- `settings.json`을 사용하는 경우 변수가 `"env"` 키 아래에 있는지 확인합니다.

### Codex CLI 텔레메트리가 전송되지 않음

- `~/.codex/config.toml`이 존재하고 `[otel]` 섹션이 있는지 확인합니다.
- 엔드포인트에 전체 경로가 포함되어야 합니다: `http://localhost:9845/v1/logs`.

### Gemini CLI 텔레메트리가 전송되지 않음

- `~/.gemini/settings.json`의 텔레메트리 섹션에 `"enabled": true`가 있는지 확인합니다.
- `"target": "local"`을 설정합니다 (`"gcp"` 아님).
- `"otlpProtocol": "http"`를 설정합니다 (기본값인 `"grpc"` 아님).

### 데이터베이스 문제

- SQLite 데이터베이스는 `dashboard/` 디렉토리 기준 `../argus.db`에 자동 생성됩니다.
- 사용자 지정 경로를 사용하려면 `ARGUS_DB_PATH=/path/to/argus.db`를 설정합니다.
- 데이터베이스가 손상되면 `.db`, `.db-shm`, `.db-wal` 파일을 삭제하고 대시보드를 재시작합니다. 새 데이터베이스가 자동 생성됩니다.

### 포트 충돌

포트 3000이 이미 사용 중인 경우:

```bash
# 다른 포트에서 시작
PORT=3001 pnpm dev
```

그런 다음 모든 에이전트 설정을 새 포트로 업데이트합니다.
