'use client'

import { useState, useEffect, useCallback } from 'react'

export type Locale = 'ko' | 'en'

const STORAGE_KEY = 'argus-locale'

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    // Nav
    'nav.dashboard': '대시보드',
    'nav.sessions': '세션',
    'nav.usage': '사용량',
    'nav.tools': '도구',
    'nav.rules': '규칙',
    'nav.insights': '인사이트',
    'nav.settings': '설정',
    'nav.projects': '프로젝트',
    'nav.collapse': '접기',
    'nav.expand': '펼치기',
    'nav.promptAnalysis': '프롬프트 분석',
    'nav.promptInsights': '프롬프트 인사이트',

    // Settings categories
    'settings.title': '설정',
    'settings.general': '일반',
    'settings.agents': '에이전트',
    'settings.pricing': '요금',
    'settings.data': '데이터',
    'settings.setup': '설정 가이드',

    // General section
    'settings.theme': '테마',
    'settings.theme.description': '원하는 색상 모드를 선택하세요.',
    'settings.theme.light': '라이트',
    'settings.theme.dark': '다크',
    'settings.theme.system': '시스템',
    'settings.agentTheme': '에이전트 테마',
    'settings.agentTheme.description': '에이전트별 강조 색상 테마를 선택하세요.',
    'settings.autoRefresh': '자동 새로고침',
    'settings.autoRefresh.description': '대시보드 데이터 폴링 주기를 설정합니다.',
    'settings.language': '언어',
    'settings.language.description': '인터페이스 언어를 선택하세요.',

    // Settings — Agents section
    'settings.agents.costLimits.description': '에이전트별 일일/월별 비용 한도를 설정합니다. Bottom Bar에서 잔여 비율을 확인할 수 있습니다.',
    'settings.agents.collection.description': '에이전트별 마지막 데이터 수신 시간과 오늘 수집 건수를 확인합니다.',

    // Settings — Data section
    'settings.data.export.description': '모니터링 데이터를 CSV 또는 JSON으로 내보냅니다.',
    'settings.data.cleanup.description': '기간별/에이전트별 데이터를 삭제합니다.',
    'settings.data.dbstats.description': '데이터베이스 파일 크기 및 테이블별 레코드 수를 확인합니다.',

    // Settings — Setup section
    'settings.setup.dashboard.title': '대시보드 실행',
    'settings.setup.events.title': '수집되는 이벤트',
    'settings.setup.events.description': 'Claude Code, Codex, Gemini CLI 모두 동일한 이벤트 유형으로 정규화되어 저장됩니다.',
    'settings.setup.claude.step1': '1. 환경변수 설정',
    'settings.setup.claude.step1.desc': '셸 프로필 (~/.zshrc, ~/.bashrc, 또는 Windows PowerShell $PROFILE)에 다음을 추가합니다:',
    'settings.setup.claude.step2': '2. 프로젝트 필터링 (선택)',
    'settings.setup.claude.step2.desc': '프로젝트별 데이터를 구분하려면 프로젝트의 .claude/settings.json에 추가합니다:',
    'settings.setup.claude.step3': '3. Orchestration Tools 추적 (선택)',
    'settings.setup.claude.step3.desc': '에이전트, 스킬, MCP 도구 호출을 상세 추적하려면 글로벌 설정(~/.claude/settings.json, Windows: %USERPROFILE%\\.claude\\settings.json)에 추가합니다:',
    'settings.setup.claude.step3.note': '이 설정이 활성화되면 OTel 텔레메트리에 Agent의 subagent_type, Skill 이름, MCP 서버/도구 이름이 포함됩니다.',
    'settings.setup.claude.step4': '4. 확인',
    'settings.setup.claude.step4.desc': 'Claude Code를 실행하고 대시보드에서 데이터가 수집되는지 확인합니다.',
    'settings.setup.codex.step1': '1. OTel 설정',
    'settings.setup.codex.step1.desc': '~/.codex/config.toml (Windows: %USERPROFILE%\\.codex\\config.toml)에 다음을 추가합니다:',
    'settings.setup.codex.step2': '2. 프로젝트 정보',
    'settings.setup.codex.step2.desc': 'Codex는 도구 실행 시 작업 디렉토리(workdir)에서 프로젝트 이름을 자동으로 추출합니다. 별도의 프로젝트 설정이 필요하지 않습니다.',
    'settings.setup.codex.step3': '3. 확인',
    'settings.setup.codex.step3.desc': 'Codex를 실행하고 대시보드에서 데이터가 수집되는지 확인합니다.',
    'settings.setup.gemini.step1': '1. 텔레메트리 설정',
    'settings.setup.gemini.step1.desc': '~/.gemini/settings.json (Windows: %USERPROFILE%\\.gemini\\settings.json)에 다음을 추가합니다:',
    'settings.setup.gemini.step1.note': '또는 환경변수로 설정할 수 있습니다:',
    'settings.setup.gemini.step2': '2. 프로젝트 필터링 (선택)',
    'settings.setup.gemini.step2.desc': '프로젝트별 데이터를 구분하려면 direnv를 사용합니다:',
    'settings.setup.gemini.step3': '3. 확인',
    'settings.setup.gemini.step3.desc': 'Gemini CLI를 실행하고 대시보드에서 데이터가 수집되는지 확인합니다.',
    'settings.setup.dashboard.desc': 'http://localhost:3000에서 대시보드에 접속할 수 있습니다. 에이전트의 OTLP 엔드포인트도 동일한 주소를 사용합니다.',

    // Sessions page
    'sessions.search.placeholder': '세션 ID, 프로젝트, 모델 검색...',
    'sessions.sort.latest': '최신순',
    'sessions.sort.cost': '비용순',
    'sessions.sort.tokens': '토큰순',
    'sessions.loading': '로딩 중...',
    'sessions.empty': '세션 없음',
    'sessions.count': '개 세션',
    'sessions.total': '총 ',
    'sessions.cache': '캐시 ',
    'sessions.detail.loading': '세션 상세 로딩 중...',
    'sessions.detail.placeholder': '세션을 선택하면 상세 정보가 표시됩니다',
    'sessions.detail.cost': '비용',
    'sessions.detail.input': '입력',
    'sessions.detail.output': '출력',
    'sessions.detail.cache': '캐시',
    'sessions.detail.duration': '소요시간',
    'sessions.detail.reqTools': '요청/도구',
    'sessions.detail.timeline': '이벤트 타임라인',
    'sessions.detail.noEvents': '이벤트 없음',
    'sessions.promptGroup.events': ' 이벤트',
    'sessions.reltime.sec': '초 전',
    'sessions.reltime.min': '분 전',
    'sessions.reltime.hour': '시간 전',
    'sessions.reltime.day': '일 전',

    // Session detail page
    'sessions.detail.back': '← 세션 목록',
    'sessions.detail.openDetail': '상세 페이지 열기',
    'sessions.detail.costChart': '프롬프트별 비용 분포',
    'sessions.detail.noProject': '프로젝트 없음',
    'sessions.detail.promptNum': '프롬프트 #',
    'sessions.detail.toolCalls': '도구 호출',

    // Insights page
    'insights.date.7': '7일',
    'insights.date.14': '14일',
    'insights.date.30': '30일',
    'insights.date.90': '90일',

    // Tools page
    'tools.subtitle': '도구 사용 패턴 분석',
    'tools.date.7': '7일',
    'tools.date.14': '14일',
    'tools.date.30': '30일',
    'tools.date.90': '90일',
    'tools.kpi.totalCalls': '총 호출수',
    'tools.kpi.successRate': '성공률',
    'tools.kpi.avgDuration': '평균 소요시간',
    'tools.kpi.uniqueTools': '고유 도구 수',
    'tools.chart.topTools': '상위 도구 (Top 15)',
    'tools.chart.categoryDist': '카테고리별 분포',
    'tools.chart.dailyTrend': '일별 도구 사용 추이',
    'tools.chart.dailyTotal': '일별 총 호출 추이',
    'tools.chart.totalCalls': '총 호출',

    // Rules page
    'rules.subtitle': '에이전트 지침 · 스킬 · 설정 파일',
    'rules.loading': '로딩 중...',
    'rules.empty': '에이전트 파일을 찾을 수 없습니다.',
    'rules.scope.user': 'User: ~ (홈)',
    'rules.file.placeholder': '파일을 선택하세요',
    'rules.file.placeholder.desc': '좌측 트리에서 파일을 클릭하면 내용을 확인할 수 있습니다.',
    'rules.file.loading': '불러오는 중...',
    'rules.btn.preview': '미리보기',
    'rules.btn.edit': '편집',
    'rules.btn.save': '저장',
    'rules.btn.saved': '저장됨',

    // Projects page
    'projects.title': 'Projects',
    'projects.subtitle': '프로젝트별 비용 및 사용 현황',
    'projects.kpi.totalProjects': 'TOTAL PROJECTS',
    'projects.kpi.totalCost': 'TOTAL COST',
    'projects.kpi.mostActive': 'MOST ACTIVE',
    'projects.sessions': '세션',
    'projects.chart.costComparison': '프로젝트별 비용 비교 (Top 15)',
    'projects.chart.noData': '프로젝트 데이터가 없습니다',
    'projects.table.title': '프로젝트 목록',
    'projects.col.project': '프로젝트',
    'projects.col.sessions': '세션',
    'projects.col.requests': '요청',
    'projects.col.cost': '비용',
    'projects.col.topModel': '주요 모델',
    'projects.col.lastActive': '마지막 활동',
    'projects.back': '← Projects',

    // Project detail page
    'projects.detail.kpi.totalCost': '총 비용',
    'projects.detail.kpi.sessions': '세션',
    'projects.detail.kpi.requests': '요청',
    'projects.detail.kpi.inputTokens': '입력 토큰',
    'projects.detail.kpi.outputTokens': '출력 토큰',
    'projects.detail.kpi.cacheHitRate': '캐시 히트율',
    'projects.detail.chart.agentDist': '에이전트별 비용 분포',
    'projects.detail.chart.dailyCost': '일별 비용 추이',
    'projects.detail.chart.agentStatus': '에이전트별 현황',
    'projects.detail.noData': '데이터 없음',

    // Insights page
    'insights.title': 'Cost Insights',
    'insights.subtitle': '고비용 세션, 모델 효율성, 예산 추적',
    'insights.suggestions': '개선 제안',
    'insights.suggestions.allGood': '모든 지표가 양호합니다',
    'insights.suggestions.allGood.desc': '현재 사용 패턴에서 개선이 필요한 항목이 없습니다.',
    'insights.suggestions.loading': '로딩 중...',
    'insights.suggestions.current': '현재',
    'insights.suggestions.targetLabel': '목표',
    'insights.suggestions.actionLabel': '개선 방법',
    'suggestions.lowCacheRate.title': '캐시 히트율 개선 필요',
    'suggestions.lowCacheRate.desc': '캐시 히트율이 {rate}로 낮습니다. CLAUDE.md에 컨텍스트 힌트를 추가하면 캐시 재사용률을 높일 수 있습니다.',
    'suggestions.lowCacheRate.target': '50% 이상',
    'suggestions.lowCacheRate.action': 'CLAUDE.md에 자주 쓰이는 컨텍스트(프로젝트 구조, 코딩 규칙 등)를 추가하세요.',
    'suggestions.highToolFail.title': '도구 실패율이 높습니다',
    'suggestions.highToolFail.desc': '도구 실패율이 {rate}입니다. 도구 설정 및 권한을 확인하세요.',
    'suggestions.highToolFail.target': '15% 미만',
    'suggestions.highToolFail.action': '실패율이 높은 도구의 권한과 경로 설정을 검토하세요.',
    'suggestions.expensiveModel.title': '고가 모델 사용 비율이 높습니다',
    'suggestions.expensiveModel.desc': '고가 모델(opus 계열) 사용 비율이 {ratio}입니다. 단순 작업에는 sonnet을 사용하면 비용을 절감할 수 있습니다.',
    'suggestions.expensiveModel.target': '70% 미만',
    'suggestions.expensiveModel.action': '반복적이거나 단순한 작업은 claude-sonnet 모델을 사용하도록 설정하세요.',
    'suggestions.highSessionCost.title': '세션 평균 비용이 높습니다',
    'suggestions.highSessionCost.desc': '세션당 평균 비용이 {cost}입니다. 프롬프트를 구체적으로 작성하면 불필요한 왕복 요청을 줄일 수 있습니다.',
    'suggestions.highSessionCost.target': '$2.00 미만',
    'suggestions.highSessionCost.action': '프롬프트를 명확하고 구체적으로 작성해 불필요한 추가 요청을 줄이세요.',
    'suggestions.highDailyCost.title': '일일 비용이 높습니다',
    'suggestions.highDailyCost.desc': '오늘 총 비용이 {cost}입니다. 예산 한도를 설정하는 것을 권장합니다.',
    'suggestions.highDailyCost.target': '$10.00 미만',
    'suggestions.highDailyCost.action': 'Settings 페이지에서 에이전트별 일일 예산 한도를 설정하세요.',
    'suggestions.toolFail.title': '{name} 도구 실패율이 높습니다',
    'suggestions.toolFail.desc': '{name} 실패율이 {rate}입니다. 권한 및 경로 설정을 확인하세요.',
    'suggestions.toolFail.target': '30% 미만',
    'suggestions.toolFail.action': '{name} 도구의 실행 권한, 경로, 환경 설정을 점검하세요.',
    'insights.kpi.top10Total': 'TOP 10 합계',
    'insights.kpi.avgSessionCost': '평균 세션 비용',
    'insights.kpi.topCause': '주요 원인',
    'insights.highCostSessions': '고비용 세션 (Top 10)',
    'insights.modelEfficiency': '모델 비용 효율성',
    'insights.dailyBudget': '일별 예산',
    'insights.loading': '로딩 중...',
    'insights.noHighCost': '고비용 세션 없음',
    'insights.noModelData': '모델 데이터 없음',
    'insights.noLimit': '한도 없음',
    'insights.suggestion.current': '현재',
    'insights.suggestion.target': '목표',
    'insights.suggestion.action': '개선 방법',
    'insights.cause.expensiveModel': '비싼 모델',
    'insights.cause.manyToolCalls': '도구 호출 많음',
    'insights.cause.manyRequests': '요청 많음',
    'insights.cause.noCache': '캐시 미사용',
    'insights.col.agent': '에이전트',
    'insights.col.model': '모델',
    'insights.col.cost': '비용',
    'insights.col.reqs': '요청',
    'insights.col.tools': '도구',
    'insights.col.causes': '원인',
    'insights.col.totalCost': '총 비용',
    'insights.col.avgPerReq': '요청당 평균',
    'insights.col.per1kTok': '$/1K 토큰',
    'insights.col.avgSpeed': '평균 속도',
  },
  en: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.sessions': 'Sessions',
    'nav.usage': 'Usage',
    'nav.tools': 'Tools',
    'nav.rules': 'Rules',
    'nav.insights': 'Insights',
    'nav.settings': 'Settings',
    'nav.projects': 'Projects',
    'nav.collapse': 'Collapse',
    'nav.expand': 'Expand',
    'nav.promptAnalysis': 'Prompt Analysis',
    'nav.promptInsights': 'Prompt Insights',

    // Settings categories
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.agents': 'Agents',
    'settings.pricing': 'Pricing',
    'settings.data': 'Data',
    'settings.setup': 'Setup',

    // General section
    'settings.theme': 'Theme',
    'settings.theme.description': 'Choose your preferred color scheme.',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.theme.system': 'System',
    'settings.agentTheme': 'Agent Theme',
    'settings.agentTheme.description': 'Choose an agent accent color theme.',
    'settings.autoRefresh': 'Auto Refresh',
    'settings.autoRefresh.description': 'Set the polling interval for dashboard data.',
    'settings.language': 'Language',
    'settings.language.description': 'Select the interface language.',

    // Settings — Agents section
    'settings.agents.costLimits.description': 'Set daily/monthly cost limits per agent. The remaining ratio is shown in the Bottom Bar.',
    'settings.agents.collection.description': 'Check the last data received time and today\'s collection count per agent.',

    // Settings — Data section
    'settings.data.export.description': 'Export monitoring data as CSV or JSON.',
    'settings.data.cleanup.description': 'Delete data by time range or agent.',
    'settings.data.dbstats.description': 'Check database file size and record count per table.',

    // Settings — Setup section
    'settings.setup.dashboard.title': 'Run Dashboard',
    'settings.setup.events.title': 'Collected Events',
    'settings.setup.events.description': 'Claude Code, Codex, and Gemini CLI are all normalized to the same event types before storage.',
    'settings.setup.claude.step1': '1. Set Environment Variables',
    'settings.setup.claude.step1.desc': 'Add the following to your shell profile (~/.zshrc, ~/.bashrc, or Windows PowerShell $PROFILE):',
    'settings.setup.claude.step2': '2. Project Filtering (optional)',
    'settings.setup.claude.step2.desc': 'To separate data per project, add to the project\'s .claude/settings.json:',
    'settings.setup.claude.step3': '3. Track Orchestration Tools (optional)',
    'settings.setup.claude.step3.desc': 'To track agent, skill, and MCP tool calls in detail, add to the global settings (~/.claude/settings.json, Windows: %USERPROFILE%\\.claude\\settings.json):',
    'settings.setup.claude.step3.note': 'When enabled, the OTel telemetry will include the Agent\'s subagent_type, Skill name, and MCP server/tool name.',
    'settings.setup.claude.step4': '4. Verify',
    'settings.setup.claude.step4.desc': 'Run Claude Code and verify that data is being collected on the dashboard.',
    'settings.setup.codex.step1': '1. OTel Configuration',
    'settings.setup.codex.step1.desc': 'Add the following to ~/.codex/config.toml (Windows: %USERPROFILE%\\.codex\\config.toml):',
    'settings.setup.codex.step2': '2. Project Information',
    'settings.setup.codex.step2.desc': 'Codex automatically extracts the project name from the working directory (workdir) when executing tools. No separate project configuration is needed.',
    'settings.setup.codex.step3': '3. Verify',
    'settings.setup.codex.step3.desc': 'Run Codex and verify that data is being collected on the dashboard.',
    'settings.setup.gemini.step1': '1. Telemetry Configuration',
    'settings.setup.gemini.step1.desc': 'Add the following to ~/.gemini/settings.json (Windows: %USERPROFILE%\\.gemini\\settings.json):',
    'settings.setup.gemini.step1.note': 'Or configure via environment variables:',
    'settings.setup.gemini.step2': '2. Project Filtering (optional)',
    'settings.setup.gemini.step2.desc': 'To separate data per project, use direnv:',
    'settings.setup.gemini.step3': '3. Verify',
    'settings.setup.gemini.step3.desc': 'Run Gemini CLI and verify that data is being collected on the dashboard.',
    'settings.setup.dashboard.desc': 'Access the dashboard at http://localhost:3000. The agent\'s OTLP endpoint uses the same address.',

    // Sessions page
    'sessions.search.placeholder': 'Search session ID, project, model...',
    'sessions.sort.latest': 'Latest',
    'sessions.sort.cost': 'By Cost',
    'sessions.sort.tokens': 'By Tokens',
    'sessions.loading': 'Loading...',
    'sessions.empty': 'No sessions',
    'sessions.count': ' sessions',
    'sessions.total': 'Total ',
    'sessions.cache': 'Cache ',
    'sessions.detail.loading': 'Loading session details...',
    'sessions.detail.placeholder': 'Select a session to view details',
    'sessions.detail.cost': 'Cost',
    'sessions.detail.input': 'Input',
    'sessions.detail.output': 'Output',
    'sessions.detail.cache': 'Cache',
    'sessions.detail.duration': 'Duration',
    'sessions.detail.reqTools': 'Req / Tools',
    'sessions.detail.timeline': 'Event Timeline',
    'sessions.detail.noEvents': 'No events',
    'sessions.promptGroup.events': ' events',
    'sessions.reltime.sec': 's ago',
    'sessions.reltime.min': 'm ago',
    'sessions.reltime.hour': 'h ago',
    'sessions.reltime.day': 'd ago',

    // Session detail page
    'sessions.detail.back': '← Sessions',
    'sessions.detail.openDetail': 'Open detail page',
    'sessions.detail.costChart': 'Cost by Prompt',
    'sessions.detail.noProject': 'No project',
    'sessions.detail.promptNum': 'Prompt #',
    'sessions.detail.toolCalls': 'tool calls',

    // Insights page
    'insights.date.7': '7 days',
    'insights.date.14': '14 days',
    'insights.date.30': '30 days',
    'insights.date.90': '90 days',

    // Tools page
    'tools.subtitle': 'Tool usage pattern analysis',
    'tools.date.7': '7d',
    'tools.date.14': '14d',
    'tools.date.30': '30d',
    'tools.date.90': '90d',
    'tools.kpi.totalCalls': 'Total Calls',
    'tools.kpi.successRate': 'Success Rate',
    'tools.kpi.avgDuration': 'Avg Duration',
    'tools.kpi.uniqueTools': 'Unique Tools',
    'tools.chart.topTools': 'Top Tools (Top 15)',
    'tools.chart.categoryDist': 'Category Distribution',
    'tools.chart.dailyTrend': 'Daily Tool Usage Trend',
    'tools.chart.dailyTotal': 'Daily Total Calls Trend',
    'tools.chart.totalCalls': 'Total Calls',

    // Rules page
    'rules.subtitle': 'Agent instructions · Skills · Config files',
    'rules.loading': 'Loading...',
    'rules.empty': 'No agent files found.',
    'rules.scope.user': 'User: ~ (home)',
    'rules.file.placeholder': 'Select a file',
    'rules.file.placeholder.desc': 'Click a file in the left tree to view its content.',
    'rules.file.loading': 'Loading...',
    'rules.btn.preview': 'Preview',
    'rules.btn.edit': 'Edit',
    'rules.btn.save': 'Save',
    'rules.btn.saved': 'Saved',

    // Projects page
    'projects.title': 'Projects',
    'projects.subtitle': 'Cost and usage by project',
    'projects.kpi.totalProjects': 'TOTAL PROJECTS',
    'projects.kpi.totalCost': 'TOTAL COST',
    'projects.kpi.mostActive': 'MOST ACTIVE',
    'projects.sessions': 'sessions',
    'projects.chart.costComparison': 'Cost Comparison by Project (Top 15)',
    'projects.chart.noData': 'No project data',
    'projects.table.title': 'Project List',
    'projects.col.project': 'Project',
    'projects.col.sessions': 'Sessions',
    'projects.col.requests': 'Requests',
    'projects.col.cost': 'Total Cost',
    'projects.col.topModel': 'Top Model',
    'projects.col.lastActive': 'Last Active',
    'projects.back': '← Projects',

    // Project detail page
    'projects.detail.kpi.totalCost': 'Total Cost',
    'projects.detail.kpi.sessions': 'Sessions',
    'projects.detail.kpi.requests': 'Requests',
    'projects.detail.kpi.inputTokens': 'Input Tokens',
    'projects.detail.kpi.outputTokens': 'Output Tokens',
    'projects.detail.kpi.cacheHitRate': 'Cache Hit Rate',
    'projects.detail.chart.agentDist': 'Cost by Agent',
    'projects.detail.chart.dailyCost': 'Daily Cost Trend',
    'projects.detail.chart.agentStatus': 'Agent Breakdown',
    'projects.detail.noData': 'No data',

    // Insights page
    'insights.title': 'Cost Insights',
    'insights.subtitle': 'High-cost sessions, model efficiency, and budget tracking',
    'insights.suggestions': 'Suggestions',
    'insights.suggestions.allGood': 'All metrics look good',
    'insights.suggestions.allGood.desc': 'No improvements needed for the current usage pattern.',
    'insights.suggestions.loading': 'Loading...',
    'insights.suggestions.current': 'Current',
    'insights.suggestions.targetLabel': 'Target',
    'insights.suggestions.actionLabel': 'How to improve',
    'suggestions.lowCacheRate.title': 'Low cache hit rate',
    'suggestions.lowCacheRate.desc': 'Cache hit rate is {rate}. Adding context hints to CLAUDE.md can improve cache reuse.',
    'suggestions.lowCacheRate.target': 'Above 50%',
    'suggestions.lowCacheRate.action': 'Add frequently used context (project structure, coding rules, etc.) to CLAUDE.md.',
    'suggestions.highToolFail.title': 'High tool failure rate',
    'suggestions.highToolFail.desc': 'Tool failure rate is {rate}. Check tool settings and permissions.',
    'suggestions.highToolFail.target': 'Below 15%',
    'suggestions.highToolFail.action': 'Review permissions and path settings for tools with high failure rates.',
    'suggestions.expensiveModel.title': 'High expensive model usage',
    'suggestions.expensiveModel.desc': 'Expensive model (opus) usage ratio is {ratio}. Using sonnet for simple tasks can reduce costs.',
    'suggestions.expensiveModel.target': 'Below 70%',
    'suggestions.expensiveModel.action': 'Configure claude-sonnet for repetitive or simple tasks.',
    'suggestions.highSessionCost.title': 'High average session cost',
    'suggestions.highSessionCost.desc': 'Average cost per session is {cost}. Writing specific prompts can reduce unnecessary round-trips.',
    'suggestions.highSessionCost.target': 'Below $2.00',
    'suggestions.highSessionCost.action': 'Write clear, specific prompts to reduce unnecessary extra requests.',
    'suggestions.highDailyCost.title': 'High daily cost',
    'suggestions.highDailyCost.desc': 'Total cost today is {cost}. Consider setting a budget limit.',
    'suggestions.highDailyCost.target': 'Below $10.00',
    'suggestions.highDailyCost.action': 'Set daily budget limits per agent in the Settings page.',
    'suggestions.toolFail.title': '{name} tool has high failure rate',
    'suggestions.toolFail.desc': '{name} failure rate is {rate}. Check permissions and path settings.',
    'suggestions.toolFail.target': 'Below 30%',
    'suggestions.toolFail.action': 'Check execution permissions, paths, and environment settings for {name}.',
    'insights.kpi.top10Total': 'TOP 10 TOTAL',
    'insights.kpi.avgSessionCost': 'AVG SESSION COST',
    'insights.kpi.topCause': 'TOP CAUSE',
    'insights.highCostSessions': 'High-Cost Sessions (Top 10)',
    'insights.modelEfficiency': 'Model Cost Efficiency',
    'insights.dailyBudget': 'Daily Budget',
    'insights.loading': 'Loading...',
    'insights.noHighCost': 'No high-cost sessions',
    'insights.noModelData': 'No model data',
    'insights.noLimit': 'No limit',
    'insights.suggestion.current': 'Current',
    'insights.suggestion.target': 'Target',
    'insights.suggestion.action': 'Action',
    'insights.cause.expensiveModel': 'Expensive Model',
    'insights.cause.manyToolCalls': 'Many Tools',
    'insights.cause.manyRequests': 'Many Requests',
    'insights.cause.noCache': 'No Cache',
    'insights.col.agent': 'Agent',
    'insights.col.model': 'Model',
    'insights.col.cost': 'Cost',
    'insights.col.reqs': 'Reqs',
    'insights.col.tools': 'Tools',
    'insights.col.causes': 'Causes',
    'insights.col.totalCost': 'Total Cost',
    'insights.col.avgPerReq': 'Avg/req',
    'insights.col.per1kTok': '$/1K tok',
    'insights.col.avgSpeed': 'Avg Speed',
  },
}

export const getLocale = (): Locale => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && (stored === 'ko' || stored === 'en')) return stored
  } catch {
    // ignore
  }
  return 'ko'
}

export const setLocale = (locale: Locale) => {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
    window.dispatchEvent(new CustomEvent('argus-locale-change', { detail: locale }))
  } catch {
    // ignore
  }
}

export const t = (key: string, locale: Locale, params?: Record<string, string>): string => {
  let result = translations[locale]?.[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replaceAll(`{${k}}`, v)
    }
  }
  return result
}

export const useLocale = () => {
  const [locale, setLocaleState] = useState<Locale>('ko')

  useEffect(() => {
    setLocaleState(getLocale())

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Locale>).detail
      setLocaleState(detail)
    }
    window.addEventListener('argus-locale-change', handler)
    return () => window.removeEventListener('argus-locale-change', handler)
  }, [])

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    setLocale(newLocale)
  }, [])

  const translate = useCallback(
    (key: string, params?: Record<string, string>) => t(key, locale, params),
    [locale]
  )

  return { locale, setLocale: changeLocale, t: translate }
}
