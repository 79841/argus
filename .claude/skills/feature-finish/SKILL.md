---
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read
---

# /feature-finish — feature 브랜치를 develop에 머지

현재 feature 브랜치를 develop에 머지하고 worktree를 포함하여 정리한다.

## 사용법

```
/feature-finish
```

## 실행 절차

1. 현재 브랜치가 `feature/*`인지 확인한다
2. 변경사항이 모두 커밋되었는지 확인한다
3. worktree에서 작업 중이면 메인 저장소로 이동한다
4. develop에 --no-ff 머지한다
5. feature 브랜치와 worktree를 삭제한다

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

# worktree 확인 및 메인 저장소에서 머지
MAIN_REPO=$(git worktree list | head -1 | awk '{print $1}')
cd "$MAIN_REPO"

# develop으로 머지
git checkout develop
git merge --no-ff "$BRANCH" -m "Merge $BRANCH into develop"

# worktree 정리 (존재하면)
WORKTREE_PATH=$(git worktree list | grep "$BRANCH" | awk '{print $1}')
if [ -n "$WORKTREE_PATH" ] && [ "$WORKTREE_PATH" != "$MAIN_REPO" ]; then
  git worktree remove "$WORKTREE_PATH"
fi

# feature 브랜치 삭제
git branch -d "$BRANCH"
```

6. 머지 결과를 출력한다:
   - 머지된 커밋 수
   - 변경된 파일 수
   - develop 브랜치의 최신 로그
