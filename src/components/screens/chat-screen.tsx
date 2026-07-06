'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import {
  ArrowLeft, Phone, Video, MoreVertical, Paperclip, Smile, Mic, Send, X,
  Reply, Copy, Forward, Pin, BellOff, Trash2, Check, CheckCheck, Play, Pause,
  Download, FileText, Image as ImageIcon, Film, Gift, Loader2,
} from 'lucide-react'
import {
  useApp, useActiveChat, useActiveMessages,
} from '@/lib/store'
import type { ApiMessage } from '@/lib/types'
import { Avatar, Verified, formatTime, formatDuration } from '@/components/glass'
import { cn } from '@/lib/utils'

const QUICK_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '🙏', '👏']
const STICKER_EMOJIS = ['🐶', '🐱', '🚀', '🌟', '🎉', '👋', '🔥', '💯', '🥳', '😎', '🤝', '😴', '🤔', '👀', '🍕', '☕']

export function ChatScreen() {
  const chat = useActiveChat()
  const messages = useActiveMessages()
  const me = useApp((s) => s.me)
  const typingByChat = useApp((s) => s.typingByChat)
  const onlineUserIds = useApp((s) => s.onlineUserIds)

  const back = useApp((s) => s.back)
  const draft = useApp((s) => (chat ? s.draftByChat[chat.id] ?? '' : ''))
  const setDraft = useApp((s) => s.setDraft)
  const sendMessage = useApp((s) => s.sendMessage)
  const sendSticker = useApp((s) => s.sendSticker)
  const sendVoice = useApp((s) => s.sendVoice)
  const sendMedia = useApp((s) => s.sendMedia)
  const startCall = useApp((s) => s.startCall)
  const replyingTo = useApp((s) => s.replyingTo)
  const setReplyingTo = useApp((s) => s.setReplyingTo)
  const showEmojiPicker = useApp((s) => s.showEmojiPicker)
  const setShowEmojiPicker = useApp((s) => s.setShowEmojiPicker)
  const showAttachSheet = useApp((s) => s.showAttachSheet)
  const setShowAttachSheet = useApp((s) => s.setShowAttachSheet)
  const setTyping = useApp((s) => s.setTyping)
  const navigate = useApp((s) => s.navigate)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [longPressMsg, setLongPressMsg] = useState<string | null>(null)
  const [swipeReplyId, setSwipeReplyId] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length])

  useEffect(() => {
    if (!longPressMsg) return
    const close = () => setLongPressMsg(null)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [longPressMsg])

  if (!chat) {
    back()
    return null
  }

  const onSend = async () => {
    if (!draft.trim()) return
    await sendMessage(chat.id, draft)
  }

  const onDraftChange = (val: string) => {
    setDraft(chat.id, val)
    // Typing indicator
    if (typingDebounce.current) clearTimeout(typingDebounce.current)
    setTyping(chat.id, true)
    typingDebounce.current = setTimeout(() => setTyping(chat.id, false), 1500)
  }

  const startRecording = () => {
    setRecording(true)
    setRecordSecs(0)
    recordTimer.current = setInterval(() => setRecordSecs((s) => s + 1), 1000)
  }
  const stopRecording = async (send: boolean) => {
    if (recordTimer.current) clearInterval(recordTimer.current)
    const secs = recordSecs
    setRecording(false)
    setRecordSecs(0)
    if (send && secs > 0) await sendVoice(chat.id, Math.max(1, secs))
  }

  const onSwipeReply = (msgId: string, info: PanInfo) => {
    if (info.offset.x > 60) {
      const m = messages.find((x) => x.id === msgId)
      if (m) setReplyingTo(m)
    }
    setSwipeReplyId(null)
  }

  const onMediaPick = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'photo' | 'video') => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !chat) return
    const maxBytes = kind === 'video' ? 4.5 * 1024 * 1024 : 2 * 1024 * 1024
    if (file.size > maxBytes) {
      setUploadError(`${kind === 'video' ? 'Video' : 'Image'} too large (max ${kind === 'video' ? '4.5MB' : '2MB'})`)
      return
    }
    setUploadError(null)
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      // compute aspect for images
      let aspect: number | undefined
      if (kind === 'photo') {
        try {
          const img = new window.Image()
          img.src = dataUrl
          await new Promise((res) => { img.onload = res; img.onerror = res })
          aspect = img.width / img.height
        } catch { /* ignore */ }
      }
      await sendMedia(chat.id, kind, dataUrl, { aspect })
      setUploading(false)
    }
    reader.onerror = () => {
      setUploading(false)
      setUploadError('Could not read file')
    }
    reader.readAsDataURL(file)
  }

  const onPickGif = () => {
    if (!chat) return
    // Inline GIF picker — uses Giphy's public beta key for trending + search
    // We open a simple prompt-based picker for now
    const url = window.prompt('Paste a GIF URL (https://media.giphy.com/...gif) or search term:')
    if (!url) return
    if (/^https?:\/\//.test(url)) {
      // Direct URL — fetch and convert to data URL
      setUploadError(null)
      setUploading(true)
      fetch(url)
        .then((r) => r.blob())
        .then((blob) => {
          if (blob.size > 4.5 * 1024 * 1024) {
            setUploading(false)
            setUploadError('GIF too large (max 4.5MB)')
            return
          }
          const reader = new FileReader()
          reader.onload = async () => {
            await sendMedia(chat.id, 'gif', reader.result as string)
            setUploading(false)
          }
          reader.readAsDataURL(blob)
        })
        .catch(() => {
          setUploading(false)
          setUploadError('Could not load GIF')
        })
    } else {
      // Treat as a search term — fetch trending from Giphy
      setUploadError(null)
      setUploading(true)
      const key = 'dc6zaTOxFJmzC' // Giphy public beta key
      fetch(`https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(url)}&api_key=${key}&limit=1`)
        .then((r) => r.json())
        .then(async (json) => {
          const gifUrl = json?.data?.[0]?.images?.original?.url
          if (!gifUrl) {
            setUploading(false)
            setUploadError('No GIF found')
            return
          }
          const blob = await fetch(gifUrl).then((r) => r.blob())
          if (blob.size > 4.5 * 1024 * 1024) {
            setUploading(false)
            setUploadError('GIF too large (max 4.5MB)')
            return
          }
          const reader = new FileReader()
          reader.onload = async () => {
            await sendMedia(chat.id, 'gif', reader.result as string)
            setUploading(false)
          }
          reader.readAsDataURL(blob)
        })
        .catch(() => {
          setUploading(false)
          setUploadError('Giphy search failed')
        })
    }
  }

  const otherOnline = chat.kind === 'private' && chat.otherUserId
    ? onlineUserIds.has(chat.otherUserId)
    : false
  const typing = typingByChat[chat.id]
  const subtitle = chat.kind === 'channel'
    ? 'channel'
    : chat.kind === 'group'
      ? 'group'
      : chat.kind === 'saved'
        ? 'your cloud scratchpad'
        : typing
          ? 'typing…'
          : otherOnline
            ? 'online'
            : 'offline'

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col">
      <header className="z-30 px-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="glass-strong flex items-center gap-2 rounded-3xl p-2">
          <button
            type="button"
            onClick={back}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground active:scale-90"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => navigate('profile')}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl p-1 text-left active:scale-[0.98]"
          >
            <Avatar
              initials={chat.avatarInitials}
              color={[chat.avatarA, chat.avatarB]}
              size={40}
              avatarUrl={chat.otherUserAvatarUrl ?? undefined}
              online={chat.kind === 'private' ? otherOnline : undefined}
            >
              {chat.kind === 'saved' ? <span className="text-white">★</span> : <span className="text-sm font-semibold text-white">{chat.avatarInitials}</span>}
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-semibold">{chat.name}</span>
                {chat.kind === 'channel' && <Verified size={12} />}
              </div>
              <div className={cn('truncate text-xs', typing ? 'text-primary' : 'text-muted-foreground')}>
                {subtitle}
              </div>
            </div>
          </button>
          {chat.kind === 'private' && (
            <>
              <button
                type="button"
                onClick={() => startCall(chat.id, 'voice')}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground active:scale-90"
                aria-label="Voice call"
              >
                <Phone size={18} />
              </button>
              <button
                type="button"
                onClick={() => startCall(chat.id, 'video')}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground active:scale-90"
                aria-label="Video call"
              >
                <Video size={18} />
              </button>
            </>
          )}
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground active:scale-90" aria-label="More">
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto mb-3 w-fit rounded-full bg-foreground/5 px-3 py-1 text-[11px] text-muted-foreground">
          {chat.kind === 'private' ? '🔒 End-to-end encrypted' : 'Today'}
        </div>

        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-xs rounded-2xl bg-foreground/5 px-4 py-3 text-center text-xs text-muted-foreground">
            No messages yet. Say hi to {chat.name}!
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {messages.map((m, i) => {
            const mine = m.senderId === me?.id || chat.kind === 'saved'
            const prev = messages[i - 1]
            const grouped = prev && prev.senderId === m.senderId && (Date.parse(m.createdAt) - Date.parse(prev.createdAt)) < 60_000
            const showSenderName = !mine && chat.kind !== 'private' && chat.kind !== 'saved' && !grouped

            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.6, right: 0 }}
                onDragStart={() => setSwipeReplyId(m.id)}
                onDragEnd={(_, info) => onSwipeReply(m.id, info)}
                className={cn('flex w-full', mine ? 'justify-end' : 'justify-start', grouped ? 'mt-0.5' : 'mt-2')}
              >
                <div
                  className="relative max-w-[78%] select-none"
                  onContextMenu={(e) => { e.preventDefault(); setLongPressMsg(m.id) }}
                >
                  <div
                    onPointerDown={(e) => {
                      const t = setTimeout(() => setLongPressMsg(m.id), 380)
                      const cancel = () => clearTimeout(t)
                      ;(e.target as HTMLElement).addEventListener('pointerup', cancel, { once: true })
                      ;(e.target as HTMLElement).addEventListener('pointermove', cancel, { once: true })
                    }}
                    className={cn(
                      'send-ripple relative rounded-2xl px-3 py-2 text-sm leading-relaxed',
                      mine ? 'bubble-out rounded-br-md' : 'bubble-in rounded-bl-md',
                      m.kind === 'sticker' && 'bg-transparent p-0 shadow-none',
                    )}
                  >
                    {swipeReplyId === m.id && (
                      <div className={cn('absolute top-1/2 -translate-y-1/2', mine ? 'right-full mr-2' : 'left-full ml-2')}>
                        <Reply size={20} className="text-primary" />
                      </div>
                    )}

                    {showSenderName && (
                      <div className="mb-0.5 text-xs font-semibold" style={{ color: 'var(--brand-2)' }}>
                        {m.senderName}
                      </div>
                    )}

                    {m.replyTo && (
                      <div className="mb-1 flex items-stretch gap-2 overflow-hidden rounded-lg bg-black/10 pl-2 pr-3 py-1 dark:bg-white/10">
                        <div className="w-0.5 rounded-full bg-primary" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-primary">{m.replyTo.senderName}</div>
                          <div className="truncate text-[11px] opacity-80">{m.replyTo.text ?? '📎 attachment'}</div>
                        </div>
                      </div>
                    )}

                    <MessageBody message={m} />

                    {m.kind !== 'sticker' && (
                      <div className={cn('mt-0.5 flex items-center justify-end gap-1 text-[10px]', mine ? 'text-white/70' : 'text-muted-foreground')}>
                        <span>{formatTime(Date.parse(m.createdAt))}</span>
                        {mine && (m.senderId === me?.id) && <CheckCheck size={12} className="text-white/80" />}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {typing && (
          <div className={cn('mt-2 flex', chat.kind === 'saved' ? 'justify-end' : 'justify-start')}>
            <div className="bubble-in flex items-center gap-1 rounded-2xl px-3 py-2">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {longPressMsg && (
          <ContextCard
            messageId={longPressMsg}
            onClose={() => setLongPressMsg(null)}
            onReply={() => {
              const m = messages.find((x) => x.id === longPressMsg)
              if (m) setReplyingTo(m)
              setLongPressMsg(null)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-3 mb-1"
          >
            <div className="glass flex items-center gap-2 rounded-2xl p-2">
              <Reply size={16} className="text-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-primary">
                  Reply to {replyingTo.senderId === me?.id ? 'yourself' : replyingTo.senderName}
                </div>
                <div className="truncate text-xs text-muted-foreground">{replyingTo.text ?? '📎 attachment'}</div>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="mx-3 mb-2"
          >
            <div className="glass-strong rounded-3xl p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stickers</div>
              <div className="grid grid-cols-8 gap-1">
                {STICKER_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => sendSticker(chat.id, e)}
                    className="grid h-10 w-10 place-items-center rounded-2xl text-2xl transition active:scale-90 hover:bg-foreground/8"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAttachSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAttachSheet(false)}
            className="absolute inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 320 }}
              animate={{ y: 0 }}
              exit={{ y: 320 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong mx-3 mb-3 w-full max-w-md rounded-3xl p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {uploading ? 'Uploading…' : `Share to ${chat.name}`}
                </span>
                <button type="button" onClick={() => setShowAttachSheet(false)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"><X size={16} /></button>
              </div>

              {uploading && (
                <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-foreground/5 py-3 text-xs text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Uploading media…
                </div>
              )}

              <AnimatePresence>
                {uploadError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
                  >
                    {uploadError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-4 gap-3">
                <AttachButton
                  icon={ImageIcon}
                  label="Photo"
                  color="var(--brand-3)"
                  disabled={uploading}
                  onClick={() => photoInputRef.current?.click()}
                />
                <AttachButton
                  icon={Film}
                  label="Video"
                  color="var(--brand-2)"
                  disabled={uploading}
                  onClick={() => videoInputRef.current?.click()}
                />
                <AttachButton
                  icon={Gift}
                  label="GIF"
                  color="var(--brand-1)"
                  disabled={uploading}
                  onClick={() => onPickGif()}
                />
                <AttachButton
                  icon={FileText}
                  label="File"
                  color="var(--brand-4)"
                  disabled={uploading}
                  onClick={() => { /* TODO */ }}
                />
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onMediaPick(e, 'photo')}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => onMediaPick(e, 'video')}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1">
        {recording ? (
          <div className="glass-strong flex items-center gap-3 rounded-3xl p-2 pl-4">
            <span className="h-3 w-3 animate-pulse rounded-full bg-destructive" />
            <span className="text-sm font-medium tabular-nums">{formatDuration(recordSecs)}</span>
            <div className="flex flex-1 items-center gap-0.5 overflow-hidden">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="wave-bar"
                  style={{
                    height: `${20 + Math.sin(i + recordSecs * 4) * 20 + Math.random() * 12}%`,
                    minHeight: 4,
                  }}
                />
              ))}
            </div>
            <button type="button" onClick={() => stopRecording(false)} className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
            <button type="button" onClick={() => stopRecording(true)} className="grid h-11 w-11 place-items-center rounded-full text-primary-foreground active:scale-90" style={{ background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))' }}>
              <Send size={18} />
            </button>
          </div>
        ) : (
          <div className="glass-strong flex items-end gap-2 rounded-3xl p-2">
            <button type="button" onClick={() => setShowAttachSheet(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground active:scale-90">
              <Paperclip size={20} />
            </button>
            <div className="flex min-h-10 flex-1 items-center rounded-2xl bg-white/30 px-3 dark:bg-white/5">
              <textarea
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSend()
                  }
                }}
                rows={1}
                placeholder="Message"
                className="max-h-32 flex-1 resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const t = e.currentTarget
                  t.style.height = 'auto'
                  t.style.height = `${Math.min(t.scrollHeight, 128)}px`
                }}
              />
              <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={cn('grid h-8 w-8 place-items-center rounded-full active:scale-90', showEmojiPicker ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                <Smile size={20} />
              </button>
            </div>
            <AnimatePresence mode="wait">
              {draft.trim() ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 320 }}
                  type="button"
                  onClick={onSend}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-primary-foreground active:scale-90"
                  style={{
                    background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))',
                    boxShadow: '0 8px 20px -8px color-mix(in oklch, var(--brand-1) 70%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.25)',
                  }}
                >
                  <Send size={18} />
                </motion.button>
              ) : (
                <motion.button
                  key="mic"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 320 }}
                  type="button"
                  onPointerDown={startRecording}
                  onPointerUp={() => stopRecording(true)}
                  onPointerLeave={() => recording && stopRecording(false)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground active:scale-90"
                >
                  <Mic size={20} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBody({ message: m }: { message: ApiMessage }) {
  if (m.kind === 'sticker') {
    return <div className="text-7xl leading-none">{m.meta?.stickerEmoji ?? m.text ?? '🙂'}</div>
  }
  if (m.kind === 'voice') {
    return (
      <VoicePlayer
        durationSec={m.meta?.voiceDurationSec ?? 0}
        waveform={m.meta?.voiceWaveform ?? []}
      />
    )
  }
  if (m.kind === 'photo' || m.kind === 'gif' || (m.kind === 'video' && m.meta?.mediaUrl)) {
    const url = m.meta?.mediaUrl
    const aspect = m.meta?.mediaAspect ?? 1
    if (!url) return <div className="italic opacity-60">[media unavailable]</div>
    return (
      <div className="overflow-hidden rounded-xl">
        {m.kind === 'video' ? (
          <video
            src={url}
            controls
            playsInline
            className="block w-full rounded-xl"
            style={{ maxHeight: 320, aspectRatio: `${aspect}` }}
          />
        ) : (
          <img
            src={url}
            alt={m.text ?? 'media'}
            className="block w-full rounded-xl object-cover"
            style={{ maxHeight: 360, aspectRatio: `${aspect}` }}
          />
        )}
        {m.text && <div className="mt-1.5 whitespace-pre-wrap break-words">{m.text}</div>}
      </div>
    )
  }
  if (m.kind === 'file') {
    return (
      <div className="flex items-center gap-3 py-1 pr-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 text-white">
          <FileText size={20} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{m.meta?.fileName ?? 'file'}</div>
          <div className="text-xs opacity-70">{m.meta?.fileSize ?? ''}</div>
        </div>
        <Download size={16} className="opacity-70" />
      </div>
    )
  }
  return <div className="whitespace-pre-wrap break-words">{m.text}</div>
}

function AttachButton({
  icon: Icon,
  label,
  color,
  onClick,
  disabled,
}: {
  icon: typeof FileText
  label: string
  color: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 disabled:opacity-50"
    >
      <div
        className="grid h-14 w-14 place-items-center rounded-2xl text-white transition active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color} 60%, black))`,
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)',
        }}
      >
        <Icon size={22} />
      </div>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </button>
  )
}

function VoicePlayer({ durationSec, waveform }: { durationSec: number; waveform: number[] }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + 100 / (durationSec * 10)
        if (next >= 100) {
          setPlaying(false)
          return 0
        }
        return next
      })
    }, 100)
    return () => clearInterval(t)
  }, [playing, durationSec])

  const elapsed = (durationSec * progress) / 100
  return (
    <div className="flex items-center gap-2 py-1 pr-1">
      <button
        type="button"
        onClick={() => setPlaying(!playing)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/25"
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <div className="flex h-7 flex-1 items-center gap-[2px]">
        {waveform.map((h, i) => {
          const played = (i / waveform.length) * 100 < progress
          return (
            <span
              key={i}
              className="wave-bar"
              style={{
                height: `${Math.max(15, h * 100)}%`,
                minHeight: 3,
                opacity: played ? 1 : 0.5,
              }}
            />
          )
        })}
      </div>
      <span className="shrink-0 text-[10px] tabular-nums opacity-70">{formatDuration(playing ? Math.round(elapsed) : durationSec)}</span>
    </div>
  )
}

function ContextCard({ messageId, onClose, onReply }: { messageId: string; onClose: () => void; onReply: () => void }) {
  const messages = useActiveMessages()
  const m = messages.find((x) => x.id === messageId)
  if (!m) return null

  const items = [
    { icon: Reply, label: 'Reply', action: onReply },
    { icon: Copy, label: 'Copy', action: () => { navigator.clipboard?.writeText(m.text ?? ''); onClose() } },
    { icon: Forward, label: 'Forward', action: onClose },
    { icon: Pin, label: 'Pin', action: onClose },
    { icon: BellOff, label: 'Mute', action: onClose },
    { icon: Trash2, label: 'Delete', action: onClose, danger: true },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong mx-6 w-full max-w-xs rounded-3xl p-3"
      >
        <div className="mb-2 flex items-center justify-around">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full text-xl transition active:scale-90 hover:bg-foreground/10"
            >
              {e}
            </button>
          ))}
        </div>
        <div className="h-px bg-foreground/10" />
        <div className="mt-1 grid grid-cols-3 gap-1">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={it.action}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium transition active:scale-95 hover:bg-foreground/8',
                it.danger && 'text-destructive',
              )}
            >
              <it.icon size={18} />
              {it.label}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
