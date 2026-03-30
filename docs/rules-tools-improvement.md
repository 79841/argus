# Rules & Tools 페이지 개선 계획

## 현재 구조

### Rules 페이지 (`/rules`)

AI 코딩 에이전트의 설정 파일을 통합 조회·편집하는 페이지 (M4).

**구성:**
- FileTree (좌측 35%) — 프로젝트별·에이전트별 설정 파일 트리 탐색
- FileViewer (우측 65%) — 미리보기 + 편집 모드 전환, 저장 기능
- 에이전트 타입 필터 (All / Claude / Codex / Gemini)
- Markdown: frontmatter 카드, 구문 하이라이팅, TOC 사이드바
- JSON/TOML: 구문 색상 하이라이팅
- 콘텐츠 내 검색 (CSS Highlight API, `Cmd+F`)

**파일:**
| 파일 | 역할 |
|------|------|
| `app/(dashboard)/rules/page.tsx` | 페이지 컴포넌트 |
| `features/rules/components/file-tree.tsx` | 트리 네비게이션 |
| `features/rules/components/file-viewer.tsx` | 파일 뷰어 (미리보기 + 편집) |
| `features/rules/components/markdown-viewer.tsx` | Markdown 렌더링 |
| `features/rules/components/content-search.tsx` | 콘텐츠 내 검색 |
| `features/rules/components/toc-sidebar.tsx` | Markdown TOC |
| `features/rules/components/syntax-highlight.tsx` | JSON/TOML 하이라이팅 |
| `features/rules/hooks/use-config-files.ts` | 데이터 패칭·상태 관리 |

**API:**
| 엔드포인트 | 역할 |
|-----------|------|
| `GET /api/config-files` | 설정 파일 목록 (파일시스템 스캔) |
| `GET /api/config-history` | 설정 변경 이력 (SQLite) |
| `GET /api/config-history/compare` | 두 시점 간 설정 비교 |
| `GET /api/config-history/daily-metrics` | 일별 변경 메트릭 |

---

### Tools 페이지 (`/tools`)

AI 에이전트의 도구 사용 현황을 모니터링·분석하는 페이지.

**구성:**
- 상단 KPI 4개: 총 호출 수, 성공률, 평균 실행 시간, 고유 도구 수
- Overview 탭: Top 15 도구 막대 차트 + 카테고리 트리맵
- Details 탭: Skills / Agents / MCP 서버별 상세 테이블
- Trends 탭: 일별 도구 사용 추이 + 실패율 트렌드

**파일:**
| 파일 | 역할 |
|------|------|
| `app/(dashboard)/tools/page.tsx` | 페이지 컴포넌트 |
| `features/tools/components/top-tools-chart.tsx` | Top 도구 막대 차트 |
| `features/tools/components/category-treemap.tsx` | 카테고리 트리맵 |
| `features/tools/components/daily-trend-chart.tsx` | 일별 추이 차트 |
| `features/tools/components/fail-rate-trend-chart.tsx` | 실패율 트렌드 |
| `features/tools/components/details-section.tsx` | Details 탭 컨테이너 |
| `features/tools/components/tool-list-tab.tsx` | 재사용 도구 목록 테이블 |
| `features/tools/components/skills-tab.tsx` | Skills 탭 |
| `features/tools/components/agents-tab.tsx` | Agents 탭 |
| `features/tools/components/mcp-tab.tsx` | MCP 탭 |
| `features/tools/hooks/use-tools-data.ts` | 데이터 패칭 |
| `features/tools/lib/merge-tools.ts` | 등록·사용 데이터 머지 |

**API:**
| 엔드포인트 | 역할 |
|-----------|------|
| `GET /api/tools` | 도구 사용 통계 (SQLite) |
| `GET /api/tools/registered` | 등록된 도구 목록 (파일시스템 스캔) |

---

## 개선 항목

### R1. Rules — 편집 기능 제거

**현재:** FileViewer에 미리보기/편집 모드 전환, 저장 버튼이 있다.
**변경:** 읽기 전용으로 단순화. 편집/저장 관련 코드 제거.

**영향 범위:**
- `file-viewer.tsx` — 편집 모드 전환, textarea, 저장 버튼 제거
- `use-config-files.ts` — `saveConfig` 관련 상태·함수 제거
- 관련 서비스의 `saveConfig()` 메서드 제거

---

### R2. Rules — 설정 변경 이력 타임라인

**현재:** `/api/config-history`, `/api/config-history/compare`, `/api/config-history/daily-metrics` API가 존재하지만 UI에서 충분히 활용하지 않는다.
**변경:** 파일별 변경 이력을 타임라인으로 시각화하고, 두 시점 간 diff 비교 기능 제공.

**상세:**
- 선택한 파일의 변경 이력을 시간순 타임라인으로 표시
- 두 스냅샷을 선택하면 diff 뷰(추가/삭제 하이라이팅)로 비교
- "이 설정 변경 이후 비용/성능 변화" 같은 인사이트 연결 가능

---

### R3. Rules — 에이전트 간 설정 비교 뷰

**현재:** 에이전트 타입 필터로 하나씩 볼 수 있지만 나란히 비교는 불가.
**변경:** Claude / Codex / Gemini의 동일 목적 설정을 side-by-side로 비교.

**상세:**
- 예: 세 에이전트의 MCP 서버 설정, 허용 도구 목록, 에이전트 정의 등을 병렬 표시
- 프로젝트 단위로 "어떤 에이전트에 어떤 설정이 적용되어 있는지" 한눈에 파악

---

### T1. Tools — 도구/스킬/에이전트 상세 페이지

**현재:** Details 탭에서 테이블로만 확인 가능. 클릭 시 추가 정보 없음.
**변경:** `/tools/[name]` 라우트를 추가하여 개별 항목의 상세 페이지 제공.

**상세 페이지 구성안:**
- 기본 정보: 이름, 카테고리, 등록 상태(active/unused/unregistered), 스코프(project/global)
- 호출 추이: 일별 호출 수 라인 차트
- 성공률 추이: 일별 성공/실패 비율
- 평균 소요 시간 추이
- 관련 세션 목록: 이 도구를 사용한 최근 세션들 (세션 상세 페이지 링크)
- 설정 파일 링크: Rules 페이지의 해당 정의 파일로 이동 (R-T 연결)

---

### T2. Tools — 도구 호출 패턴 분석

**현재:** 개별 도구의 호출 수만 표시. 도구 간 관계는 보이지 않음.
**변경:** 세션 내 도구 호출 순서·패턴을 시각화.

**상세:**
- "Read → Edit → Bash" 같은 빈출 도구 시퀀스 표시
- Sankey 다이어그램 또는 호출 흐름 시각화
- "이 도구 다음에 주로 호출되는 도구" top 5

---

### T3. Tools — 실패 도구 드릴다운

**현재:** 실패율은 표시되지만, 실패 원인은 확인 불가.
**변경:** 실패율 높은 도구 클릭 시 실패 원인별 분류.

**상세:**
- 에러 유형별 그룹핑
- 실패가 발생한 세션 목록
- 시간대별 실패 패턴 (특정 시간대에 집중되는지)

---

### T4. Tools — 미사용 도구 정리 제안

**현재:** `unused` 상태 도구가 Details 탭에 표시되지만 별도 안내 없음.
**변경:** 미사용 도구를 모아 정리 가이드 제공.

**상세:**
- "N일간 사용되지 않은 도구" 요약 카드
- 도구별 마지막 사용일, 등록 위치 표시
- 해당 설정 파일 위치 안내 (정리를 위한 참고)

---

### C1. 공통 — Rules ↔ Tools 페이지 연결

**현재:** 두 페이지가 독립적으로 동작. 상호 참조 없음.
**변경:** 양방향 링크 제공.

**상세:**
- Rules에서 스킬/에이전트 정의 파일 조회 시, 해당 항목의 Tools 사용 통계 링크 표시
- Tools 상세 페이지(T1)에서 해당 도구의 설정 파일(Rules)로 바로 이동

---

## 우선순위 (미정)

| 항목 | 난이도 | 가치 | 비고 |
|------|--------|------|------|
| R1. 편집 기능 제거 | 낮음 | 중간 | 코드 단순화 |
| R2. 변경 이력 타임라인 | 중간 | 높음 | 기존 API 활용 |
| R3. 에이전트 간 비교 | 중간 | 중간 | 새 UI 필요 |
| T1. 상세 페이지 | 중간 | 높음 | 새 라우트 + API |
| T2. 호출 패턴 분석 | 높음 | 중간 | 새 쿼리 + 시각화 |
| T3. 실패 드릴다운 | 중간 | 중간 | 기존 데이터 활용 가능 |
| T4. 미사용 도구 정리 | 낮음 | 낮음 | 기존 데이터 활용 가능 |
| C1. 페이지 간 연결 | 낮음 | 중간 | T1 완료 후 |
