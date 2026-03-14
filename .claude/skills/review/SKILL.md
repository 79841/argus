---
user-invocable: true
disable-model-invocation: false
allowed-tools: Agent
---

# /review — 코드 리뷰

구현 완료 후 코드 품질을 검토한다.

## 사용법

```
/review
```

## 실행 절차

1. `code-reviewer` 에이전트를 호출하여 변경된 코드를 검토한다
2. 리뷰 결과는 다음 카테고리로 분류된다:
   - **필수 수정 (Critical)**: 보안, 버그, 규칙 위반
   - **권장 수정 (Warning)**: 코드 품질, 성능
   - **제안 (Suggestion)**: 선택적 개선 사항

## 다음 단계

리뷰에서 수정이 필요하면 `/refactor`로 개선한다. 문제가 없으면 커밋한다.
