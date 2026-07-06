'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Sparkles } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'lumen-install-dismissed-at'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Already installed (standalone) → never show
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) {
      // Defer to avoid setState-in-effect lint — runs once on mount
      const id = window.setTimeout(() => setInstalled(true), 0)
      return () => window.clearTimeout(id)
    }
    // Respect previous dismissal for 7 days
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return
    } catch { /* localStorage blocked */ }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setVisible(false)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const onInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      setVisible(false)
    }
    setDeferred(null)
  }

  const onDismiss = () => {
    setVisible(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
  }

  if (installed) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed bottom-[max(env(safe-area-inset-bottom),1rem)] left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"
        >
          <div className="glass-strong relative flex items-center gap-3 overflow-hidden rounded-3xl p-3 pr-12">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white"
              style={{
                background: 'linear-gradient(135deg, var(--brand-1), var(--brand-3))',
                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)',
              }}
            >
              <Download size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                Install Lumen
                <Sparkles size={12} className="text-primary" />
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                Add to your home screen for the full app experience
              </div>
            </div>
            <button
              type="button"
              onClick={onInstall}
              className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground active:scale-95"
              style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' }}
            >
              Install
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
