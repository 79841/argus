---
title: "아키텍처"
description: "기술 아키텍처와 설계 결정사항"
---

Argus는 AI 코딩 에이전트(Claude Code, Codex CLI, Gemini CLI)에서 OpenTelemetry 데이터를 수집하고 통합 대시보드를 통해 사용량 지표를 시각화하는 로컬 전용, 인증 없는 모니터링 도구입니다.

## 1. 시스템 개요

<Mermaid chart={`graph TB
  subgraph "AI Coding Agents"
    CC[Claude Code]
    CX[Codex CLI]
    GM[Gemini CLI]
  end

  subgraph "Argus"
    direction TB
    V1["/v1/logs<br/>(OTLP standard)"]
    API["/api/ingest<br/>(Next.js API Route)"]
    DB[(SQLite<br/>WAL mode)]
    QE["Query Engine<br/>(queries.ts)"]
    SE["Suggestion Engine<br/>(suggestions.ts)"]
    CT["Config Tracker<br/>(Git diff)"]
    UI["Dashboard<br/>(Next.js App Router)"]
  end

  CC -->|"OTLP HTTP<br/>JSON / Protobuf"| V1
  CX -->|"OTLP HTTP<br/>JSON / Protobuf"| V1
  GM -->|"OTLP HTTP<br/>JSON / Protobuf"| V1
  V1 -->|"proxy"| API
  API -->|"INSERT"| DB
  DB --> QE
  QE --> UI
  SE --> UI
  CT -->|"git log"| UI`} />

### 핵심 설계 결정

- **인증 없음** -- 개인용, 로컬 전용으로 설계되었습니다.
- **외부 콜렉터 불필요** -- Next.js API 라우트가 OTLP를 직접 수신하므로 OTel Collector가 필요 없습니다.
- **WAL 모드 SQLite** -- 단일 파일 저장소로 동시 읽기를 지원하며 첫 시작 시 자동 초기화됩니다.
- **멀티 에이전트 정규화** -- 각 에이전트의 텔레메트리 스키마가 수집 시 통합 `agent_logs` 테이블로 정규화됩니다.

## 2. 데이터 수집 흐름

### 수집 파이프라인

<Mermaid chart={`sequenceDiagram
    participant Agent as AI Agent
    participant V1 as /v1/logs
    participant Ingest as /api/ingest
    participant DB as SQLite

    Agent->>V1: POST OTLP (JSON or Protobuf)
    V1->>V1: Detect format (JSON vs Protobuf)
    V1->>V1: Decode Protobuf → JSON (if needed)
    V1->>Ingest: Proxy as JSON

    Ingest->>Ingest: Extract resource attributes
    Ingest->>Ingest: detectAgentType(service.name)
    Ingest->>Ingest: normalizeEventName(event.name)
    Ingest->>Ingest: normalizeModelId(model)
    Ingest->>Ingest: calculateCost (pricing_model lookup)

    Ingest->>DB: INSERT INTO agent_logs (transaction)
    Ingest->>DB: INSERT INTO tool_details (orchestration tools)
    Ingest-->>Agent: { accepted: N }`} />

### OTLP 엔드포인트

| 엔드포인트 | 형식 | 목적 |
|------------|------|------|
| `POST /v1/logs` | JSON + Protobuf | OTLP 표준 경로. 에이전트가 기본적으로 이곳으로 전송합니다. |
| `POST /v1/metrics` | JSON + Protobuf | Gemini CLI 도구/세션 메트릭과 Claude Code 생산성 메트릭을 처리합니다. |
| `POST /v1/traces` | - | 수신하지만 무시합니다 (200 반환). |
| `POST /api/ingest` | JSON 전용 | 내부 처리 라우트. `/v1/logs`가 이곳으로 프록시합니다. |

### 에이전트 유형 감지

`service.name` 리소스 속성으로 에이전트 유형을 결정합니다:

| service.name 포함 문자열 | agent_type |
|-------------------------|------------|
| `codex` | `codex` |
| `claude` | `claude` |
| `gemini` | `gemini` |
| (기본값) | `claude` |

### 이벤트 정규화

각 에이전트는 서로 다른 이벤트 이름 접두사를 사용합니다. 수집 시 정규화됩니다:

| 에이전트 | 원시 이벤트 | 정규화된 이벤트 |
|----------|-----------|----------------|
| Claude Code | `claude_code.api_request` | `api_request` |
| Claude Code | `claude_code.tool_result` | `tool_result` |
| Codex CLI | `codex.sse_event` (kind=response.completed) | `api_request` |
| Codex CLI | `codex.conversation_starts` | `session_start` |
| Gemini CLI | `gemini_cli.api_response` | `api_request` |
| Gemini CLI | `gemini_cli.tool_call` | `tool_result` |

### 인식되는 이벤트 유형

| 이벤트 | 설명 |
|--------|------|
| `api_request` | 토큰, 비용, 모델, 소요 시간이 포함된 LLM API 호출 |
| `user_prompt` | 사용자 입력 이벤트 |
| `tool_result` | 성공/실패가 포함된 도구 실행 결과 |
| `tool_decision` | 도구 승인/거부 |
| `session_start` | 세션 초기화 |
| `api_error` | 상태 코드가 포함된 API 오류 |

### 비용 계산

1. Claude Code는 텔레메트리에 `cost_usd`를 직접 전송합니다 -- 그대로 사용합니다.
2. Codex와 Gemini의 경우 `pricing_model` 테이블에서 비용을 계산합니다:

```
cost = (input_tokens * input_per_mtok
      + output_tokens * output_per_mtok
      + cache_read_tokens * cache_read_per_mtok
      + reasoning_tokens * output_per_mtok) / 1,000,000
```

### 도구 상세 추출

오케스트레이션 도구(Agent, Skill, MCP)는 `tool_result` 이벤트에서 자동 추출되어 `tool_details` 테이블에 저장됩니다:

| 도구 패턴 | detail_type | 감지 방법 |
|-----------|-------------|-----------|
| `mcp__*` 또는 `mcp_tool` | `mcp` | 도구 이름 접두사 또는 `mcp_server_name` 파라미터 |
| `Skill` | `skill` | tool_parameters의 `skill_name` 파라미터 |
| `Agent` | `agent` | `subagent_type` 또는 `name` 파라미터 |

### 프로젝트 이름 추출

- **Claude Code / Gemini CLI**: OTEL 리소스 속성의 `project.name`.
- **Codex CLI**: tool_parameters의 `arguments.workdir`에서 추출하며, 동일 세션의 모든 이벤트에 역적용됩니다.

## 3. SQLite 스키마

스키마는 애플리케이션 시작 시 `src/shared/lib/db.ts`에서 자동 초기화됩니다. `schema_version` 테이블로 마이그레이션을 추적하며, 새 컬럼/테이블 추가 시 버전 기반 마이그레이션이 자동 실행됩니다.

### agent_logs

모든 텔레메트리 이벤트를 저장하는 주 테이블입니다.

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `id` | INTEGER | AUTO | 기본 키 |
| `timestamp` | TEXT | now() | ISO 8601 타임스탬프 |
| `agent_type` | TEXT | `'claude'` | 에이전트 식별자: `claude`, `codex`, `gemini` |
| `service_name` | TEXT | `'claude-code'` | OTLP의 원본 `service.name` |
| `event_name` | TEXT | `''` | 정규화된 이벤트 유형 |
| `session_id` | TEXT | `''` | 세션 식별자 |
| `prompt_id` | TEXT | `''` | 프롬프트 상관관계 ID |
| `model` | TEXT | `''` | 모델 식별자 (예: `claude-sonnet-4-20250514`) |
| `input_tokens` | INTEGER | `0` | 입력 토큰 수 |
| `output_tokens` | INTEGER | `0` | 출력 토큰 수 |
| `cache_read_tokens` | INTEGER | `0` | 캐시 읽기 토큰 |
| `cache_creation_tokens` | INTEGER | `0` | 캐시 생성 토큰 |
| `reasoning_tokens` | INTEGER | `0` | 추론/사고 토큰 |
| `cost_usd` | REAL | `0.0` | USD 비용 |
| `duration_ms` | INTEGER | `0` | 응답 소요 시간 (밀리초) |
| `speed` | TEXT | `'normal'` | 속도 티어 |
| `tool_name` | TEXT | `''` | 도구 이름 (도구 이벤트용) |
| `tool_success` | INTEGER | NULL | 도구 성공 여부: 1=성공, 0=실패, NULL=미확인 |
| `severity_text` | TEXT | `'INFO'` | 로그 심각도 |
| `body` | TEXT | `''` | 로그 본문 / 오류 메시지 |
| `project_name` | TEXT | `''` | 프로젝트 이름 |
| `resource_attributes` | TEXT | `'{}'` | OTLP 리소스 속성 JSON |
| `log_attributes` | TEXT | `'{}'` | OTLP 로그 속성 JSON |

**인덱스**: `timestamp`, `agent_type`, `session_id`, `event_name`, `date(timestamp)`, `prompt_id`, `project_name`

### pricing_model

모델별 토큰 가격입니다. 시작 시 알려진 모델로 자동 시드됩니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `model_id` | TEXT | 모델 식별자 (effective_date와 함께 PK) |
| `agent_type` | TEXT | 에이전트 유형 |
| `effective_date` | TEXT | 가격 적용 날짜 |
| `input_per_mtok` | REAL | 백만 토큰당 입력 비용 |
| `output_per_mtok` | REAL | 백만 토큰당 출력 비용 |
| `cache_read_per_mtok` | REAL | 백만 토큰당 캐시 읽기 비용 |
| `cache_creation_per_mtok` | REAL | 백만 토큰당 캐시 생성 비용 |

**기본 키**: `(model_id, effective_date)`

### config_snapshots

에이전트 설정 파일의 이력 스냅샷입니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER | 기본 키 |
| `timestamp` | TEXT | ISO 8601 타임스탬프 |
| `agent_type` | TEXT | 에이전트 유형 |
| `file_path` | TEXT | 설정 파일 경로 |
| `content` | TEXT | 파일 내용 |
| `content_hash` | TEXT | 중복 제거용 콘텐츠 해시 |

**인덱스**: `(agent_type, file_path, timestamp)`

### tool_details

오케스트레이션 도구 호출(MCP 서버, 스킬, 서브 에이전트)의 상세 추적입니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER | 기본 키 |
| `timestamp` | TEXT | ISO 8601 타임스탬프 |
| `session_id` | TEXT | 세션 식별자 |
| `tool_name` | TEXT | 상위 도구 (예: `mcp:linear-server`, `Skill`, `Agent`) |
| `detail_name` | TEXT | 구체적인 호출 이름 |
| `detail_type` | TEXT | 카테고리: `agent`, `skill`, `mcp` |
| `duration_ms` | INTEGER | 실행 소요 시간 |
| `success` | INTEGER | 성공 플래그 (1/0/NULL) |
| `project_name` | TEXT | 프로젝트 이름 |
| `metadata` | TEXT | JSON 메타데이터 |
| `agent_type` | TEXT | 에이전트 유형 |

**인덱스**: `timestamp`, `(tool_name, detail_name)`, `session_id`

### project_registry

연결된 프로젝트 경로 관리입니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER | 기본 키 |
| `project_name` | TEXT | 프로젝트 이름 (고유) |
| `project_path` | TEXT | 절대 파일시스템 경로 |
| `created_at` | TEXT | ISO 8601 타임스탬프 |

### app_meta

앱 수준 메타데이터 (키-값 저장소)입니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `key` | TEXT | 기본 키 |
| `value` | TEXT | 메타데이터 값 |

### 엔터티 관계

<Mermaid chart={`erDiagram
    agent_logs ||--o{ tool_details : "session_id"
    agent_logs }o--|| pricing_model : "model → model_id"
    agent_logs }o--o| project_registry : "project_name"
    config_snapshots }o--|| agent_logs : "agent_type"

    agent_logs {
        int id PK
        text timestamp
        text agent_type
        text event_name
        text session_id
        text model
        int input_tokens
        int output_tokens
        int reasoning_tokens
        real cost_usd
        text tool_name
        text project_name
    }

    pricing_model {
        text model_id PK
        text effective_date PK
        text agent_type
        real input_per_mtok
        real output_per_mtok
    }

    tool_details {
        int id PK
        text session_id FK
        text tool_name
        text detail_name
        text detail_type
        text agent_type
    }

    project_registry {
        int id PK
        text project_name UK
        text project_path
        text created_at
    }

    app_meta {
        text key PK
        text value
    }

    config_snapshots {
        int id PK
        text agent_type
        text file_path
        text content_hash
    }`} />

## 4. Electron 아키텍처

Argus는 웹 애플리케이션(`pnpm dev`)과 데스크톱 애플리케이션(`pnpm electron:dev`) 양쪽으로 실행됩니다.

<Mermaid chart={`graph LR
  subgraph "Electron Main Process"
    M["main.ts<br/>(app lifecycle)"]
    IPC["ipc-handlers.ts<br/>(query router)"]
    NS["Next.js Server<br/>(spawned child process)"]
    DB[(SQLite)]
    TR[System Tray]
  end

  subgraph "Electron Renderer Process"
    P["preload.ts<br/>(context bridge)"]
    DC["data-client.ts<br/>(IPC / HTTP adapter)"]
    UI["React Pages<br/>(Next.js App Router)"]
  end

  M --> NS
  M --> TR
  M --> IPC
  IPC --> DB

  UI --> DC
  DC -->|"IPC (Electron)"| P
  P -->|"ipcRenderer.invoke"| IPC
  DC -->|"HTTP fallback"| NS`} />

### 라이프사이클

1. `app.whenReady()`가 시작을 트리거합니다.
2. `registerIpcHandlers()`가 `db:query`와 `db:mutate` IPC 채널을 등록합니다.
3. 시스템 트레이 아이콘이 생성됩니다 (`createTray()`).
4. Next.js 개발 서버가 포트 9845에서 자식 프로세스로 생성됩니다.
5. `/api/health`가 응답하면 메인 `BrowserWindow`가 생성됩니다.
6. 윈도우 닫기는 트레이로 숨기며 (macOS), 종료 시 Next.js 프로세스를 종료합니다.

### IPC 채널

| 채널 | 방향 | 목적 |
|------|------|------|
| `db:query` | 렌더러 -> 메인 | 읽기 쿼리 (overview, sessions, daily 등) |
| `db:mutate` | 렌더러 -> 메인 | 쓰기 작업 (settings, pricing sync, config) |
| `capture-screenshot` | 렌더러 -> 메인 | 윈도우 스크린샷 캡처 |

### IPC 쿼리 라우터

`ipc-handlers.ts`는 쿼리 이름을 API 라우트와 동일한 함수에 매핑합니다:

| 쿼리 이름 | 핸들러 |
|-----------|--------|
| `overview` | `getOverviewStats` + `getAllTimeStats` + `getOverviewDelta` |
| `daily` | `getDailyStats` |
| `sessions` | `getSessions` |
| `sessions/{id}` | `getSessionDetail` |
| `sessions/active` | `getActiveSessions` |
| `models` | `getModelUsage` |
| `efficiency` | `getEfficiencyStats` + `getEfficiencyComparison` |
| `tools` | `getToolUsageStats` / `getToolDetailStats` |
| `projects` | `getProjects` / `getProjectCosts` / `getProjectComparison` |
| `insights` | `getHighCostSessions` + `getModelCostEfficiency` + `getBudgetStatus` |
| `suggestions` | `getSuggestionMetrics` + `generateSuggestions` |
| `config-history` | `getConfigHistory` (Git 기반) |

## 5. 데이터 클라이언트 추상화

`data-client.ts`는 웹과 Electron 환경 모두에서 작동하는 통합 데이터 접근 계층을 제공합니다.

<Mermaid chart={`flowchart TD
    A["dataClient.query(name, params)"] --> B{isElectron?}
    B -->|Yes| C["window.electronAPI.query()"]
    C -->|Success| D[Return data]
    C -->|Failure| E["Set ipcDisabled = true"]
    E --> F["fetch(/api/name)"]
    B -->|No| F
    F --> D`} />

### 동작 방식

- **감지**: `isElectron()`은 프리로드 스크립트가 노출한 `window.electronAPI`를 확인합니다.
- **IPC 우선**: Electron에서는 IPC를 통해 직접 SQLite에 접근합니다 (HTTP 오버헤드 없음).
- **자동 폴백**: IPC가 한 번 실패하면 `ipcDisabled`가 `true`로 설정되고 이후 모든 호출은 HTTP를 사용합니다.
- **동일한 인터페이스**: 읽기용 `query(name, params)`, 쓰기용 `mutate(name, body)`.

### 프리로드 브릿지

`preload.ts`는 `contextBridge.exposeInMainWorld`를 사용하여 세 가지 메서드를 안전하게 노출합니다:

```
window.electronAPI = {
  query(name, params)          → ipcRenderer.invoke('db:query', ...)
  mutate(name, body)           → ipcRenderer.invoke('db:mutate', ...)
  captureScreenshot(savePath)  → ipcRenderer.invoke('capture-screenshot', ...)
}
```

## 6. 디렉토리 구조

```
argus/
├── dashboard/                         # Next.js + Electron 애플리케이션
│   ├── src/
│   │   ├── app/                       # App Router — 라우팅만 담당
│   │   │   ├── api/                   # API 라우트 (30개 엔드포인트)
│   │   │   ├── (dashboard)/           # 라우트 그룹 (공유 레이아웃)
│   │   │   │   ├── page.tsx           # Overview
│   │   │   │   ├── sessions/          # 세션 목록 + [id] 상세
│   │   │   │   ├── usage/             # 사용량 분석 (M3)
│   │   │   │   ├── tools/             # 도구 추적
│   │   │   │   ├── user/              # 사용자 설정 파일 뷰어
│   │   │   │   ├── projects/          # 프로젝트 목록 + [name] 상세 (서브 탭: overview, sessions, usage, tools, rules)
│   │   │   │   └── settings/          # 설정
│   │   │   ├── onboarding/            # 온보딩 플로우
│   │   │   └── v1/                    # OTLP 표준 엔드포인트
│   │   ├── features/                  # Feature 모듈 (도메인별 컴포넌트·로직·테스트)
│   │   │   └── {feature-name}/        # components/, lib/, hooks/, __tests__/, index.ts
│   │   └── shared/                    # 공유 모듈 (2개+ feature에서 사용)
│   │       ├── components/            # 공유 컴포넌트 (ui/, 필터, 네비게이션)
│   │       ├── hooks/                 # 공유 훅
│   │       └── lib/                   # 유틸 (db, queries, format, agents)
│   │           ├── db.ts              # SQLite 클라이언트 + 스키마 + 마이그레이션
│   │           ├── queries/           # SQL 쿼리 모듈 (11개 파일)
│   │           ├── ingest-utils.ts    # OTLP 파싱 및 정규화
│   │           ├── data-client.ts     # IPC/HTTP 추상화 계층
│   │           ├── suggestions.ts     # 규칙 기반 제안 엔진
│   │           ├── config-tracker.ts  # Git 기반 설정 변경 추적
│   │           ├── agents.ts          # 에이전트 정의 (색상, 아이콘)
│   │           ├── pricing-sync.ts    # LiteLLM 가격 동기화
│   │           ├── registered-tools.ts# MCP/에이전트/스킬 도구 스캐너
│   │           └── i18n.ts            # 다국어 지원 (ko/en)
│   └── electron/                      # Electron 데스크톱 앱
│       ├── main.ts                    # 진입점 (윈도우, 트레이, IPC)
│       ├── preload.ts                 # IPC 브릿지
│       ├── presentation/              # window.ts, tray.ts
│       ├── infrastructure/            # Next.js 서버, IPC 핸들러
│       └── domain/                    # config, mutation, query 서비스
├── website/                           # 문서 사이트 (별도 Next.js)
├── docs/                              # 사용자 문서
├── scripts/                           # 유틸리티 스크립트
└── .claude/                           # Claude Code 설정
    ├── agents/                        # 에이전트 정의
    └── skills/                        # 스킬 정의
```

## 7. 기술 스택

| 레이어 | 기술 | 버전 | 목적 |
|--------|------|------|------|
| **런타임** | Node.js | 20+ | 서버 런타임 |
| **프레임워크** | Next.js | 16.1 | App Router, API 라우트, SSR |
| **언어** | TypeScript | 5.x | Strict 모드 |
| **UI 라이브러리** | React | 19.x | 컴포넌트 렌더링 |
| **스타일링** | Tailwind CSS | 4.x | 유틸리티 퍼스트 CSS |
| **컴포넌트** | shadcn/ui | 4.x | 접근성 있는 UI 프리미티브 |
| **차트** | Recharts | 3.x | 데이터 시각화 |
| **데이터베이스** | SQLite | - | 로컬 저장소 (WAL 모드) |
| **DB 드라이버** | better-sqlite3 | 12.x | 동기 SQLite API |
| **데스크톱** | Electron | 40.x | 트레이가 있는 데스크톱 래퍼 |
| **빌드** | electron-builder | 26.x | DMG (macOS) / NSIS (Windows) |
| **테스트** | Vitest | 4.x | 유닛 및 통합 테스트 |
| **패키지 매니저** | pnpm | - | 빠르고 디스크 효율적 |
| **텔레메트리** | OpenTelemetry | - | OTLP 프로토콜 파싱 |

## 8. 설정 추적

설정 추적기(`config-tracker.ts`)는 Git 이력을 통해 에이전트 설정 파일 변경을 모니터링합니다.

### 추적 파일

| 에이전트 | 파일 |
|----------|------|
| Claude Code | `CLAUDE.md`, `.claude/settings.json`, `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `.mcp.json` |
| Codex CLI | `codex.md`, `AGENTS.md`, `~/.codex/config.toml`, `~/.codex/instructions.md` |
| Gemini CLI | `GEMINI.md`, `~/.gemini/settings.json` |

### 동작 방식

1. 각 추적 파일에 대해 `git log --since=N --follow -- <file>`을 실행합니다.
2. 각 커밋에 대해 `git diff <hash>~1..<hash>`를 실행하여 diff를 추출합니다.
3. 날짜순으로 정렬하여 반환합니다 (최신순).
4. Diff는 저장 효율을 위해 2000자로 잘립니다.

## 9. 제안 엔진

제안 엔진(`suggestions.ts`)은 사용량 지표를 분석하고 실행 가능한 권장 사항을 생성합니다.

### 규칙

| 규칙 ID | 트리거 | 심각도 |
|---------|--------|--------|
| `low_cache_rate` | 캐시 히트율 < 50% | Warning (< 20%: Critical) |
| `high_tool_fail_rate` | 도구 실패율 > 15% | Warning (> 30%: Critical) |
| `high_expensive_model_ratio` | 고가 모델 사용률 > 70% | Warning (> 90%: Critical) |
| `high_avg_session_cost` | 평균 세션 비용 > $2 | Warning (> $5: Critical) |
| `high_daily_cost` | 일일 비용 > $10 | Warning (> $20: Critical) |
| `tool_fail_{name}` | 개별 도구 실패율 > 30% | Warning (> 50%: Critical) |

### 카테고리

- **cost** -- 지출 최적화
- **cache** -- 캐시 활용
- **tools** -- 도구 안정성
- **performance** -- 전반적인 효율성
