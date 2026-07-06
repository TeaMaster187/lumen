// Shared types between Next.js API + socket.io service
export type ChatKind = 'private' | 'group' | 'channel' | 'saved'

export type MessageKind = 'text' | 'photo' | 'video' | 'voice' | 'sticker' | 'file' | 'gif' | 'system'

export type MessageMeta = {
  // voice
  voiceDurationSec?: number
  voiceWaveform?: number[]
  // sticker
  stickerEmoji?: string
  // file
  fileName?: string
  fileSize?: string
  // photo / video / gif — stored as data URL (base64) for demo
  mediaUrl?: string
  mediaKind?: 'photo' | 'video' | 'gif'
  mediaAspect?: number
  mediaWidth?: number
  mediaHeight?: number
  // legacy compat
  photoUrl?: string
  photoAspect?: number
}

export type ApiReaction = {
  id: string
  emoji: string
  userId: string
  userName: string
}

export type ApiMessage = {
  id: string
  chatId: string
  senderId: string
  senderName: string
  kind: MessageKind
  text: string | null
  meta: MessageMeta | null
  replyToId: string | null
  replyTo?: {
    id: string
    senderName: string
    text: string | null
    kind: MessageKind
  } | null
  reactions: ApiReaction[]
  expiresAt: string | null
  deletedAt: string | null
  editedAt: string | null
  readByPeer: boolean
  createdAt: string
}

export type ApiChat = {
  id: string
  kind: ChatKind
  name: string
  avatarA: string
  avatarB: string
  avatarInitials: string
  otherUserId?: string | null
  otherUserAvatarUrl?: string | null
  otherUserOnline?: boolean
  lastMessage?: ApiMessage | null
  unreadCount: number
  createdAt: string
}

export type ApiUser = {
  id: string
  numericId: number
  numericIdStr: string
  phone: string
  name: string
  username: string | null
  bio: string | null
  avatarA: string
  avatarB: string
  avatarUrl: string | null
  dailyPublic: boolean
  gymPublic: boolean
  progressPicsPublic: boolean
  readReceipts: boolean
  notificationsEnabled: boolean
  hapticsEnabled: boolean
  createdAt: string
}
