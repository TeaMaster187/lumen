'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Bell, Pin, Trash2, Shield, Image as ImageIcon, FileText, Link2, Star, Share2,
  KeyRound, Copy, Check, Camera, X, Check as CheckIcon, Loader2,
} from 'lucide-react'
import { useApp, useActiveChat } from '@/lib/store'
import { Avatar, Verified } from '@/components/glass'
import { cn } from '@/lib/utils'

export function ProfileScreen() {
  const chat = useActiveChat()
  const back = useApp((s) => s.back)
  const me = useApp((s) => s.me)
  const onlineUserIds = useApp((s) => s.onlineUserIds)
  const updateProfile = useApp((s) => s.updateProfile)
  const uploadAvatar = useApp((s) => s.uploadAvatar)

  const isSelf = !chat
  const name = chat?.name ?? me?.name ?? 'Lumen User'
  const initials = chat?.avatarInitials ?? 'LU'
  const color: [string, string] = chat?.avatarColor ?? ['oklch(0.62 0.24 285)', 'oklch(0.66 0.22 330)']
  const avatarUrl = isSelf ? (me?.avatarUrl ?? null) : null
  const subtitle = chat
    ? chat.kind === 'channel'
      ? 'channel'
      : chat.kind === 'group'
        ? 'group'
        : chat.kind === 'saved'
          ? 'your cloud scratchpad'
          : chat.otherUserId
            ? onlineUserIds.has(chat.otherUserId) ? 'online' : 'offline'
            : ''
    : me?.phone ?? ''

  // edit mode (self only)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(me?.name ?? '')
  const [editUsername, setEditUsername] = useState(me?.username ?? '')
  const [editBio, setEditBio] = useState(me?.bio ?? '')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingPfp, setUploadingPfp] = useState(false)

  const onPickAvatar = () => fileInputRef.current?.click()
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setEditError('Image too large (max 2MB)')
      return
    }
    setUploadingPfp(true)
    setEditError(null)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const res = await uploadAvatar(dataUrl)
      setUploadingPfp(false)
      if (!res.ok) setEditError(res.error ?? 'Upload failed')
    }
    reader.readAsDataURL(file)
    // reset input so the same file can be picked again
    e.target.value = ''
  }

  const onSave = async () => {
    setEditError(null)
    setSaving(true)
    const res = await updateProfile({
      name: editName,
      username: editUsername,
      bio: editBio,
    })
    setSaving(false)
    if (!res.ok) {
      setEditError(res.error ?? 'Save failed')
      return
    }
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditName(me?.name ?? '')
    setEditUsername(me?.username ?? '')
    setEditBio(me?.bio ?? '')
    setEditError(null)
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="glass-strong flex items-center gap-2 rounded-3xl p-2">
          <button type="button" onClick={back} className="grid h-10 w-10 place-items-center rounded-full active:scale-90" aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 text-sm font-semibold">Profile</div>
          {isSelf && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground active:scale-95"
            >
              Edit
            </button>
          )}
          {isSelf && editing && (
            <>
              <button type="button" onClick={cancelEdit} className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-3 px-3 pb-32 pt-3">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass specular relative flex flex-col items-center rounded-3xl p-6 text-center"
        >
          <div className="relative">
            <Avatar
              initials={initials}
              color={color}
              size={96}
              avatarUrl={avatarUrl}
              online={chat?.kind === 'private' && chat.otherUserId ? onlineUserIds.has(chat.otherUserId) : undefined}
            />
            {isSelf && (
              <button
                type="button"
                onClick={onPickAvatar}
                disabled={uploadingPfp}
                className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-90 disabled:opacity-50"
                style={{ boxShadow: '0 6px 14px -4px color-mix(in oklch, var(--brand-1) 70%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.25)' }}
                aria-label="Change profile picture"
              >
                {uploadingPfp ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
          </div>

          {!editing ? (
            <>
              <h2 className="mt-3 flex items-center gap-1.5 text-xl font-semibold">
                {name}
                {chat?.kind === 'channel' && <Verified size={16} />}
              </h2>
              <p className="text-sm text-primary">{subtitle}</p>
              {chat?.kind === 'private' && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
                  <Shield size={12} /> End-to-end encrypted
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 w-full space-y-3 text-left">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl bg-white/40 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                  <input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="alice"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-xl bg-white/40 px-3 py-2 pl-7 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5"
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">3-20 chars: a-z, 0-9, _</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="A short bio"
                  className="w-full resize-none rounded-xl bg-white/40 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5"
                />
              </div>
              <AnimatePresence>
                {editError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
                  >
                    {editError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Quick actions — only when not editing */}
        {!editing && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Bell, label: 'Mute', onClick: () => {} },
              { icon: Pin, label: 'Pin', onClick: () => {} },
              { icon: Share2, label: 'Share', onClick: () => {} },
              { icon: Star, label: 'Favorite', onClick: () => {} },
            ].map((a) => (
              <motion.button
                key={a.label}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={a.onClick}
                className="glass flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[11px] font-medium active:scale-95"
              >
                <a.icon size={18} className="text-primary" />
                {a.label}
              </motion.button>
            ))}
          </div>
        )}

        {/* Info section */}
        {!editing && (
          <>
            <div className="glass overflow-hidden rounded-3xl">
              <Row icon={FileText} label="Bio" value={isSelf ? (me?.bio || 'No bio yet — tap Edit to add one.') : 'Available for messages'} />
              <Divider />
              <Row icon={Link2} label="Username" value={isSelf ? (me?.username ? `@${me.username}` : 'not set') : `@${name.toLowerCase().replace(/\s+/g, '_')}`} />
              {isSelf && me && (
                <>
                  <Divider />
                  <CopyableRow icon={KeyRound} label="Your user ID" value={me.numericIdStr} />
                </>
              )}
              {!isSelf && (
                <>
                  <Divider />
                  <Row icon={ImageIcon} label="Media, links, docs" value="48 items" chevron />
                </>
              )}
            </div>

            {isSelf && me && (
              <p className="px-3 text-center text-[11px] text-muted-foreground">
                Share your user ID ({me.numericIdStr}) or username {me.username ? `(@${me.username})` : ''} so others can find you.
              </p>
            )}

            {!isSelf && chat && (
              <button
                type="button"
                onClick={back}
                className="glass flex w-full items-center gap-3 rounded-3xl p-3 text-left text-destructive active:scale-[0.99]"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10">
                  <Trash2 size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Leave chat</div>
                  <div className="text-xs opacity-70">Remove this conversation from your list</div>
                </div>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value, chevron }: { icon: typeof Bell; label: string; value: string; chevron?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground/8 text-foreground/80">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm">{value}</div>
      </div>
      {chevron && <span className="text-muted-foreground">›</span>}
    </div>
  )
}

function CopyableRow({ icon: Icon, label, value }: { icon: typeof Bell; label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard may be blocked
    }
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-foreground/5"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground/8 text-foreground/80">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-mono">{value}</div>
      </div>
      <span className="shrink-0 text-muted-foreground">
        {copied ? <CheckIcon size={16} className="text-emerald-500" /> : <Copy size={16} />}
      </span>
    </button>
  )
}

function Divider() {
  return <div className="mx-3 h-px bg-foreground/8" />
}
