#!/bin/bash
# Argus Orchestration Tool Hook
# Captures Agent/Skill/MCP invocations from Claude Code PostToolUse hook.
#
# Hook JSON on stdin:
#   { "session_id": "...", "tool_name": "...", "tool_input": {...}, ... }

ARGUS_ENDPOINT="${ARGUS_ENDPOINT:-http://localhost:3000}"

HOOK_JSON=$(cat)

TOOL_NAME=$(echo "$HOOK_JSON" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_name', ''))
except: pass
" 2>/dev/null)

TOOL_NAME="${TOOL_NAME:-$CLAUDE_TOOL_NAME}"
[ -z "$TOOL_NAME" ] && exit 0

# Only capture Agents, Skills, and MCP tools
case "$TOOL_NAME" in
  Agent|Skill|mcp__*)
    ;;
  *)
    exit 0
    ;;
esac

SESSION_ID=$(echo "$HOOK_JSON" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('session_id', ''))
except: pass
" 2>/dev/null)
SESSION_ID="${SESSION_ID:-$CLAUDE_SESSION_ID}"

TOOL_INPUT=$(echo "$HOOK_JSON" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(json.dumps(d.get('tool_input', {})))
except: print('{}')
" 2>/dev/null)

DETAIL_NAME=""
DETAIL_TYPE=""

case "$TOOL_NAME" in
  Agent)
    DETAIL_NAME=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    name = d.get('subagent_type', d.get('name', d.get('description', '')))
    print(name[:100] if name else '')
except: pass
" 2>/dev/null)
    DETAIL_TYPE="agent"
    ;;
  Skill)
    DETAIL_NAME=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('skill', d.get('name', '')))
except: pass
" 2>/dev/null)
    DETAIL_TYPE="skill"
    ;;
  mcp__*)
    DETAIL_NAME="$TOOL_NAME"
    MCP_SERVER=$(echo "$TOOL_NAME" | sed 's/^mcp__\([^_]*\)__.*/\1/')
    TOOL_NAME="mcp:${MCP_SERVER}"
    DETAIL_TYPE="mcp"
    ;;
esac

[ -z "$DETAIL_NAME" ] && exit 0

PROJECT_NAME=""
if [ -n "$OTEL_RESOURCE_ATTRIBUTES" ]; then
  PROJECT_NAME=$(echo "$OTEL_RESOURCE_ATTRIBUTES" | sed -n 's/.*project\.name=\([^,]*\).*/\1/p')
fi

PAYLOAD=$(python3 -c "
import json, sys
print(json.dumps({
    'session_id': sys.argv[1],
    'tool_name': sys.argv[2],
    'detail_name': sys.argv[3],
    'detail_type': sys.argv[4],
    'project_name': sys.argv[5],
    'agent_type': 'claude'
}))
" "$SESSION_ID" "$TOOL_NAME" "$DETAIL_NAME" "$DETAIL_TYPE" "$PROJECT_NAME" 2>/dev/null)

[ -z "$PAYLOAD" ] && exit 0

curl -s --max-time 2 -X POST "${ARGUS_ENDPOINT}/api/ingest/tool-detail" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" >/dev/null 2>&1

exit 0
