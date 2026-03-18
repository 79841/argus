'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Link from 'next/link'

import type { SessionNarrativeRow, RepetitionClusterRow, PromptEvolutionResult, CodeAreaRow } from '@/lib/queries/prompt-visualization'

export default function PromptInsightsPage() {
  const [narratives, setNarratives] = useState<SessionNarrativeRow[]>([])
  const [repetitions, setRepetitions] = useState<RepetitionClusterRow[]>([])
  const [heatmapData, setHeatmapData] = useState<CodeAreaRow[]>([])
  const [activeTab, setActiveTab] = useState('narratives')
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [evolution, setEvolution] = useState<PromptEvolutionResult | null>(null)

  useEffect(() => {
    const from = new Date(Date.now() - 30 * 86400000).toISOString()
    const base = `/api/prompts/insights?from=${from}`

    if (activeTab === 'narratives') {
      fetch(`${base}&type=narratives`).then(r => r.json()).then(setNarratives).catch(() => {})
    } else if (activeTab === 'repetitions') {
      fetch(`${base}&type=repetitions`).then(r => r.json()).then(setRepetitions).catch(() => {})
    } else if (activeTab === 'heatmap') {
      fetch(`${base}&type=heatmap`).then(r => r.json()).then(setHeatmapData).catch(() => {})
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'evolution' && selectedSession) {
      fetch(`/api/prompts/insights?type=evolution&session_id=${selectedSession}`)
        .then(r => r.json())
        .then(setEvolution)
        .catch(() => {})
    }
  }, [activeTab, selectedSession])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prompt Insights</h1>
        <p className="text-muted-foreground text-sm mt-1">세션 요약, 반복 감지, 진화 추적, 코드 히트맵</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="narratives">세션 요약</TabsTrigger>
          <TabsTrigger value="repetitions">반복 감지</TabsTrigger>
          <TabsTrigger value="evolution">진화 추적</TabsTrigger>
          <TabsTrigger value="heatmap">코드 히트맵</TabsTrigger>
        </TabsList>

        <TabsContent value="narratives" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>세션 내러티브 요약</CardTitle></CardHeader>
            <CardContent>
              {narratives.length > 0 ? (
                <div className="space-y-3">
                  {narratives.map(n => (
                    <Link
                      key={n.sessionId}
                      href={`/sessions/${n.sessionId}`}
                      className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <code className="text-xs text-muted-foreground">{n.sessionId.slice(0, 16)}...</code>
                        <div className="flex gap-2 items-center">
                          <Badge variant="outline">{n.agentType}</Badge>
                          <span className="text-xs text-muted-foreground">{n.promptCount}개 프롬프트</span>
                        </div>
                      </div>
                      <p className="text-sm">{n.narrative || '(내용 없음)'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.firstTimestamp).toLocaleString()}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">프롬프트 데이터가 없습니다</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repetitions" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>반복 프롬프트 클러스터</CardTitle></CardHeader>
            <CardContent>
              {repetitions.length > 0 ? (
                <div className="space-y-3">
                  {repetitions.map((r, i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={r.recommendation === 'skill' ? 'default' : 'secondary'}>
                          {r.recommendation === 'skill' ? '스킬 전환 추천' : r.recommendation === 'claude_md' ? 'CLAUDE.md 추가 추천' : ''}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{r.count}회 반복 · ${r.totalCost.toFixed(2)}</span>
                      </div>
                      <p className="text-sm bg-muted/50 p-2 rounded line-clamp-2">{r.pattern}</p>
                      <p className="text-xs text-muted-foreground mt-2">{r.sessionIds.length}개 세션에서 발견</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">반복 프롬프트가 없습니다</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>프롬프트 진화 추적</CardTitle>
              <div className="mt-2">
                <select
                  className="border rounded px-3 py-1.5 text-sm bg-background"
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                >
                  <option value="">세션을 선택하세요</option>
                  {narratives.map(n => (
                    <option key={n.sessionId} value={n.sessionId}>
                      {n.sessionId.slice(0, 16)}... ({n.promptCount}개 프롬프트)
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {evolution ? (
                <div className="space-y-4">
                  <div className="flex gap-4 text-sm">
                    <Badge>구체화 점수: {evolution.refinementScore}/100</Badge>
                    <span className="text-muted-foreground">{evolution.costImpact}</span>
                  </div>
                  <div className="space-y-3">
                    {evolution.sequence.map(s => (
                      <div key={s.index} className="flex gap-4 items-start">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {s.index + 1}
                          </div>
                          {s.index < evolution.sequence.length - 1 && (
                            <div className="w-px h-8 bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm line-clamp-2">{s.text}</p>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>구체성: {s.specificity}/100</span>
                            <span>비용: ${s.costAfter.toFixed(4)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">
                  {selectedSession ? '로딩 중...' : '세션을 선택하세요'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>코드 영역별 AI 사용 빈도</CardTitle></CardHeader>
            <CardContent>
              {heatmapData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(300, heatmapData.slice(0, 20).length * 32)}>
                  <BarChart data={heatmapData.slice(0, 20)} layout="vertical" margin={{ left: 150 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="path" type="category" width={140} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="promptCount" name="프롬프트 수">
                      {heatmapData.slice(0, 20).map((entry, i) => (
                        <Cell key={i} fill={entry.isHotspot ? '#ef4444' : '#8b5cf6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">코드 영역 데이터가 없습니다</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
