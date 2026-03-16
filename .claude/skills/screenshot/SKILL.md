---
name: screenshot
description: 대시보드 페이지를 headless Chrome으로 캡처한다.
user-invocable: true
allowed-tools: Bash, Read
---

# /screenshot — 대시보드 스크린샷 캡처

headless Chrome으로 localhost:3000의 대시보드 페이지를 캡처한다. JS 실행을 5초 대기한 후 스크린샷을 저장한다.

## 사용법

```
/screenshot [페이지경로 또는 all]
```

- `/screenshot` — Overview(/) 페이지만 캡처
- `/screenshot /sessions` — 특정 페이지 캡처
- `/screenshot all` — 전체 페이지 일괄 캡처

## 실행 절차

### 1. 서버 상태 확인

```bash
curl -sf http://localhost:3000/api/health > /dev/null 2>&1 && echo "Server OK" || echo "FAIL: pnpm dev 또는 pnpm electron:dev를 먼저 실행하세요"
```

### 2. 스크린샷 캡처

Chrome 경로: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

인자가 `all`이면 전체 페이지를 캡처한다:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="http://localhost:3000"
OUTDIR="/tmp/argus-screenshots"
mkdir -p "$OUTDIR"

PAGES="/ /sessions /usage /tools /projects /insights /rules /settings"

for PAGE in $PAGES; do
  NAME=$(echo "$PAGE" | sed 's/\//-/g' | sed 's/^-//' | sed 's/^$/overview/')
  "$CHROME" --headless=new --disable-gpu --window-size=1280,900 --hide-scrollbars --virtual-time-budget=5000 --screenshot="$OUTDIR/$NAME.png" "$BASE$PAGE" 2>/dev/null
  echo "Captured: $OUTDIR/$NAME.png"
done
```

인자가 특정 경로이면 해당 페이지만 캡처한다:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGE="${ARGUMENTS:-/}"
NAME=$(echo "$PAGE" | sed 's/\//-/g' | sed 's/^-//' | sed 's/^$/overview/')
OUTDIR="/tmp/argus-screenshots"
mkdir -p "$OUTDIR"
"$CHROME" --headless=new --disable-gpu --window-size=1280,900 --hide-scrollbars --virtual-time-budget=5000 --screenshot="$OUTDIR/$NAME.png" "http://localhost:3000$PAGE" 2>/dev/null
echo "Captured: $OUTDIR/$NAME.png"
```

### 3. 캡처된 이미지 확인

Read 도구로 캡처된 PNG 파일을 읽어 화면에 표시한다. `all` 모드에서는 모든 이미지를 순차적으로 표시한다.

## 옵션

- `--width=1440` — 뷰포트 너비 (기본: 1280)
- `--height=900` — 뷰포트 높이 (기본: 900)
- `--wait=8000` — JS 대기 시간 ms (기본: 5000)
- `--dark` — 다크모드 (기본, 별도 설정 불필요)
