---
name: simplify
description: Review changed code for reuse, quality, and efficiency, then fix any issues found.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /simplify — 코드 품질·재사용성·효율성 검토 및 개선

변경된 코드를 검토하고 품질, 재사용성, 효율성 관점에서 개선한다.
`/review`(검토만) + `/refactor`(수정만)를 하나로 통합한 단계이다.

## 사용법

```
/simplify [대상 범위 — 기본: develop 대비 현재 브랜치 변경사항]
```

## 실행 절차

### 1. 변경 범위 파악

```bash
git diff develop --stat
git diff develop --name-only
```

### 2. 검토 기준

#### 품질
- 보안 취약점, 런타임 에러 가능성
- CLAUDE.md 코딩 컨벤션 준수 (named export, import type, 인라인 스타일 금지)
- 에러 핸들링 (시스템 경계에서만)
- 타입 안전성

#### 재사용성
- 중복 코드 → 공유 유틸 추출 (`shared/lib/`)
- 비슷한 컴포넌트 → 공통 컴포넌트 통합 (`shared/components/`)
- 반복 패턴 → 커스텀 훅 추출 (`shared/hooks/`)

#### 효율성
- 불필요한 재렌더링, 불필요한 API 호출
- N+1 쿼리, 미사용 인덱스
- 번들 크기 (불필요한 의존성, 동적 import 누락)

### 3. 발견 즉시 수정

검토와 수정을 동시에 수행한다. 수정 후 테스트를 실행하여 회귀가 없는지 확인한다.

```bash
cd dashboard && pnpm test:run
```

### 4. 결과 보고

수정한 내용을 카테고리별로 보고한다.

## 원칙

- 기존 테스트가 통과하는 상태를 유지한다
- 과도한 추상화를 만들지 않는다
- 변경 범위 밖의 코드는 건드리지 않는다

## 다음 단계

`/test`로 회귀가 없는지 최종 확인하고 커밋한다.
