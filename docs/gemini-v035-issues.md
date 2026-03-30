# Gemini CLI v0.35 대응 — Linear 이슈 목록

> 작성일: 2026-03-26 | 분석 문서: [gemini-cli-v0.35-otel-analysis.md](./gemini-cli-v0.35-otel-analysis.md)

## 1. Gemini CLI v0.35 스킵 이벤트 업데이트

- **라벨**: Improvement, Data, Infra
- **우선순위**: 높음

`ingest-utils.ts`의 `normalizeEventName()` Gemini 스킵 리스트에 v0.35 신규 이벤트가 누락되어 불필요한 데이터가 DB에 저장됨.

추가할 스킵 대상:

- `network_retry_attempt`, `startup_stats`, `llm_loop_check`, `hook_call`
- `onboarding.start`, `onboarding.success` (패턴: `onboarding.*`)
- `overage_menu_shown`, `overage_option_selected`, `empty_wallet_menu_shown`, `credit_purchase_click`, `credits_used`
- `edit_strategy`, `edit_correction`, `plan.execution`
- `approval_mode_switch`, `approval_mode_duration` (패턴: `approval_mode*`)
- `agent.start`, `agent.finish`, `agent.recovery_attempt` (패턴: `agent.*`)
- `token_storage.initialization`, `keychain.availability` (패턴: `keychain.*`)
- `web_fetch_fallback_attempt`
- 기존 `retry_attempt` → `network_retry_attempt`로 명칭 변경 반영

**관련 파일**: `src/shared/lib/ingest-utils.ts:94-96`, `src/shared/lib/__tests__/ingest-utils.test.ts`
**수락 조건**: 새 이벤트 모두 빈 문자열 반환, 테스트 커버리지 추가

---

## 2. Gemini CLI 도구 카테고리 누락 보완

- **라벨**: Improvement, Dashboard
- **우선순위**: 중간

`AGENT_TOOL_CATEGORIES`에 Gemini CLI v0.35 도구 이름이 일부 누락됨.

| 카테고리 | 현재 등록 | 누락된 Gemini 도구 |
|---------|----------|-----------------|
| File Read | `read_file` | `read_many_files` |
| File Edit | `edit_file` | `replace` (Gemini의 실제 edit 도구명) |
| Search | `list_directory`, `web_search` | `glob`, `grep_search`, `google_web_search` |
| Web | - | `web_fetch` (새 카테고리 또는 Search에 추가) |
| Memory | - | `save_memory` (새 카테고리 검토) |

**관련 파일**: `src/shared/lib/agents.ts:63-70`, `src/shared/lib/__tests__/ingest-utils.test.ts`
**수락 조건**: Gemini 도구가 올바른 카테고리로 분류됨, 테스트 추가

---

## 3. Gemini CLI `cached_content_token_count` 속성 키 통합

- **라벨**: Bug, Data
- **우선순위**: 중간

인제스트 라우트(`route.ts:62`)에서 캐시 토큰 추출 시:

```typescript
const cacheReadTokens = getTokenAttr(attrs, 'cache_read_tokens', 'cached_token_count') || getNumAttr(attrs, 'cached_content_token_count')
```

Gemini CLI는 `cached_content_token_count`를 사용하는데 `getTokenAttr`의 codex 키가 `cached_token_count`로 되어 있어 폴백으로만 동작. `getTokenAttr`에 Gemini 키를 직접 지원하거나, 3개 에이전트의 키를 모두 탐색하는 헬퍼로 개선 필요.

**관련 파일**: `src/app/api/ingest/route.ts:62`
**수락 조건**: Gemini 캐시 토큰이 정확히 추출됨

---

## 4. reasoning 토큰 추출 로직 통일

- **라벨**: Improvement, Data
- **우선순위**: 낮음

인제스트 라우트(`route.ts:64`)에서:

```typescript
const reasoningTokens = getNumAttr(attrs, 'reasoning_token_count') || getNumAttr(attrs, 'thoughts_token_count')
```

`reasoning_token_count`는 Codex용, `thoughts_token_count`는 Gemini용. `getTokenAttr` 헬퍼 패턴으로 통일하면 일관성 향상.

**관련 파일**: `src/app/api/ingest/route.ts:64`
**수락 조건**: 토큰 추출 로직이 `getTokenAttr` 패턴으로 통일됨

---

## 5. Gemini 연동 설정에 `logPrompts` 옵션 명시

- **라벨**: Bug, Infra
- **우선순위**: 중간

`setup.ts`의 `ARGUS_GEMINI_TELEMETRY`에 `logPrompts: true`가 누락:

```typescript
const ARGUS_GEMINI_TELEMETRY = (endpoint: string) => ({
  enabled: true,
  target: 'local',
  otlpEndpoint: endpoint,
  otlpProtocol: 'http',
  // logPrompts: true 누락!
})
```

기본값이 `true`이므로 동작 문제는 없지만 명시적 설정이 안전.

**관련 파일**: `src/shared/lib/setup.ts:57-62`
**수락 조건**: `logPrompts: true` 명시 추가

---

## 6. CLAUDE.md에 Gemini 텔레메트리 설정 추가

- **라벨**: Chore, Data
- **우선순위**: 낮음

CLAUDE.md의 데이터 수집 섹션에 Claude Code 설정만 있고 Gemini CLI 설정 가이드가 없음.

```bash
export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:9845
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http
```

**관련 파일**: `CLAUDE.md`
**수락 조건**: Gemini CLI OTel 설정이 CLAUDE.md에 추가됨

---

## 7. Gemini global MCP 서버 스캔 누락

- **라벨**: Bug, Dashboard
- **우선순위**: 낮음

`registered-tools.ts`의 `scanMcp()`에서 global scope MCP 스캔 시 Gemini 누락:

```typescript
if (scope === 'global') {
  return [
    ...scanMcpFile(path.join(rootDir, '.claude', '.mcp.json'), scope, 'claude'),
    ...scanMcpFile(path.join(rootDir, '.codex', '.mcp.json'), scope, 'codex'),
    // Gemini ~/.gemini/settings.json 내 mcpServers 미스캔
  ]
}
```

Gemini CLI도 `~/.gemini/settings.json`에 MCP 서버를 설정할 수 있으므로 스캔 대상에 추가 필요.

**관련 파일**: `src/shared/lib/registered-tools.ts:95-103`
**수락 조건**: Gemini global MCP 서버가 도구 목록에 표시됨

---

## 우선순위 요약

| 순위 | 이슈 | 영향도 |
|------|------|--------|
| 1 | #1 스킵 이벤트 업데이트 | DB에 불필요한 데이터 축적 방지 |
| 2 | #5 logPrompts 명시 | 설정 명확성 |
| 3 | #2 도구 카테고리 보완 | 대시보드 도구 분류 정확도 |
| 4 | #3 캐시 토큰 키 통합 | 비용 계산 정확도 |
| 5 | #4 reasoning 토큰 통일 | 코드 일관성 |
| 6 | #6 CLAUDE.md 동기화 | 문서 완성도 |
| 7 | #7 Gemini MCP 스캔 | 도구 추적 완성도 |
