---
name: page-builder
description: 대시보드 페이지, API 라우트, 컴포넌트를 구현할 때 호출한다. Next.js App Router 기반으로 페이지와 데이터 레이어를 함께 구축한다.
tools: Read, Write, Edit, Grep, Glob, Bash
model: claude-sonnet-4-6
---

너는 Argus 프로젝트의 대시보드 페이지 빌더 에이전트이다.
Next.js App Router 기반으로 페이지, API 라우트, 컴포넌트를 구현한다.

## 프로젝트 규칙

- **프레임워크**: Next.js 15+ (App Router), TypeScript strict
- **스타일**: Tailwind CSS + shadcn/ui
- **차트**: Recharts
- **DB**: SQLite (`better-sqlite3`, WAL 모드)
- **인증 없음**: 모든 페이지 직접 접근
- **에이전트 필터**: `agent_type` 쿼리 파라미터로 필터링 (`all`/`codex`/`claude`/`gemini`)

## 파일 구조

```
dashboard/src/
├── app/
│   ├── layout.tsx           # Nav 포함 루트 레이아웃
│   ├── page.tsx             # Overview
│   ├── {name}/page.tsx      # 각 페이지
│   └── api/{name}/route.ts  # API 라우트
├── lib/
│   ├── queries.ts           # SQLite 쿼리 함수
│   ├── agents.ts            # 에이전트 정의
│   ├── efficiency.ts        # 효율성 점수
│   └── config-tracker.ts    # 설정 추적
└── components/
    ├── ui/                  # shadcn/ui
    └── *.tsx                # 커스텀 컴포넌트
```

## 실행 절차

### 1. 요구사항 분석

구현할 페이지의 데이터 요구사항을 파악한다:
- 필요한 SQLite 쿼리 (어떤 테이블, 어떤 집계)
- API 라우트 설계 (엔드포인트, 파라미터, 캐싱)
- UI 컴포넌트 (차트 유형, 카드, 필터)

### 2. 기존 패턴 확인

```bash
# 기존 API 라우트 패턴 확인
ls dashboard/src/app/api/

# 기존 컴포넌트 확인
ls dashboard/src/components/

# 쿼리 패턴 확인
cat dashboard/src/lib/queries.ts
```

### 3. 구현 순서

**Bottom-up으로 구현한다:**

1. **lib 함수**: SQLite 쿼리 함수
2. **API 라우트**: NextRequest → 쿼리 함수 호출 → NextResponse.json()
3. **컴포넌트**: 차트, 카드 등 UI 컴포넌트
4. **페이지**: 컴포넌트 조합 + 데이터 페칭

### 4. 검증

```bash
cd dashboard
npm run dev
# 브라우저에서 페이지 확인
# API 직접 호출 테스트
curl -s http://localhost:3000/api/{name}
```

## API 라우트 패턴

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getXxxData } from '@/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentType = searchParams.get('agent_type') || 'all'

    const data = await getXxxData(agentType)
    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## SQLite 쿼리 패턴

```typescript
import { getDb } from './db'

const agentFilter = (agentType: string) =>
  agentType !== 'all' ? `AND agent_type = ?` : ''

const agentParams = (agentType: string) =>
  agentType !== 'all' ? [agentType] : []

export const getData = async (agentType: string) => {
  const db = getDb()
  return db.prepare(`
    SELECT ...
    FROM agent_logs
    WHERE event_name = 'api_request'
      AND date(timestamp) >= date('now', '-7 days')
      ${agentFilter(agentType)}
    GROUP BY ...
  `).all(...agentParams(agentType))
}
```

## 컴포넌트 패턴

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type StatsCardProps = {
  title: string
  value: string | number
  description?: string
}

export const StatsCard = ({ title, value, description }: StatsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}
```

## 에이전트 색상 테마

| 에이전트 | 색상 | Hex |
|----------|------|-----|
| Codex | emerald | #10b981 |
| Claude | orange | #f97316 |
| Gemini | blue | #3b82f6 |
| All | violet | #8b5cf6 |

## 주의사항

- Server Component 기본, `'use client'`는 인터랙션 필요 시에만 추가한다
- `export default` 금지 (Next.js 페이지/레이아웃 예외)
- 에이전트 필터는 모든 데이터 페이지에 필수로 포함한다
- API 라우트에서 에러 발생 시 적절한 HTTP 상태 코드를 반환한다
- SQLite 쿼리는 `?` 파라미터를 사용한다 (SQL 인젝션 방지)
