'use client'

import { useState, useEffect, useCallback } from 'react'

export type Locale = 'ko' | 'en'

const STORAGE_KEY = 'argus-locale'

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    // Nav categories
    'nav.monitoring': '모니터링',
    'nav.analysis': '분석',
    'nav.dashboard': '대시보드',
    'nav.sessions': '세션',
    'nav.cost': '비용',
    'nav.tools': '도구',
    'nav.settings': '설정',
    'nav.collapse': '접기',
    'nav.expand': '펼치기',

    // Settings categories
    'settings.title': '설정',
    'settings.general': '일반',
    'settings.agents': '에이전트',
    'settings.pricing': '요금',
    'settings.data': '데이터',
    'settings.config': '설정 이력',

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
  },
  en: {
    // Nav categories
    'nav.monitoring': 'Monitoring',
    'nav.analysis': 'Analysis',
    'nav.dashboard': 'Dashboard',
    'nav.sessions': 'Sessions',
    'nav.cost': 'Cost',
    'nav.tools': 'Tools',
    'nav.settings': 'Settings',
    'nav.collapse': 'Collapse',
    'nav.expand': 'Expand',

    // Settings categories
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.agents': 'Agents',
    'settings.pricing': 'Pricing',
    'settings.data': 'Data',
    'settings.config': 'Config',

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

export const t = (key: string, locale: Locale): string => {
  return translations[locale]?.[key] ?? key
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
    (key: string) => t(key, locale),
    [locale]
  )

  return { locale, setLocale: changeLocale, t: translate }
}
