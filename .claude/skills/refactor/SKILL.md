---
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /refactor — 리팩토링

리뷰 결과를 기반으로 코드를 개선한다.

## 사용법

```
/refactor [개선 대상 설명]
```

## 실행 절차

1. 코드 리뷰 결과 또는 사용자의 개선 요청을 분석한다
2. 기존 테스트가 통과하는 상태를 유지하면서 코드를 개선한다
3. 리팩토링 후 테스트를 실행하여 회귀가 없는지 확인한다

```bash
cd dashboard && pnpm test:run
```

## 리팩토링 원칙

- 동작을 변경하지 않는다 (테스트 통과 유지)
- 한 번에 하나의 개선만 수행한다
- 가독성, 중복 제거, 성능 순으로 우선한다
- 불필요한 추상화를 만들지 않는다

## 다음 단계

리팩토링 후 `/test`로 회귀가 없는지 확인하고 커밋한다.
