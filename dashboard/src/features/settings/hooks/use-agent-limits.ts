'use client'

import { useState, useEffect } from 'react'
import { settingsService } from '@/shared/services'
import type { AgentLimitState } from '@/types/settings'

const LIMIT_AGENT_TYPES = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'codex', label: 'Codex' },
  { id: 'gemini', label: 'Gemini CLI' },
]

export const useAgentLimits = () => {
  const [limits, setLimits] = useState<AgentLimitState[]>(
    LIMIT_AGENT_TYPES.map((a) => ({ agent_type: a.id, daily_cost_limit: '0', monthly_cost_limit: '0' }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    settingsService.getLimits()
      .then((data) => {
        const existing = data.limits ?? []
        setLimits((prev) =>
          prev.map((l) => {
            const found = existing.find((e) => e.agent_type === l.agent_type)
            if (found) {
              return {
                ...l,
                daily_cost_limit: String(found.daily_cost_limit),
                monthly_cost_limit: String(found.monthly_cost_limit),
              }
            }
            return l
          })
        )
      })
      .catch(() => {})
  }, [])

  const handleChange = (agentType: string, field: 'daily_cost_limit' | 'monthly_cost_limit', value: string) => {
    setLimits((prev) =>
      prev.map((l) => (l.agent_type === agentType ? { ...l, [field]: value } : l))
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await settingsService.saveLimits({
        limits: limits.map((l) => ({
          agent_type: l.agent_type,
          daily_cost_limit: parseFloat(l.daily_cost_limit) || 0,
          monthly_cost_limit: parseFloat(l.monthly_cost_limit) || 0,
        })),
      })
      setSaved(true)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return { limits, saving, saved, agentTypes: LIMIT_AGENT_TYPES, handleChange, handleSave }
}
