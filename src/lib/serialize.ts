import { db } from '@/lib/db'
import { initials, formatNumericId } from '@/lib/auth'
import type { ApiChat, ApiMessage, ApiReaction, ApiUser, MessageMeta } from '@/lib/types'

export function serializeUser(u: {
  id: string
  numericId: number
  phone: string
  name: string
  username: string | null
  bio: string | null
  avatarA: string
  avatarB: string
  avatarUrl: string | null
  dailyPublic?: boolean
  gymPublic?: boolean
  progressPicsPublic?: boolean
  readReceipts?: boolean
  notificationsEnabled?: boolean
  hapticsEnabled?: boolean
  createdAt: Date
}): ApiUser {
  return {
    id: u.id,
    numericId: u.numericId,
    numericIdStr: formatNumericId(u.numericId),
    phone: u.phone,
    name: u.name,
    username: u.username,
    bio: u.bio,
    avatarA: u.avatarA,
    avatarB: u.avatarB,
    avatarUrl: u.avatarUrl,
    dailyPublic: u.dailyPublic ?? true,
    gymPublic: u.gymPublic ?? true,
    progressPicsPublic: u.progressPicsPublic ?? true,
    readReceipts: u.readReceipts ?? true,
    notificationsEnabled: u.notificationsEnabled ?? true,
    hapticsEnabled: u.hapticsEnabled ?? true,
    createdAt: u.createdAt.toISOString(),
  }
}

type ReactionRow = {
  id: string
  emoji: string
  userId: string
  user?: { name: string } | null
}

export function serializeMessage(
  m: {
    id: string
    chatId: string
    senderId: string
    sender: { name: string }
    kind: string
    text: string | null
    meta: string | null
    replyToId: string | null
    replyTo: {
      id: string
      sender: { name: string }
      kind: string
      text: string | null
    } | null
    reactions?: ReactionRow[] | null
    expiresAt?: Date | null
    deletedAt?: Date | null
    editedAt?: Date | null
    createdAt: Date
  },
): ApiMessage {
  const reactions: ApiReaction[] = (m.reactions ?? []).map((r) => ({
    id: r.id,
    emoji: r.emoji,
    userId: r.userId,
    userName: r.user?.name ?? 'User',
  }))
  return {
    id: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    senderName: m.sender.name,
    kind: m.kind as ApiMessage['kind'],
    text: m.text,
    meta: m.meta ? (JSON.parse(m.meta) as MessageMeta) : null,
    replyToId: m.replyToId,
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          senderName: m.replyTo.sender.name,
          text: m.replyTo.text,
          kind: m.replyTo.kind as ApiMessage['kind'],
        }
      : null,
    reactions,
    expiresAt: m.expiresAt ? m.expiresAt.toISOString() : null,
    deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    readByPeer: false,
    createdAt: m.createdAt.toISOString(),
  }
}

export async function serializeChat(
  c: {
    id: string
    kind: string
    name: string | null
    avatarA: string | null
    avatarB: string | null
    createdAt: Date
  },
  currentUserId: string,
): Promise<ApiChat> {
  let name = c.name ?? 'Chat'
  let avatarA = c.avatarA ?? 'oklch(0.62 0.24 285)'
  let avatarB = c.avatarB ?? 'oklch(0.66 0.22 330)'
  let otherUserId: string | null = null

  const members = await db.chatMember.findMany({
    where: { chatId: c.id },
    include: { user: true },
  })

  let otherUserAvatarUrl: string | null = null
  if (c.kind === 'private') {
    const other = members.find((m) => m.userId !== currentUserId)
    if (other) {
      name = other.user.name
      avatarA = other.user.avatarA
      avatarB = other.user.avatarB
      otherUserId = other.user.id
      otherUserAvatarUrl = other.user.avatarUrl
    }
  } else if (c.kind === 'saved') {
    name = 'Saved Messages'
    const me = members.find((m) => m.userId === currentUserId)
    if (me) {
      avatarA = me.user.avatarA
      avatarB = me.user.avatarB
    }
  }

  const lastMsg = await db.message.findFirst({
    where: { chatId: c.id },
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: { name: true } }, replyTo: { select: { id: true, kind: true, text: true, sender: { select: { name: true } } } } },
  })

  const myMembership = members.find((m) => m.userId === currentUserId)
  const lastReadAt = myMembership?.lastReadAt ?? new Date(0)
  const unreadCount = await db.message.count({
    where: {
      chatId: c.id,
      senderId: { not: currentUserId },
      createdAt: { gt: lastReadAt },
    },
  })

  return {
    id: c.id,
    kind: c.kind as ApiChat['kind'],
    name,
    avatarA,
    avatarB,
    avatarInitials: initials(name),
    otherUserId,
    otherUserAvatarUrl,
    lastMessage: lastMsg ? serializeMessage(lastMsg) : null,
    unreadCount,
    createdAt: c.createdAt.toISOString(),
  }
}
