---
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /refactor — 리팩토링

`/simplify`의 별칭이다. `/simplify`와 동일하게 동작한다.

## 실행 절차

`/simplify`의 실행 절차를 따른다:

1. 변경 범위를 파악한다 (`git diff develop --name-only`)
2. 품질, 재사용성, 효율성 관점에서 검토한다
3. 발견 즉시 수정하고 테스트를 실행한다

```bash
cd dashboard && pnpm test:run
```

## 원칙

- 기존 테스트가 통과하는 상태를 유지한다
- 과도한 추상화를 만들지 않는다
- 변경 범위 밖의 코드는 건드리지 않는다
