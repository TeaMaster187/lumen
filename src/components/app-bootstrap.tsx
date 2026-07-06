'use client'

import { useEffect, type ReactNode } from 'react'
import { useApp } from '@/lib/store'

/**
 * AppBootstrap — calls `init()` on mount to restore the session from cookies
 * and connect the WebSocket. Renders a splash while loading.
 */
export function AppBootstrap({ children }: { children: ReactNode }) {
  const init = useApp((s) => s.init)
  const screen = useApp((s) => s.screen)

  useEffect(() => {
    init()
  }, [init])

  if (screen === 'splash') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="grid h-20 w-20 animate-pulse place-items-center rounded-3xl text-white"
            style={{
              background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2), var(--brand-3))',
              boxShadow: '0 20px 50px -16px color-mix(in oklch, var(--brand-1) 50%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.35)',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M4 11 C4 7 7 5 11 5 L13 5 C17 5 20 7 20 11 C20 15 17 17 13 17 L10 17 L7 19 L7.5 16.5 C5.5 16 4 14 4 11 Z" fill="white" opacity="0.95" />
            </svg>
          </div>
          <div className="text-sm text-muted-foreground">Loading Lumen…</div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
