# Argus 대시보드 UI 개편 요구사항

## 1. 공통 레이아웃 원칙

```
┌──────┬──────────────────────────────────────────┬──────┐
│      │            Top Bar (h-10)                 │      │
│      │  [에이전트 필터] [프로젝트] [기간 선택]     │      │
│      ├──────────────────────────────────────────┤      │
│      │                                          │Right │
│ Nav  │           Content Area                   │Side  │
│(w-14)│  (h-[calc(100vh-top-bottom)])            │bar   │
│      │                                          │(w-64)│
│ icon │  ┌──────────────────────────────────────┐│      │
│ only │  │ 각 영역은 독립적으로 스크롤           ││ 접기 │
│      │  │ 페이지 전체는 스크롤되지 않음         ││ 가능 │
│      │  └──────────────────────────────────────┘│      │
│      ├──────────────────────────────────────────┤      │
│      │            Bottom Bar (h-8)              │      │
│      │  [수집 상태 LED] [DB 통계] [마지막 동기화] │      │
└──────┴──────────────────────────────────────────┴──────┘
```

- **전체 페이지 `h-screen overflow-hidden`** — 페이지 스크롤 없음
- **Nav 축소**: w-52 텍스트 → **w-14 아이콘만** + hover 시 tooltip
- **Top Bar**: h-10 고정, 전역 필터 (에이전트/프로젝트/기간) — 모든 페이지 공통
- **Bottom Bar**: h-8 고정, 시스템 상태 표시 — 모든 페이지 공통
- **Right Sidebar**: w-64, 접기 가능 (토글 버튼), 페이지별 컨텍스트 패널
- **Content Area**: `h-[calc(100vh-top-bottom)]` 고정 높이, 내부 패널만 스크롤
- **모든 차트/테이블 영역**: `overflow-y-auto`로 독립 스크롤
- **반응형**: 최소 1280px 기준, flex/grid로 패널 비율 조절

### Top Bar

모든 페이지에 공통으로 표시되는 전역 필터 바.

```
┌─────────────────────────────────────────────────────────────┐
│ [All ▼ Claude ▼ Codex ▼ Gemini]  [Project ▼]  [7일 ▼ 📅]  │
└─────────────────────────────────────────────────────────────┘
```

| 요소 | 설명 |
|------|------|
| 에이전트 필터 | 탭 또는 토글 — All/Claude/Codex/Gemini |
| 프로젝트 필터 | 드롭다운 — All + 프로젝트 목록 |
| 기간 선택 | 프리셋(오늘/7일/30일) + 캘린더 커스텀 (DateRangePicker, PER-30) |

필터 변경 시 **모든 페이지의 데이터가 연동**됨 (URL searchParams 기반).

### Bottom Bar

모든 페이지에 공통으로 표시되는 시스템 상태 바.

```
┌─────────────────────────────────────────────────────────────┐
│ ● Claude 2m ago  ● Codex 4d ago  ○ Gemini no data          │
│                          DB: 156MB · 9,400 records · Sync 5m ago │
└─────────────────────────────────────────────────────────────┘
```

| 요소 | 설명 |
|------|------|
| 수집 상태 LED | 에이전트별 상태 표시 — ● 초록(1시간 이내) / ● 노랑(24시간 이내) / ○ 회색(없음) |
| 마지막 수신 | 에이전트별 "Nm ago" / "Nd ago" |
| DB 통계 | 파일 크기, 총 레코드 수 |
| 가격 동기화 | LiteLLM 마지막 동기화 시각 |

### Right Sidebar

접기 가능한(collapsible) 우측 패널. 페이지별로 다른 콘텐츠 표시.

```
┌────────────────────┐
│ [✕] Quick View     │
├────────────────────┤
│                    │
│  (페이지별 콘텐츠)  │
│                    │
└────────────────────┘
```

| 페이지 | Right Sidebar 콘텐츠 |
|--------|---------------------|
| Dashboard | **Alerts** — 고비용 세션 경고, 실패율 높은 도구 경고, 수집 중단 알림 |
| Sessions | **Session Quick Info** — 선택된 세션의 요약 통계, 빠른 액션 (비용 상세, 도구 목록) |
| Cost | **Budget** — 일일/주간 예산 설정, 현재 소비율, 초과 예측 게이지 |
| Tools | **Tool Insights** — 실패율 높은 도구 Top 5, 최근 실패 로그, 도구 추천 |
| Settings | 사용하지 않음 (접힌 상태) |

#### 접기 동작
- 토글 버튼으로 열기/닫기 (기본: 열림)
- 닫으면 Content Area가 전체 폭 사용
- 상태는 localStorage에 저장

## 2. 페이지 구조 (5개)

| # | 경로 | 이름 | 역할 |
|---|------|------|------|
| 1 | `/` | Dashboard | 실시간 종합 현황 — 핵심 지표 + 추이 + 활동 |
| 2 | `/sessions` | Sessions | 세션 탐색기 — 목록 + 상세 (master-detail) |
| 3 | `/cost` | Cost | 비용 분석 — 모델별·프로젝트별·일별 비용 심층 분석 |
| 4 | `/tools` | Tools | 도구 분석 — Built-in + Orchestration 통합 |
| 5 | `/settings` | Settings | 설정 — 에이전트 연동, 가격 동기화, 데이터 관리 |

**삭제 대상**: `/daily` (Dashboard 통합), `/efficiency` (Dashboard 통합), `/config-history` (Settings 통합), `/setup` (Settings 통합)

## 3. Nav 개편

```
현재 (w-52, 7개)              →    개편 (w-14, 5개)

┌──────────────────┐              ┌──────┐
│ 🏠 Overview      │              │  📊  │ ← tooltip: "Dashboard"
│ 📈 Daily         │              │  💬  │ ← tooltip: "Sessions"
│ 💬 Sessions      │              │  💰  │ ← tooltip: "Cost"
│ 🔧 Tools         │              │  🔧  │ ← tooltip: "Tools"
│ ⚡ Efficiency    │              │  ⚙️  │ ← tooltip: "Settings"
│ 📋 Config History│              │      │
│ ⚙️ Setup         │              │ ──── │
│                  │              │  🌙  │ ← 다크모드 토글
└──────────────────┘              └──────┘
```

## 4. Dashboard (`/`)

실시간 종합 현황. 앱 실행 시 가장 먼저 보는 화면.

필터는 Top Bar에서 공통 제공. Content Area만 표시.

```
├──────────────┬───────────────────────────────────────────┤
│              │                                           │
│  KPI Cards   │         Cost Trend (LineChart)            │
│  (4 cards    │         - 에이전트별 색상 구분              │
│   2x2 grid)  │         - 설정 변경 마커                   │
│              │                                           │
│  Sessions    ├───────────────────────────────────────────┤
│  Cost        │                                           │
│  Tokens      │         Token Trend (BarChart)            │
│  Cache Rate  │         - input/output/cache 스택          │
│              │                                           │
├──────────────┼──────────────────┬────────────────────────┤
│              │                  │                        │
│  Model       │  Recent Sessions │  Tool Usage            │
│  Pie Chart   │  (테이블, 스크롤) │  (가로 바 차트)         │
│              │  최근 10개       │  상위 15개 도구          │
│              │                  │                        │
└──────────────┴──────────────────┴────────────────────────┘
```

### 레이아웃: 3행, 높이 비율 30%/30%/40%

| 영역 | 컴포넌트 | 데이터 소스 |
|------|---------|-----------|
| (Top Bar) | 에이전트 필터, 프로젝트 필터, DateRangePicker — 공통 | URL searchParams |
| KPI 1 | Sessions — 기간 내 세션 수 | `GET /api/overview` |
| KPI 2 | Total Cost — 비용 합계, hover 시 계산 방식 tooltip | `GET /api/overview` |
| KPI 3 | Tokens — input + output + cache 합계, 각각 표시 | `GET /api/overview` |
| KPI 4 | Cache Hit Rate — 캐시 효율 %, 전기간 대비 변화율 | `GET /api/overview` |
| Cost Trend | 일별 비용 LineChart, 에이전트별 색상, 설정 변경 마커 | `GET /api/daily` |
| Token Trend | 일별 토큰 BarChart, cache/input/output 스택 | `GET /api/daily` |
| Model Pie | 모델별 비용 비율 도넛 차트 | `GET /api/models` |
| Recent Sessions | 최근 세션 10개 미니 테이블, 클릭 시 `/sessions?id=` 이동 | `GET /api/sessions?limit=10` |
| Tool Usage | 상위 15개 도구 가로 바 차트, hover 시 성공률 표시 | `GET /api/tools` |

### 상호작용
- 필터: Top Bar에서 공통 제공 (에이전트/프로젝트/기간)
- 자동 갱신: 30초 polling
- Right Sidebar: Alerts (고비용 세션 경고, 수집 중단 알림)

## 5. Sessions (`/sessions`)

Master-Detail 패턴의 세션 탐색기.

```
┌──────────────────────────────────────────────────────────┐
│ (필터는 Top Bar 공통)                                     │
├──────────────────────────┬───────────────────────────────┤
│                          │                               │
│   Session List           │   Session Detail              │
│   (스크롤 영역)           │   (스크롤 영역)                │
│                          │                               │
│   ┌────────────────────┐ │   ┌─────────────────────────┐ │
│   │ ● Claude  sonnet   │ │   │ Summary                 │ │
│   │   $12.34  45min    │ │   │ 모델, 비용, 토큰, 시간   │ │
│   │   argus  3/14      │ │   ├─────────────────────────┤ │
│   ├────────────────────┤ │   │ Prompt Timeline         │ │
│   │ ● Codex  gpt-4.1  │ │   │ (세로 타임라인)           │ │
│   │   $3.21   12min   │ │   │                         │ │
│   │   web-app  3/13    │ │   │ prompt 1 ─ $2.1        │ │
│   ├────────────────────┤ │   │   ├ api_request (1.2s)  │ │
│   │ ...                │ │   │   ├ Read (30ms)         │ │
│   │                    │ │   │   ├ Edit (5ms)          │ │
│   │                    │ │   │   └ api_request (0.8s)  │ │
│   │                    │ │   │ prompt 2 ─ $1.5        │ │
│   │                    │ │   │   ├ ...                 │ │
│   │                    │ │   │                         │ │
│   │                    │ │   ├─────────────────────────┤ │
│   │                    │ │   │ Cost Breakdown          │ │
│   │                    │ │   │ (프롬프트별 비용 바차트)   │ │
│   │                    │ │   └─────────────────────────┘ │
│   └────────────────────┘ │                               │
│   Pagination / ∞ scroll  │                               │
├──────────────────────────┴───────────────────────────────┤
│ Status Bar: 총 N개 세션, 필터된 M개, 총 비용 $X.XX        │
└──────────────────────────────────────────────────────────┘
```

### 레이아웃: 좌우 분할 (좌 35% / 우 65%), 각각 독립 스크롤

#### 좌측: Session List
- 세션 카드: 에이전트 색상 dot + 모델 + 비용 + 시간 + 프로젝트 + 날짜
- 정렬: 최신순(기본), 비용순, 토큰순
- 검색: session_id, model, project
- 무한 스크롤 또는 페이지네이션 (100건씩)
- 선택 시 우측 업데이트 + 하이라이트

#### 우측: Session Detail
- Summary: 모델, 에이전트, 총 비용, 총 토큰(input/output/cache), 벽시계 시간, 요청 수
- Prompt Timeline: prompt_id 그룹핑, 각 프롬프트별 api_request + tool_result 시간순, 프롬프트별 비용 표시
- Cost Breakdown: 프롬프트별 비용 가로 바 차트
- 비어있을 때: "세션을 선택하세요" 안내

## 6. Cost (`/cost`)

비용 심층 분석.

```
┌──────────────────────────────────────────────────────────┐
│ (필터는 Top Bar 공통)                                     │
├──────────────────────────────┬───────────────────────────┤
│                              │                           │
│  Daily Cost Trend            │  Model Cost Breakdown     │
│  (Area Chart, 스택)           │  (Treemap 또는 바 차트)    │
│  에이전트별 색상              │  모델별 비용 비율          │
│                              │                           │
├──────────────────────────────┼───────────────────────────┤
│                              │                           │
│  Cost by Project             │  Cost Efficiency          │
│  (가로 바 차트)               │  (에이전트별 비교)         │
│  프로젝트별 비용 비교         │  - 캐시 효율              │
│                              │  - 토큰 효율              │
│                              │  - 전기간 대비 변화율      │
├──────────────────────────────┴───────────────────────────┤
│                                                          │
│  High Cost Sessions (테이블, 스크롤)                       │
│  비용 상위 세션 목록 — 에이전트, 모델, 비용, 토큰, 원인 태그 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 레이아웃: 3행 (33%/33%/34%), 상단 2행 좌우 분할

| 영역 | 설명 |
|------|------|
| Daily Cost Trend | Area Chart, 에이전트별 스택, 설정 변경 마커 |
| Model Cost Breakdown | Treemap — 면적 = 비용, 색상 = 에이전트 |
| Cost by Project | 프로젝트별 비용 가로 바 차트 |
| Cost Efficiency | 에이전트별 캐시 효율(%), 토큰 효율(output/input), 전기간 대비 ↑↓% |
| High Cost Sessions | 비용 상위 20개 세션 테이블, 클릭 시 `/sessions?id=` 이동 |

## 7. Tools (`/tools`)

도구 사용 분석.

```
┌──────────────────────────────────────────────────────────┐
│ (필터는 Top Bar 공통)                                     │
├──────────────────────────────┬───────────────────────────┤
│                              │                           │
│  Tool Invocation Treemap     │  Tool Category Summary    │
│  (면적 = 호출 수)             │  (카테고리별 집계 카드)    │
│  색상 = 카테고리             │  File Read: 1,200 calls   │
│                              │  Shell: 800 calls         │
│                              │  Orchestration: 50 calls  │
├──────────────────────────────┴───────────────────────────┤
│                                                          │
│  Tool Detail Table (스크롤)                                │
│  Tool | Category | Calls | Success | Fail | Rate | Cost% │
├──────────────────────────────────────────────────────────┤
│  Orchestration Detail (스크롤)                             │
│  Agent/Skill/MCP 개별 도구 테이블                          │
└──────────────────────────────────────────────────────────┘
```

### 레이아웃: 3행 (35%/35%/30%), 상단 좌우 분할

| 영역 | 설명 |
|------|------|
| Treemap | 면적 = 호출 수, 색상 = 카테고리 (getToolCategory 활용) |
| Category Summary | 카테고리별 집계 카드 |
| Tool Detail Table | 전체 도구 통합 테이블 — 호출수, 성공, 실패, 실패율(경고), 비용 기여도(%) |
| Orchestration Detail | Agent/Skill/MCP 개별 도구 테이블 |

## 8. Settings (`/settings`)

설정, 연동, 데이터 관리 통합.

```
┌──────────────────────────────────────────────────────────┐
│ (Top Bar 공통, Right Sidebar 미사용)                       │
├──────────────────────────────┬───────────────────────────┤
│                              │                           │
│  Agent Setup Guide           │  Pricing                  │
│  (탭: Claude/Codex/Gemini)   │  - 마지막 동기화 시각      │
│  현재 수집 상태 표시          │  - 모델별 단가 테이블      │
│  설정 코드 블록              │  - [수동 동기화] 버튼      │
│                              │                           │
├──────────────────────────────┼───────────────────────────┤
│                              │                           │
│  Config History              │  Data Management          │
│  (설정 변경 타임라인)         │  - DB 크기, 레코드 수     │
│  좌: 리스트, 우: diff        │  - [내보내기] CSV/JSON    │
│                              │  - [정리] 기간/에이전트별  │
│                              │                           │
└──────────────────────────────┴───────────────────────────┘
```

### 레이아웃: 2행 2열 그리드, 각 패널 독립 스크롤

| 영역 | 설명 |
|------|------|
| Agent Setup | 에이전트별 설정 가이드, 탭으로 전환 |
| Pricing | pricing_model 테이블, LiteLLM 동기화 상태, 수동 동기화 버튼 |
| Config History | 설정 변경 타임라인 + diff 뷰어 |
| Data Management | DB 통계, CSV/JSON 내보내기, 기간별 데이터 정리 |

## 9. 필요한 API

### 신규

| API | 메서드 | 설명 |
|-----|--------|------|
| `GET /api/sessions/[id]` | GET | 세션 상세 (프롬프트별 이벤트 그룹) |
| `GET /api/cost/high-sessions` | GET | 비용 상위 세션 목록 |
| `GET /api/data/stats` | GET | DB 통계 (크기, 레코드 수) |
| `POST /api/data/export` | POST | CSV/JSON 내보내기 |
| `POST /api/data/cleanup` | POST | 기간별 데이터 정리 |

### 기존 변경

| API | 변경 |
|-----|------|
| `GET /api/overview` | `from`, `to` 파라미터 추가, cache_hit_rate 반환 |
| `GET /api/daily` | `from`, `to` 파라미터 추가 |
| `GET /api/sessions` | `sort`, `offset`, `limit`, `from`, `to` 파라미터 추가 |

## 10. 구현 순서

| 순서 | 이슈 | 설명 | 의존 |
|------|------|------|------|
| 1 | PER-39 | Nav 아이콘 모드 축소 | — |
| 2 | PER-40 | h-screen 고정 레이아웃 | — |
| 3 | PER-30 | DateRangePicker | — |
| 4 | PER-42 | Dashboard 개편 | 1, 2, 3 |
| 5 | PER-43 | Sessions 개편 | 2, 3 |
| 6 | PER-44 | Cost 페이지 | 2, 3 |
| 7 | PER-45 | Tools 개편 | 2 |
| 8 | PER-41 | Settings 통합 | 2 |
| 9 | PER-37 | 실시간 모니터링 | 4 |
