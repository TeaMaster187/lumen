'use client'

import { useEffect } from 'react'

/**
 * Registers /sw.js so the installable PWA can boot offline after first visit.
 * Only runs in production + browsers that support service workers.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    // Skip in dev — Turbopack HMR + SW caching fight each other and cause stale chunks
    if (process.env.NODE_ENV !== 'production') return

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('[sw] registration failed', err)
      })
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
