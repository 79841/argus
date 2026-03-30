---
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash
---

# /review — 코드 리뷰

변경된 코드의 품질, 보안, 일관성을 검토한다.

## 사용법

```
/review [대상 범위 — 기본: develop 대비 현재 브랜치 변경사항]
```

## 실행 절차

### 1. 변경 범위 파악

```bash
# 현재 브랜치의 변경사항 확인
git diff develop --stat
git diff develop --name-only
```

### 2. 변경 파일별 리뷰

각 변경 파일을 읽고 다음 기준으로 검토한다:

#### Critical (필수 수정)
- 보안 취약점 (SQL injection, XSS, 인증 우회)
- 런타임 에러 가능성 (null/undefined, 타입 불일치)
- 데이터 유실 위험 (silent catch, 미검증 입력)

#### Warning (권장 수정)
- CLAUDE.md 코딩 컨벤션 위반 (`export default` 사용, 인라인 스타일 등)
- **i18n 위반: UI 텍스트 한글 하드코딩** — `useLocale().t()` 사용 필수, `src/shared/lib/i18n.ts`에 `ko`/`en` 키 등록 필요
- 에러 핸들링 누락 (시스템 경계에서)
- 성능 이슈 (불필요한 재렌더링, N+1 쿼리)

#### Suggestion (선택)
- 가독성 개선
- 중복 코드 추출
- 더 적합한 패턴 제안

### 3. 리뷰 결과 출력

카테고리별로 분류하여 파일:라인 형태로 보고한다.

```
## Critical
- `src/app/api/xxx/route.ts:25` — 입력값 미검증

## Warning
- `src/features/xxx/components/yyy.tsx:10` — export default 사용

## Suggestion
- `src/shared/lib/zzz.ts:42` — 유틸 함수 추출 가능
```

## 다음 단계

리뷰에서 수정이 필요하면 `/simplify`로 개선한다. 문제가 없으면 커밋한다.
