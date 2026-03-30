# 미리보기 사이드바 설계

## 개요

리스트 페이지에서 항목 클릭 시 **우측 미리보기 패널**을 먼저 표시하고, 사용자가 원할 때 상세 페이지로 이동하는 패턴을 도입한다.

## 현황 분석

| 페이지 | 현재 동작 | 상세 페이지 존재 |
|--------|----------|----------------|
| Sessions `/sessions` | 35%/65% 2-pane (리스트 + **전체 상세** 인라인) | `/sessions/[id]` |
| Projects `/projects` | 단일 컬럼, `router.push()`로 즉시 이동 | `/projects/[name]` |
| Tools `/tools` | 단일 컬럼 + 탭 | 없음 |

### 문제점

- **Sessions**: 우측 패널이 전체 상세(타임라인, 워터폴 등)를 모두 표시 → 무겁고 로딩 느림. 미리보기와 상세의 구분이 없음.
- **Projects**: 미리보기 없이 바로 페이지 이동 → 빠른 비교/탐색이 불가.

## 설계

### 핵심 컨셉

```
┌─────────────────────────────────────────────────────────┐
│ FilterBar                                               │
├──────────────────┬──────────────────────────────────────┤
│                  │                                      │
│   리스트 (좌)     │   미리보기 패널 (우)                   │
│                  │                                      │
│   - 항목 1       │   ┌──────────────────────────────┐   │
│   > 항목 2 (선택) │   │ 헤더 (이름, 에이전트, 시간)    │   │
│   - 항목 3       │   │ KPI 요약 (3~4개)              │   │
│   - 항목 4       │   │ 미니 차트 (선택적)             │   │
│   - ...          │   │                              │   │
│                  │   │ [상세 보기 →] 버튼             │   │
│                  │   └──────────────────────────────┘   │
│                  │                                      │
├──────────────────┴──────────────────────────────────────┤
│ BottomBar                                               │
└─────────────────────────────────────────────────────────┘
```

**원칙:**
- 리스트에서 항목 클릭 → 우측에 **가벼운 미리보기** 표시 (API 1회, 요약 데이터만)
- 미리보기에서 "상세 보기" 클릭 → `/sessions/[id]` 또는 `/projects/[name]` 이동
- 미리보기는 빠른 탐색용 — 스크롤 없이 한 눈에 볼 수 있는 정보량

### 적용 대상

| 페이지 | 적용 | 비고 |
|--------|------|------|
| Sessions | O | 현재 전체 상세 → 미리보기로 경량화 |
| Projects | O | 새로 추가 |
| Tools | X | 상세 페이지 없음 |

---

## 컴포넌트 설계

### 1. `PreviewPanel` (공유 컴포넌트)

```
위치: src/shared/components/preview-panel.tsx
```

리스트+미리보기 2-pane 레이아웃을 제공하는 컨테이너 컴포넌트.

```tsx
type PreviewPanelLayoutProps = {
  list: React.ReactNode           // 좌측 리스트 영역
  preview: React.ReactNode | null // 우측 미리보기 (null이면 placeholder)
  placeholder?: React.ReactNode   // 미선택 시 표시할 내용
  listWidth?: string              // 기본값 'w-[40%]'
}
```

**레이아웃:**
- 좌측 리스트: `w-[40%]` (기본), `border-r`, `overflow-y-auto`
- 우측 미리보기: `flex-1`, `overflow-y-auto`
- 미선택 시: 중앙에 placeholder 아이콘 + 텍스트

### 2. `SessionPreview` (세션 미리보기)

```
위치: src/features/sessions/components/session-preview.tsx
```

기존 `SessionDetail`에서 핵심 요약만 추출한 경량 컴포넌트.

**표시 내용:**
| 섹션 | 내용 |
|------|------|
| 헤더 | AgentBadge + 모델 배지 + 세션 ID (16자) |
| 프로젝트 | 프로젝트 이름 + 상대 시간 |
| KPI 그리드 (2×3) | 비용, 입력 토큰, 출력 토큰, 캐시율, 소요시간, 요청/도구 수 |
| 모델 비용 | `SessionModelCostChart` (기존 컴포넌트 재사용) |
| 상세 보기 | 하단 고정 버튼 → `/sessions/[id]` 링크 |

**데이터 소스:** 기존 `useSessions` 훅의 `selectedSession` + `detailEvents`를 그대로 활용하되, 타임라인/워터폴은 렌더링하지 않음.

### 3. `ProjectPreview` (프로젝트 미리보기)

```
위치: src/features/projects/components/project-preview.tsx
```

**표시 내용:**
| 섹션 | 내용 |
|------|------|
| 헤더 | 프로젝트 이름 + 활동 기간 |
| KPI 그리드 (2×3) | 총 비용, 세션 수, 요청 수, 입력 토큰, 출력 토큰, 캐시율 |
| 에이전트 분포 | `AgentDistChart` (기존 컴포넌트 재사용) |
| 일별 추이 | `DailyCostChart` (기존 컴포넌트 재사용, 높이 축소) |
| 상세 보기 | 하단 고정 버튼 → `/projects/[name]` 링크 |

**데이터 소스:** 새 훅 `useProjectPreview(projectName)` — 기존 `/api/projects/[name]` API 호출.

---

## 페이지별 변경 사항

### Sessions 페이지 (`/sessions`)

**Before:**
```
[ 리스트 35% ][ SessionDetail (전체 상세) 65% ]
```

**After:**
```
[ 리스트 40% ][ SessionPreview (요약) 60% ]
```

변경 내용:
1. 우측 패널을 `SessionDetail` → `SessionPreview`로 교체
2. 리스트 비율 35% → 40% (미리보기가 가벼워진 만큼 리스트에 여유)
3. `SessionPreview` 하단에 "상세 보기" 버튼 추가 → `/sessions/[id]`로 이동
4. 기존 `SessionListItem`의 외부 링크 아이콘(호버 시 표시)은 유지

### Projects 페이지 (`/projects`)

**Before:**
```
[ KPI 카드 ]
[ 비용 비교 차트 ]
[ DataTable ] → 행 클릭 시 router.push('/projects/[name]')
```

**After:**
```
┌──────────────────┬─────────────────────────────┐
│ FilterBar + KPI  │                             │
│ DataTable        │ ProjectPreview (요약)        │
│  > 행 클릭 선택   │                             │
│                  │ [상세 보기 →]                │
└──────────────────┴─────────────────────────────┘
```

변경 내용:
1. `PreviewPanelLayout`으로 2-pane 레이아웃 적용
2. 좌측: KPI 카드 + 비용 비교 차트 + DataTable (기존 컨텐츠)
3. 우측: `ProjectPreview` (선택된 프로젝트 미리보기)
4. DataTable `onRowClick` → `router.push()` 대신 `setSelectedProject()` 호출
5. 미리보기 하단 "상세 보기" 버튼 → `/projects/[name]` 이동

---

## 새로운 훅

### `useProjectPreview(projectName: string | null)`

```
위치: src/features/projects/hooks/use-project-preview.ts
```

- `projectName`이 null이면 데이터를 fetching하지 않음
- 기존 `/api/projects/[name]` API를 호출 (별도 API 불필요)
- 반환: `{ loading, stats, daily }`
- 기존 `useProjectDetail`을 재사용하거나, 선택적 호출이 가능하도록 리팩토링

---

## 상세 보기 버튼 컴포넌트

```
위치: src/shared/components/preview-detail-link.tsx
```

미리보기 패널 하단에 고정 표시되는 공유 버튼.

```tsx
type PreviewDetailLinkProps = {
  href: string
  label?: string // 기본값: t('common.viewDetail')
}
```

- 하단 고정: `sticky bottom-0`, 배경 그라데이션으로 자연스럽게
- 전체 너비 버튼, `variant="outline"`
- 아이콘: `ArrowRight` (lucide)

---

## i18n 키 추가

```typescript
// ko
'common.viewDetail': '상세 보기',
'common.selectItem': '항목을 선택하세요',
'sessions.preview.title': '세션 미리보기',
'projects.preview.title': '프로젝트 미리보기',

// en
'common.viewDetail': 'View Detail',
'common.selectItem': 'Select an item',
'sessions.preview.title': 'Session Preview',
'projects.preview.title': 'Project Preview',
```

---

## 파일 변경 목록

### 새로 생성

| 파일 | 설명 |
|------|------|
| `src/shared/components/preview-panel.tsx` | 2-pane 레이아웃 컨테이너 |
| `src/shared/components/preview-detail-link.tsx` | 하단 고정 상세 보기 버튼 |
| `src/features/sessions/components/session-preview.tsx` | 세션 미리보기 |
| `src/features/projects/components/project-preview.tsx` | 프로젝트 미리보기 |
| `src/features/projects/hooks/use-project-preview.ts` | 프로젝트 미리보기 훅 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/app/(dashboard)/sessions/page.tsx` | `SessionDetail` → `SessionPreview`로 교체, 비율 조정 |
| `src/app/(dashboard)/projects/page.tsx` | 2-pane 레이아웃 적용, 행 클릭 → 미리보기 선택 |
| `src/features/sessions/index.ts` | `SessionPreview` export 추가 |
| `src/features/projects/index.ts` | `ProjectPreview`, `useProjectPreview` export 추가 |
| `src/shared/lib/i18n.ts` | 새 번역 키 추가 |

### 삭제 없음

기존 `SessionDetail`, `useSessionDetail`은 상세 페이지(`/sessions/[id]`)에서 계속 사용.

---

## 구현 순서

1. **`PreviewPanel`** + **`PreviewDetailLink`** 공유 컴포넌트 생성
2. **`SessionPreview`** 컴포넌트 생성 + Sessions 페이지 적용
3. **`ProjectPreview`** + **`useProjectPreview`** 생성 + Projects 페이지 적용
4. i18n 키 추가
5. 테스트 작성

---

## 고려 사항

### 키보드 내비게이션
- 리스트에서 `↑`/`↓` 키로 항목 이동 시 미리보기도 자동 갱신
- `Enter` 키로 상세 페이지 이동
- 추후 구현 (이번 범위 외)

### 반응형
- 현재 대시보드는 데스크톱 전용 (Electron 앱)
- 모바일 대응은 고려하지 않음

### 성능
- 미리보기는 리스트 데이터 + 요약 API 1회만 호출
- 타임라인, 이벤트 목록 등 무거운 데이터는 상세 페이지에서만 로드
- Sessions: 기존과 동일한 API 사용, 렌더링만 경량화
- Projects: 기존 detail API 재사용
