import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getDb } from '@/shared/lib/db'
import { errorResponse, serverError, parseSlug } from '@/shared/lib/api-utils'

const MAX_NAME_LENGTH = 200
const MAX_PATH_LENGTH = 500

const RESOURCE_ATTR_KEY = 'OTEL_RESOURCE_ATTRIBUTES'

const readJsonFile = (filePath: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>
  } catch {
    return null
  }
}

const writeJsonFile = (filePath: string, data: Record<string, unknown>): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

const writeProjectResourceAttr = (projectPath: string, projectName: string): void => {
  try {
    const settingsPath = path.join(projectPath, '.claude', 'settings.json')
    const data = readJsonFile(settingsPath) ?? {}
    const env = (data.env as Record<string, string> | undefined) ?? {}
    env[RESOURCE_ATTR_KEY] = `project.name=${projectName}`
    data.env = env
    writeJsonFile(settingsPath, data)
  } catch {
    // best-effort
  }
}

const removeProjectResourceAttr = (projectPath: string): void => {
  try {
    const settingsPath = path.join(projectPath, '.claude', 'settings.json')
    const data = readJsonFile(settingsPath)
    if (!data) return
    const env = data.env as Record<string, string> | undefined
    if (!env || !(RESOURCE_ATTR_KEY in env)) return
    delete env[RESOURCE_ATTR_KEY]
    if (Object.keys(env).length === 0) {
      delete data.env
    } else {
      data.env = env
    }
    writeJsonFile(settingsPath, data)
  } catch {
    // best-effort
  }
}

const backfillExistingSessions = (db: ReturnType<typeof getDb>, projectName: string, projectPath: string): number => {
  const pathPattern = `%${projectPath}/%`
  const sessions = db.prepare(
    "SELECT DISTINCT session_id FROM agent_logs WHERE project_name = '' AND log_attributes LIKE ?"
  ).all(pathPattern) as { session_id: string }[]

  if (sessions.length === 0) return 0

  const updateLogs = db.prepare(
    "UPDATE agent_logs SET project_name = ? WHERE session_id = ? AND project_name = ''"
  )
  const updateTools = db.prepare(
    "UPDATE tool_details SET project_name = ? WHERE session_id = ? AND project_name = ''"
  )
  db.transaction(() => {
    for (const { session_id } of sessions) {
      updateLogs.run(projectName, session_id)
      updateTools.run(projectName, session_id)
    }
  })()

  return sessions.length
}

type RegistryRow = {
  project_name: string
  project_path: string
  created_at: string
}

export async function GET() {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM project_registry ORDER BY project_name').all() as RegistryRow[]
    return NextResponse.json({ projects: rows })
  } catch (error) {
    return serverError('/api/projects/registry GET', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, path: projectPath } = body as { name: string; path: string }

    if (!name || !projectPath) {
      return errorResponse('name and path are required')
    }

    if (typeof name !== 'string' || name.length > MAX_NAME_LENGTH) {
      return errorResponse(`name must be a string under ${MAX_NAME_LENGTH} characters`)
    }

    if (typeof projectPath !== 'string' || projectPath.length > MAX_PATH_LENGTH) {
      return errorResponse(`path must be a string under ${MAX_PATH_LENGTH} characters`)
    }

    const resolved = path.resolve(projectPath)
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return errorResponse('Directory not found')
    }

    const db = getDb()
    db.prepare(
      'INSERT OR REPLACE INTO project_registry (project_name, project_path) VALUES (?, ?)'
    ).run(name, resolved)

    writeProjectResourceAttr(resolved, name)

    // 기존 세션 중 project_name이 비어있고 파일 경로가 매칭되는 세션을 backfill
    const backfilled = backfillExistingSessions(db, name, resolved)

    return NextResponse.json({ success: true, name, path: resolved, backfilled })
  } catch (error) {
    return serverError('/api/projects/registry POST', error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const nameRaw = request.nextUrl.searchParams.get('name')
    const name = parseSlug(nameRaw ?? '', MAX_NAME_LENGTH)
    if (!name) {
      return errorResponse('name is required')
    }

    const db = getDb()
    const row = db.prepare('SELECT project_path FROM project_registry WHERE project_name = ?').get(name) as { project_path: string } | undefined
    db.prepare('DELETE FROM project_registry WHERE project_name = ?').run(name)

    if (row?.project_path) {
      removeProjectResourceAttr(row.project_path)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError('/api/projects/registry DELETE', error)
  }
}

export const dynamic = 'force-dynamic'
