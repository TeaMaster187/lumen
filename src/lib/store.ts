'use client'

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { io, type Socket } from 'socket.io-client'
import type { ApiChat, ApiMessage, ApiUser, MessageMeta } from '@/lib/types'

export type Screen =
  | 'splash'
  | 'onboarding'
  | 'login'
  | 'chats'
  | 'chat'
  | 'calls'
  | 'contacts'
  | 'settings'
  | 'profile'
  | 'new-chat'
  | 'call'
  | 'aura'
  | 'aura-profile'
  | 'streaks'
  | 'gym'
  | 'gym-plan'
  | 'daily'
  | 'online-users'
  | 'user-profile'

export type ThemeName = 'aurora' | 'frost' | 'sunset' | 'forest'
export type ThemeMode = 'light' | 'dark' | 'system'

type State = {
  // routing
  screen: Screen
  activeChatId: string | null
  activeStoryId: string | null
  previousScreen: Screen | null

  // auth
  me: ApiUser | null
  authLoading: boolean
  authToken: string | null

  // data
  chats: ApiChat[]
  messagesByChat: Record<string, ApiMessage[]>

  // chat list
  searchQuery: string

  // composer
  draftByChat: Record<string, string>
  replyingTo: ApiMessage | null
  showEmojiPicker: boolean
  showAttachSheet: boolean

  // presence + typing
  onlineUserIds: Set<string>
  typingByChat: Record<string, { userId: string; name: string } | null>

  // theme
  themeName: ThemeName
  themeMode: ThemeMode

  // settings
  readReceipts: boolean
  notifications: boolean
  haptics: boolean

  // socket
  socket: Socket | null
  socketConnected: boolean

  // call state
  activeCall: {
    chatId: string
    peerName: string
    peerInitials: string
    peerAvatarA: string
    peerAvatarB: string
    peerAvatarUrl: string | null
    peerUserId: string
    kind: 'voice' | 'video'
    direction: 'out' | 'in'
    status: 'calling' | 'ringing' | 'connected' | 'ended'
    startedAt: number
    remoteStream: MediaStream | null
  } | null
  incomingCall: {
    chatId: string
    fromUserId: string
    fromName: string
    kind: 'voice' | 'video'
    offer: RTCSessionDescriptionInit | null
  } | null

  // pagination
  hasMoreMessages: Record<string, boolean>
  loadingMoreMessages: boolean

  // contacts
  contacts: {
    id: string
    numericId: number
    numericIdStr: string
    name: string
    username: string | null
    avatarA: string
    avatarB: string
    avatarUrl: string | null
    avatarInitials: string
    chatId: string
  }[]

  // streaks
  streaks: {
    id: string
    count: number
    lastActivityDate: string
    peer: {
      id: string
      name: string
      numericId: number
      username: string | null
      avatarA: string
      avatarB: string
      avatarUrl: string | null
    }
  }[]

  // aura
  auraFeed: {
    id: string
    numericId: number
    numericIdStr: string
    name: string
    username: string | null
    bio: string | null
    avatarA: string
    avatarB: string
    avatarUrl: string | null
    avatarInitials: string
    cardCount: number
    latestCard: { id: string; photoUrl: string; caption: string | null; createdAt: string } | null
    matched: boolean
  }[]
  activeAuraUserId: string | null

  // gym
  workoutPlans: {
    id: string
    name: string
    day: string | null
    notes: string | null
    exercises: {
      id: string
      exerciseId: string
      exerciseName: string
      bodyPart: string | null
      target: string | null
      equipment: string | null
      gifUrl: string | null
      sets: number
      reps: number
      weight: number | null
      completed: boolean
      order: number
    }[]
  }[]
  activeGymPlanId: string | null

  // daily (nutrition tracking)
  dailyLog: {
    id: string
    date: string
    calorieGoal: number
    proteinGoal: number
    carbGoal: number
    fatGoal: number
    waterGoal: number
    waterIntake: number
    entries: {
      id: string
      meal: string
      foodName: string
      fdcId: string | null
      quantity: number
      unit: string
      calories: number
      protein: number
      carbs: number
      fat: number
      imageUrl: string | null
      aiEstimated: boolean
      createdAt: string
    }[]
  } | null
  dailyTotals: { calories: number; protein: number; carbs: number; fat: number } | null

  // online users + public profile
  onlineUsers: {
    id: string
    numericId: number
    name: string
    username: string | null
    avatarA: string
    avatarB: string
    avatarUrl: string | null
    avatarInitials: string
  }[]
  activeUserProfileId: string | null
  userProfileData: {
    user: {
      id: string
      name: string
      username: string | null
      bio: string | null
      avatarA: string
      avatarB: string
      avatarUrl: string | null
      avatarInitials: string
      numericIdStr: string
      isSelf: boolean
      dailyPublic: boolean
      gymPublic: boolean
    }
    dailySummary: {
      calorieGoal: number
      proteinGoal: number
      carbGoal: number
      fatGoal: number
      totals: { calories: number; protein: number; carbs: number; fat: number }
      entryCount: number
    } | null
    workoutPlans: {
      id: string
      name: string
      day: string | null
      exerciseCount: number
      completedCount: number
    }[] | null
  } | null
}

type Actions = {
  init: () => Promise<void>
  navigate: (screen: Screen) => void
  openChat: (chatId: string) => Promise<void>
  back: () => void
  setSearch: (q: string) => void

  register: (phone: string, name: string, inviteCode: string, password: string, username?: string) => Promise<{ ok: boolean; error?: string }>
  login: (phone: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>

  setDraft: (chatId: string, text: string) => void
  sendMessage: (chatId: string, text: string, selfDestructSec?: number) => Promise<void>
  sendSticker: (chatId: string, emoji: string) => Promise<void>
  sendVoice: (chatId: string, durationSec: number, audioDataUrl: string, waveform: number[]) => Promise<void>
  setReplyingTo: (m: ApiMessage | null) => void
  setShowEmojiPicker: (v: boolean) => void
  setShowAttachSheet: (v: boolean) => void

  startDirectChat: (phone: string) => Promise<{ ok: boolean; chatId?: string; error?: string }>
  refreshChats: () => Promise<void>
  loadMessages: (chatId: string) => Promise<void>
  loadMoreMessages: (chatId: string) => Promise<void>
  hasMoreMessages: Record<string, boolean>
  loadingMoreMessages: boolean

  toggleReaction: (messageId: string, emoji: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  editMessage: (messageId: string, text: string) => Promise<void>

  sendMedia: (
    chatId: string,
    kind: 'photo' | 'video' | 'gif' | 'file',
    dataUrl: string,
    opts?: { aspect?: number; width?: number; height?: number; caption?: string; fileName?: string; fileSize?: string },
  ) => Promise<void>

  updateSettings: (data: { readReceipts?: boolean; notificationsEnabled?: boolean; hapticsEnabled?: boolean; dailyPublic?: boolean; gymPublic?: boolean }) => Promise<void>

  refreshContacts: () => Promise<void>
  contacts: {
    id: string
    numericId: number
    numericIdStr: string
    name: string
    username: string | null
    avatarA: string
    avatarB: string
    avatarUrl: string | null
    avatarInitials: string
    chatId: string
  }[]

  refreshStreaks: () => Promise<void>
  streaks: {
    id: string
    count: number
    lastActivityDate: string
    peer: {
      id: string
      name: string
      numericId: number
      username: string | null
      avatarA: string
      avatarB: string
      avatarUrl: string | null
    }
  }[]

  refreshAuraFeed: () => Promise<void>
  openAuraProfile: (userId: string) => void
  addAuraCard: (userId: string, dataUrl: string, caption?: string) => Promise<{ ok: boolean; error?: string }>
  auraFeed: {
    id: string
    numericId: number
    numericIdStr: string
    name: string
    username: string | null
    bio: string | null
    avatarA: string
    avatarB: string
    avatarUrl: string | null
    avatarInitials: string
    cardCount: number
    latestCard: { id: string; photoUrl: string; caption: string | null; createdAt: string } | null
    matched: boolean
  }[]
  activeAuraUserId: string | null

  // gym
  refreshWorkoutPlans: () => Promise<void>
  createWorkoutPlan: (name: string, day?: string, notes?: string) => Promise<{ ok: boolean; planId?: string; error?: string }>
  deleteWorkoutPlan: (planId: string) => Promise<void>
  addExerciseToPlan: (planId: string, exercise: {
    exerciseId: string; exerciseName: string; bodyPart?: string; target?: string; equipment?: string; gifUrl?: string; sets?: number; reps?: number
  }) => Promise<{ ok: boolean; error?: string }>
  toggleExerciseCompleted: (planId: string, exerciseId: string) => Promise<void>
  removeExerciseFromPlan: (planId: string, exerciseId: string) => Promise<void>
  openGymPlan: (planId: string) => void
  workoutPlans: {
    id: string
    name: string
    day: string | null
    notes: string | null
    exercises: {
      id: string
      exerciseId: string
      exerciseName: string
      bodyPart: string | null
      target: string | null
      equipment: string | null
      gifUrl: string | null
      sets: number
      reps: number
      weight: number | null
      completed: boolean
      order: number
    }[]
  }[]
  activeGymPlanId: string | null

  // daily
  refreshDailyLog: () => Promise<void>
  addFoodEntry: (entry: {
    meal: string
    foodName: string
    fdcId?: string
    quantity?: number
    unit?: string
    calories: number
    protein: number
    carbs: number
    fat: number
    imageUrl?: string
    aiEstimated?: boolean
  }) => Promise<{ ok: boolean; error?: string }>
  removeFoodEntry: (entryId: string) => Promise<void>
  updateDailyGoals: (goals: { calorieGoal?: number; proteinGoal?: number; carbGoal?: number; fatGoal?: number; waterGoal?: number }) => Promise<void>
  addWater: (ml: number) => Promise<void>
  aiEstimateFood: (imageDataUrl: string) => Promise<{
    ok: boolean
    result?: { foodName: string; calories: number; protein: number; carbs: number; fat: number; confidence: string }
    error?: string
  }>
  dailyLog: {
    id: string
    date: string
    calorieGoal: number
    proteinGoal: number
    carbGoal: number
    fatGoal: number
    waterGoal: number
    waterIntake: number
    entries: {
      id: string
      meal: string
      foodName: string
      fdcId: string | null
      quantity: number
      unit: string
      calories: number
      protein: number
      carbs: number
      fat: number
      imageUrl: string | null
      aiEstimated: boolean
      createdAt: string
    }[]
  } | null
  dailyTotals: { calories: number; protein: number; carbs: number; fat: number } | null

  // online users + public profile
  onlineUsers: {
    id: string
    numericId: number
    name: string
    username: string | null
    avatarA: string
    avatarB: string
    avatarUrl: string | null
    avatarInitials: string
  }[]
  refreshOnlineUsers: () => Promise<void>
  openUserProfile: (userId: string) => void
  activeUserProfileId: string | null
  userProfileData: {
    user: {
      id: string
      name: string
      username: string | null
      bio: string | null
      avatarA: string
      avatarB: string
      avatarUrl: string | null
      avatarInitials: string
      numericIdStr: string
      isSelf: boolean
      dailyPublic: boolean
      gymPublic: boolean
    }
    dailySummary: {
      calorieGoal: number
      proteinGoal: number
      carbGoal: number
      fatGoal: number
      totals: { calories: number; protein: number; carbs: number; fat: number }
      entryCount: number
    } | null
    workoutPlans: {
      id: string
      name: string
      day: string | null
      exerciseCount: number
      completedCount: number
    }[] | null
  } | null

  lookupUser: (query: string, by: 'id' | 'phone' | 'username') => Promise<{
    ok: boolean
    user?: {
      id: string
      numericId: number
      name: string
      username: string | null
      avatarA: string
      avatarB: string
      avatarUrl: string | null
      avatarInitials: string
    }
    error?: string
  }>
  startDirectChatById: (userId: string) => Promise<{ ok: boolean; chatId?: string; error?: string }>
  startDirectChatByNumericId: (numericId: number | string) => Promise<{ ok: boolean; chatId?: string; error?: string }>

  updateProfile: (data: { username?: string; name?: string; bio?: string }) => Promise<{ ok: boolean; error?: string }>
  uploadAvatar: (dataUrl: string) => Promise<{ ok: boolean; error?: string }>

  sendMedia: (
    chatId: string,
    kind: 'photo' | 'video' | 'gif',
    dataUrl: string,
    opts?: { aspect?: number; width?: number; height?: number; caption?: string },
  ) => Promise<void>

  // call state
  activeCall: {
    chatId: string
    peerName: string
    peerInitials: string
    peerAvatarA: string
    peerAvatarB: string
    peerAvatarUrl: string | null
    kind: 'voice' | 'video'
    direction: 'out' | 'in'
    status: 'calling' | 'ringing' | 'connected' | 'ended'
    startedAt: number
  } | null
  startCall: (chatId: string, kind: 'voice' | 'video') => Promise<void>
  endCall: () => void
  acceptCall: () => Promise<void>
  declineCall: () => void
  incomingCall: { chatId: string; fromUserId: string; fromName: string; kind: 'voice' | 'video'; offer: RTCSessionDescriptionInit | null } | null
  declineIncomingCall: () => void

  setTyping: (chatId: string, isTyping: boolean) => void

  setThemeName: (t: ThemeName) => void
  setThemeMode: (m: ThemeMode) => void
  setReadReceipts: (v: boolean) => void
  setNotifications: (v: boolean) => void
  setHaptics: (v: boolean) => void

  connectSocket: () => void
}

export type AppStore = State & Actions

// Module-level socket singleton (so reconnecting same socket during HMR doesn't duplicate)
let _socket: Socket | null = null

// WebRTC resources — not serializable, kept outside Zustand state
let _peerConnection: RTCPeerConnection | null = null
let _localStream: MediaStream | null = null

function _cleanupCallResources() {
  if (_localStream) { _localStream.getTracks().forEach((t) => t.stop()); _localStream = null }
  if (_peerConnection) { _peerConnection.close(); _peerConnection = null }
}

export const useApp = create<AppStore>((set, get) => ({
  // routing
  screen: 'splash',
  activeChatId: null,
  activeStoryId: null,
  previousScreen: null,

  // auth
  me: null,
  authLoading: true,
  authToken: null,

  // data
  chats: [],
  messagesByChat: {},
  searchQuery: '',

  // composer
  draftByChat: {},
  replyingTo: null,
  showEmojiPicker: false,
  showAttachSheet: false,

  // presence + typing
  onlineUserIds: new Set<string>(),
  typingByChat: {},

  // theme
  themeName: 'aurora',
  themeMode: 'dark',

  // settings
  readReceipts: true,
  notifications: true,
  haptics: true,

  // socket
  socket: null,
  socketConnected: false,

  // call state
  activeCall: null,
  incomingCall: null,

  // pagination
  hasMoreMessages: {},
  loadingMoreMessages: false,

  // contacts
  contacts: [],

  // streaks
  streaks: [],

  // aura
  auraFeed: [],
  activeAuraUserId: null,

  // gym
  workoutPlans: [],
  activeGymPlanId: null,

  // daily
  dailyLog: null,
  dailyTotals: null,

  // online users + public profile
  onlineUsers: [],
  activeUserProfileId: null,
  userProfileData: null,

  // ----------------- actions -----------------

  init: async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (!res.ok) { set({ me: null, screen: 'onboarding', authLoading: false }); return }
      const text = await res.text()
      if (!text) { set({ me: null, screen: 'onboarding', authLoading: false }); return }
      const data = JSON.parse(text)
      if (data.user) {
        set({
          me: data.user,
          screen: 'chats',
          authLoading: false,
          readReceipts: data.user.readReceipts ?? true,
          notifications: data.user.notificationsEnabled ?? true,
          haptics: data.user.hapticsEnabled ?? true,
        })
        await get().refreshChats()
        get().refreshContacts()
        get().refreshStreaks()
        get().refreshAuraFeed()
        get().refreshWorkoutPlans()
        get().refreshDailyLog()
        get().connectSocket()
      } else {
        set({ me: null, screen: 'onboarding', authLoading: false })
      }
    } catch (e) {
      console.error('[init] error', e)
      set({ me: null, screen: 'onboarding', authLoading: false })
    }
  },

  navigate: (screen) => set((s) => ({ screen, previousScreen: s.screen })),

  openChat: async (chatId) => {
    set((s) => ({
      screen: 'chat',
      activeChatId: chatId,
      previousScreen: s.screen,
      showEmojiPicker: false,
      showAttachSheet: false,
      replyingTo: null,
    }))
    await get().loadMessages(chatId)
    // mark read in background
    fetch(`/api/chats/${chatId}/messages`, { credentials: 'include' }).catch(() => {})
    // refresh chats to update unread
    get().refreshChats()
  },

  back: () =>
    set((s) => ({
      screen: s.previousScreen ?? 'chats',
      previousScreen: null,
      activeChatId: s.screen === 'chat' ? null : s.activeChatId,
      activeStoryId: s.screen === 'story-viewer' ? null : s.activeStoryId,
      showEmojiPicker: false,
      showAttachSheet: false,
      replyingTo: null,
    })),

  setSearch: (q) => set({ searchQuery: q }),

  register: async (phone, name, inviteCode, password, username) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, inviteCode, password, username }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error ?? 'Registration failed' }
      set({ me: data.user, authToken: data.token, screen: 'chats' })
      await get().refreshChats()
      get().connectSocket()
      return { ok: true }
    } catch (e) {
      console.error('[register] error', e)
      return { ok: false, error: 'Network error' }
    }
  },

  login: async (phone, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error ?? 'Login failed' }
      set({ me: data.user, authToken: data.token, screen: 'chats' })
      await get().refreshChats()
      get().refreshContacts()
      get().refreshStreaks()
      get().refreshAuraFeed()
      get().refreshWorkoutPlans()
      get().refreshDailyLog()
      get().connectSocket()
      return { ok: true }
    } catch (e) {
      console.error('[login] error', e)
      return { ok: false, error: 'Network error' }
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    const sock = get().socket
    if (sock) sock.disconnect()
    set({
      me: null,
      authToken: null,
      chats: [],
      messagesByChat: {},
      activeChatId: null,
      socket: null,
      screen: 'onboarding',
    })
  },

  setDraft: (chatId, text) =>
    set((s) => ({ draftByChat: { ...s.draftByChat, [chatId]: text } })),

  sendMessage: async (chatId, text, selfDestructSec?: number) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const replyToId = get().replyingTo?.id ?? null
    const me = get().me
    set((s) => ({ draftByChat: { ...s.draftByChat, [chatId]: '' }, replyingTo: null }))
    // Optimistic: add temp message immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    if (me) {
      const tempMsg: ApiMessage = {
        id: tempId, chatId, senderId: me.id, senderName: me.name, kind: 'text', text: trimmed, meta: null,
        replyToId: replyToId ?? null, replyTo: null, reactions: [],
        expiresAt: selfDestructSec ? new Date(Date.now() + selfDestructSec * 1000).toISOString() : null,
        deletedAt: null, editedAt: null, readByPeer: false, createdAt: new Date().toISOString(),
      }
      set((s) => ({ messagesByChat: { ...s.messagesByChat, [chatId]: [...(s.messagesByChat[chatId] ?? []), tempMsg] } }))
    }
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, kind: 'text', replyToId, selfDestructSec }),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.message) {
        set((s) => ({ messagesByChat: { ...s.messagesByChat, [chatId]: (s.messagesByChat[chatId] ?? []).filter((m) => m.id !== tempId).concat(data.message) } }))
        get().refreshChats()
        if (get().haptics && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
        get().refreshStreaks()
      }
    } catch (e) {
      console.error('[sendMessage] error', e)
      set((s) => ({ messagesByChat: { ...s.messagesByChat, [chatId]: (s.messagesByChat[chatId] ?? []).filter((m) => m.id !== tempId) } }))
      set((s) => ({ draftByChat: { ...s.draftByChat, [chatId]: trimmed } }))
    }
  },

  sendSticker: async (chatId, emoji) => {
    const meta: MessageMeta = { stickerEmoji: emoji }
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: emoji, kind: 'sticker', meta }),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.message) {
        set((s) => ({
          showEmojiPicker: false,
          messagesByChat: {
            ...s.messagesByChat,
            [chatId]: [...(s.messagesByChat[chatId] ?? []), data.message],
          },
        }))
        get().refreshChats()
      }
    } catch (e) {
      console.error('[sendSticker] error', e)
    }
  },

  sendVoice: async (chatId, durationSec, audioDataUrl, waveform) => {
    const meta: MessageMeta = { voiceDurationSec: durationSec, voiceWaveform: waveform, voiceUrl: audioDataUrl }
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'voice', meta }), credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.message) { set((s) => ({ messagesByChat: { ...s.messagesByChat, [chatId]: [...(s.messagesByChat[chatId] ?? []), data.message] } })); get().refreshChats() }
    } catch (e) { console.error('[sendVoice] error', e) }
  },

  setReplyingTo: (m) => set({ replyingTo: m, showEmojiPicker: false }),
  setShowEmojiPicker: (v) => set({ showEmojiPicker: v }),
  setShowAttachSheet: (v) => set({ showAttachSheet: v }),

  startDirectChat: async (phone) => {
    try {
      const res = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error ?? 'Could not start chat' }
      await get().refreshChats()
      return { ok: true, chatId: data.chat.id as string }
    } catch (e) {
      console.error('[startDirectChat] error', e)
      return { ok: false, error: 'Network error' }
    }
  },

  refreshChats: async () => {
    try {
      const res = await fetch('/api/chats', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) set({ chats: data.chats })
    } catch (e) {
      console.error('[refreshChats] error', e)
    }
  },

  lookupUser: async (query, by) => {
    try {
      const params = new URLSearchParams(
        by === 'id' ? { id: query } : by === 'phone' ? { phone: query } : { username: query },
      )
      const res = await fetch(`/api/users/lookup?${params.toString()}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error ?? 'Lookup failed' }
      return { ok: true, user: data.user }
    } catch (e) {
      console.error('[lookupUser] error', e)
      return { ok: false, error: 'Network error' }
    }
  },

  startDirectChatById: async (userId) => {
    try {
      const res = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error ?? 'Could not start chat' }
      await get().refreshChats()
      return { ok: true, chatId: data.chat.id as string }
    } catch (e) {
      console.error('[startDirectChatById] error', e)
      return { ok: false, error: 'Network error' }
    }
  },

  startDirectChatByNumericId: async (numericId) => {
    try {
      const res = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numericId }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error ?? 'Could not start chat' }
      await get().refreshChats()
      return { ok: true, chatId: data.chat.id as string }
    } catch (e) {
      console.error('[startDirectChatByNumericId] error', e)
      return { ok: false, error: 'Network error' }
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) return { ok: false, error: json.error ?? 'Update failed' }
      set({ me: json.user })
      return { ok: true }
    } catch (e) {
      console.error('[updateProfile] error', e)
      return { ok: false, error: 'Network error' }
    }
  },

  uploadAvatar: async (dataUrl) => {
    try {
      const res = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) return { ok: false, error: json.error ?? 'Upload failed' }
      set({ me: json.user })
      return { ok: true }
    } catch (e) {
      console.error('[uploadAvatar] error', e)
      return { ok: false, error: 'Network error' }
    }
  },

  sendMedia: async (chatId, kind, dataUrl, opts) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          dataUrl,
          aspect: opts?.aspect,
          width: opts?.width,
          height: opts?.height,
          caption: opts?.caption,
        }),
        credentials: 'include',
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let msg = `Upload failed (${res.status})`
        if (text) { try { msg = JSON.parse(text).error ?? msg } catch { /* ignore HTML 404 etc */ } }
        console.error('[sendMedia] error:', msg)
        return
      }
      const text = await res.text()
      if (!text) return
      const data = JSON.parse(text)
      if (data.message) {
        set((s) => ({
          showAttachSheet: false,
          messagesByChat: {
            ...s.messagesByChat,
            [chatId]: [...(s.messagesByChat[chatId] ?? []), data.message],
          },
        }))
        get().refreshChats()
      }
    } catch (e) {
      console.error('[sendMedia] error', e)
    }
  },

  startCall: async (chatId, kind) => {
    const chat = get().chats.find((c) => c.id === chatId)
    if (!chat || !chat.otherUserId) return
    const me = get().me; if (!me) return
    try {
      const constraints: MediaStreamConstraints = kind === 'video' ? { audio: true, video: { facingMode: 'user' } } : { audio: true, video: false }
      const localStream = await navigator.mediaDevices.getUserMedia(constraints)
      _localStream = localStream
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] })
      _peerConnection = pc
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
      const remoteStream = new MediaStream()
      pc.ontrack = (event) => { event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track)); const cur = get().activeCall; if (cur) set({ activeCall: { ...cur, remoteStream, status: 'connected', startedAt: Date.now() } }) }
      pc.onicecandidate = (event) => { if (event.candidate && _socket) _socket.emit('call-signal', { toUserId: chat.otherUserId, type: 'ice', data: event.candidate.toJSON() }) }
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') get().endCall() }
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer)
      if (_socket) { _socket.emit('call-signal', { toUserId: chat.otherUserId, type: 'invite', chatId, kind, fromName: me.name }); _socket.emit('call-signal', { toUserId: chat.otherUserId, type: 'offer', data: offer }) }
      set({ activeCall: { chatId, peerName: chat.name, peerInitials: chat.avatarInitials, peerAvatarA: chat.avatarA, peerAvatarB: chat.avatarB, peerAvatarUrl: chat.otherUserAvatarUrl ?? null, peerUserId: chat.otherUserId, kind, direction: 'out', status: 'calling', startedAt: Date.now(), remoteStream: null }, screen: 'call', previousScreen: get().screen })
    } catch (e) { console.error('[startCall] error', e); _cleanupCallResources(); alert('Could not access microphone/camera.') }
  },

  acceptCall: async () => {
    const incoming = get().incomingCall; if (!incoming || !incoming.offer) return
    const me = get().me; if (!me) return
    try {
      const constraints: MediaStreamConstraints = incoming.kind === 'video' ? { audio: true, video: { facingMode: 'user' } } : { audio: true, video: false }
      const localStream = await navigator.mediaDevices.getUserMedia(constraints); _localStream = localStream
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }); _peerConnection = pc
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
      const remoteStream = new MediaStream()
      pc.ontrack = (event) => { event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track)); const cur = get().activeCall; if (cur) set({ activeCall: { ...cur, remoteStream, status: 'connected', startedAt: Date.now() } }) }
      pc.onicecandidate = (event) => { if (event.candidate && _socket) _socket.emit('call-signal', { toUserId: incoming.fromUserId, type: 'ice', data: event.candidate.toJSON() }) }
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') get().endCall() }
      await pc.setRemoteDescription(incoming.offer)
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer)
      if (_socket) _socket.emit('call-signal', { toUserId: incoming.fromUserId, type: 'answer', data: answer })
      const chat = get().chats.find((c) => c.otherUserId === incoming.fromUserId)
      set({ incomingCall: null, activeCall: { chatId: incoming.chatId, peerName: chat?.name ?? incoming.fromName, peerInitials: chat?.avatarInitials ?? '??', peerAvatarA: chat?.avatarA ?? 'oklch(0.62 0.24 285)', peerAvatarB: chat?.avatarB ?? 'oklch(0.66 0.22 330)', peerAvatarUrl: chat?.otherUserAvatarUrl ?? null, peerUserId: incoming.fromUserId, kind: incoming.kind, direction: 'in', status: 'connected', startedAt: Date.now(), remoteStream: null }, screen: 'call', previousScreen: get().screen })
    } catch (e) { console.error('[acceptCall] error', e); _cleanupCallResources(); alert('Could not access microphone/camera.'); set({ incomingCall: null }) }
  },

  declineCall: () => {
    const incoming = get().incomingCall
    if (incoming && _socket) _socket.emit('call-signal', { toUserId: incoming.fromUserId, type: 'reject' })
    set({ incomingCall: null })
  },

  endCall: () => {
    const cur = get().activeCall
    if (cur && _socket) _socket.emit('call-signal', { toUserId: cur.peerUserId, type: 'end' })
    _cleanupCallResources()
    set((s) => ({ activeCall: null, screen: s.previousScreen ?? 'chats', previousScreen: null }))
  },

  declineIncomingCall: () => set({ incomingCall: null }),

  loadMessages: async (chatId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages?limit=50`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        set((s) => ({
          messagesByChat: { ...s.messagesByChat, [chatId]: data.messages },
          hasMoreMessages: { ...s.hasMoreMessages, [chatId]: data.hasMore },
          chats: s.chats.map((c) => c.id === chatId ? { ...c, unreadCount: 0 } : c),
        }))
      }
    } catch (e) { console.error('[loadMessages] error', e) }
  },

  loadMoreMessages: async (chatId) => {
    const state = get()
    if (state.loadingMoreMessages || !state.hasMoreMessages[chatId]) return
    const messages = state.messagesByChat[chatId] ?? []
    if (messages.length === 0) return
    const oldestId = messages[0].id
    set({ loadingMoreMessages: true })
    try {
      const res = await fetch(`/api/chats/${chatId}/messages?before=${oldestId}&limit=50`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        set((s) => ({
          messagesByChat: { ...s.messagesByChat, [chatId]: [...data.messages, ...(s.messagesByChat[chatId] ?? [])] },
          hasMoreMessages: { ...s.hasMoreMessages, [chatId]: data.hasMore },
        }))
      }
    } catch (e) { console.error('[loadMoreMessages] error', e) } finally { set({ loadingMoreMessages: false }) }
  },

  toggleReaction: async (messageId, emoji) => {
    const chatId = get().activeChatId; if (!chatId) return
    const me = get().me; if (!me) return
    set((s) => {
      const msgs = s.messagesByChat[chatId] ?? []
      const updated = msgs.map((m) => {
        if (m.id !== messageId) return m
        const existing = (m.reactions ?? []).find((r: any) => r.userId === me.id && r.emoji === emoji)
        if (existing) return { ...m, reactions: (m.reactions ?? []).filter((r: any) => !(r.userId === me.id && r.emoji === emoji)) }
        return { ...m, reactions: [...(m.reactions ?? []), { emoji, userId: me.id, userName: me.name }] }
      })
      return { messagesByChat: { ...s.messagesByChat, [chatId]: updated } }
    })
    try { await fetch(`/api/chats/${chatId}/messages/${messageId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }), credentials: 'include' }) } catch (e) { console.error('[toggleReaction] error', e) }
  },

  deleteMessage: async (messageId) => {
    const chatId = get().activeChatId; if (!chatId) return
    set((s) => ({ messagesByChat: { ...s.messagesByChat, [chatId]: (s.messagesByChat[chatId] ?? []).filter((m) => m.id !== messageId) } }))
    try { await fetch(`/api/chats/${chatId}/messages/${messageId}`, { method: 'DELETE', credentials: 'include' }) } catch (e) { console.error('[deleteMessage] error', e) }
  },

  editMessage: async (messageId, text) => {
    const chatId = get().activeChatId; if (!chatId) return
    set((s) => ({ messagesByChat: { ...s.messagesByChat, [chatId]: (s.messagesByChat[chatId] ?? []).map((m) => m.id === messageId ? { ...m, text, editedAt: new Date().toISOString() } : m) } }))
    try {
      const res = await fetch(`/api/chats/${chatId}/messages/${messageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.message) { set((s) => ({ messagesByChat: { ...s.messagesByChat, [chatId]: (s.messagesByChat[chatId] ?? []).map((m) => m.id === messageId ? data.message : m) } })) }
    } catch (e) { console.error('[editMessage] error', e) }
  },

  updateSettings: async (data) => {
    try { const res = await fetch('/api/users/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' }); const json = await res.json(); if (res.ok && json.user) { set({ me: json.user }); if (typeof json.user.readReceipts === 'boolean') set({ readReceipts: json.user.readReceipts }); if (typeof json.user.notificationsEnabled === 'boolean') set({ notifications: json.user.notificationsEnabled }); if (typeof json.user.hapticsEnabled === 'boolean') set({ haptics: json.user.hapticsEnabled }) } } catch (e) { console.error('[updateSettings] error', e) }
  },

  refreshContacts: async () => { try { const res = await fetch('/api/contacts', { credentials: 'include' }); const data = await res.json(); if (res.ok) set({ contacts: data.contacts }) } catch (e) { console.error('[refreshContacts] error', e) } },
  refreshStreaks: async () => { try { const res = await fetch('/api/streaks', { credentials: 'include' }); const data = await res.json(); if (res.ok) set({ streaks: data.streaks }) } catch (e) { console.error('[refreshStreaks] error', e) } },
  refreshAuraFeed: async () => { try { const res = await fetch('/api/aura/feed', { credentials: 'include' }); const data = await res.json(); if (res.ok) set({ auraFeed: data.feed }) } catch (e) { console.error('[refreshAuraFeed] error', e) } },
  openAuraProfile: (userId) => { set((s) => ({ activeAuraUserId: userId, screen: 'aura-profile', previousScreen: s.screen })) },
  addAuraCard: async (userId, dataUrl, caption) => { try { const res = await fetch('/api/aura/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, dataUrl, caption }), credentials: 'include' }); const data = await res.json(); if (!res.ok) return { ok: false, error: data.error ?? 'Upload failed' }; get().refreshAuraFeed(); return { ok: true } } catch (e) { console.error('[addAuraCard] error', e); return { ok: false, error: 'Network error' } } },

  refreshWorkoutPlans: async () => { try { const res = await fetch('/api/gym/plans', { credentials: 'include' }); const data = await res.json(); if (res.ok) set({ workoutPlans: data.plans }) } catch (e) { console.error('[refreshWorkoutPlans] error', e) } },
  createWorkoutPlan: async (name, day, notes) => { try { const res = await fetch('/api/gym/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, day, notes }), credentials: 'include' }); const data = await res.json(); if (!res.ok) return { ok: false, error: data.error ?? 'Failed' }; await get().refreshWorkoutPlans(); return { ok: true, planId: data.plan.id } } catch (e) { console.error('[createWorkoutPlan] error', e); return { ok: false, error: 'Network error' } } },
  deleteWorkoutPlan: async (planId) => { set((s) => ({ workoutPlans: s.workoutPlans.filter((p) => p.id !== planId) })); try { await fetch('/api/gym/plans', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId }), credentials: 'include' }) } catch (e) { console.error('[deleteWorkoutPlan] error', e) } },
  addExerciseToPlan: async (planId, exercise) => { try { const res = await fetch(`/api/gym/plans/${planId}/exercises`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(exercise), credentials: 'include' }); const data = await res.json(); if (!res.ok) return { ok: false, error: data.error ?? 'Failed' }; await get().refreshWorkoutPlans(); return { ok: true } } catch (e) { console.error('[addExerciseToPlan] error', e); return { ok: false, error: 'Network error' } } },
  toggleExerciseCompleted: async (planId, exerciseId) => { set((s) => ({ workoutPlans: s.workoutPlans.map((p) => p.id === planId ? { ...p, exercises: p.exercises.map((e) => e.id === exerciseId ? { ...e, completed: !e.completed } : e) } : p) })); try { const plan = get().workoutPlans.find((p) => p.id === planId); const ex = plan?.exercises.find((e) => e.id === exerciseId); await fetch(`/api/gym/plans/${planId}/exercises`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exerciseId, completed: ex?.completed }), credentials: 'include' }) } catch (e) { console.error('[toggleExerciseCompleted] error', e) } },
  removeExerciseFromPlan: async (planId, exerciseId) => { set((s) => ({ workoutPlans: s.workoutPlans.map((p) => p.id === planId ? { ...p, exercises: p.exercises.filter((e) => e.id !== exerciseId) } : p) })); try { await fetch(`/api/gym/plans/${planId}/exercises`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exerciseId }), credentials: 'include' }) } catch (e) { console.error('[removeExerciseFromPlan] error', e) } },
  openGymPlan: (planId) => { set((s) => ({ activeGymPlanId: planId, screen: 'gym-plan', previousScreen: s.screen })) },

  refreshDailyLog: async () => { try { const res = await fetch('/api/daily/log', { credentials: 'include' }); const data = await res.json(); if (res.ok && data.log) set({ dailyLog: data.log, dailyTotals: data.totals }) } catch (e) { console.error('[refreshDailyLog] error', e) } },
  addFoodEntry: async (entry) => { const log = get().dailyLog; if (!log) return { ok: false, error: 'No daily log' }; try { const res = await fetch(`/api/daily/log/${log.id}/entries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry), credentials: 'include' }); const data = await res.json(); if (!res.ok) return { ok: false, error: data.error ?? 'Failed' }; await get().refreshDailyLog(); return { ok: true } } catch (e) { console.error('[addFoodEntry] error', e); return { ok: false, error: 'Network error' } } },
  removeFoodEntry: async (entryId) => { const log = get().dailyLog; if (!log) return; set((s) => ({ dailyLog: s.dailyLog ? { ...s.dailyLog, entries: s.dailyLog.entries.filter((e) => e.id !== entryId) } : null })); try { await fetch(`/api/daily/log/${log.id}/entries`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId }), credentials: 'include' }); await get().refreshDailyLog() } catch (e) { console.error('[removeFoodEntry] error', e) } },
  updateDailyGoals: async (goals) => { try { await fetch('/api/daily/log', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goals), credentials: 'include' }); await get().refreshDailyLog() } catch (e) { console.error('[updateDailyGoals] error', e) } },
  addWater: async (ml) => { try { await fetch('/api/daily/log', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addWater: ml }), credentials: 'include' }); await get().refreshDailyLog() } catch (e) { console.error('[addWater] error', e) } },
  aiEstimateFood: async (imageDataUrl) => { try { const res = await fetch('/api/daily/ai-estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: imageDataUrl }), credentials: 'include' }); const data = await res.json(); if (!res.ok) return { ok: false, error: data.error ?? 'AI failed' }; return { ok: true, result: data } } catch (e) { console.error('[aiEstimateFood] error', e); return { ok: false, error: 'Network error' } } },

  refreshOnlineUsers: async () => { try { const res = await fetch('/api/users/online', { credentials: 'include' }); const data = await res.json(); if (res.ok) set({ onlineUsers: data.users ?? [] }) } catch (e) { console.error('[refreshOnlineUsers] error', e) } },
  openUserProfile: (userId) => { set((s) => ({ activeUserProfileId: userId, screen: 'user-profile', previousScreen: s.screen, userProfileData: null })); fetch(`/api/users/${userId}/profile`, { credentials: 'include' }).then((r) => r.json()).then((data) => { if (data.user) set({ userProfileData: data }) }).catch((e) => console.error('[openUserProfile] fetch error', e)) },

  setTyping: (chatId, isTyping) => {
    const sock = get().socket
    if (sock && sock.connected) {
      sock.emit('typing', { chatId, isTyping })
    }
  },

  setThemeName: (t) => set({ themeName: t }),
  setThemeMode: (m) => set({ themeMode: m }),
  setReadReceipts: (v) => { set({ readReceipts: v }); get().updateSettings({ readReceipts: v }) },
  setNotifications: (v) => { set({ notifications: v }); get().updateSettings({ notificationsEnabled: v }) },
  setHaptics: (v) => { set({ haptics: v }); get().updateSettings({ hapticsEnabled: v }) },

  connectSocket: () => {
    if (_socket) return
    // Connect to the same origin — in production, Next.js proxies /socket.io/
    // to the chat-service on port 3003 via next.config.ts rewrites.
    // In dev, the XTransformPort query param tells the z.ai dev proxy the same thing.
    const isDev = process.env.NODE_ENV !== 'production'
    const socketUrl = isDev ? '/?XTransformPort=3003' : undefined
    _socket = io(socketUrl ?? '/', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    })

    _socket.on('connect', () => {
      set({ socketConnected: true })
      const token = get().authToken
      if (token) _socket!.emit('auth', { token })
    })
    _socket.on('disconnect', () => set({ socketConnected: false }))
    _socket.on('auth-ok', (payload: { userId: string }) => {
      set((s) => ({ onlineUserIds: new Set([...s.onlineUserIds, payload.userId]) }))
    })
    _socket.on('auth-error', (payload: { message?: string }) => {
      console.warn('[socket] auth-error', payload?.message)
    })
    _socket.on('message', (payload: { chatId: string; message: ApiMessage }) => {
      const { chatId, message } = payload
      set((s) => ({
        messagesByChat: {
          ...s.messagesByChat,
          [chatId]: [...(s.messagesByChat[chatId] ?? []), message],
        },
      }))
      get().refreshChats()
    })
    _socket.on('chat-updated', () => {
      get().refreshChats()
    })
    _socket.on('presence', (payload: { userId: string; online: boolean }) => {
      set((s) => {
        const next = new Set(s.onlineUserIds)
        if (payload.online) next.add(payload.userId)
        else next.delete(payload.userId)
        return { onlineUserIds: next }
      })
    })
    _socket.on('typing', (payload: { chatId: string; userId: string; name: string; isTyping: boolean }) => {
      set((s) => ({
        typingByChat: {
          ...s.typingByChat,
          [payload.chatId]: payload.isTyping ? { userId: payload.userId, name: payload.name } : null,
        },
      }))
      if (payload.isTyping) {
        setTimeout(() => {
          const cur = get().typingByChat[payload.chatId]
          if (cur?.userId === payload.userId) {
            set((s) => ({ typingByChat: { ...s.typingByChat, [payload.chatId]: null } }))
          }
        }, 3000)
      }
    })
    _socket.on('reaction', (payload: { chatId: string; reaction: { messageId: string; message: ApiMessage } }) => {
      const { chatId, reaction } = payload
      set((s) => {
        const msgs = s.messagesByChat[chatId] ?? []
        const updated = msgs.map((m) => m.id === reaction.messageId ? reaction.message : m)
        return { messagesByChat: { ...s.messagesByChat, [chatId]: updated } }
      })
    })
    _socket.on('message-deleted', (payload: { chatId: string; messageId: string }) => {
      const { chatId, messageId } = payload
      set((s) => ({ messagesByChat: { ...s.messagesByChat, [chatId]: (s.messagesByChat[chatId] ?? []).filter((m) => m.id !== messageId) } }))
    })
    _socket.on('message-updated', (payload: { chatId: string; message: ApiMessage }) => {
      const { chatId, message } = payload
      set((s) => ({ messagesByChat: { ...s.messagesByChat, [chatId]: (s.messagesByChat[chatId] ?? []).map((m) => m.id === message.id ? message : m) } }))
    })
    _socket.on('messages-read', (payload: { chatId: string; readByUserId: string }) => {
      const { chatId, readByUserId } = payload
      set((s) => {
        const msgs = s.messagesByChat[chatId] ?? []
        return { messagesByChat: { ...s.messagesByChat, [chatId]: msgs.map((m) => m.senderId !== readByUserId ? { ...m, readByPeer: true } : m) } }
      })
    })
    _socket.on('call-signal', (payload: { fromUserId: string; fromName?: string; type: string; data?: unknown; chatId?: string; kind?: string }) => {
      const { type, data, fromUserId, fromName, chatId, kind } = payload
      if (type === 'invite') {
        set({ incomingCall: { chatId: chatId ?? '', fromUserId, fromName: fromName ?? 'Unknown', kind: (kind as 'voice' | 'video') ?? 'voice', offer: null } })
      } else if (type === 'offer') {
        const incoming = get().incomingCall
        if (incoming && incoming.fromUserId === fromUserId) {
          set({ incomingCall: { ...incoming, offer: data as RTCSessionDescriptionInit } })
        } else {
          set({ incomingCall: { chatId: chatId ?? '', fromUserId, fromName: fromName ?? 'Unknown', kind: (kind as 'voice' | 'video') ?? 'voice', offer: data as RTCSessionDescriptionInit } })
        }
      } else if (type === 'end' || type === 'reject') {
        _cleanupCallResources()
        set((s) => ({ activeCall: null, incomingCall: null, screen: s.previousScreen ?? 'chats', previousScreen: null }))
      }
    })

    set({ socket: _socket })
  },
}))

// ----------------- selectors -----------------

export function useActiveChat() {
  return useApp((s) => s.chats.find((c) => c.id === s.activeChatId) ?? null)
}

export function useActiveMessages() {
  return useApp(
    useShallow((s) => {
      if (!s.activeChatId) return [] as ApiMessage[]
      return s.messagesByChat[s.activeChatId] ?? ([] as ApiMessage[])
    }),
  )
}

export function useFilteredChats() {
  return useApp(
    useShallow((s) => {
      const q = s.searchQuery.trim().toLowerCase()
      let list = s.chats
      if (q) {
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.lastMessage?.text ?? '').toLowerCase().includes(q),
        )
      }
      // Saved first, then by last message desc
      return [...list].sort((a, b) => {
        if (a.kind === 'saved' && b.kind !== 'saved') return -1
        if (b.kind === 'saved' && a.kind !== 'saved') return 1
        const at = (c: typeof a) => c.lastMessage ? Date.parse(c.lastMessage.createdAt) : Date.parse(c.createdAt)
        return at(b) - at(a)
      })
    }),
  )
}
