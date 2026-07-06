'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Users, Megaphone, Bot, Sparkles, Phone, KeyRound, Search, UserCircle, AtSign } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Avatar } from '@/components/glass'
import { cn } from '@/lib/utils'

type Mode = 'phone' | 'username' | 'id'
type LookupUser = {
  id: string
  numericId: number
  name: string
  username: string | null
  avatarA: string
  avatarB: string
  avatarUrl: string | null
  avatarInitials: string
}

const MODE_META: Record<Mode, {
  label: string
  icon: typeof Phone
  placeholder: string
  minLength: number
  errorMsg: string
  helper: string
  maxLength?: number
  inputMode?: 'tel' | 'text' | 'numeric'
}> = {
  phone: {
    label: 'By phone',
    icon: Phone,
    placeholder: '+1 555 0100',
    minLength: 6,
    errorMsg: 'Enter a valid phone number',
    helper: 'Starts a chat with anyone who has a Lumen account.',
    inputMode: 'tel',
  },
  username: {
    label: 'By username',
    icon: AtSign,
    placeholder: 'alice',
    minLength: 2,
    errorMsg: 'Enter a username',
    helper: 'Usernames are case-insensitive. The @ prefix is optional.',
    inputMode: 'text',
  },
  id: {
    label: 'By user ID',
    icon: KeyRound,
    placeholder: '00001',
    minLength: 1,
    maxLength: 5,
    errorMsg: 'Enter a 1-5 digit user ID',
    helper: 'Ask the person for their 5-digit user ID — find it in their Profile screen.',
    inputMode: 'numeric',
  },
}

export function NewChatScreen() {
  const back = useApp((s) => s.back)
  const openChat = useApp((s) => s.openChat)
  const startDirectChat = useApp((s) => s.startDirectChat)
  const startDirectChatById = useApp((s) => s.startDirectChatById)
  const startDirectChatByNumericId = useApp((s) => s.startDirectChatByNumericId)
  const lookupUser = useApp((s) => s.lookupUser)

  const [mode, setMode] = useState<Mode>('username')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [found, setFound] = useState<LookupUser | null>(null)
  const [searching, setSearching] = useState(false)

  const switchMode = (m: Mode) => {
    setMode(m)
    setQuery('')
    setError(null)
    setFound(null)
  }

  const onSearch = async () => {
    setError(null)
    setFound(null)
    const meta = MODE_META[mode]
    let q = query.trim()
    // Strip leading @ for username mode
    if (mode === 'username') q = q.replace(/^@/, '').toLowerCase()
    // For id mode, strip non-digits
    if (mode === 'id') q = q.replace(/\D/g, '')
    if (q.length < meta.minLength) {
      setError(meta.errorMsg)
      return
    }
    setSearching(true)
    const res = await lookupUser(q, mode)
    setSearching(false)
    if (!res.ok || !res.user) {
      setError(res.error ?? 'User not found')
      return
    }
    setFound(res.user)
  }

  const onStart = async () => {
    setError(null)
    setSubmitting(true)
    let res: { ok: boolean; chatId?: string; error?: string }
    if (mode === 'phone') {
      res = await startDirectChat(query.trim())
    } else if (mode === 'id') {
      // For numeric ID, start chat directly (no need to look up first if we already found them)
      if (found) {
        res = await startDirectChatById(found.id)
      } else {
        const q = query.trim().replace(/\D/g, '')
        res = await startDirectChatByNumericId(q)
      }
    } else if (found) {
      // username
      res = await startDirectChatById(found.id)
    } else {
      setSubmitting(false)
      return onSearch()
    }
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'Could not start chat')
      return
    }
    if (res.chatId) await openChat(res.chatId)
  }

  const meta = MODE_META[mode]
  const ModeIcon = meta.icon
  const isLookup = mode !== 'phone' // username + id both need a search step

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="glass-strong flex items-center gap-2 rounded-3xl p-2">
          <button type="button" onClick={back} className="grid h-10 w-10 place-items-center rounded-full active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 text-base font-semibold">New chat</h1>
        </div>
      </header>

      <div className="mt-3 flex-1 px-3 pb-32">
        {/* Quick actions */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          {[
            { icon: Users, label: 'New group', color: 'var(--brand-1)' },
            { icon: Megaphone, label: 'New channel', color: 'var(--brand-2)' },
            { icon: Bot, label: 'New bot', color: 'var(--brand-3)' },
            { icon: Sparkles, label: 'Invite friends', color: 'var(--brand-4)' },
          ].map((a) => (
            <motion.button
              key={a.label}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={back}
              className="glass specular flex items-center gap-3 rounded-2xl p-3 text-left"
            >
              <div
                className="grid h-10 w-10 place-items-center rounded-xl text-white"
                style={{ background: `linear-gradient(135deg, ${a.color}, color-mix(in oklch, ${a.color} 60%, black))`, boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' }}
              >
                <a.icon size={18} />
              </div>
              <span className="text-sm font-medium">{a.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Mode toggle + search */}
        <div className="glass specular rounded-3xl p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <UserCircle size={12} /> Find someone to message
          </div>

          {/* 3-mode toggle */}
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-foreground/5 p-1">
            {(Object.keys(MODE_META) as Mode[]).map((m) => {
              const M = MODE_META[m]
              const MIcon = M.icon
              const active = mode === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={cn(
                    'flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition',
                    active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  <MIcon size={12} /> {M.label.replace('By ', '')}
                </button>
              )
            })}
          </div>

          {/* Search input */}
          <div className="relative">
            <ModeIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            {mode === 'username' && !query.startsWith('@') && query.length > 0 && (
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
            )}
            <input
              type={mode === 'id' ? 'text' : mode === 'phone' ? 'tel' : 'text'}
              inputMode={meta.inputMode ?? 'text'}
              value={query}
              onChange={(e) => {
                let v = e.target.value
                if (mode === 'id') v = v.replace(/\D/g, '').slice(0, 5)
                if (mode === 'username') v = v.toLowerCase().replace(/[^a-z0-9_@]/g, '')
                setQuery(v)
                setFound(null)
                setError(null)
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && isLookup) onSearch() }}
              placeholder={meta.placeholder}
              maxLength={meta.maxLength}
              autoCorrect="off"
              autoCapitalize={mode === 'phone' ? undefined : 'none'}
              spellCheck={false}
              className={cn(
                'w-full rounded-2xl bg-white/40 py-3 pl-10 pr-3 text-sm outline-none ring-1 ring-border transition focus:ring-2 focus:ring-ring dark:bg-white/5',
                mode === 'username' && !query.startsWith('@') && query.length > 0 && 'pl-12',
                mode === 'id' && 'font-mono tracking-widest',
              )}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lookup result */}
          <AnimatePresence>
            {found && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-3 flex items-center gap-3 rounded-2xl bg-foreground/5 p-3"
              >
                <Avatar
                  initials={found.avatarInitials}
                  color={[found.avatarA, found.avatarB]}
                  size={44}
                  avatarUrl={found.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{found.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {found.username ? `@${found.username}` : `ID: ${found.numericId.toString().padStart(5, '0')}`}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                  Found
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action button */}
          <button
            type="button"
            disabled={submitting || searching}
            onClick={found || !isLookup ? onStart : onSearch}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg transition active:scale-[0.98] disabled:opacity-50"
            style={{ boxShadow: '0 10px 24px -10px color-mix(in oklch, var(--brand-1) 60%, transparent)' }}
          >
            {searching ? (
              'Searching…'
            ) : found ? (
              submitting ? 'Starting chat…' : `Message ${found.name.split(' ')[0]}`
            ) : isLookup ? (
              <><Search size={16} /> Look up user</>
            ) : (
              submitting ? 'Starting…' : 'Start chat'
            )}
          </button>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            {meta.helper}
          </p>
        </div>
      </div>
    </div>
  )
}
