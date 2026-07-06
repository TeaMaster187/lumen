import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { serializeUser } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PATCH /api/users/me — update username, name, bio
export async function PATCH(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { username, name, bio } = body as {
      username?: string
      name?: string
      bio?: string
    }

    const data: { username?: string | null; name?: string; bio?: string | null } = {}

    if (typeof username !== 'undefined') {
      const clean = username.trim().toLowerCase().replace(/^@/, '')
      if (clean) {
        if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
          return NextResponse.json({ error: 'Username must be 3-20 chars: a-z, 0-9, _' }, { status: 400 })
        }
        const taken = await db.user.findUnique({ where: { username: clean } })
        if (taken && taken.id !== me.id) {
          return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
        }
        data.username = clean
      } else {
        data.username = null // allow clearing
      }
    }

    if (typeof name !== 'undefined') {
      const cleanName = name.trim()
      if (cleanName.length < 2) return NextResponse.json({ error: 'Name too short' }, { status: 400 })
      if (cleanName.length > 50) return NextResponse.json({ error: 'Name too long' }, { status: 400 })
      data.name = cleanName
    }

    if (typeof bio !== 'undefined') {
      const cleanBio = bio.trim()
      if (cleanBio.length > 200) return NextResponse.json({ error: 'Bio too long (max 200)' }, { status: 400 })
      data.bio = cleanBio || null
    }

    const updated = await db.user.update({ where: { id: me.id }, data })
    return NextResponse.json({ user: serializeUser(updated) })
  } catch (e) {
    console.error('[users/me PATCH] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
