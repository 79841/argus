---
user-invocable: true
disable-model-invocation: false
allowed-tools: Agent
---

# /develop — 구현

계획과 테스트를 기반으로 기능을 구현한다 (Green 단계).

## 사용법

```
/develop [구현 대상 설명]
```

## 실행 절차

1. 작업 유형에 따라 적절한 에이전트를 선택하여 호출한다:
   - **대시보드 페이지/API/컴포넌트**: `page-builder` 에이전트
   - **DB 스키마/데이터 파이프라인/인프라**: `infra-builder` 에이전트
   - **테스트 데이터 생성/검증**: `data-seeder` 에이전트
2. 병렬 작업 가능한 경우 여러 에이전트를 동시에 호출한다
3. 구현 완료 후 테스트가 있으면 `/test`로 통과 여부를 확인한다

## 다음 단계

구현 후 `/test`로 테스트를 실행하고, `/review`로 코드 리뷰를 수행한다.
