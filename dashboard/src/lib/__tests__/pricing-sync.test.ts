import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { initSchema } from '../db'
import { syncPricingFromLiteLLM } from '@/lib/pricing-sync'

let testDb: Database.Database

beforeEach(() => {
  testDb = new Database(':memory:')
  initSchema(testDb)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const makeLiteLLMResponse = (models: Record<string, object>) => {
  return {
    ok: true,
    json: async () => models,
  } as Response
}

const makeErrorResponse = (status: number) => {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as Response
}

describe('syncPricingFromLiteLLM', () => {
  it('LiteLLM JSON 정상 응답 → DB에 pricing upsert, 업데이트 건수 반환', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      makeLiteLLMResponse({
        'gpt-4o': {
          input_cost_per_token: 0.000005,
          output_cost_per_token: 0.000015,
          litellm_provider: 'openai',
        },
      })
    )

    const count = await syncPricingFromLiteLLM(testDb)

    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(count).toBe(1)

    const row = testDb.prepare("SELECT * FROM pricing_model WHERE model_id = 'gpt-4o'").get() as {
      model_id: string
      agent_type: string
      input_per_mtok: number
      output_per_mtok: number
    } | undefined
    expect(row).toBeDefined()
    expect(row!.agent_type).toBe('codex')
    expect(row!.input_per_mtok).toBeCloseTo(5.0)
    expect(row!.output_per_mtok).toBeCloseTo(15.0)
  })

  it('fetch 실패 (network error) → 에러 전파', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

    // pricing-sync.ts 구현에 try/catch가 없으므로 에러가 그대로 전파됨
    await expect(syncPricingFromLiteLLM(testDb)).rejects.toThrow('Network error')
  })

  it('fetch 4xx 응답 → 0 반환', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(makeErrorResponse(404))

    const count = await syncPricingFromLiteLLM(testDb)

    expect(count).toBe(0)
  })

  it('fetch 5xx 응답 → 0 반환', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(makeErrorResponse(500))

    const count = await syncPricingFromLiteLLM(testDb)

    expect(count).toBe(0)
  })

  it('codex 모델 매칭 → agent_type="codex"로 저장', async () => {
    // 새로운 codex 모델 (기존 seed에 없는 모델)을 사용
    // gpt- prefix와 o3 prefix 모두 codex로 매핑됨
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeLiteLLMResponse({
        'gpt-new-model-x': {
          input_cost_per_token: 0.000002,
          output_cost_per_token: 0.000008,
          litellm_provider: 'openai',
        },
        'o3-test-variant': {
          input_cost_per_token: 0.0000011,
          output_cost_per_token: 0.0000044,
          litellm_provider: 'openai',
        },
      })
    )

    const count = await syncPricingFromLiteLLM(testDb)

    expect(count).toBe(2)

    const rows = testDb.prepare(
      "SELECT * FROM pricing_model WHERE agent_type = 'codex' AND model_id IN ('gpt-new-model-x', 'o3-test-variant')"
    ).all() as Array<{ agent_type: string }>
    expect(rows.length).toBe(2)
    rows.forEach(r => expect(r.agent_type).toBe('codex'))
  })

  it('gemini 모델 매칭 → agent_type="gemini"로 저장', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeLiteLLMResponse({
        'gemini/gemini-2.5-pro': {
          input_cost_per_token: 0.00000125,
          output_cost_per_token: 0.00001,
          litellm_provider: 'gemini',
        },
      })
    )

    const count = await syncPricingFromLiteLLM(testDb)

    expect(count).toBe(1)

    const row = testDb.prepare("SELECT * FROM pricing_model WHERE model_id = 'gemini-2.5-pro'").get() as {
      agent_type: string
    } | undefined
    expect(row).toBeDefined()
    expect(row!.agent_type).toBe('gemini')
  })

  it('관련 없는 모델 → 무시 (count에 포함되지 않음)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeLiteLLMResponse({
        'some-random-model': {
          input_cost_per_token: 0.000001,
          output_cost_per_token: 0.000002,
          litellm_provider: 'unknown-provider',
        },
        'anthropic/claude-3-sonnet': {
          input_cost_per_token: 0.000003,
          output_cost_per_token: 0.000015,
          litellm_provider: 'anthropic',
        },
      })
    )

    const count = await syncPricingFromLiteLLM(testDb)

    expect(count).toBe(0)
  })

  it('models/ 접두사 → 제거 후 저장 (gemini/ prefix 제거)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeLiteLLMResponse({
        'gemini/gemini-2.0-flash': {
          input_cost_per_token: 0.0000001,
          output_cost_per_token: 0.0000004,
          litellm_provider: 'gemini',
        },
      })
    )

    await syncPricingFromLiteLLM(testDb)

    // gemini/ prefix가 제거되어 저장됨
    const row = testDb.prepare("SELECT * FROM pricing_model WHERE model_id = 'gemini-2.0-flash'").get()
    expect(row).toBeDefined()

    // 원본 키로는 저장되지 않음
    const rowWithPrefix = testDb.prepare("SELECT * FROM pricing_model WHERE model_id = 'gemini/gemini-2.0-flash'").get()
    expect(rowWithPrefix).toBeUndefined()
  })

  it('이미 존재하는 모델 → OR REPLACE로 갱신 (같은 날짜)', async () => {
    // syncPricingFromLiteLLM은 오늘 날짜를 effective_date로 사용하므로
    // 오늘 날짜로 먼저 삽입한 뒤, 다른 가격으로 sync하면 갱신됨
    const today = new Date().toISOString().slice(0, 10)

    testDb.prepare(`
      INSERT INTO pricing_model (model_id, agent_type, effective_date, input_per_mtok, output_per_mtok, cache_read_per_mtok, cache_creation_per_mtok)
      VALUES ('gpt-unique-test', 'codex', '${today}', 1.0, 2.0, 0.0, 0.0)
    `).run()

    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeLiteLLMResponse({
        'gpt-unique-test': {
          input_cost_per_token: 0.000005,
          output_cost_per_token: 0.000020,
          litellm_provider: 'openai',
        },
      })
    )

    const count = await syncPricingFromLiteLLM(testDb)

    expect(count).toBe(1)

    const rows = testDb.prepare(
      "SELECT * FROM pricing_model WHERE model_id = 'gpt-unique-test'"
    ).all() as Array<{ input_per_mtok: number; output_per_mtok: number; effective_date: string }>

    // OR REPLACE로 갱신 — 오늘 날짜 레코드가 하나만 존재
    const todayRow = rows.find(r => r.effective_date === today)
    expect(todayRow).toBeDefined()
    expect(todayRow!.input_per_mtok).toBeCloseTo(5.0)
    expect(todayRow!.output_per_mtok).toBeCloseTo(20.0)
  })

  it('input_cost_per_token 또는 output_cost_per_token이 없는 모델 → 무시', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeLiteLLMResponse({
        'gpt-4o': {
          input_cost_per_token: 0.000005,
          // output_cost_per_token 없음
          litellm_provider: 'openai',
        },
        'o3': {
          // input_cost_per_token 없음
          output_cost_per_token: 0.000008,
          litellm_provider: 'openai',
        },
      })
    )

    const count = await syncPricingFromLiteLLM(testDb)

    expect(count).toBe(0)
  })

  it('cache_read_input_token_cost 있으면 cache_read_per_mtok에 저장', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeLiteLLMResponse({
        'gpt-4o': {
          input_cost_per_token: 0.000005,
          output_cost_per_token: 0.000015,
          cache_read_input_token_cost: 0.0000025,
          litellm_provider: 'openai',
        },
      })
    )

    await syncPricingFromLiteLLM(testDb)

    const row = testDb.prepare("SELECT * FROM pricing_model WHERE model_id = 'gpt-4o'").get() as {
      cache_read_per_mtok: number
    } | undefined
    expect(row).toBeDefined()
    expect(row!.cache_read_per_mtok).toBeCloseTo(2.5)
  })
})
