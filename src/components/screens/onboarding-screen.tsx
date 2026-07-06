'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, Phone, Shield, Sparkles, KeyRound, LogIn, Lock, Eye, EyeOff } from 'lucide-react'
import { useApp } from '@/lib/store'
import { GlassMotion } from '@/components/glass'

export function OnboardingScreen() {
  const step = useApp((s) => s.onboardingStep)
  const setThemeMode = useApp((s) => s.setThemeMode)
  const register = useApp((s) => s.register)
  const navigate = useApp((s) => s.navigate)

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [invite, setInvite] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setError(null)
    if (phone.trim().length < 6) return setError('Enter a valid phone number')
    if (name.trim().length < 2) return setError('Enter your name')
    if (invite.trim().length < 3) return setError('Invite code required')
    if (password.length < 4) return setError('Password must be at least 4 characters')
    setSubmitting(true)
    setThemeMode('dark')
    const res = await register(phone.trim(), name.trim(), invite.trim(), password)
    setSubmitting(false)
    if (!res.ok) setError(res.error ?? 'Registration failed')
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 240 }}
        className="mb-8 flex flex-col items-center text-center"
      >
        <div
          className="relative grid h-24 w-24 place-items-center rounded-3xl text-white shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2), var(--brand-3))',
            boxShadow: '0 20px 50px -16px color-mix(in oklch, var(--brand-1) 50%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.35)',
          }}
        >
          <Sparkles size={40} strokeWidth={2.2} />
          <div className="pointer-events-none absolute inset-0 rounded-3xl" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.4)' }} />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          Welcome to <span className="text-gradient">Lumen</span>
        </h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          A modern, liquid-glass messenger for Android. Invite-only beta.
        </p>
      </motion.div>

      <GlassMotion className="w-full rounded-3xl p-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <KeyRound size={16} /> Invite code required to register
        </div>

        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Invite code</label>
        <input
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
          placeholder="Enter your invite code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="mb-3 w-full rounded-2xl bg-white/40 px-4 py-3 text-lg font-semibold uppercase tracking-widest outline-none ring-1 ring-border transition focus:ring-2 focus:ring-ring dark:bg-white/5"
        />

        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone number</label>
        <div className="relative mb-3">
          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 415 555 0100"
            className="w-full rounded-2xl bg-white/40 py-3.5 pl-10 pr-4 text-base outline-none ring-1 ring-border transition focus:ring-2 focus:ring-ring dark:bg-white/5"
          />
        </div>

        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Display name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="mb-3 w-full rounded-2xl bg-white/40 px-4 py-3.5 text-base outline-none ring-1 ring-border transition focus:ring-2 focus:ring-ring dark:bg-white/5"
        />

        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
        <div className="relative mb-3">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="At least 4 characters"
            className="w-full rounded-2xl bg-white/40 py-3.5 pl-10 pr-10 text-base outline-none ring-1 ring-border transition focus:ring-2 focus:ring-ring dark:bg-white/5"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground shadow-lg transition active:scale-[0.98] disabled:opacity-50"
          style={{ boxShadow: '0 10px 24px -10px color-mix(in oklch, var(--brand-1) 60%, transparent)' }}
        >
          {submitting ? 'Creating account…' : <>Create account <ArrowRight size={18} /></>}
        </button>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={() => navigate('login')}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <LogIn size={12} /> Log in
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Shield size={11} /> End-to-end encrypted by default
        </div>
      </GlassMotion>
    </div>
  )
}
