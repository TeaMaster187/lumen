'use client'

import { motion } from 'framer-motion'
import { MessageCircle, Settings, Sparkles, Dumbbell, Apple } from 'lucide-react'
import { useApp, type Screen } from '@/lib/store'
import { cn } from '@/lib/utils'

const tabs: { id: Screen; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chats', label: 'Chats', icon: MessageCircle },
  { id: 'daily', label: 'Daily', icon: Apple },
  { id: 'aura', label: 'Aura', icon: Sparkles },
  { id: 'gym', label: 'Gym', icon: Dumbbell },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const screen = useApp((s) => s.screen)
  const navigate = useApp((s) => s.navigate)
  const chats = useApp((s) => s.chats)
  const me = useApp((s) => s.me)

  const totalUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0)
  const missedCalls = 0

  const activeTab: Screen =
    screen === 'chat' || screen === 'new-chat' || screen === 'login'
      ? 'chats'
      : screen === 'aura-profile' || screen === 'streaks'
        ? 'aura'
        : screen === 'gym-plan'
          ? 'gym'
          : screen === 'online-users' || screen === 'user-profile'
            ? 'chats'
            : (screen as Screen)

  // Hide on auth screens, chat (immersive — composer needs the space), and when not authenticated
  if (screen === 'onboarding' || screen === 'login' || screen === 'chat' || screen === 'aura-profile' || screen === 'gym-plan' || screen === 'online-users' || screen === 'user-profile' || !me) return null

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2"
    >
      <div className="glass-strong flex w-full max-w-md items-stretch justify-around gap-1 rounded-3xl p-1.5">
        {tabs.map((t) => {
          const active = activeTab === t.id
          const badge = t.id === 'chats' ? totalUnread : t.id === 'calls' ? missedCalls : 0
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(t.id)}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-[11px] font-medium transition-all duration-300',
                active ? 'text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))',
                    boxShadow: '0 8px 20px -8px color-mix(in oklch, var(--brand-1) 70%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.25)',
                  }}
                  transition={{ type: 'spring', damping: 28, stiffness: 360 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <span className="relative">
                  <t.icon size={22} strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 grid min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span>{t.label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </motion.nav>
  )
}
