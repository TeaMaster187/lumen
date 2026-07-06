import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { INVITE_CODE, createSession, pickAvatar, assignNumericId, normalizePhone } from '@/lib/auth'
import { ensureDbInitialized } from '@/lib/db-init'
import { serializeUser } from '@/lib/serialize'
import { hashPassword } from '@/lib/password'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Ensure tables exist (handles cold starts on serverless platforms)
    await ensureDbInitialized()

    const body = await req.json()
    const { phone, name, inviteCode, password, username } = body as {
      phone?: string
      name?: string
      inviteCode?: string
      password?: string
      username?: string
    }

    if (!phone || !name || !inviteCode) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
    }

    if (inviteCode.trim().toUpperCase() !== INVITE_CODE) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 })
    }

    let code
    try {
      code = await db.inviteCode.findUnique({ where: { code: inviteCode.trim().toUpperCase() } })
    } catch (dbErr) {
      console.error('[register] inviteCode lookup failed:', dbErr)
      return NextResponse.json({ error: 'Database not ready — please try again in a moment' }, { status: 503 })
    }
    if (!code || !code.active) {
      return NextResponse.json({ error: 'Invite code not recognized' }, { status: 403 })
    }
    if (code.uses >= code.maxUses) {
      return NextResponse.json({ error: 'Invite code has been fully used' }, { status: 403 })
    }

    const normalizedPhone = normalizePhone(phone)
    const existing = await db.user.findUnique({ where: { phone: normalizedPhone } })
    if (existing) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 })
    }

    // Validate username if provided
    const cleanUsername = username?.trim().toLowerCase().replace(/^@/, '')
    if (cleanUsername) {
      if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
        return NextResponse.json({ error: 'Username must be 3-20 chars: a-z, 0-9, _' }, { status: 400 })
      }
      const taken = await db.user.findUnique({ where: { username: cleanUsername } })
      if (taken) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
      }
    }

    const [avatarA, avatarB] = pickAvatar(normalizedPhone + name)
    const numericId = await assignNumericId()
    const passwordHash = hashPassword(password)
    const user = await db.user.create({
      data: {
        numericId,
        phone: normalizedPhone,
        name: name.trim(),
        username: cleanUsername || null,
        avatarA,
        avatarB,
        passwordHash,
      },
    })

    await db.chat.create({
      data: {
        kind: 'saved',
        name: 'Saved Messages',
        createdBy: user.id,
        avatarA,
        avatarB,
        members: { create: [{ userId: user.id, role: 'owner' }] },
      },
    })

    await db.inviteCode.update({
      where: { id: code.id },
      data: { uses: { increment: 1 } },
    })

    const token = await createSession(user.id)
    const res = NextResponse.json({ user: serializeUser(user), token })
    res.cookies.set('lumen-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return res
  } catch (e) {
    console.error('[register] error', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Server error', detail: msg }, { status: 500 })
  }
}
