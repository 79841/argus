---
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read
---

# /feature-finish — feature 브랜치를 PR로 머지하고 worktree 정리

현재 feature 브랜치를 리모트에 push하고 PR을 생성한다. PR 머지 후 worktree와 브랜치를 정리한다.

## 사용법

```
/feature-finish
```

## 실행 절차

### 1. 사전 확인

```bash
# 현재 브랜치 확인
BRANCH=$(git branch --show-current)
if [[ ! "$BRANCH" == feature/* ]]; then
  echo "Error: feature/* 브랜치에서만 실행 가능합니다. 현재: $BRANCH"
  exit 1
fi

# 미커밋 변경사항 확인
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: 커밋되지 않은 변경사항이 있습니다."
  git status --short
  exit 1
fi
```

### 2. Push + PR 생성

```bash
git push -u origin "$BRANCH"
gh pr create --base develop --head "$BRANCH" --title "Merge $BRANCH" --body ""
```

### 3. PR 머지 후 정리

PR이 머지되면 다음을 실행한다:

```bash
BRANCH_NAME="${BRANCH#feature/}"
MAIN_REPO=$(git worktree list | head -1 | awk '{print $1}')

# worktree 정리 (.claude/worktrees/ 하위)
WORKTREE_PATH="$MAIN_REPO/.claude/worktrees/$BRANCH_NAME"
if [ -d "$WORKTREE_PATH" ]; then
  cd "$MAIN_REPO"
  git worktree remove "$WORKTREE_PATH"
fi

# develop 최신화 및 feature 브랜치 삭제
cd "$MAIN_REPO"
git checkout develop
git pull origin develop
git branch -d "$BRANCH"
git push origin --delete "$BRANCH" 2>/dev/null || true
```

### 4. 결과 출력

- PR URL
- 머지된 커밋 수
- 변경된 파일 수
- worktree 정리 완료 여부
