---
title: "시작하기"
description: "Argus를 빠르게 시작하세요"
---

Argus는 AI 코딩 에이전트를 위한 로컬 모니터링 대시보드입니다. Claude Code, Codex CLI, Gemini CLI에서 OpenTelemetry (OTLP) 텔레메트리를 수신하고, 통합 대시보드에서 사용량을 시각화합니다.

## 작동 방식

<Mermaid>
{"flowchart LR\n    A[Claude Code / Codex CLI / Gemini CLI] -- OTLP HTTP --> B[Argus 데스크톱 앱]\n    B -- 저장 --> C[(SQLite)]\n    C -- 쿼리 --> D[대시보드]"}
</Mermaid>

1. **AI 에이전트**가 OTLP를 통해 텔레메트리 이벤트(API 요청, 도구 사용, 비용)를 전송합니다
2. **Argus**가 이를 수신하여 로컬 SQLite 데이터베이스에 저장합니다
3. **대시보드**에서 비용, 토큰, 세션, 도구 등을 시각화합니다

## 다음 단계

1. [Argus 설치](/docs/ko/installation) — 데스크톱 앱 다운로드
2. [에이전트 설정](/docs/ko/setup-guide) — Claude Code, Codex, Gemini의 텔레메트리 설정
3. [대시보드 살펴보기](/docs/ko/user-guide) — 각 페이지에 대해 알아보기
