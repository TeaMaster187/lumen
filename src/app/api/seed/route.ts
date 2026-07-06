import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { INVITE_CODE, createSession, pickAvatar } from '@/lib/auth'
import { serializeUser } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/seed — idempotent seeding of invite code + 2 test accounts + a DM between them
export async function GET() {
  const results: string[] = []

  // 1. Invite code
  let invite = await db.inviteCode.findUnique({ where: { code: INVITE_CODE } })
  if (!invite) {
    invite = await db.inviteCode.create({
      data: { code: INVITE_CODE, maxUses: 1000, active: true },
    })
    results.push(`Created invite code ${INVITE_CODE}`)
  } else {
    if (invite.maxUses < 1000) {
      await db.inviteCode.update({ where: { id: invite.id }, data: { maxUses: 1000, active: true } })
    }
    results.push(`Invite code ${INVITE_CODE} already exists`)
  }

  // 2. Two test accounts with fixed numeric IDs (1 and 2)
  const accountSpecs = [
    { numericId: 1, phone: '+1 555 0100', name: 'Alice', username: 'alice' },
    { numericId: 2, phone: '+1 555 0200', name: 'Bob', username: 'bob' },
  ]
  const users = []
  for (const spec of accountSpecs) {
    let u = await db.user.findUnique({ where: { phone: spec.phone } })
    if (!u) {
      const [avatarA, avatarB] = pickAvatar(spec.phone + spec.name)
      u = await db.user.create({
        data: {
          numericId: spec.numericId,
          phone: spec.phone,
          name: spec.name,
          username: spec.username,
          avatarA,
          avatarB,
        },
      })
      await db.chat.create({
        data: {
          kind: 'saved',
          name: 'Saved Messages',
          createdBy: u.id,
          avatarA,
          avatarB,
          members: { create: [{ userId: u.id, role: 'owner' }] },
        },
      })
      results.push(`Created account ${spec.name} (id=${spec.numericId}, phone=${spec.phone}, @${spec.username})`)
    } else {
      results.push(`Account ${spec.name} (id=${u.numericId}) already exists`)
    }
    users.push(u)
  }

  const [alice, bob] = users

  // 3. DM between them
  const aliceChats = await db.chatMember.findMany({ where: { userId: alice.id }, select: { chatId: true } })
  const bobChats = await db.chatMember.findMany({ where: { userId: bob.id }, select: { chatId: true } })
  const aliceSet = new Set(aliceChats.map((m) => m.chatId))
  const shared = bobChats.map((m) => m.chatId).filter((id) => aliceSet.has(id))
  let dmId: string | null = null
  for (const chatId of shared) {
    const chat = await db.chat.findUnique({ where: { id: chatId } })
    if (chat?.kind === 'private') {
      dmId = chat.id
      break
    }
  }
  if (!dmId) {
    const dm = await db.chat.create({
      data: {
        kind: 'private',
        createdBy: alice.id,
        members: {
          create: [
            { userId: alice.id, role: 'owner' },
            { userId: bob.id, role: 'member' },
          ],
        },
      },
    })
    dmId = dm.id
    results.push(`Created DM between Alice & Bob`)
  } else {
    results.push(`DM between Alice & Bob already exists`)
  }

  // 4. Starter messages
  const existingCount = await db.message.count({ where: { chatId: dmId } })
  if (existingCount === 0) {
    await db.message.create({
      data: {
        chatId: dmId,
        senderId: alice.id,
        kind: 'text',
        text: 'Hey Bob — this is the Lumen test DM. The glass looks 🔥',
      },
    })
    await db.message.create({
      data: {
        chatId: dmId,
        senderId: bob.id,
        kind: 'text',
        text: 'Alice! agreed. ready to test messaging between accounts?',
      },
    })
    results.push(`Seeded 2 starter messages`)
  } else {
    results.push(`DM already has ${existingCount} messages`)
  }

  // 5. Issue session tokens
  const aliceToken = await createSession(alice.id)
  const bobToken = await createSession(bob.id)

  return NextResponse.json({
    ok: true,
    inviteCode: INVITE_CODE,
    results,
    accounts: [
      { name: 'Alice', numericId: alice.numericId, phone: alice.phone, username: alice.username, token: aliceToken },
      { name: 'Bob', numericId: bob.numericId, phone: bob.phone, username: bob.username, token: bobToken },
    ],
    dmChatId: dmId,
    note: 'In this demo, use the Login screen with the phone numbers above to switch between accounts.',
  })
}
