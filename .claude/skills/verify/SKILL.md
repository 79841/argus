---
name: verify
description: 대시보드와 데이터 파이프라인을 검증한다.
disable-model-invocation: true
user-invocable: true
allowed-tools: Bash
---

## 파이프라인 검증

### 1. 대시보드 상태

```bash
echo "=== Dashboard ==="
curl -sf http://localhost:3000/api/health && echo " OK" || echo "FAIL (not running)"
```

### 2. API 검증

```bash
echo "=== Overview API ==="
curl -s http://localhost:3000/api/overview | python3 -m json.tool

echo "=== Daily API (7 days) ==="
curl -s "http://localhost:3000/api/daily?days=7" | python3 -c "import sys,json; data=json.load(sys.stdin); print(f'{len(data)} rows')"

echo "=== Sessions API ==="
curl -s http://localhost:3000/api/sessions | python3 -c "import sys,json; data=json.load(sys.stdin); print(f'{len(data)} sessions')"

echo "=== Models API ==="
curl -s http://localhost:3000/api/models | python3 -m json.tool

echo "=== Efficiency API ==="
curl -s "http://localhost:3000/api/efficiency?days=7" | python3 -c "import sys,json; data=json.load(sys.stdin); print(f'{len(data)} rows')"
```
