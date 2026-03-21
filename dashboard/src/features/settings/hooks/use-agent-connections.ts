'use client'

import { useState, useEffect } from 'react'
import { settingsService } from '@/shared/services'
import type { AgentConnectionStatus } from '@/types/settings'

export const useAgentConnections = () => {
  const [agents, setAgents] = useState<AgentConnectionStatus[]>([])
  const [endpoint, setEndpoint] = useState('http://localhost:9845')
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  const refreshStatus = async () => {
    const data = await settingsService.getSetupStatus()
    setAgents(data.agents)
    const connected = data.agents.find((a) => a.configured && a.endpoint)
    if (connected?.endpoint) setEndpoint(connected.endpoint)
  }

  useEffect(() => {
    settingsService.getSetupStatus()
      .then((data) => {
        setAgents(data.agents)
        const connected = data.agents.find((a) => a.configured && a.endpoint)
        if (connected?.endpoint) setEndpoint(connected.endpoint)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleConnect = async (agentTypes: string[]) => {
    const key = agentTypes.length > 1 ? 'all' : agentTypes[0]
    setConnecting(key)
    try {
      await settingsService.connectAgents({ agents: agentTypes, endpoint })
      await refreshStatus()
    } catch {
      // ignore
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (type: string) => {
    setConnecting(type)
    try {
      await settingsService.disconnectAgents({ agents: [type] })
      await refreshStatus()
    } catch {
      // ignore
    } finally {
      setConnecting(null)
    }
  }

  const hasAnyConnected = agents.some((a) => a.configured)
  const unconfiguredAgents = agents.filter((a) => !a.configured).map((a) => a.type)

  return {
    agents,
    endpoint,
    setEndpoint,
    loading,
    connecting,
    hasAnyConnected,
    unconfiguredAgents,
    handleConnect,
    handleDisconnect,
  }
}
