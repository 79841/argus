import { NextRequest, NextResponse } from 'next/server'
import { connectHooks, disconnectHooks, getHooksStatus } from '@/shared/lib/setup-hooks'
import { serverError, errorResponse } from '@/shared/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const projectPath = request.nextUrl.searchParams.get('project_path')
    if (!projectPath) return errorResponse('project_path required')
    const status = getHooksStatus(projectPath)
    return NextResponse.json(status)
  } catch (error) {
    return serverError('/api/setup/hooks', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return errorResponse('Invalid JSON')
    }
    const projectPath = body.project_path as string
    if (!projectPath || typeof projectPath !== 'string') return errorResponse('project_path required')
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : undefined
    const result = connectHooks(projectPath, endpoint)
    return NextResponse.json(result)
  } catch (error) {
    return serverError('/api/setup/hooks', error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const projectPath = request.nextUrl.searchParams.get('project_path')
    if (!projectPath) return errorResponse('project_path required')
    const result = disconnectHooks(projectPath)
    return NextResponse.json(result)
  } catch (error) {
    return serverError('/api/setup/hooks', error)
  }
}
