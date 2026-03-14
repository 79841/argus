---
user-invocable: true
disable-model-invocation: false
allowed-tools: Agent
---

# /plan — 구현 계획 수립

요구사항을 분석하고 TDD 기반 구현 계획을 수립한다.

## 사용법

```
/plan <요구사항 또는 Linear 이슈>
```

## 실행 절차

1. `plan-writer` 에이전트를 호출하여 구현 계획을 수립한다
2. 계획에는 다음이 포함된다:
   - 수락 조건
   - 테스트 시나리오 (입력 → 기대 출력)
   - 구현 순서와 의존 관계
   - 검증 절차

## 다음 단계

계획 수립 후 `/tdd`로 테스트 코드를 먼저 작성하거나, 단순한 경우 `/develop`로 바로 구현할 수 있다.
