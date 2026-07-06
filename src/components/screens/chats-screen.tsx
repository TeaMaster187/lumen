'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Settings as SettingsIcon, PencilLine, X, Plus, LogOut,
} from 'lucide-react'
import { useApp, useFilteredChats } from '@/lib/store'
import { Avatar, Verified, formatChatListTime } from '@/components/glass'
import { cn } from '@/lib/utils'
import type { ApiMessage } from '@/lib/types'

export function ChatsScreen() {
  const navigate = useApp((s) => s.navigate)
  const openChat = useApp((s) => s.openChat)
  const searchQuery = useApp((s) => s.searchQuery)
  const setSearch = useApp((s) => s.setSearch)
  const logout = useApp((s) => s.logout)
  const socketConnected = useApp((s) => s.socketConnected)
  const me = useApp((s) => s.me)

  const list = useFilteredChats()
  const typingByChat = useApp((s) => s.typingByChat)
  const onlineUserIds = useApp((s) => s.onlineUserIds)

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="glass rounded-3xl px-4 pb-3 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                <span className="text-gradient">Lumen</span>
              </h1>
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  socketConnected ? 'bg-emerald-400' : 'bg-muted-foreground/40',
                )}
                title={socketConnected ? 'Connected' : 'Reconnecting…'}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('new-chat')}
                className="glass-pill grid h-10 w-10 place-items-center rounded-full text-foreground active:scale-90"
                aria-label="New chat"
              >
                <PencilLine size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate('settings')}
                className="glass-pill grid h-10 w-10 place-items-center rounded-full text-foreground active:scale-90"
                aria-label="Settings"
              >
                <SettingsIcon size={18} />
              </button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats and messages"
              className="w-full rounded-2xl bg-white/40 py-2.5 pl-10 pr-10 text-sm outline-none ring-1 ring-border transition focus:ring-2 focus:ring-ring dark:bg-white/5"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mt-3 flex-1 px-3 pb-32">
        <AnimatePresence mode="popLayout">
          {list.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-16 flex flex-col items-center gap-4 text-center"
            >
              <div className="text-sm text-muted-foreground">
                {searchQuery ? 'No chats match your search.' : 'No chats yet.'}
              </div>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => navigate('new-chat')}
                  className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                >
                  <Plus size={16} /> Start a new chat
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Log out of {me?.name ?? 'account'}
              </button>
            </motion.div>
          ) : (
            list.map((c) => {
              const typing = typingByChat[c.id]
              const isTyping = !!typing
              const preview = previewText(c.lastMessage, isTyping, c.kind, typing?.name)
              const otherOnline = c.kind === 'private' && c.otherUserId ? onlineUserIds.has(c.otherUserId) : false
              return (
                <motion.button
                  layout
                  key={c.id}
                  type="button"
                  onClick={() => openChat(c.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="glass specular group mb-2 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.99]"
                >
                  <Avatar
                    initials={c.avatarInitials}
                    color={[c.avatarA, c.avatarB]}
                    size={52}
                    avatarUrl={c.otherUserAvatarUrl ?? undefined}
                    online={c.kind === 'private' ? otherOnline : undefined}
                  >
                    {c.kind === 'saved' ? (
                      <span className="grid h-full place-items-center text-white">
                        <span className="text-xl">★</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-white" style={{ fontSize: 18 }}>
                        {c.avatarInitials}
                      </span>
                    )}
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{c.name}</span>
                      {c.kind === 'channel' && <Verified size={13} />}
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                        {c.lastMessage ? formatChatListTime(Date.parse(c.lastMessage.createdAt)) : ''}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-xs',
                          isTyping ? 'text-primary' : 'text-muted-foreground',
                          c.unreadCount > 0 && !isTyping && 'font-medium text-foreground',
                        )}
                      >
                        {preview}
                      </span>
                      {c.unreadCount > 0 && (
                        <span
                          className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-bold text-primary-foreground"
                          style={{
                            background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))',
                            boxShadow: '0 4px 10px -4px color-mix(in oklch, var(--brand-1) 70%, transparent)',
                          }}
                        >
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function previewText(
  last: ApiMessage | null | undefined,
  isTyping: boolean,
  chatKind: string,
  typingName?: string,
): string {
  if (isTyping) {
    return chatKind === 'private'
      ? 'typing…'
      : `${typingName ?? 'Someone'} is typing…`
  }
  if (!last) return 'No messages yet'
  if (last.kind === 'photo') return '📷 Photo'
  if (last.kind === 'video') return '🎬 Video'
  if (last.kind === 'gif') return 'GIF'
  if (last.kind === 'voice') return '🎤 Voice message'
  if (last.kind === 'sticker') return `${last.text ?? '🙂'} Sticker`
  if (last.kind === 'file') return '📎 File'
  if (last.kind === 'system') return last.text ?? ''
  return last.text ?? ''
}
