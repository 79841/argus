import { NextRequest, NextResponse } from 'next/server'
import { execFileSync } from 'child_process'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { errorResponse, serverError } from '@/shared/lib/api-utils'

const ALLOWED_PATHS = new Set(['/', '/sessions', '/usage', '/tools', '/insights', '/settings', '/rules', '/projects'])

const findChrome = (): string | null => {
  const platform = process.platform
  const candidates: string[] =
    platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : platform === 'win32'
        ? [
            path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          ]
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
          ]
  return candidates.find((p) => p && fs.existsSync(p)) ?? null
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const pagePath = sp.get('path') || '/'
    const width = sp.get('width') || '1280'
    const height = sp.get('height') || '800'

    if (!ALLOWED_PATHS.has(pagePath)) {
      return errorResponse('Invalid path')
    }

    const parsedWidth = parseInt(width, 10)
    const parsedHeight = parseInt(height, 10)
    if (
      isNaN(parsedWidth) || parsedWidth < 320 || parsedWidth > 3840 ||
      isNaN(parsedHeight) || parsedHeight < 320 || parsedHeight > 3840
    ) {
      return errorResponse('Invalid dimensions')
    }

    const chromePath = findChrome()
    if (!chromePath) {
      return NextResponse.json({ error: 'Chrome not found' }, { status: 500 })
    }

    const timestamp = Date.now()
    const screenshotPath = path.join(os.tmpdir(), `argus-screenshot-${timestamp}.png`)
    const url = `http://localhost:9845${pagePath}`

    execFileSync(
      chromePath,
      [
        '--headless=new',
        '--disable-gpu',
        `--window-size=${parsedWidth},${parsedHeight}`,
        '--hide-scrollbars',
        `--screenshot=${screenshotPath}`,
        url,
      ],
      { timeout: 15000, stdio: 'ignore' }
    )

    if (!fs.existsSync(screenshotPath)) {
      return NextResponse.json({ error: 'Screenshot failed' }, { status: 500 })
    }


    const buffer = fs.readFileSync(screenshotPath)
    fs.unlinkSync(screenshotPath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="argus-${pagePath.replace(/\//g, '-')}.png"`,
      },
    })
  } catch (error) {
    return serverError('/api/screenshot', error)
  }
}

export const dynamic = 'force-dynamic'
