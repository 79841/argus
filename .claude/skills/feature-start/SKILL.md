---
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read
---

# /feature-start — 새 feature 브랜치 시작

develop 브랜치에서 새 feature 브랜치를 생성한다.

## 사용법

```
/feature-start <브랜치명>
```

## 실행 절차

1. 현재 변경사항이 없는지 확인한다
2. develop 브랜치를 최신으로 업데이트한다
3. `feature/<브랜치명>` 브랜치를 생성하고 체크아웃한다

```bash
# 워킹 디렉토리 깨끗한지 확인
git status --porcelain

# develop 최신화
git checkout develop
git pull origin develop 2>/dev/null || true

# feature 브랜치 생성
git checkout -b feature/<브랜치명>
```

4. 브랜치 생성 결과를 출력한다
