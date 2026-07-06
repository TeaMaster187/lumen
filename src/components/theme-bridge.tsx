'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/store'

/**
 * ThemeBridge — applies the active theme name + mode to <html>.
 * - Adds/removes .dark
 * - Adds .theme-aurora / .theme-frost / .theme-sunset / .theme-forest
 * - Resolves 'system' mode via prefers-color-scheme
 */
export function ThemeBridge() {
  const themeName = useApp((s) => s.themeName)
  const themeMode = useApp((s) => s.themeMode)

  useEffect(() => {
    const root = document.documentElement
    const allThemes = ['theme-aurora', 'theme-frost', 'theme-sunset', 'theme-forest']
    allThemes.forEach((t) => root.classList.remove(t))
    root.classList.add(`theme-${themeName}`)

    const apply = (mode: 'light' | 'dark') => {
      if (mode === 'dark') root.classList.add('dark')
      else root.classList.remove('dark')
    }

    if (themeMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches ? 'dark' : 'light')
      const onChange = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    apply(themeMode)
  }, [themeName, themeMode])

  return null
}
