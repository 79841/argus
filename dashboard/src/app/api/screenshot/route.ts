import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const pagePath = sp.get('path') || '/'
    const width = sp.get('width') || '1280'
    const height = sp.get('height') || '800'

    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    if (!fs.existsSync(chromePath)) {
      return NextResponse.json({ error: 'Chrome not found' }, { status: 500 })
    }

    const timestamp = Date.now()
    const screenshotPath = path.join('/tmp', `argus-screenshot-${timestamp}.png`)
    const url = `http://localhost:3000${pagePath}`

    execSync(
      `"${chromePath}" --headless=new --disable-gpu --window-size=${width},${height} --hide-scrollbars --screenshot="${screenshotPath}" "${url}" 2>/dev/null`,
      { timeout: 15000 }
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
  } catch {
    return NextResponse.json({ error: 'Screenshot capture failed' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
