---
title: "설치"
description: "Argus 다운로드 및 설치"
---

## 다운로드

<DownloadCards />

| 플랫폼 | 설치 방법 |
|--------|-----------|
| **macOS** (Apple Silicon) | DMG를 열고 → Applications으로 드래그 → 실행 |
| **Windows** (x64) | 설치 프로그램 실행 → 시작 메뉴에서 실행 |

실행 후 Argus는 **트레이 상주 앱**으로 동작하며 자동으로:
- `http://localhost:9845`에서 Next.js 서버를 시작합니다
- Electron 윈도우에서 대시보드를 엽니다
- 텔레메트리 저장을 위한 SQLite 데이터베이스를 생성합니다

별도의 설정이 필요 없습니다 — 설치하고 실행하기만 하면 됩니다.

## 다음 단계

설치 후, [AI 에이전트를 설정](/docs/ko/setup-guide)하여 Argus로 텔레메트리를 전송하세요.
