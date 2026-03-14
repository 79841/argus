import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SetupPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Setup Guide</h1>
      <p className="text-muted-foreground">
        AI 코딩 에이전트의 텔레메트리를 Argus로 수집하기 위한 설정 가이드입니다.
      </p>

      {/* Claude Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-500" />
            Claude Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">1. 환경변수 설정</h3>
            <p className="text-sm text-muted-foreground mb-2">
              셸 프로필 (~/.zshrc 또는 ~/.bashrc)에 다음을 추가합니다:
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3000`}</code></pre>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">2. 프로젝트 필터링 (선택)</h3>
            <p className="text-sm text-muted-foreground mb-2">
              프로젝트별 데이터를 구분하려면 프로젝트의 <code className="bg-muted px-1 rounded">.claude/settings.json</code>에 추가합니다:
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`{
  "env": {
    "OTEL_RESOURCE_ATTRIBUTES": "project.name=my-project"
  }
}`}</code></pre>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">3. Orchestration Tools 추적 (선택)</h3>
            <p className="text-sm text-muted-foreground mb-2">
              에이전트, 스킬, MCP 도구 호출을 추적하려면 프로젝트의 <code className="bg-muted px-1 rounded">.claude/settings.json</code>에 PostToolUse hook을 등록합니다:
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Agent|Skill|mcp__.*",
      "hooks": [{ "type": "command", "command": "bash scripts/tool-hook.sh" }]
    }]
  }
}`}</code></pre>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">4. 확인</h3>
            <p className="text-sm text-muted-foreground">
              Claude Code를 실행하고 대시보드에서 데이터가 수집되는지 확인합니다.
              Overview 페이지에서 에이전트 필터를 &quot;Claude Code&quot;로 설정하면 됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Codex Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            Codex
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">1. OTel 설정</h3>
            <p className="text-sm text-muted-foreground mb-2">
              <code className="bg-muted px-1 rounded">~/.codex/config.toml</code>에 다음을 추가합니다:
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`[otel]
exporter = { otlp-http = { endpoint = "http://localhost:3000/v1/logs", protocol = "json" } }`}</code></pre>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">2. 프로젝트 정보</h3>
            <p className="text-sm text-muted-foreground">
              Codex는 도구 실행 시 작업 디렉토리(workdir)에서 프로젝트 이름을 자동으로 추출합니다.
              별도의 프로젝트 설정이 필요하지 않습니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">3. 확인</h3>
            <p className="text-sm text-muted-foreground">
              Codex를 실행하고 대시보드에서 데이터가 수집되는지 확인합니다.
              Overview 페이지에서 에이전트 필터를 &quot;Codex&quot;로 설정하면 됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Gemini CLI Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            Gemini CLI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">1. 텔레메트리 설정</h3>
            <p className="text-sm text-muted-foreground mb-2">
              <code className="bg-muted px-1 rounded">~/.gemini/settings.json</code>에 다음을 추가합니다:
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpEndpoint": "http://localhost:3000",
    "otlpProtocol": "http"
  }
}`}</code></pre>
            <p className="text-sm text-muted-foreground mt-2">
              또는 환경변수로 설정할 수 있습니다:
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`export GEMINI_TELEMETRY_ENABLED=true
export GEMINI_TELEMETRY_TARGET=local
export GEMINI_TELEMETRY_OTLP_ENDPOINT=http://localhost:3000
export GEMINI_TELEMETRY_OTLP_PROTOCOL=http`}</code></pre>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">2. 프로젝트 필터링 (선택)</h3>
            <p className="text-sm text-muted-foreground mb-2">
              프로젝트별 데이터를 구분하려면 환경변수를 추가합니다:
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`export OTEL_RESOURCE_ATTRIBUTES="project.name=my-project"`}</code></pre>
            <p className="text-sm text-muted-foreground mt-2">
              또는 <code className="bg-muted px-1 rounded">~/.gemini/settings.json</code>에 추가할 수 있습니다:
            </p>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`{
  "telemetry": {
    "enabled": true,
    "target": "local",
    "otlpEndpoint": "http://localhost:3000",
    "otlpProtocol": "http",
    "resourceAttributes": {
      "project.name": "my-project"
    }
  }
}`}</code></pre>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">3. 확인</h3>
            <p className="text-sm text-muted-foreground">
              Gemini CLI를 실행하고 대시보드에서 데이터가 수집되는지 확인합니다.
              Overview 페이지에서 에이전트 필터를 &quot;Gemini CLI&quot;로 설정하면 됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Section */}
      <Card>
        <CardHeader>
          <CardTitle>대시보드 실행</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto"><code>{`cd dashboard
pnpm install
pnpm dev`}</code></pre>
          </div>
          <p className="text-sm text-muted-foreground">
            <code className="bg-muted px-1 rounded">http://localhost:3000</code>에서 대시보드에 접속할 수 있습니다.
            에이전트의 OTLP 엔드포인트도 동일한 주소를 사용합니다.
          </p>
        </CardContent>
      </Card>

      {/* Supported Events */}
      <Card>
        <CardHeader>
          <CardTitle>수집되는 이벤트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Claude Code, Codex, Gemini CLI 모두 동일한 이벤트 유형으로 정규화되어 저장됩니다.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><code className="bg-muted px-1 rounded">api_request</code> — API 요청 (모델, 토큰, 비용)</li>
              <li><code className="bg-muted px-1 rounded">user_prompt</code> — 사용자 프롬프트</li>
              <li><code className="bg-muted px-1 rounded">tool_result</code> — 도구 실행 결과</li>
              <li><code className="bg-muted px-1 rounded">tool_decision</code> — 도구 승인/거부</li>
              <li><code className="bg-muted px-1 rounded">api_error</code> — API 오류</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
