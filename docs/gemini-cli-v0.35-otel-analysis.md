# Gemini CLI v0.35 OTel 변경사항 분석

> 분석일: 2026-03-26 | 대상: v0.34.0 → v0.35.1 | 소스: gemini-cli 소스코드 + 공식문서

## 1. 요약

v0.35에서 OTel **프로토콜 자체의 변경은 없지만**, 텔레메트리 계측(instrumentation)이 6건 추가/수정되었다. 또한 v0.34에서 수정된 **OTLP HTTP 경로 버그 수정**이 v0.35에 포함되어 있어, Argus와의 연동 안정성이 크게 개선되었다.

### 변경사항 한눈에 보기

| # | PR | 유형 | 변경사항 | Argus 영향 |
|---|-----|------|---------|-----------|
| 1 | #22027 | **신규 이벤트+메트릭** | 네트워크 재시도 텔레메트리 | 중 — 새 이벤트 수신 가능 |
| 2 | #22054 | **속성 추가** | 대화 개시 방법(`initiationMethod`) | 없음 (code_assist 내부) |
| 3 | #22153 | **신규 이벤트** | AI 크레딧 과금 이벤트 (Clearcut) | 낮음 — Clearcut 전용 |
| 4 | #22214 | **속성 추가** | `trajectoryId` (ConversationOffered) | 없음 (code_assist 내부) |
| 5 | #22201 | **버그 수정** | `startup_stats` 타임스탬프/duration int 타입 수정 | 낮음 |
| 6 | #23118 | **신규 이벤트+메트릭** | 온보딩 텔레메트리 | 중 — 새 이벤트 수신 가능 |
| 7 | #22082 | **기능 추가** | JIT 컨텍스트 디스커버리 (파일 도구 계측) | 없음 (텔레메트리 아님) |

---

## 2. 상세 분석

### 2.1 네트워크 재시도 텔레메트리 (PR #22027)

**새 로그 이벤트**: `gemini_cli.network_retry_attempt`

네트워크 오류 시 재시도 시도를 추적한다. `baseLlmClient`, `geminiChat`, `web-fetch` 도구에 계측이 적용되었다.

#### 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| `attempt` | number | 현재 재시도 횟수 |
| `max_attempts` | number | 최대 재시도 횟수 |
| `error_type` | string | 오류 유형 (`QUOTA_EXCEEDED`, `FETCH_FAILED`, `INCOMPLETE_JSON`, `ECONNRESET` 등) |
| `delay_ms` | number | 재시도 전 대기 시간 (ms) |
| `model` | string | 모델 ID |

#### 새 메트릭

- **`gemini_cli.network_retry.count`** (Counter, INT)
  - 속성: `model`, `attempt`

#### 소스 위치

- `packages/core/src/telemetry/types.ts` — `NetworkRetryAttemptEvent` 클래스
- `packages/core/src/telemetry/loggers.ts` — `logNetworkRetryAttempt()` 함수
- `packages/core/src/telemetry/metrics.ts` — `recordRetryAttemptMetrics()` 함수
- 계측 적용: `baseLlmClient.ts`, `geminiChat.ts`, `web-fetch.ts`

---

### 2.2 대화 개시 방법 추적 (PR #22054)

**속성 추가**: `initiationMethod` (ConversationInteraction 텔레메트리)

대화가 어떤 방식으로 시작되었는지 구분한다. 값: `InitiationMethod.COMMAND` 등.

#### Argus 영향

없음. 이 속성은 `code_assist` (Gemini Code Assist IDE 확장) 내부 텔레메트리로, OTLP 로그에는 포함되지 않는다.

#### 소스 위치

- `packages/core/src/code_assist/telemetry.ts`
- `packages/core/src/code_assist/types.ts`

---

### 2.3 AI 크레딧 과금 텔레메트리 (PR #22153)

Clearcut 로깅 시스템에 AI 크레딧 관련 이벤트 4종이 추가되었다.

#### 새 Clearcut 이벤트

| 이벤트 | 설명 |
|--------|------|
| `credits_used` | 크레딧 소비 (model, credits_consumed, credits_remaining) |
| `overage_option_selected` | 초과 사용 옵션 선택 (use_credits, use_fallback, manage, stop, get_credits) |
| `empty_wallet_menu_shown` | 빈 지갑 메뉴 표시 |
| `credit_purchase_click` | 크레딧 구매 클릭 (source: overage_menu, empty_wallet_menu, manage) |

#### OTLP 로그 이벤트 (billingEvents.ts)

이 이벤트들은 `logBillingEvent()`를 통해 OTLP 로그로도 전송된다:

| 이벤트 | event.name | 주요 속성 |
|--------|-----------|-----------|
| `OverageMenuShownEvent` | `gemini_cli.overage_menu_shown` | model, credit_balance, overage_strategy |
| `OverageOptionSelectedEvent` | `gemini_cli.overage_option_selected` | model, selected_option, credit_balance |
| `EmptyWalletMenuShownEvent` | `gemini_cli.empty_wallet_menu_shown` | model |
| `CreditPurchaseClickEvent` | `gemini_cli.credit_purchase_click` | model, source |
| `CreditsUsedEvent` | `gemini_cli.credits_used` | model, credits_consumed, credits_remaining |

#### 새 메트릭

- **`gemini_cli.overage_option.count`** (Counter, INT)
- **`gemini_cli.credit_purchase.count`** (Counter, INT)

#### Argus 영향

현재 Argus의 `normalizeEventName()`에서 이 이벤트들은 매칭되지 않아 이벤트 이름 그대로 저장된다. 스킵 대상에 추가할지 결정 필요.

#### 소스 위치

- `packages/core/src/telemetry/billingEvents.ts` — 이벤트 클래스 정의
- `packages/core/src/telemetry/clearcut-logger/clearcut-logger.ts` — Clearcut 로깅
- `packages/core/src/telemetry/loggers.ts` — `logBillingEvent()` OTLP 전송

---

### 2.4 trajectoryId 추가 (PR #22214)

**속성 추가**: `trajectoryId` (ConversationOffered 텔레메트리)

#### Argus 영향

없음. code_assist 내부 텔레메트리.

#### 소스 위치

- `packages/core/src/code_assist/telemetry.ts`
- `packages/core/src/code_assist/types.ts`

---

### 2.5 startup_stats 타입 수정 (PR #22201)

`gemini_cli.startup_stats` 이벤트의 타임스탬프/duration 값을 int 타입으로 수정. 기존에는 float 값이 전송될 수 있었다.

#### Argus 영향

낮음. 이 이벤트는 현재 Argus에서 스킵하지 않고 이름 그대로 저장하고 있으므로, 데이터 정확성이 개선된다.

#### 소스 위치

- `packages/core/src/telemetry/startupProfiler.ts`

---

### 2.6 온보딩 텔레메트리 (PR #23118)

**새 로그 이벤트 2종 + 새 메트릭 2종**

인증 온보딩 플로우의 시작과 완료를 추적한다.

#### 새 로그 이벤트

| 이벤트 | 설명 | 속성 |
|--------|------|------|
| `gemini_cli.onboarding.start` | 인증 플로우 시작 | (공통 속성만) |
| `gemini_cli.onboarding.success` | 온보딩 완료 | `user_tier` (string) |

#### 새 메트릭

| 메트릭 | 타입 | 설명 |
|--------|------|------|
| `gemini_cli.onboarding.start` | Counter, INT | 온보딩 시작 횟수 |
| `gemini_cli.onboarding.success` | Counter, INT | 온보딩 성공 횟수 (속성: `user_tier`) |

#### Argus 영향

현재 Argus의 `normalizeEventName()`에서 이 이벤트들은 매칭되지 않아 이름 그대로 저장된다. 스킵 대상에 추가할지 결정 필요.

#### 소스 위치

- `packages/core/src/telemetry/types.ts` — `OnboardingStartEvent`, `OnboardingSuccessEvent`
- `packages/core/src/telemetry/loggers.ts` — `logOnboardingStart()`, `logOnboardingSuccess()`
- `packages/core/src/telemetry/metrics.ts` — `recordOnboardingStart()`, `recordOnboardingSuccess()`
- `docs/cli/telemetry.md` — 공식 문서 업데이트

---

### 2.7 JIT 컨텍스트 디스커버리 (PR #22082)

파일 시스템 도구(read_file, list_directory, write_file, replace, read_many_files)에서 GEMINI.md 컨텍스트 파일을 동적으로 로드하는 기능. 텔레메트리 변경은 아니지만 도구 호출 시 부가적인 컨텍스트가 추가될 수 있다.

#### Argus 영향

없음. 텔레메트리 이벤트/속성 변경 없음.

---

## 3. v0.34에서 수정된 OTLP HTTP 경로 버그 (v0.35에 포함)

### 문제 (Issue #15581)

HTTP 모드에서 모든 텔레메트리가 `/` 루트 경로로 전송되어 OTLP 컬렉터에서 404 에러가 발생했다.

### 원인

`sdk.ts`에서 HTTP exporter에 `url` 파라미터를 명시적으로 설정하면, OTel SDK가 시그널별 경로(`/v1/logs`, `/v1/traces`, `/v1/metrics`)를 추가하지 않았다.

### 수정

exporter 구성 시 시그널별 경로를 직접 추가:
- `${parsedEndpoint}v1/traces`
- `${parsedEndpoint}v1/logs`
- `${parsedEndpoint}v1/metrics`

### Argus 영향

**높음**. v0.35부터 HTTP 모드로 Argus의 `/v1/logs` 엔드포인트에 정상 전송된다. 이전 버전에서는 HTTP 모드 사용 시 수신이 안 될 수 있었다.

---

## 4. v0.35 전체 이벤트 목록 (OTLP 로그)

### Argus가 수신·처리하는 이벤트

| 이벤트 | Argus 정규화 | 용도 |
|--------|-------------|------|
| `gemini_cli.api_response` | `api_request` | API 응답 (토큰, 비용, 모델) |
| `gemini_cli.api_error` | `api_error` | API 오류 |
| `gemini_cli.config` | `session_start` | 세션 시작 |
| `gemini_cli.user_prompt` | `user_prompt` | 사용자 프롬프트 |
| `gemini_cli.tool_call` | `tool_result` | 도구 실행 결과 |
| `gemini_cli.file_operation` | `file_operation` | 파일 작업 |

### Argus가 스킵하는 이벤트

| 이벤트 | 스킵 이유 |
|--------|----------|
| `gemini_cli.api_request` | 요청 시점 (응답에서 처리) |
| `gemini_cli.tool_output_truncated` | 내부 상태 |
| `gemini_cli.malformed_json_response` | 내부 오류 |
| `gemini_cli.flash_fallback` | 모델 폴백 |
| `gemini_cli.chat_compression` | 내부 최적화 |
| `gemini_cli.model_routing` | 내부 라우팅 |
| `gemini_cli.slash_command` | 내부 명령 |
| `gemini_cli.conversation_finished` | 세션 종료 (별도 처리 불필요) |
| `gemini_cli.rewind` | 대화 되감기 |
| `gemini_cli.next_speaker_check` | 내부 체크 |
| `gemini_cli.ide_connection` | IDE 연결 |
| `gemini_cli.tool_output_masked` | 출력 마스킹 |
| `gemini_cli.ripgrep_fallback` | 폴백 |
| `gemini_cli.retry_attempt` | ※ 이전 이름. 현재는 `network_retry_attempt` |
| `gemini_cli.chat.*` | 채팅 내부 이벤트 |
| `gemini_cli.extension_*` | 확장 생애주기 |
| `gemini_cli.conseca.*` | 보안 판정 |
| `gen_ai.*` | GenAI 시맨틱 (별도 처리) |

### v0.35에서 추가된 이벤트 — Argus 스킵 여부 미결정

| 이벤트 | 권장 처리 |
|--------|----------|
| `gemini_cli.network_retry_attempt` | **스킵 권장** — 네트워크 재시도는 내부 상태 |
| `gemini_cli.onboarding.start` | **스킵 권장** — 온보딩은 일회성 이벤트 |
| `gemini_cli.onboarding.success` | **스킵 권장** — 온보딩은 일회성 이벤트 |
| `gemini_cli.overage_menu_shown` | **스킵 권장** — UI 이벤트 |
| `gemini_cli.overage_option_selected` | **스킵 권장** — UI 이벤트 |
| `gemini_cli.empty_wallet_menu_shown` | **스킵 권장** — UI 이벤트 |
| `gemini_cli.credit_purchase_click` | **스킵 권장** — UI 이벤트 |
| `gemini_cli.credits_used` | **검토 필요** — 비용 추적에 활용 가능 |
| `gemini_cli.startup_stats` | **스킵 권장** — 시작 성능 메트릭 |
| `gemini_cli.llm_loop_check` | **스킵 권장** — 내부 루프 감지 |
| `gemini_cli.hook_call` | **스킵 권장** — 훅 실행 상세 |
| `gemini_cli.keychain.availability` | **스킵 권장** — 키체인 상태 |
| `gemini_cli.edit_strategy` | **스킵 권장** — 편집 전략 내부 |
| `gemini_cli.edit_correction` | **스킵 권장** — 편집 보정 내부 |
| `gemini_cli.approval_mode_switch` | **스킵 권장** — 승인 모드 전환 |
| `gemini_cli.approval_mode_duration` | **스킵 권장** — 모드별 체류 시간 |
| `gemini_cli.plan.execution` | **스킵 권장** — 플랜→실행 전환 |
| `gemini_cli.agent.start` | **검토 필요** — 서브에이전트 추적에 활용 가능 |
| `gemini_cli.agent.finish` | **검토 필요** — 서브에이전트 추적에 활용 가능 |
| `gemini_cli.agent.recovery_attempt` | **스킵 권장** — 에이전트 오류 복구 내부 |
| `gemini_cli.token_storage.initialization` | **스킵 권장** — 토큰 저장소 초기화 |

---

## 5. v0.35 전체 메트릭 목록

### 카운터 (Counter)

| 메트릭 | 설명 | v0.35 변경 |
|--------|------|-----------|
| `gemini_cli.session.count` | 세션 수 | |
| `gemini_cli.tool.call.count` | 도구 호출 수 | |
| `gemini_cli.api.request.count` | API 요청 수 | |
| `gemini_cli.file.operation.count` | 파일 작업 수 | |
| `gemini_cli.chat.invalid_chunk.count` | 잘못된 청크 수 | |
| `gemini_cli.chat.content_retry.count` | 콘텐츠 재시도 수 | |
| `gemini_cli.chat.content_retry_failure.count` | 콘텐츠 재시도 실패 수 | |
| `gemini_cli.network_retry.count` | 네트워크 재시도 수 | **v0.35 신규** |
| `gemini_cli.model_routing.failure.count` | 모델 라우팅 실패 수 | |
| `gemini_cli.slash_command.model.call_count` | 모델 슬래시 커맨드 수 | |
| `gemini_cli.hook_call.count` | 훅 호출 수 | |
| `gemini_cli.keychain.availability.count` | 키체인 가용성 체크 | |
| `gemini_cli.token_storage.type.count` | 토큰 저장소 타입 | |
| `gemini_cli.overage_option.count` | 초과 옵션 선택 수 | **v0.35 신규** |
| `gemini_cli.credit_purchase.count` | 크레딧 구매 클릭 수 | **v0.35 신규** |
| `gemini_cli.onboarding.start` | 온보딩 시작 수 | **v0.35 신규** |
| `gemini_cli.onboarding.success` | 온보딩 성공 수 | **v0.35 신규** |
| `gemini_cli.agent.run.count` | 에이전트 실행 수 | |
| `gemini_cli.agent.recovery_attempt.count` | 에이전트 복구 시도 수 | |
| `gemini_cli.plan.execution.count` | 플랜 실행 수 | |
| `gemini_cli.ui.flicker.count` | UI 플리커 수 | |
| `gemini_cli.exit.fail.count` | 종료 실패 수 | |

### 히스토그램 (Histogram)

| 메트릭 | 설명 |
|--------|------|
| `gemini_cli.tool.call.latency` | 도구 호출 지연 (ms) |
| `gemini_cli.api.request.latency` | API 요청 지연 (ms) |
| `gemini_cli.model_routing.latency` | 모델 라우팅 지연 (ms) |
| `gemini_cli.agent.duration` | 에이전트 실행 시간 |
| `gemini_cli.agent.turns` | 에이전트 턴 수 |
| `gemini_cli.agent.recovery_attempt.duration` | 에이전트 복구 시간 |
| `gemini_cli.hook_call.latency` | 훅 호출 지연 (ms) |
| `gemini_cli.startup.duration` | 시작 시간 |
| `gemini_cli.ui.slow_render.latency` | 느린 렌더링 지연 |
| `gen_ai.client.token.usage` | GenAI 토큰 사용량 |
| `gen_ai.client.operation.duration` | GenAI 작업 시간 (초) |

### 게이지/성능 메트릭

| 메트릭 | 설명 |
|--------|------|
| `gemini_cli.token.usage` | 토큰 사용 (type: input/output/thought/cache/tool) |
| `gemini_cli.lines.changed` | 변경 라인 수 |
| `gemini_cli.memory.usage` | 메모리 사용량 |
| `gemini_cli.cpu.usage` | CPU 사용량 |
| `gemini_cli.tool.queue.depth` | 도구 큐 깊이 |
| `gemini_cli.tool.execution.breakdown` | 도구 실행 분석 |
| `gemini_cli.token.efficiency` | 토큰 효율 |
| `gemini_cli.performance.score` | 성능 점수 |

---

## 6. Argus 연동 설정 (v0.35 기준)

### Gemini CLI 설정

```bash
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:9845
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http
export GEMINI_TELEMETRY_LOG_PROMPTS=true
```

또는 `~/.gemini/settings.json`:

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

HTTP 모드 시 3개 경로로 전송:
- `POST /v1/logs` — Argus가 수신
- `POST /v1/traces` — Argus가 수신 (현재 미처리)
- `POST /v1/metrics` — Argus가 수신 (현재 미처리)

---

## 7. Argus 코드 수정 권장사항

### 7.1 `ingest-utils.ts` — 스킵 대상 이벤트 추가

현재 코드 (line 94-96):

```typescript
if (name === 'tool_output_truncated' || name === 'malformed_json_response' || name === 'flash_fallback' || name === 'chat_compression' || name === 'model_routing' || name === 'slash_command' || name === 'conversation_finished') return ''
if (name === 'rewind' || name === 'next_speaker_check' || name === 'ide_connection' || name === 'tool_output_masked' || name === 'ripgrep_fallback' || name === 'retry_attempt') return ''
if (name.startsWith('chat.') || name.startsWith('extension_') || name.startsWith('conseca.')) return ''
```

v0.35에서 추가해야 할 스킵 대상:

```typescript
// 기존 스킵 라인에 추가
if (name === 'network_retry_attempt' || name === 'startup_stats' || name === 'llm_loop_check' || name === 'hook_call') return ''
if (name.startsWith('onboarding.') || name.startsWith('approval_mode') || name.startsWith('agent.')) return ''
if (name === 'overage_menu_shown' || name === 'overage_option_selected' || name === 'empty_wallet_menu_shown' || name === 'credit_purchase_click' || name === 'credits_used') return ''
if (name === 'edit_strategy' || name === 'edit_correction' || name === 'plan.execution') return ''
if (name === 'token_storage.initialization' || name.startsWith('keychain.') || name === 'web_fetch_fallback_attempt') return ''
```

### 7.2 `retry_attempt` → `network_retry_attempt` 이름 변경

기존 스킵 라인의 `retry_attempt`은 더 이상 사용되지 않는 이전 이름이다. `network_retry_attempt`로 업데이트 필요.

### 7.3 향후 검토 — `credits_used` 이벤트 활용

`credits_used` 이벤트에는 `credits_consumed`, `credits_remaining` 정보가 포함되어 있어, Gemini CLI의 AI 크레딧 사용량 추적에 활용할 수 있다. 현재 Argus의 비용 계산은 토큰 기반 pricing_model을 사용하므로, 크레딧 기반 과금과 병행할지 검토가 필요하다.

### 7.4 향후 검토 — 에이전트 이벤트 활용

`gemini_cli.agent.start`, `gemini_cli.agent.finish` 이벤트를 활용하면 Gemini CLI의 서브에이전트 실행을 추적할 수 있다. v0.35에서 서브에이전트가 활성화되었으므로, 이 데이터의 가치가 높아졌다.

---

## 8. 참고 자료

- [Gemini CLI v0.35.0 릴리스](https://github.com/google-gemini/gemini-cli/releases/tag/v0.35.0)
- [공식 텔레메트리 문서](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/telemetry.md)
- [OTLP HTTP 경로 버그 #15581](https://github.com/google-gemini/gemini-cli/issues/15581)
- [네트워크 재시도 텔레메트리 PR #22027](https://github.com/google-gemini/gemini-cli/pull/22027)
- [AI 크레딧 과금 텔레메트리 PR #22153](https://github.com/google-gemini/gemini-cli/pull/22153)
- [온보딩 텔레메트리 PR #23118](https://github.com/google-gemini/gemini-cli/pull/23118)
- [소스 코드 분석 기준 태그: v0.35.1](https://github.com/google-gemini/gemini-cli/tree/v0.35.1)
