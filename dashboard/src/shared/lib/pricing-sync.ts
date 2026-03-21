/**
 * Sync pricing data from LiteLLM's model_prices_and_context_window.json
 * Source: https://github.com/BerriAI/litellm (MIT License, Copyright 2023 Berri AI)
 */
import type Database from 'better-sqlite3'

const LITELLM_PRICES_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'

type LiteLLMModel = {
  input_cost_per_token?: number
  output_cost_per_token?: number
  cache_read_input_token_cost?: number
  litellm_provider?: string
}

const AGENT_MODEL_MAP: Record<string, { prefix: string; agent_type: string }[]> = {
  codex: [
    { prefix: 'gpt-', agent_type: 'codex' },
    { prefix: 'o3', agent_type: 'codex' },
    { prefix: 'o4-', agent_type: 'codex' },
    { prefix: 'codex-', agent_type: 'codex' },
  ],
  gemini: [
    { prefix: 'gemini/', agent_type: 'gemini' },
  ],
}

const normalizeModelId = (key: string): string => {
  return key.replace(/^gemini\//, '')
}

const matchesAgent = (key: string, model: LiteLLMModel): string | null => {
  const provider = model.litellm_provider || ''

  for (const rule of AGENT_MODEL_MAP.codex) {
    if (key.startsWith(rule.prefix) && (provider === 'openai' || provider === '')) {
      return 'codex'
    }
  }

  for (const rule of AGENT_MODEL_MAP.gemini) {
    if (key.startsWith(rule.prefix) && (provider === 'gemini' || provider === '')) {
      return 'gemini'
    }
  }

  return null
}

export const syncPricingFromLiteLLM = async (db: Database.Database): Promise<number> => {
  const res = await fetch(LITELLM_PRICES_URL)
  if (!res.ok) return 0

  const data = (await res.json()) as Record<string, LiteLLMModel>

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO pricing_model
      (model_id, agent_type, effective_date, input_per_mtok, output_per_mtok, cache_read_per_mtok, cache_creation_per_mtok)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `)

  let count = 0
  const today = new Date().toISOString().slice(0, 10)

  const tx = db.transaction(() => {
    for (const [key, model] of Object.entries(data)) {
      if (!model.input_cost_per_token || !model.output_cost_per_token) continue

      const agentType = matchesAgent(key, model)
      if (!agentType) continue

      const modelId = normalizeModelId(key)
      const inputPerMtok = model.input_cost_per_token * 1_000_000
      const outputPerMtok = model.output_cost_per_token * 1_000_000
      const cacheReadPerMtok = (model.cache_read_input_token_cost || 0) * 1_000_000

      upsert.run(modelId, agentType, today, inputPerMtok, outputPerMtok, cacheReadPerMtok)
      count++
    }
  })
  tx()

  return count
}
