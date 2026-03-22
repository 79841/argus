---
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /refactor — 리팩토링

변경된 코드의 구조를 개선한다. 동작은 변경하지 않고 코드 구조만 정리한다.

## 실행 절차

1. 변경 범위를 파악한다 (`git diff develop --name-only`)
2. 구조 개선 포인트를 식별한다:
   - 중복 코드 → 공유 유틸/컴포넌트 추출
   - 복잡한 로직 → 함수 분리, 네이밍 개선
   - 반복 패턴 → 커스텀 훅 추출
3. 수정하고 테스트를 실행한다

```bash
cd dashboard && pnpm test:run
```

## 원칙

- 기존 테스트가 통과하는 상태를 유지한다
- 과도한 추상화를 만들지 않는다
- 변경 범위 밖의 코드는 건드리지 않는다
