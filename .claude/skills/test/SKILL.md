---
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash
---

# /test — 테스트 실행

vitest로 테스트를 실행하고 결과를 확인한다.

## 사용법

```
/test [파일 패턴]
```

## 실행 절차

```bash
cd dashboard && pnpm test:run
```

파일 패턴이 지정되면 해당 파일만 실행한다:

```bash
cd dashboard && pnpm test:run -- <파일 패턴>
```

## 결과 해석

- **모든 테스트 통과**: Green 상태. `/simplify`로 진행하거나 커밋한다.
- **테스트 실패**: Red 상태. 실패 원인을 분석하고 수정한다.
