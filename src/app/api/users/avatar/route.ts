import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { serializeUser } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const MAX_BODY = 3 * 1024 * 1024 // 3MB raw — ~2MB base64 image

// POST /api/users/avatar — upload profile picture as data URL (base64)
// Body: { dataUrl: "data:image/jpeg;base64,..." }
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { dataUrl } = body as { dataUrl?: string }

    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
    }
    if (dataUrl.length > MAX_BODY) {
      return NextResponse.json({ error: 'Image too large (max ~2MB)' }, { status: 413 })
    }

    const updated = await db.user.update({
      where: { id: me.id },
      data: { avatarUrl: dataUrl },
    })
    return NextResponse.json({ user: serializeUser(updated) })
  } catch (e) {
    console.error('[users/avatar] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
