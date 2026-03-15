# Argus Design System

Linear 2025 스타일 "모노크롬 + 비비드 액센트" 디자인 시스템.

## 1. 디자인 원칙

### 1.1 모노크롬 기반 + 에이전트 액센트

무채색(neutral) 팔레트가 UI의 95%를 구성한다. 색상은 오직 3가지 에이전트 액센트와 상태 색상에만 사용한다.

- **배경, 카드, 보더, 텍스트**: 전부 무채색 (oklch chroma = 0)
- **유일한 색상 요소**: 에이전트 도트, 에이전트 배지, 차트 라인, 상태 표시
- **색상 사용 원칙**: 색상이 나타나면 반드시 의미가 있어야 한다 (에이전트 구분 또는 상태 전달)

### 1.2 일관성 원칙

- **간격**: 4px 기반 스케일 (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- **라운딩**: 카드 8px, 버튼/배지 6px, 도트 full, 입력 6px
- **보더**: 1px, 투명도 기반 (`oklch(1 0 0 / 10%)` 다크, `oklch(0 0 0 / 8%)` 라이트)
- **그림자**: 최소 사용. 카드에 미세 그림자만 허용

### 1.3 접근성

- **텍스트 대비**: WCAG AA 기준 4.5:1 이상 (본문), 3:1 이상 (대형 텍스트)
- **포커스 상태**: `ring-2 ring-offset-2` 패턴, 에이전트 테마 색상 사용
- **모션**: `prefers-reduced-motion` 대응, 트랜지션 200ms 이하

---

## 2. 색상 시스템

### 2.1 중립색 팔레트 (OKLCH 기반)

모든 중립색은 chroma = 0으로 순수 무채색이다.

#### 라이트 모드

| 토큰 | OKLCH 값 | 용도 |
|------|----------|------|
| `--bg-base` | `oklch(0.985 0 0)` | 페이지 배경 |
| `--bg-raised` | `oklch(1 0 0)` | 카드, 팝오버 배경 |
| `--bg-overlay` | `oklch(0.97 0 0)` | 모달 오버레이, muted 배경 |
| `--bg-sunken` | `oklch(0.955 0 0)` | 인셋 영역, 코드 블록 배경 |
| `--border-default` | `oklch(0 0 0 / 8%)` | 기본 보더 |
| `--border-subtle` | `oklch(0 0 0 / 5%)` | 약한 보더 (카드 내부 구분선) |
| `--border-strong` | `oklch(0 0 0 / 15%)` | 강한 보더 (활성 입력) |
| `--text-primary` | `oklch(0.145 0 0)` | 본문 텍스트 |
| `--text-secondary` | `oklch(0.40 0 0)` | 보조 텍스트, 레이블 |
| `--text-tertiary` | `oklch(0.556 0 0)` | 비활성 텍스트, 힌트 |
| `--text-disabled` | `oklch(0.708 0 0)` | 비활성 상태 |
| `--fill-hover` | `oklch(0 0 0 / 4%)` | 호버 상태 배경 |
| `--fill-active` | `oklch(0 0 0 / 8%)` | 액티브/선택 상태 배경 |

#### 다크 모드

| 토큰 | OKLCH 값 | 용도 |
|------|----------|------|
| `--bg-base` | `oklch(0.13 0 0)` | 페이지 배경 |
| `--bg-raised` | `oklch(0.175 0 0)` | 카드, 팝오버 배경 |
| `--bg-overlay` | `oklch(0.22 0 0)` | 모달 오버레이, muted 배경 |
| `--bg-sunken` | `oklch(0.10 0 0)` | 인셋 영역, 코드 블록 배경 |
| `--border-default` | `oklch(1 0 0 / 10%)` | 기본 보더 |
| `--border-subtle` | `oklch(1 0 0 / 6%)` | 약한 보더 |
| `--border-strong` | `oklch(1 0 0 / 18%)` | 강한 보더 |
| `--text-primary` | `oklch(0.93 0 0)` | 본문 텍스트 |
| `--text-secondary` | `oklch(0.65 0 0)` | 보조 텍스트 |
| `--text-tertiary` | `oklch(0.50 0 0)` | 비활성 텍스트 |
| `--text-disabled` | `oklch(0.35 0 0)` | 비활성 상태 |
| `--fill-hover` | `oklch(1 0 0 / 6%)` | 호버 상태 배경 |
| `--fill-active` | `oklch(1 0 0 / 10%)` | 액티브/선택 상태 배경 |

### 2.2 에이전트 액센트 색상

에이전트 색상은 UI에서 유일한 유채색이다. OKLCH 기반으로 정의하여 지각적 균일성을 보장한다.

| 에이전트 | Primary | Muted (10%) | Subtle (5%) | 용도 |
|---------|---------|-------------|-------------|------|
| **Claude** | `oklch(0.70 0.17 45)` (#f97316 근사) | `oklch(0.70 0.17 45 / 10%)` | `oklch(0.70 0.17 45 / 5%)` | 도트, 배지, 차트 라인 |
| **Codex** | `oklch(0.72 0.17 165)` (#10b981 근사) | `oklch(0.72 0.17 165 / 10%)` | `oklch(0.72 0.17 165 / 5%)` | 도트, 배지, 차트 라인 |
| **Gemini** | `oklch(0.62 0.17 255)` (#3b82f6 근사) | `oklch(0.62 0.17 255 / 10%)` | `oklch(0.62 0.17 255 / 5%)` | 도트, 배지, 차트 라인 |

다크 모드에서는 lightness를 +0.08 올려 가시성을 확보한다.

| 에이전트 | Dark Primary |
|---------|-------------|
| **Claude** | `oklch(0.78 0.17 45)` |
| **Codex** | `oklch(0.80 0.17 165)` |
| **Gemini** | `oklch(0.70 0.17 255)` |

### 2.3 상태 색상

상태 색상은 에이전트 색상과 혼동되지 않도록 hue를 구분한다.

| 상태 | 라이트 | 다크 | 용도 |
|------|--------|------|------|
| **Success** | `oklch(0.65 0.18 150)` | `oklch(0.75 0.18 150)` | 성공, 캐시 히트 |
| **Warning** | `oklch(0.75 0.15 85)` | `oklch(0.82 0.15 85)` | 경고, 제한 근접 |
| **Error** | `oklch(0.58 0.22 27)` | `oklch(0.70 0.19 22)` | 오류, 실패, 초과 |
| **Info** | `oklch(0.65 0.15 240)` | `oklch(0.72 0.15 240)` | 정보, 안내 |

### 2.4 shadcn/ui 변수 매핑

기존 shadcn/ui CSS 변수를 새 토큰으로 매핑한다. 기존 변수명은 유지하여 shadcn 컴포넌트 호환성을 보장한다.

```css
:root {
  /* shadcn 호환 매핑 */
  --background: var(--bg-base);
  --foreground: var(--text-primary);
  --card: var(--bg-raised);
  --card-foreground: var(--text-primary);
  --popover: var(--bg-raised);
  --popover-foreground: var(--text-primary);
  --primary: var(--text-primary);           /* 버튼, 활성 nav */
  --primary-foreground: var(--bg-base);
  --secondary: var(--bg-overlay);
  --secondary-foreground: var(--text-primary);
  --muted: var(--bg-overlay);
  --muted-foreground: var(--text-tertiary);
  --accent: var(--fill-active);
  --accent-foreground: var(--text-primary);
  --destructive: var(--status-error);
  --border: var(--border-default);
  --input: var(--border-default);
  --ring: var(--text-disabled);
}
```

---

## 3. 타이포그래피

Geist Sans (본문) + Geist Mono (코드, 숫자) 조합을 유지한다.

### 3.1 크기/웨이트 스케일

| 토큰 | 크기 | 웨이트 | 행간 | 용도 |
|------|------|--------|------|------|
| `text-page-title` | 20px | 700 (bold) | 28px | 페이지 제목 (h1) |
| `text-section-title` | 14px | 600 (semibold) | 20px | 섹션 제목 (카드 헤더) |
| `text-body` | 13px | 400 (normal) | 20px | 본문 텍스트 |
| `text-body-medium` | 13px | 500 (medium) | 20px | 강조 본문 |
| `text-label` | 11px | 500 (medium) | 16px | 레이블, KPI 타이틀 |
| `text-label-upper` | 10px | 600 (semibold) | 14px | 대문자 레이블, 상태 배지 |
| `text-data` | 24px | 700 (bold) | 32px | KPI 값 (숫자) |
| `text-data-sm` | 18px | 600 (semibold) | 24px | 보조 KPI 값 |
| `text-caption` | 11px | 400 (normal) | 16px | 캡션, 보조 설명 |
| `text-code` | 12px | 400 (normal) | 18px | 코드, 모노스페이스 |
| `text-micro` | 10px | 500 (medium) | 14px | 히트맵 축 레이블, 매우 작은 텍스트 |

### 3.2 숫자 표기 규칙

- 모든 숫자에 `tabular-nums` (고정폭 숫자) 적용
- 비용: `$0.00` (소수점 2자리), 소수점 이하 상세 시 4자리
- 토큰: 1K 이상 `1.2K`, 1M 이상 `1.2M`
- 퍼센트: `85.0%` (소수점 1자리)
- 시간: `3.2s`, `1.5m`, `2h 15m`

---

## 4. 간격 시스템

### 4.1 기본 스케일 (4px 기반)

| 토큰 | 값 | Tailwind |
|------|-----|----------|
| `space-0.5` | 2px | `p-0.5` |
| `space-1` | 4px | `p-1` |
| `space-1.5` | 6px | `p-1.5` |
| `space-2` | 8px | `p-2` |
| `space-3` | 12px | `p-3` |
| `space-4` | 16px | `p-4` |
| `space-5` | 20px | `p-5` |
| `space-6` | 24px | `p-6` |
| `space-8` | 32px | `p-8` |
| `space-10` | 40px | `p-10` |

### 4.2 컴포넌트별 간격 규칙

| 컨텍스트 | 내부 패딩 | 간격 (gap) |
|---------|----------|-----------|
| **페이지 컨텐츠** | `px-6 py-4` | — |
| **카드 (Card)** | header: `px-4 pt-4 pb-1`, content: `px-4 pb-4` | — |
| **KPI 카드 그리드** | — | `gap-3` |
| **카드 간 그리드** | — | `gap-4` |
| **필터 바** | `px-4 py-2.5` | `gap-3` |
| **테이블 셀** | `px-4 py-2` | — |
| **배지** | `px-1.5 py-0.5` | — |
| **버튼 (sm)** | `px-3 py-1.5` | — |
| **네비게이션 항목** | `px-3 py-2` | `gap-2` |

---

## 5. 재사용 가능한 UI 컴포넌트

### 5.1 현재 상태 분석

현재 컴포넌트에서 발견된 문제점:
1. **KPI 카드가 3곳에서 각각 다르게 구현됨** — `page.tsx` (DeltaBadge 인라인), `usage/page.tsx` (KpiCard 로컬), `tools/page.tsx` (KpiCards 로컬)
2. **필터 바가 페이지마다 다르게 구현됨** — Sessions, Usage, Tools 각각 자체 필터 구현
3. **빈 상태 표시가 통일되지 않음** — `"No data"`, `"No sessions"`, `"Loading..."` 등 하드코딩
4. **테이블 스타일이 인라인으로 반복됨** — Usage Models, Tools Details 등
5. **에이전트 도트가 inline style과 Tailwind class 혼용**
6. **차트 스타일이 개별 컴포넌트마다 다름** — CartesianGrid opacity, 축 fontSize 등

### 5.2 새로 만들거나 개선할 컴포넌트

#### KpiCard (신규 — 통합)

현재 3곳에 흩어진 KPI 카드를 하나로 통합한다.

```
위치: src/components/ui/kpi-card.tsx
Props:
  - label: string              — 상단 레이블 (text-label-upper 스타일)
  - value: string              — 메인 값 (text-data 스타일)
  - sub?: string               — 보조 설명 (text-caption 스타일)
  - delta?: number | null      — 변화율 (%, 화살표 + 색상)
  - deltaInverted?: boolean    — true이면 양수가 나쁜 것 (비용 등)
  - icon?: LucideIcon          — 선택적 아이콘
  - loading?: boolean          — 스켈레톤 표시

디자인:
  - 카드 배경: bg-raised
  - 보더: border-subtle
  - 레이블: uppercase, tracking-wider, text-tertiary
  - 값: text-data, tabular-nums
  - delta: text-micro, success/error 색상
```

#### DataTable (신규)

공통 테이블 래퍼. Usage Models, Tools Details, Efficiency 테이블을 통합한다.

```
위치: src/components/ui/data-table.tsx
Props:
  - columns: Column[]          — { key, label, align, format, width }
  - data: Record<string, unknown>[]
  - emptyMessage?: string
  - highlightOnHover?: boolean  — hover:bg-fill-hover
  - sortable?: boolean
  - stickyHeader?: boolean

디자인:
  - 헤더: bg-sunken, text-label, uppercase
  - 행: border-subtle 구분선
  - 호버: fill-hover
  - 정렬 아이콘: text-disabled
```

#### ChartCard (신규)

차트를 감싸는 공통 카드. 제목 + 높이 + 빈 상태를 통합한다.

```
위치: src/components/ui/chart-card.tsx
Props:
  - title: string
  - height?: number             — 기본 280
  - loading?: boolean
  - empty?: boolean
  - emptyMessage?: string
  - actions?: React.ReactNode   — 우측 상단 액션 (탭 등)
  - children: React.ReactNode

디자인:
  - title: text-section-title
  - 빈 상태: 중앙 정렬, text-tertiary, 아이콘
  - 로딩: 스켈레톤 애니메이션
```

#### FilterBar (신규 — 통합)

페이지 상단 필터 영역 통합.

```
위치: src/components/filter-bar.tsx
Props:
  - children: React.ReactNode   — 필터 요소들 (AgentFilter, ProjectFilter, DateRangePicker 등)

디자인:
  - border-b, px-4, py-2.5
  - flex, items-center, gap-3
  - bg-base (스크롤 시 backdrop-blur)
```

#### StatusBadge (신규)

상태를 표시하는 작은 배지.

```
위치: src/components/ui/status-badge.tsx
Props:
  - status: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  - label: string
  - size?: 'sm' | 'md'

디자인:
  - 배경: 상태 색상 5% 투명도
  - 텍스트: 상태 색상
  - 테두리: 없음
  - text-label-upper
```

#### AgentDot (신규)

에이전트 색상 도트. 현재 inline style로 반복되는 패턴을 컴포넌트화.

```
위치: src/components/ui/agent-dot.tsx
Props:
  - agent: AgentType
  - size?: 'xs' | 'sm' | 'md'  — 6px, 8px, 10px
  - pulse?: boolean             — 활성 세션 표시용 ping 애니메이션

디자인:
  - rounded-full
  - 에이전트 primary 색상
  - pulse: 외곽 ping 애니메이션
```

#### AgentBadge (신규)

에이전트 이름 배지. 현재 여러 곳에서 반복.

```
위치: src/components/ui/agent-badge.tsx
Props:
  - agent: AgentType
  - size?: 'sm' | 'md'

디자인:
  - 배경: 에이전트 색상
  - 텍스트: white
  - text-label-upper (sm), text-label (md)
  - 라운드: rounded-md
```

#### SectionHeader (신규)

섹션 제목 + 선택적 우측 액션.

```
위치: src/components/ui/section-header.tsx
Props:
  - title: string
  - description?: string
  - actions?: React.ReactNode

디자인:
  - title: text-section-title
  - description: text-caption, text-tertiary
  - actions: 우측 정렬
```

#### EmptyState (신규)

빈 데이터 상태 표시.

```
위치: src/components/ui/empty-state.tsx
Props:
  - icon?: LucideIcon           — 기본: Inbox
  - title?: string              — 기본: "No data"
  - description?: string
  - action?: { label: string; onClick: () => void }

디자인:
  - 중앙 정렬
  - 아이콘: size-10, text-disabled, opacity-40
  - title: text-body-medium, text-secondary
  - description: text-caption, text-tertiary
  - 최소 높이: h-40
```

#### LoadingSkeleton (개선)

현재 `animate-pulse rounded-xl bg-muted` 인라인 패턴을 컴포넌트화.

```
위치: src/components/ui/skeleton.tsx (기존 shadcn 확장)
Props:
  - variant: 'card' | 'chart' | 'table-row' | 'text'
  - count?: number              — 반복 횟수

디자인:
  - bg-sunken
  - animate-pulse
  - 각 variant별 기본 크기 프리셋
```

---

## 6. 차트 스타일 가이드

### 6.1 공통 차트 테마

모든 Recharts 차트에 적용할 공통 설정.

```
위치: src/lib/chart-theme.ts

export const CHART_THEME = {
  // 그리드
  grid: {
    strokeDasharray: '3 3',
    stroke: 'var(--border-subtle)',
    strokeOpacity: 0.6,
  },

  // 축
  axis: {
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    fill: 'var(--text-tertiary)',
    tickLine: false,
    axisLine: { stroke: 'var(--border-default)' },
  },

  // 툴팁
  tooltip: {
    containerStyle: {
      backgroundColor: 'var(--bg-raised)',
      border: '1px solid var(--border-default)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px oklch(0 0 0 / 10%)',
      padding: '8px 12px',
    },
    labelStyle: {
      fontSize: 11,
      color: 'var(--text-secondary)',
      marginBottom: 4,
    },
    itemStyle: {
      fontSize: 13,
      color: 'var(--text-primary)',
    },
  },

  // 레전드
  legend: {
    fontSize: 11,
    iconType: 'circle',
    iconSize: 8,
  },
}
```

### 6.2 에이전트별 차트 색상

차트에서 에이전트를 표현할 때 사용하는 색상.

| 에이전트 | 라인/영역 | 영역 투명도 |
|---------|----------|-----------|
| Claude | `var(--agent-claude)` | 0.15 |
| Codex | `var(--agent-codex)` | 0.15 |
| Gemini | `var(--agent-gemini)` | 0.15 |

### 6.3 데이터 시리즈 색상 (에이전트 외)

에이전트가 아닌 데이터 시리즈 (토큰 종류, 도구 등)에는 무채색 계열 팔레트를 사용한다.

```
neutral 시리즈 팔레트 (OKLCH):
1. oklch(0.55 0 0)    — 가장 진한 회색
2. oklch(0.65 0 0)
3. oklch(0.45 0 0)
4. oklch(0.75 0 0)
5. oklch(0.35 0 0)    — 가장 어두운 회색
```

단, **입력/출력/캐시 토큰** 구분 시에는 가독성을 위해 다음 색상 사용:
- Input: `oklch(0.55 0.12 280)` (차분한 보라)
- Output: `oklch(0.65 0.15 350)` (차분한 핑크)
- Cache Read: 에이전트 Success 색상

### 6.4 다크/라이트 모드 차트 차이

| 요소 | 라이트 | 다크 |
|------|--------|------|
| 그리드 선 | `oklch(0 0 0 / 6%)` | `oklch(1 0 0 / 8%)` |
| 축 텍스트 | `var(--text-tertiary)` | `var(--text-tertiary)` |
| 툴팁 배경 | `var(--bg-raised)` | `var(--bg-raised)` |
| 툴팁 그림자 | `oklch(0 0 0 / 8%)` | `oklch(0 0 0 / 30%)` |
| 영역 차트 투명도 | 0.15 | 0.20 |

---

## 7. 단계별 구현 계획

### Phase 1: 색상 시스템 + globals.css 재정의

**목표**: 모든 CSS 변수를 새 디자인 시스템으로 교체한다.

**변경 파일**:
- `dashboard/src/app/globals.css` — 새 토큰 정의 + shadcn 매핑
- `dashboard/src/lib/agents.ts` — OKLCH 기반 에이전트 색상 + muted/subtle 변형 추가

**작업 내용**:
1. `:root`와 `.dark`에 새 중립색 토큰 (`--bg-base`, `--bg-raised` 등) 정의
2. 에이전트 색상을 OKLCH 기반 CSS 변수로 재정의 (`--agent-claude`, `--agent-codex`, `--agent-gemini`)
3. 상태 색상 변수 추가 (`--status-success`, `--status-warning`, `--status-error`, `--status-info`)
4. 기존 shadcn 변수(`--background`, `--foreground` 등)를 새 토큰으로 매핑
5. `agents.ts`에 `oklch` 값 및 muted/subtle 변형 추가

**수락 조건**:
- [ ] 기존 UI가 시각적으로 크게 변하지 않으면서 새 변수 체계로 전환됨
- [ ] 다크/라이트 모드 전환 시 모든 색상이 올바르게 적용됨
- [ ] 에이전트 색상이 CSS 변수로 참조 가능함 (`var(--agent-claude)` 등)
- [ ] `pnpm build` 에러 없음

**검증**:
```bash
cd dashboard && pnpm build
# 브라우저에서 다크/라이트 전환 확인
# 각 페이지 시각적 검수
```

**Linear 이슈**: `[DS-1] 색상 시스템 재정의 — globals.css OKLCH 토큰`

---

### Phase 2: 재사용 UI 컴포넌트 생성

**목표**: 공통 컴포넌트를 만들어 코드 중복을 제거한다.

**신규 파일**:
- `dashboard/src/components/ui/kpi-card.tsx`
- `dashboard/src/components/ui/data-table.tsx`
- `dashboard/src/components/ui/chart-card.tsx`
- `dashboard/src/components/ui/status-badge.tsx`
- `dashboard/src/components/ui/agent-dot.tsx`
- `dashboard/src/components/ui/agent-badge.tsx`
- `dashboard/src/components/ui/section-header.tsx`
- `dashboard/src/components/ui/empty-state.tsx`
- `dashboard/src/components/filter-bar.tsx`
- `dashboard/src/lib/chart-theme.ts`

**의존 관계**: Phase 1 완료 후 진행 (새 CSS 변수 참조)

**작업 분할 (병렬 가능)**:
- **작업 A**: KpiCard, StatusBadge, AgentDot, AgentBadge (순수 표시 컴포넌트)
- **작업 B**: DataTable, EmptyState, SectionHeader (구조 컴포넌트)
- **작업 C**: ChartCard, chart-theme.ts, FilterBar (차트/필터 관련)

**수락 조건**:
- [ ] 각 컴포넌트가 독립적으로 렌더링됨
- [ ] 다크/라이트 모드에서 올바르게 표시됨
- [ ] Props 타입이 TypeScript strict mode 통과
- [ ] 에이전트 색상이 CSS 변수를 통해 적용됨

**Linear 이슈**:
- `[DS-2a] KpiCard + AgentDot + AgentBadge + StatusBadge 컴포넌트`
- `[DS-2b] DataTable + EmptyState + SectionHeader 컴포넌트`
- `[DS-2c] ChartCard + chart-theme + FilterBar 컴포넌트`

---

### Phase 3: 페이지별 디자인 적용

**목표**: 각 페이지에서 새 공통 컴포넌트를 사용하도록 리팩토링한다.

**변경 파일 및 작업** (병렬 가능):

#### Phase 3a: Dashboard (page.tsx)
- 인라인 KPI 카드 -> `KpiCard` 컴포넌트
- 인라인 DeltaBadge -> KpiCard의 delta prop
- 에이전트 도트 inline style -> `AgentDot` 컴포넌트
- "No sessions" -> `EmptyState` 컴포넌트

#### Phase 3b: Sessions (sessions/page.tsx)
- 에이전트 도트 Tailwind class -> `AgentDot` 컴포넌트
- 에이전트 배지 -> `AgentBadge` 컴포넌트
- 자체 필터 바 -> `FilterBar` 통합
- 빈 상태 -> `EmptyState` 컴포넌트

#### Phase 3c: Usage (usage/page.tsx)
- 로컬 KpiCard -> 공통 `KpiCard`
- 자체 필터 바 -> `FilterBar` 통합
- 테이블 -> `DataTable` 컴포넌트
- 차트 래퍼 -> `ChartCard` 컴포넌트

#### Phase 3d: Tools (tools/page.tsx)
- 로컬 KpiCards -> 공통 `KpiCard`
- 로컬 FilterBar -> 공통 `FilterBar`
- 차트 래퍼 -> `ChartCard` 컴포넌트
- 빈 상태 -> `EmptyState` 컴포넌트

#### Phase 3e: Rules (rules/page.tsx) + Settings (settings/page.tsx)
- 에이전트 도트 -> `AgentDot` 컴포넌트
- 색상 하드코딩 -> CSS 변수 참조

#### Phase 3f: Nav + TopBar + BottomBar (레이아웃)
- Nav 활성 상태 스타일 업데이트
- BottomBar 에이전트 도트 -> `AgentDot`
- TopBar 에이전트 도트 -> `AgentDot`

**수락 조건** (각 서브 Phase):
- [ ] 기존 기능이 동일하게 작동함
- [ ] 공통 컴포넌트를 사용하여 코드 중복 제거됨
- [ ] 다크/라이트 모드 정상
- [ ] `pnpm build` 에러 없음

**Linear 이슈**:
- `[DS-3a] Dashboard 페이지 디자인 시스템 적용`
- `[DS-3b] Sessions 페이지 디자인 시스템 적용`
- `[DS-3c] Usage 페이지 디자인 시스템 적용`
- `[DS-3d] Tools 페이지 디자인 시스템 적용`
- `[DS-3e] Rules + Settings 디자인 시스템 적용`
- `[DS-3f] Nav + TopBar + BottomBar 디자인 시스템 적용`

---

### Phase 4: 차트 스타일 통일

**목표**: 모든 차트에 공통 테마를 적용한다.

**변경 파일**:
- `dashboard/src/components/cost-chart.tsx`
- `dashboard/src/components/token-chart.tsx`
- `dashboard/src/components/usage-heatmap.tsx`
- `dashboard/src/components/tool-usage-chart.tsx`
- `dashboard/src/components/daily-tool-chart.tsx`
- `dashboard/src/components/model-pie-chart.tsx`
- `dashboard/src/app/usage/page.tsx` (인라인 차트들)
- `dashboard/src/app/tools/page.tsx` (인라인 차트들)

**작업 내용**:
1. `chart-theme.ts`의 공통 설정을 모든 차트에 적용
2. CartesianGrid, XAxis, YAxis, Tooltip 스타일 통일
3. 에이전트 색상을 CSS 변수 기반으로 전환
4. 툴팁 커스텀 컴포넌트 통일 (`ChartTooltip`)
5. 히트맵 색상을 새 팔레트로 업데이트

**수락 조건**:
- [ ] 모든 차트의 그리드, 축, 툴팁 스타일이 동일함
- [ ] 에이전트 색상이 CSS 변수를 통해 적용됨
- [ ] 다크/라이트 모드에서 차트가 올바르게 표시됨
- [ ] 툴팁 스타일이 통일됨

**Linear 이슈**: `[DS-4] 차트 스타일 통일 — 공통 테마 적용`

---

### Phase 5: 최종 검증 + 일관성 점검

**목표**: 전체 UI 일관성을 검증하고 누락된 부분을 수정한다.

**체크리스트**:
- [ ] 모든 페이지 다크/라이트 모드 스크린샷 비교
- [ ] 에이전트 색상 외 유채색 사용 여부 검사 (grep으로 하드코딩된 색상 검색)
- [ ] 간격 일관성 검사 (p-4, p-6 등 혼용 여부)
- [ ] 타이포그래피 일관성 검사 (text-xs, text-sm 등 용도별 통일)
- [ ] 접근성 대비율 검사 (크롬 DevTools Lighthouse)
- [ ] `pnpm build` 정상
- [ ] Electron 빌드 정상 (`pnpm electron:build`)

**검증 방법**:
```bash
# 하드코딩된 색상 검색
rg --type tsx '#[0-9a-fA-F]{6}' dashboard/src/
rg --type tsx 'bg-(red|green|blue|yellow|purple|pink|indigo|emerald|orange|violet)' dashboard/src/

# 빌드 검증
cd dashboard && pnpm build
```

**Linear 이슈**: `[DS-5] 디자인 시스템 최종 검증 + 일관성 점검`

---

## 8. 의존 관계 요약

```
Phase 1 (색상 시스템)
    ↓
Phase 2 (공통 컴포넌트) — 2a, 2b, 2c 병렬 가능
    ↓
Phase 3 (페이지 적용) — 3a~3f 병렬 가능
    ↓ (Phase 3 일부 완료 후)
Phase 4 (차트 통일)
    ↓
Phase 5 (최종 검증)
```

## 9. 제거 대상 패턴

구현 시 다음 패턴을 제거하고 새 컴포넌트/변수로 교체한다.

| 현재 패턴 | 교체 대상 |
|-----------|----------|
| `style={{ backgroundColor: agent.hex }}` | `AgentDot` 컴포넌트 또는 CSS 변수 |
| `bg-emerald-500`, `bg-orange-500`, `bg-blue-500` (에이전트) | `AgentDot`, `AgentBadge` 컴포넌트 |
| 인라인 KpiCard 로컬 컴포넌트 | 공통 `KpiCard` |
| `className="opacity-30"` (CartesianGrid) | `chart-theme.ts` 공통 설정 |
| `"No data"`, `"No sessions"` 하드코딩 | `EmptyState` 컴포넌트 |
| `#8b5cf6`, `#6366f1`, `#ec4899` 등 하드코딩 hex | CSS 변수 또는 chart-theme 상수 |

## 10. 미래 확장

- **애니메이션 시스템**: `framer-motion` 또는 CSS `@keyframes` 기반 마이크로 인터랙션
- **Storybook**: 컴포넌트 카탈로그 (선택사항, 필요 시 추가)
- **테마 커스터마이징**: 사용자 커스텀 에이전트 색상 지원
- **반응형 레이아웃**: 모바일/태블릿 대응 (현재는 데스크톱 전용)
