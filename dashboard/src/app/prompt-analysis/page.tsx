'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

import type { ComplexityCostRow, CategoryDistRow, FailedSessionRow, EffectivenessPatternRow } from '@/lib/queries/prompt-analysis'

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6']

const REASON_LABELS: Record<string, string> = {
  ambiguous_prompt: '모호한 프롬프트',
  agent_limitation: '에이전트 한계',
  complexity_exceeded: '복잡도 초과',
  context_switch: '컨텍스트 전환',
}

export default function PromptAnalysisPage() {
  const [complexityData, setComplexityData] = useState<ComplexityCostRow[]>([])
  const [categoryData, setCategoryData] = useState<CategoryDistRow[]>([])
  const [failureData, setFailureData] = useState<FailedSessionRow[]>([])
  const [effectivenessData, setEffectivenessData] = useState<EffectivenessPatternRow[]>([])
  const [activeTab, setActiveTab] = useState('complexity')

  useEffect(() => {
    const from = new Date(Date.now() - 30 * 86400000).toISOString()
    const base = `/api/prompts/analysis?from=${from}`

    if (activeTab === 'complexity') {
      fetch(`${base}&type=complexity`).then(r => r.json()).then(setComplexityData).catch(() => {})
    } else if (activeTab === 'category') {
      fetch(`${base}&type=category`).then(r => r.json()).then(setCategoryData).catch(() => {})
    } else if (activeTab === 'failure') {
      fetch(`${base}&type=failure`).then(r => r.json()).then(setFailureData).catch(() => {})
    } else if (activeTab === 'effectiveness') {
      fetch(`${base}&type=effectiveness`).then(r => r.json()).then(setEffectivenessData).catch(() => {})
    }
  }, [activeTab])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prompt Analysis</h1>
        <p className="text-muted-foreground text-sm mt-1">프롬프트 복잡도, 카테고리, 실패 분석, 효과성 패턴</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="complexity">복잡도 분석</TabsTrigger>
          <TabsTrigger value="category">카테고리</TabsTrigger>
          <TabsTrigger value="failure">실패 분석</TabsTrigger>
          <TabsTrigger value="effectiveness">효과성</TabsTrigger>
        </TabsList>

        <TabsContent value="complexity" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>프롬프트 길이 vs 세션 비용</CardTitle></CardHeader>
            <CardContent>
              {complexityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="promptLength" name="프롬프트 길이" unit="자" />
                    <YAxis dataKey="sessionCost" name="세션 비용" unit="$" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={complexityData} fill="#8b5cf6" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">프롬프트 데이터가 없습니다</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>카테고리별 분포</CardTitle></CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-12">데이터 없음</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>카테고리별 비용/턴</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryData.map(c => (
                    <div key={c.category} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <span className="font-medium">{c.label}</span>
                        <span className="text-muted-foreground text-sm ml-2">({c.count}건)</span>
                      </div>
                      <div className="text-right text-sm">
                        <div>평균 ${c.avgCost}</div>
                        <div className="text-muted-foreground">{c.avgTurns} 턴</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="failure" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>실패 세션 목록</CardTitle></CardHeader>
            <CardContent>
              {failureData.length > 0 ? (
                <div className="space-y-3">
                  {failureData.map(f => (
                    <div key={f.sessionId} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm">{f.sessionId.slice(0, 12)}...</code>
                        <div className="flex gap-2">
                          <Badge variant="outline">{f.agentType}</Badge>
                          {f.reason && <Badge variant="destructive">{REASON_LABELS[f.reason] ?? f.reason}</Badge>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm mb-2">
                        <div><span className="text-muted-foreground">비용:</span> ${f.totalCost.toFixed(2)}</div>
                        <div><span className="text-muted-foreground">턴:</span> {f.turnCount}</div>
                        <div><span className="text-muted-foreground">성공률:</span> {(f.toolSuccessRate * 100).toFixed(0)}%</div>
                        <div><span className="text-muted-foreground">신뢰도:</span> {(f.confidence * 100).toFixed(0)}%</div>
                      </div>
                      <p className="text-sm text-muted-foreground">{f.recommendation}</p>
                      {f.suggestedAgent && (
                        <p className="text-sm mt-1">추천 에이전트: <Badge>{f.suggestedAgent}</Badge></p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">실패 세션이 없습니다</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>카테고리별 효과성 패턴</CardTitle></CardHeader>
            <CardContent>
              {effectivenessData.length > 0 ? (
                <div className="space-y-3">
                  {effectivenessData.map(e => (
                    <div key={e.category} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{e.category}</span>
                        <Badge variant={e.avgScore >= 70 ? 'default' : 'secondary'}>
                          점수: {e.avgScore}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div><span className="text-muted-foreground">평균 비용:</span> ${e.avgCost}</div>
                        <div><span className="text-muted-foreground">평균 턴:</span> {e.avgTurns}</div>
                      </div>
                      <p className="text-sm text-muted-foreground">{e.bestPractice}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">데이터 없음</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
