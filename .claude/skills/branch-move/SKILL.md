---
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read
---

# /branch-move — develop 작업을 feature 브랜치로 이동

develop에서 직접 작업하다 변경 규모가 커졌을 때, 현재 변경사항을 새 feature 브랜치로 옮긴다.

## 사용법

```
/branch-move <브랜치명>
```

## 실행 절차

1. 현재 develop 브랜치인지 확인한다
2. 변경사항(staged + unstaged)이 있는지 확인한다
3. 변경사항을 stash에 임시 저장한다
4. feature 브랜치를 생성하고 체크아웃한다
5. stash를 복원한다

```bash
# 1. 현재 브랜치 확인
current=$(git branch --show-current)
if [ "$current" != "develop" ]; then
  echo "⚠ 현재 브랜치: $current (develop이 아닙니다)"
fi

# 2. 변경사항 확인
git status --short

# 3. stash
git stash push -m "branch-move: develop → feature/<브랜치명>"

# 4. feature 브랜치 생성
git checkout -b feature/<브랜치명>

# 5. stash 복원
git stash pop
```

6. 브랜치 이동 결과와 변경 파일 목록을 출력한다

## 언제 사용하는가

- develop에서 "간단한 수정"으로 시작했지만 커밋 2~3개 이상의 작업이 될 때
- 버그 수정이 예상보다 여러 파일에 걸칠 때
- 디자인/UI 조정이 단순 tweaking을 넘어설 때
- 이미 커밋 없이 변경사항만 있는 상태에서 브랜치를 분리하고 싶을 때
