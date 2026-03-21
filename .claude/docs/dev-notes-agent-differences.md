# 에이전트별 텔레메트리 차이점 — 개발 특이사항

## 1. prompt_id 처리

### Claude Code / Gemini CLI
- 텔레메트리에 `prompt_id` (또는 `prompt.id`) 속성이 네이티브로 포함됨
- 하나의 사용자 프롬프트에서 발생한 모든 이벤트가 같은 `prompt_id`로 연결됨
- Argus는 이 값을 그대로 저장하여 이벤트 타임라인에서 그룹핑에 사용

### Codex CLI
- **`prompt_id` 개념이 없음** — 텔레메트리에 프롬프트 상관관계 ID가 존재하지 않음
- 세션 ID (`conversation.id`)만 제공됨
- **Argus가 합성 prompt_id를 생성**하여 해결:
  - ingest 시점에 Codex 세션의 이벤트를 시간순으로 조회
  - `user_prompt` 이벤트를 만날 때마다 새 UUID를 할당
  - 다음 `user_prompt`가 나올 때까지 같은 UUID를 부여
  - `session_start` 이벤트는 그룹에서 제외
  - `user_prompt` 이전의 이벤트(예: 초기 api_request)도 별도 그룹으로 할당
- 구현 위치: `dashboard/src/app/api/ingest/route.ts` — Codex 세션 백필 로직

## 2. 프롬프트 텍스트 수집

### Claude Code
- 기본적으로 프롬프트 내용이 `<REDACTED>`로 전송됨
- `OTEL_LOG_USER_PROMPTS=1` 환경변수 설정 시 실제 프롬프트 텍스트 포함
- Argus의 에이전트 연결 기능이 이 변수를 자동으로 설정함 (`dashboard/src/lib/setup.ts`)

### Codex CLI
- `log_user_prompt = true` 설정 시 프롬프트 텍스트 포함 (config.toml)
- 미설정 시 `[REDACTED]`로 전송

### Gemini CLI
- 별도 프라이버시 설정 없이 프롬프트 텍스트 포함

## 3. 토큰 속성명 차이

| 항목 | Claude Code | Codex CLI | Gemini CLI |
|------|------------|-----------|------------|
| 입력 토큰 | `input_tokens` | `input_token_count` | `input_tokens` |
| 출력 토큰 | `output_tokens` | `output_token_count` | `output_tokens` |
| 캐시 토큰 | `cache_read_tokens` | `cached_token_count` | `cache_read_tokens` |
| 세션 ID | `session.id` | `conversation.id` | `session.id` |
| 비용 | `cost_usd` (네이티브) | 없음 (pricing_model로 계산) | 없음 (pricing_model로 계산) |

이 차이는 `dashboard/src/lib/ingest-utils.ts`의 `getTokenAttr`, `getSessionId` 등에서 양쪽 속성명을 모두 시도하여 처리한다.

## 4. 이벤트 이름 정규화

각 에이전트는 이벤트 이름에 고유 접두사를 사용한다:
- Claude: `claude_code.api_request` → `api_request`
- Codex: `codex.sse_event` (kind=response.completed) → `api_request`
- Gemini: `gemini.api_request` → `api_request`

정규화 로직: `dashboard/src/lib/ingest-utils.ts`의 `normalizeEventName`
