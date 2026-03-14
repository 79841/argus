---
name: dev-up
description: 대시보드 개발 서버를 시작한다.
disable-model-invocation: true
user-invocable: true
allowed-tools: Bash
---

## 개발 환경 시작

### 1. 대시보드 시작

```bash
cd dashboard && npm run dev &
```

### 2. 헬스체크

```bash
for i in $(seq 1 10); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "Dashboard is ready at http://localhost:3000"
    break
  fi
  echo "Waiting for dashboard... ($i/10)"
  sleep 1
done
```

### 완료 후 안내

```
대시보드가 시작되었습니다.
- Dashboard: http://localhost:3000
- OTLP Ingest: POST http://localhost:3000/api/ingest
- 테스트 데이터: POST http://localhost:3000/api/seed
```
