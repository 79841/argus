---
name: seed
description: 테스트 데이터를 SQLite에 시드한다. 대시보드가 실행 중이어야 한다.
disable-model-invocation: true
user-invocable: true
allowed-tools: Bash
---

## 테스트 데이터 시드

### 1. 환경 확인

```bash
curl -sf http://localhost:9845/api/health > /dev/null 2>&1 || { echo "Error: Dashboard is not running. Run /dev-up first."; exit 1; }
```

### 2. 시드 실행

```bash
curl -s -X POST http://localhost:9845/api/seed
```

### 3. 검증

```bash
echo "=== Overview ==="
curl -s http://localhost:9845/api/overview | python3 -m json.tool

echo "=== Sessions (first 3) ==="
curl -s http://localhost:9845/api/sessions | python3 -c "import sys,json; data=json.load(sys.stdin); [print(f\"{s['agent_type']:8s} {s['model']:30s} \${s['cost']:.3f}\") for s in data[:3]]"
```
