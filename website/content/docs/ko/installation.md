---
title: "설치"
description: "Argus 다운로드 및 설치"
---

## 데스크톱 앱 (권장)

[GitHub Releases](https://github.com/79841/argus/releases)에서 최신 설치 파일을 다운로드하세요:

| 플랫폼 | 파일 | 설치 방법 |
|--------|------|-----------|
| **macOS** (Apple Silicon) | `Argus-x.x.x-arm64.dmg` | DMG를 열고 → Applications으로 드래그 → 실행 |
| **Windows** | `Argus Setup x.x.x.exe` | NSIS 설치 프로그램 실행 → 시작 메뉴에서 실행 |

실행 후 Argus는 **트레이 상주 앱**으로 동작하며 자동으로:
- `http://localhost:3000`에서 Next.js 서버를 시작합니다
- Electron 윈도우에서 대시보드를 엽니다
- 텔레메트리 저장을 위한 SQLite 데이터베이스를 생성합니다

별도의 설정이 필요 없습니다 — 설치하고 실행하기만 하면 됩니다.

## 소스에서 빌드 (기여자용)

### 사전 요구사항

- **Node.js** 20+
- **pnpm** (`npm install -g pnpm`)

### 설치 단계

```bash
git clone https://github.com/79841/argus.git
cd argus/dashboard
pnpm install
```

**웹 모드** (http://localhost:3000 에서 브라우저로 접속):

```bash
pnpm dev
```

**데스크톱 모드** (트레이 아이콘이 포함된 Electron 앱):

```bash
pnpm electron:dev
```

### 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `ARGUS_DB_PATH` | `../argus.db` | SQLite 데이터베이스 파일 경로 |

### 설치 파일 빌드

```bash
pnpm electron:dist:mac   # macOS DMG (arm64)
pnpm electron:dist:win   # Windows NSIS (x64)
```

## 다음 단계

설치 후, [AI 에이전트를 설정](/docs/ko/setup-guide)하여 Argus로 텔레메트리를 전송하세요.
