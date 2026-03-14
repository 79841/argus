---
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /tdd — 테스트 코드 작성

계획을 기반으로 테스트 코드를 먼저 작성한다 (Red 단계).

## 사용법

```
/tdd [테스트 대상 설명]
```

## 실행 절차

1. 현재 계획(plan)이 있으면 계획의 테스트 시나리오를 기반으로, 없으면 사용자 요청을 기반으로 테스트를 작성한다
2. 테스트 파일은 `src/**/__tests__/*.test.ts` 패턴으로 생성한다
3. 테스트 프레임워크: vitest
4. 단위 테스트와 통합 테스트를 구분하여 작성한다
5. 테스트를 실행하여 **실패하는지** 확인한다 (Red 상태)

## 테스트 작성 규칙

- 순수 함수는 별도 모듈로 추출하여 단위 테스트한다
- DB 의존 통합 테스트는 `vi.mock`으로 in-memory SQLite를 사용한다
- 엣지 케이스 (빈 데이터, 잘못된 입력 등)를 반드시 포함한다
- 테스트 이름은 행위를 명확히 설명한다

## 다음 단계

테스트가 실패 상태(Red)가 되면 `/develop`로 구현하여 통과시킨다.
