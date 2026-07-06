'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone, Lock, LogIn, Shield } from 'lucide-react'
import { useApp } from '@/lib/store'
import { GlassMotion } from '@/components/glass'

export function LoginScreen() {
  const back = useApp((s) => s.back)
  const login = useApp((s) => s.login)

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setError(null)
    if (phone.trim().length < 6) return setError('Enter a valid phone number')
    if (!password) return setError('Enter your password')
    setSubmitting(true)
    const res = await login(phone.trim(), password)
    setSubmitting(false)
    if (!res.ok) setError(res.error ?? 'Login failed')
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10">
      <header className="absolute left-0 top-0 px-3 pt-[max(env(safe-area-inset-top),0.5rem)] w-full">
        <div className="mx-auto max-w-md flex">
          <button
            type="button"
            onClick={back}
            className="glass-pill grid h-10 w-10 place-items-center rounded-full active:scale-90"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 240 }}
        className="mb-8 flex flex-col items-center text-center"
      >
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          Welcome back to <span className="text-gradient">Lumen</span>
        </h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Log in with your phone number and password.
        </p>
      </motion.div>

      <GlassMotion className="w-full rounded-3xl p-6">
        {/* Phone */}
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Phone size={16} /> Phone number
        </div>
        <div className="relative mb-3">
          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 0100"
            className="w-full rounded-2xl bg-white/40 py-3.5 pl-10 pr-4 text-base outline-none ring-1 ring-border transition focus:ring-2 focus:ring-ring dark:bg-white/5"
          />
        </div>

        {/* Password */}
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Lock size={16} /> Password
        </div>
        <div className="relative mb-3">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="••••••••"
            className="w-full rounded-2xl bg-white/40 py-3.5 pl-10 pr-4 text-base outline-none ring-1 ring-border transition focus:ring-2 focus:ring-ring dark:bg-white/5"
          />
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
          {submitting ? 'Logging in…' : <><LogIn size={18} /> Log in</>}
        </button>

        <div className="mt-4 rounded-xl bg-foreground/5 px-3 py-2 text-[11px] text-muted-foreground">
          <strong>Test accounts:</strong><br />
          Alice — <code className="font-mono">+1 555 0100</code> / pass: <code className="font-mono">password123</code><br />
          Bob — <code className="font-mono">+1 555 0200</code> / pass: <code className="font-mono">password123</code>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Shield size={11} /> Passwords are hashed with bcrypt
        </div>
      </GlassMotion>
    </div>
  )
}
