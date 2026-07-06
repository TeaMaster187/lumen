'use client'

import { motion } from 'framer-motion'
import {
  Moon, Sun, Palette, Bell, Eye, Fingerprint, Trash2, ChevronRight, Info,
  Shield, HelpCircle, Sparkles, Vibrate, Layers, Globe, LogOut,
} from 'lucide-react'
import { useApp, type ThemeName, type ThemeMode } from '@/lib/store'
import { Avatar } from '@/components/glass'
import { cn } from '@/lib/utils'

const THEMES: { id: ThemeName; name: string; colors: [string, string, string] }[] = [
  { id: 'aurora', name: 'Aurora', colors: ['oklch(0.62 0.24 285)', 'oklch(0.66 0.22 330)', 'oklch(0.72 0.15 195)'] },
  { id: 'frost', name: 'Frost', colors: ['oklch(0.62 0.18 220)', 'oklch(0.7 0.16 200)', 'oklch(0.78 0.1 190)'] },
  { id: 'sunset', name: 'Sunset', colors: ['oklch(0.65 0.25 25)', 'oklch(0.7 0.22 350)', 'oklch(0.75 0.18 60)'] },
  { id: 'forest', name: 'Forest', colors: ['oklch(0.6 0.18 155)', 'oklch(0.68 0.2 175)', 'oklch(0.72 0.16 110)'] },
]

export function SettingsScreen() {
  const me = useApp((s) => s.me)
  const logout = useApp((s) => s.logout)
  const navigate = useApp((s) => s.navigate)
  const displayName = me?.name ?? 'Lumen User'
  const phoneNumber = me?.phone ?? ''

  const themeName = useApp((s) => s.themeName)
  const themeMode = useApp((s) => s.themeMode)
  const setThemeName = useApp((s) => s.setThemeName)
  const setThemeMode = useApp((s) => s.setThemeMode)
  const readReceipts = useApp((s) => s.readReceipts)
  const notifications = useApp((s) => s.notifications)
  const haptics = useApp((s) => s.haptics)
  const setReadReceipts = useApp((s) => s.setReadReceipts)
  const setNotifications = useApp((s) => s.setNotifications)
  const setHaptics = useApp((s) => s.setHaptics)

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="glass rounded-3xl px-4 py-3">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
      </header>

      <div className="mt-3 flex-1 space-y-3 px-3 pb-32">
        {/* Profile card */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={() => navigate('profile')}
          className="glass specular flex w-full items-center gap-3 rounded-3xl p-3 text-left active:scale-[0.99]"
        >
          <Avatar
            initials={displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'LU'}
            color={['oklch(0.62 0.24 285)', 'oklch(0.66 0.22 330)']}
            size={56}
            online
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{displayName}</div>
            <div className="truncate text-xs text-muted-foreground">
              {phoneNumber}{me?.username ? ` · @${me.username}` : ''}
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </motion.button>

        {/* Appearance — themes */}
        <Section title="Appearance" icon={Palette}>
          {/* Theme variants */}
          <div className="px-3 pb-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Color theme</div>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => {
                const active = themeName === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeName(t.id)}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 rounded-2xl p-2 transition',
                      active ? 'ring-2 ring-primary' : 'ring-1 ring-border',
                    )}
                  >
                    <div
                      className="h-12 w-full rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]} 50%, ${t.colors[2]})`,
                        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)',
                      }}
                    />
                    <span className="text-[11px] font-medium">{t.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <Divider />

          {/* Mode */}
          <div className="px-3 py-2">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Brightness</div>
            <div className="flex gap-2">
              {([
                { id: 'light' as ThemeMode, icon: Sun, label: 'Light' },
                { id: 'dark' as ThemeMode, icon: Moon, label: 'Dark' },
                { id: 'system' as ThemeMode, icon: Layers, label: 'System' },
              ]).map((m) => {
                const active = themeMode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setThemeMode(m.id)}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 text-xs font-medium transition',
                      active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                    style={active ? { background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' } : undefined}
                  >
                    <m.icon size={18} />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </Section>

        {/* Privacy */}
        <Section title="Privacy & Security" icon={Shield}>
          <ToggleRow
            icon={Eye}
            label="Read receipts"
            sub="Show others when you've read their messages"
            value={readReceipts}
            onChange={setReadReceipts}
          />
          <Divider />
          <ToggleRow
            icon={Fingerprint}
            label="Biometric lock"
            sub="Require fingerprint or face to unlock"
            value={true}
            onChange={() => {}}
          />
          <Divider />
          <NavRow icon={Trash2} label="Auto-delete messages" sub="Off" danger={false} onClick={() => {}} />
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <ToggleRow icon={Bell} label="Push notifications" sub="Messages, calls, mentions" value={notifications} onChange={setNotifications} />
          <Divider />
          <ToggleRow icon={Vibrate} label="Haptics" sub="Tactile feedback on key actions" value={haptics} onChange={setHaptics} />
        </Section>

        {/* About */}
        <Section title="About" icon={Info}>
          <NavRow icon={Sparkles} label="What's new in Lumen 2.4" sub="Liquid glass, haptics, more" onClick={() => {}} />
          <Divider />
          <NavRow icon={Globe} label="Language" sub="English (US)" onClick={() => {}} />
          <Divider />
          <NavRow icon={HelpCircle} label="Help & support" sub="FAQ, contact us" onClick={() => {}} />
        </Section>

        {/* Account */}
        <Section title="Account" icon={Shield}>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-3 text-left text-destructive active:bg-foreground/5"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10">
              <LogOut size={16} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Log out</div>
              <div className="text-xs opacity-70">Switch accounts or register a new one</div>
            </div>
          </button>
        </Section>

        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
          Lumen for Android · v2.5.0 (build 2507)
          <br />Real-time messaging · liquid glass ✨
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Bell; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
    >
      <div className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon size={12} /> {title}
      </div>
      <div className="glass overflow-hidden rounded-3xl">{children}</div>
    </motion.div>
  )
}

function Divider() {
  return <div className="mx-3 h-px bg-foreground/8" />
}

function ToggleRow({ icon: Icon, label, sub, value, onChange }: { icon: typeof Bell; label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground/8 text-foreground/80">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition',
          value ? 'bg-primary' : 'bg-foreground/15',
        )}
        style={value ? { background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' } : undefined}
      >
        <motion.span
          layout
          transition={{ type: 'spring', damping: 26, stiffness: 380 }}
          className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md', value ? 'right-0.5' : 'left-0.5')}
        />
      </button>
    </div>
  )
}

function NavRow({ icon: Icon, label, sub, danger, onClick }: { icon: typeof Bell; label: string; sub: string; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-foreground/5">
      <div className={cn('grid h-9 w-9 place-items-center rounded-xl bg-foreground/8', danger ? 'text-destructive' : 'text-foreground/80')}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-medium', danger && 'text-destructive')}>{label}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      <ChevronRight size={16} className="text-muted-foreground" />
    </button>
  )
}
