---
name: dev-down
description: 대시보드 개발 서버를 중지한다.
disable-model-invocation: true
user-invocable: true
allowed-tools: Bash
---

## 개발 환경 중지

### 1. Next.js dev 서버 중지

```bash
pkill -f "next dev" 2>/dev/null && echo "Dashboard stopped" || echo "Dashboard was not running"
```
