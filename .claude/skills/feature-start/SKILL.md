---
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read
---

# /feature-start — 새 feature 브랜치 시작

develop 브랜치에서 새 feature 브랜치를 생성하고 `.claude/worktrees/`에 격리된 작업 환경을 만든다.

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
# worktree 디렉토리 생성
mkdir -p .claude/worktrees

# feature 브랜치 생성
git branch feature/<브랜치명> develop

# worktree 생성 (.claude/worktrees/ 하위에)
git worktree add .claude/worktrees/<브랜치명> feature/<브랜치명>
```

### 3. 결과 출력

```bash
echo "Worktree: .claude/worktrees/<브랜치명>"
echo "Branch: feature/<브랜치명>"
cd .claude/worktrees/<브랜치명> && git log --oneline -1
```

## worktree 작업 완료 후

`/feature-finish`로 PR 생성 → 머지 후 worktree가 자동 정리된다.

## 참고

- `.claude/worktrees/`는 `.gitignore`에 포함되어야 한다
- worktree는 독립된 작업 디렉토리이므로 다른 브랜치와 병렬 작업이 가능하다
- Agent 도구의 `isolation: "worktree"` 옵션으로 에이전트를 격리 실행할 수도 있다
