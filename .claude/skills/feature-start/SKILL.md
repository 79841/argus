---
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read
---

# /feature-start — 새 feature 브랜치 시작

develop 브랜치에서 새 feature 브랜치를 생성하고 worktree로 격리된 작업 환경을 만든다.

## 사용법

```
/feature-start <브랜치명>
```

## 실행 절차

### 1. 사전 확인

```bash
# 워킹 디렉토리 깨끗한지 확인
git status --porcelain

# develop 최신화
git checkout develop
git pull origin develop 2>/dev/null || true
```

### 2. feature 브랜치 생성 + worktree

```bash
# feature 브랜치 생성
git branch feature/<브랜치명> develop

# worktree 생성 (프로젝트 루트의 상위 디렉토리에)
git worktree add ../argus-<브랜치명> feature/<브랜치명>
```

### 3. 결과 출력

```bash
echo "Worktree: ../argus-<브랜치명>"
echo "Branch: feature/<브랜치명>"
cd ../argus-<브랜치명> && git log --oneline -1
```

## worktree 작업 완료 후

`/feature-finish`로 머지하거나, 수동으로 정리한다:

```bash
git worktree remove ../argus-<브랜치명>
```

## 참고

- worktree는 독립된 작업 디렉토리이므로 다른 브랜치와 병렬 작업이 가능하다
- Agent 도구의 `isolation: "worktree"` 옵션으로 에이전트를 격리 실행할 수도 있다
