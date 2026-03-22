# Argus

AI 코딩 에이전트(Codex CLI, Claude Code, Gemini CLI)의 사용 현황을 통합 측정·시각화하는 **개인용** 오픈소스 모니터링 도구. **한글로 응답**한다.

**핵심 원칙**: 인증 없음, 로컬 전용, Docker Compose 원클릭, 멀티 에이전트 통합 뷰.

## 아키텍처

```
Codex CLI / Claude Code / Gemini CLI
        ↓ OTLP HTTP (POST /api/ingest)
    Next.js API Route (agent_type 태깅)
        ↓
    SQLite (agent_logs + pricing_model + config_snapshots)
        ↓
    Dashboard (Next.js, 인증 없음, 로컬 전용)
```

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 수집 | Next.js API Route `/api/ingest` (OTLP JSON 직접 수신) |
| 저장 | SQLite (`better-sqlite3`, WAL 모드) |
| 대시보드 | Next.js 15+, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| 데스크톱 | Electron (트레이 아이콘, 백그라운드 OTLP 수신) |
| 패키지 매니저 | pnpm |
| 실행 | `pnpm dev` (웹) 또는 `pnpm electron:dev` (데스크톱) |

## 프로젝트 구조

```
argus/
├── argus.db                         # SQLite 데이터베이스 (자동 생성, gitignore)
├── dashboard/                       # Next.js 대시보드
│   └── src/
│       ├── app/                     # App Router — 라우팅만 담당
│       │   ├── api/                 # API 라우트
│       │   └── {page}/page.tsx      # 페이지 → features/{name} import
│       ├── features/                # Feature 모듈 (도메인별 컴포넌트·로직·테스트)
│       │   └── {feature-name}/      # components/, lib/, hooks/, __tests__/, index.ts
│       ├── shared/                  # 공유 모듈 (2개+ feature에서 사용)
│       │   ├── components/          # 공유 컴포넌트 (ui/, 필터, 네비게이션)
│       │   ├── hooks/               # 공유 훅
│       │   └── lib/                 # 유틸 (db, queries, format, agents)
│       └── infra/                   # 외부 시스템 연동 (git, fetch)
└── .claude/                         # Claude Code 구성
    ├── agents/                      # 에이전트 정의
    └── skills/                      # 스킬 정의
```

## SQLite 스키마

| 테이블 | 목적 |
|--------|------|
| `agent_logs` | 에이전트 로그 (agent_type, session_id, model, tokens, cost 등) |
| `pricing_model` | 에이전트×모델별 토큰 단가 (자동 시드) |
| `config_snapshots` | 설정 파일 변경 스냅샷 |

스키마는 `src/lib/db.ts`에서 앱 시작 시 자동 초기화된다 (마이그레이션 불필요).

## 데이터 수집

Claude Code의 OTel 텔레메트리를 직접 수신한다. 설정:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9845
```

### 수신 엔드포인트
- `POST /v1/logs` — OTLP 표준 경로 (Claude Code가 직접 전송)
- `POST /api/ingest` — 내부 처리 경로

### Claude Code 이벤트 유형

| 이벤트 | 설명 | 주요 속성 |
|--------|------|-----------|
| `claude_code.api_request` | API 요청 | model, cost_usd, input/output_tokens, cache tokens, duration_ms |
| `claude_code.user_prompt` | 사용자 프롬프트 | prompt_length |
| `claude_code.tool_result` | 도구 실행 결과 | tool_name, success, duration_ms |
| `claude_code.api_error` | API 오류 | error, status_code |
| `claude_code.tool_decision` | 도구 승인/거부 | tool_name, decision |

### agent_logs 주요 컬럼
- `event_name`: 이벤트 유형 (`api_request`, `user_prompt`, `tool_result` 등)
- `session_id`: 세션 ID
- `prompt_id`: 프롬프트 상관관계 ID
- `model`: 모델 ID
- `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`: 토큰
- `cost_usd`: 비용
- `duration_ms`: 응답 시간
- `tool_name`: 도구 이름 (tool_result 이벤트)

## 코딩 컨벤션

### 공통
- TypeScript strict mode
- Named export 사용 (`export default` 금지, Next.js 페이지 예외)
- `import type` 사용
- 불필요한 주석, console.log 금지
- 에러 핸들링은 시스템 경계(API 라우트)에서만

### Dashboard (Next.js)
- App Router 사용 (RSC 기본, 인터랙티브 컴포넌트만 `'use client'`)
- API 라우트: `src/app/api/{name}/route.ts`
- 쿼리: `src/lib/queries.ts`
- 컴포넌트: `src/components/` (shadcn/ui는 `src/components/ui/`)
- Tailwind CSS 클래스 사용, 인라인 스타일 금지

### 데이터
- SQLite: `better-sqlite3` 동기 API, WAL 모드
- 스키마: `src/lib/db.ts`에서 자동 초기화
- 쿼리: `src/lib/queries.ts`

## Git 전략 (Gitflow)

### 브랜치 구조
```
main          ← 프로덕션 릴리스
develop       ← 개발 통합 브랜치
feature/*     ← 기능 개발 (develop에서 분기, develop으로 머지)
```

### 브랜치 규칙
- feature 브랜치는 develop에서 분기한다
- feature → develop 머지 시 `--no-ff` 사용 (머지 커밋 생성)
- develop → main 머지는 릴리스 시에만 수행한다
- `/feature-start <이름>` 스킬로 브랜치 시작
- `/feature-finish` 스킬로 브랜치 머지

### develop 직접 작업 규칙
- 버그 수정, 디자인 조정 등 작은 작업은 develop에서 직접 시작할 수 있다
- **작업이 커지면 즉시 feature 브랜치로 분리한다** — `/branch-move <이름>`
- 분리 기준: 커밋 2~3개 이상, 여러 파일 변경, 1시간 이상 소요 예상
- develop에 직접 커밋하는 것은 단일 커밋으로 완결되는 소규모 수정에만 허용한다

### Worktree 활용
병렬 작업 시 git worktree를 사용하여 격리된 작업 환경을 제공한다:
```bash
git worktree add ../argus-feature-xxx feature/xxx
```

## 개발 프로세스

```
/plan → /tdd → /develop → /test → /simplify
```

5단계 프로세스를 따르되, 경우에 따라 일부만 실행하거나 중간부터 시작할 수 있다.

| 단계 | 스킬 | 에이전트/도구 | 모델 | 설명 |
|------|------|--------------|------|------|
| 1. Plan | `/plan` | `plan-writer` | opus | 요구사항 분석, 테스트 시나리오, 수락 조건 정의 |
| 2. TDD | `/tdd` | 직접 작성 | — | 테스트 코드 먼저 작성 (Red 단계) |
| 3. Develop | `/develop` | `page-builder`, `infra-builder`, `data-seeder` | sonnet | 계획/테스트 기반 구현 (Green 단계) |
| 4. Test | `/test` | vitest | — | 테스트 실행 및 통과 확인 |
| 5. Simplify | `/simplify` | 직접 수정 | — | 코드 품질·재사용성·효율성 검토 및 개선 (테스트 유지) |

### 유연한 실행

- **전체 프로세스**: `/plan` → `/tdd` → `/develop` → `/test` → `/simplify`
- **버그 수정**: `/bugfix` (재현 테스트 → 최소 수정 → 통과 확인)
- **기존 코드 개선**: `/simplify` → `/test`
- **테스트 추가**: `/tdd` → `/test`
- **계획만 수립**: `/plan`

### 버그 수정 워크플로우

```
/bugfix
  1. 재현 확인 — 원인 특정
  2. 실패 테스트 작성 — 버그를 재현하는 테스트 (Red)
  3. 최소 수정 — 버그만 고침, 관련 없는 변경 금지 (Green)
  4. 회귀 확인 — 전체 테스트 통과
  5. 정리 (선택) — `/simplify`로 핵심 로직 변경 시에만
```

- 한 번에 하나의 버그만 수정한다
- 수정 중 발견한 다른 문제는 별도 이슈로 등록한다
- 테스트 없이 수정하지 않는다

## 모델 할당 전략

| 역할 | 모델 | 근거 |
|------|------|------|
| 플래닝 (`plan-writer`) | opus | 복잡한 요구사항 분석, 아키텍처 설계 |
| 머지 (`merge-manager`) | opus | 충돌 해결, 통합 판단 |
| 개발 (`page-builder`, `infra-builder`, `data-seeder`) | sonnet | 빠른 구현, 비용 효율 |
| 정리 (`/simplify`) | — | 변경 코드 품질·재사용성·효율성 검토 및 수정 |

## Agent 목록

| 에이전트 | 역할 | 모델 | 트리거 |
|----------|------|------|--------|
| `plan-writer` | TDD 기반 구현 계획 수립 | opus | 새 기능 계획 시 |
| `merge-manager` | Gitflow 브랜치 머지 | opus | 브랜치 머지 시 |
| `infra-builder` | Docker/SQLite/OTel 인프라 구성 | sonnet | 인프라 변경 시 |
| `page-builder` | 대시보드 페이지 + API + 컴포넌트 구현 | sonnet | 페이지 개발 시 |
| `data-seeder` | 테스트 데이터 생성 및 파이프라인 검증 | sonnet | 데이터 검증 시 |

## 팀 구성 패턴

### 1. 인프라 팀
인프라 컴포넌트를 병렬로 구축할 때 사용한다.
- 팀원: `infra-builder` × 2 (SQLite 스키마 + OTel/Docker)

### 2. 대시보드 팀
대시보드 페이지를 병렬로 개발할 때 사용한다.
- 팀원: `page-builder` × 3 (각 페이지 독립 작업)
- 작업 디렉토리: `dashboard/`

### 3. 풀스택 팀
스키마 변경과 페이지를 동시에 개발할 때 사용한다.
- infra-builder: SQLite 스키마 + API
- page-builder: 프론트엔드 컴포넌트

### Agent Teams 실행 모드

**In-process 모드**를 사용한다.

- **Shift+Down**: 다음 팀원으로 전환
- **Shift+Up**: 이전 팀원으로 전환
- **Ctrl+T**: 태스크 리스트 토글

## Linear 연동

- **팀**: Argus (PIL)
- **프로젝트**: Argus
- 상태 흐름: `Todo` → `In Progress` → `Done`

### 라벨 체계

모든 이슈에 **유형 라벨 1개 + 영역 라벨 1개 이상**을 반드시 붙인다.

#### 유형 라벨

| 라벨 | 색상 | 용도 |
|------|------|------|
| `Feature` | 보라 | 새 기능 추가 |
| `Improvement` | 파랑 | 기존 기능 개선 |
| `Bug` | 빨강 | 버그 수정 |
| `Chore` | 회색 | 설정, 인프라, 리팩토링 등 비기능 작업 |

#### 영역 라벨

| 라벨 | 색상 | 용도 |
|------|------|------|
| `Infra` | 초록 | Docker, SQLite, OTel Collector |
| `Dashboard` | 하늘 | Next.js 대시보드 (페이지, 컴포넌트, API) |
| `Data` | 주황 | 데이터 파이프라인, 쿼리, 시드 |
| `Config` | 노랑 | 설정 변경 추적, Git diff |

#### 마일스톤 라벨

| 라벨 | 용도 |
|------|------|
| `M1` | 데이터 파이프라인 |
| `M2` | 개인 대시보드 |
| `M3` | 효율성 분석 |
| `M4` | 설정 변경 추적 |

### 이슈 작성 규칙

1. **제목은 명확한 동사로 시작한다** (예: "Overview 페이지 구현", "SQLite 스키마 추가")
2. **description에 구현 범위, 관련 파일, 수락 조건을 포함한다**
3. **유형 라벨 + 영역 라벨 + 마일스톤 라벨을 반드시 붙인다**
4. **작업 완료 후 코멘트로 결과를 기록한다** (생성/수정 파일, 변경사항)
5. **추후 작업이 발견되면 즉시 새 이슈로 등록한다**

### 이슈 예시

```
제목: Overview 페이지 구현 — 오늘의 요약 (세션수, 비용, 토큰)
라벨: Feature, Dashboard, M2
설명:
- GET /api/overview?agent_type=all API 라우트 구현
- StatsCard 컴포넌트로 세션수, 총비용, 토큰사용량 표시
- 에이전트 필터 탭 포함
- 수락 조건: 시드 데이터로 Overview 페이지 정상 렌더링
```

## 개발 워크플로우

```
1. Linear 이슈 확인/생성
2. /feature-start <이름>       → feature 브랜치 생성
3. cd dashboard && pnpm dev    → 대시보드 시작
4. POST /api/seed              → 테스트 데이터 시드
5. /plan                       → 구현 계획 수립
6. /tdd                        → 테스트 코드 작성 (Red)
7. /develop                    → 구현 (Green)
8. /test                       → 테스트 실행
9. /simplify                   → 코드 정리 (품질·재사용성·효율성)
10. /feature-finish            → develop에 머지
11. Linear 이슈 상태 업데이트   → Done
```

단계 5~9는 상황에 따라 일부만 실행하거나 중간부터 시작할 수 있다.

## 마일스톤

| M | 범위 | 핵심 파일 |
|---|------|-----------|
| M1 | 데이터 파이프라인 | `dashboard/src/lib/db.ts`, `dashboard/src/app/api/ingest/` |
| M2 | 개인 대시보드 | `dashboard/src/app/`, `dashboard/src/lib/queries.ts` |
| M3 | 효율성 분석 | `dashboard/src/lib/efficiency.ts`, `/efficiency` 페이지 |
| M4 | 설정 변경 추적 | `dashboard/src/lib/config-tracker.ts`, `/config-history` 페이지 |


<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

*No recent activity*
</claude-mem-context>