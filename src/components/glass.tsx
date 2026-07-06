'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  forwardRef,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'

/* Specular highlight that follows pointer momentum on glass surfaces */
export function useSpecular() {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    el.style.setProperty('--mx', `${x}%`)
    el.style.setProperty('--my', `${y}%`)
  }
  return { ref, onMouseMove: onMove }
}

type GlassProps = HTMLAttributes<HTMLDivElement> & {
  level?: 'default' | 'strong' | 'hud'
  specular?: boolean
  as?: 'div' | 'button'
}

export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { level = 'default', specular = false, className, children, ...rest },
  _ref,
) {
  const spec = useSpecular()
  const cls = cn(
    level === 'default' && 'glass',
    level === 'strong' && 'glass-strong',
    level === 'hud' && 'glass-hud',
    specular && 'specular',
    className,
  )
  return (
    <div className={cls} {...spec} {...rest}>
      {children}
    </div>
  )
})

/* Animated glass surface using framer-motion — for sheets, modals, HUD */
export function GlassMotion({
  children,
  className,
  level = 'default',
  initial,
  animate,
  exit,
  transition,
  ...rest
}: HTMLMotionProps<'div'> & { level?: 'default' | 'strong' | 'hud' }) {
  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition ?? { type: 'spring', damping: 28, stiffness: 320 }}
      className={cn(
        level === 'default' && 'glass',
        level === 'strong' && 'glass-strong',
        level === 'hud' && 'glass-hud',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/* Avatar with gradient background — used everywhere */
export function Avatar({
  initials,
  color,
  size = 48,
  online,
  ring,
  ringSeen,
  className,
  children,
  avatarUrl,
}: {
  initials?: string
  color: [string, string]
  size?: number
  online?: boolean
  ring?: boolean
  ringSeen?: boolean
  className?: string
  children?: ReactNode
  avatarUrl?: string | null
}) {
  return (
    <div
      className={cn('relative shrink-0', ring && !ringSeen && 'story-ring', ring && ringSeen && 'story-ring-seen p-[2.5px]', className)}
      style={ring && !ringSeen ? { padding: 0 } : undefined}
    >
      <div
        className={cn('relative grid place-items-center overflow-hidden rounded-full', ring && !ringSeen && 'm-[2.5px]')}
        style={{
          width: size,
          height: size,
          background: avatarUrl ? undefined : `linear-gradient(135deg, ${color[0]}, ${color[1]})`,
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)',
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={initials ?? 'avatar'} className="h-full w-full object-cover" />
        ) : (
          children ?? (
            <span className="font-semibold text-white" style={{ fontSize: size * 0.4 }}>
              {initials}
            </span>
          )
        )}
      </div>
      {online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full border-2 border-background bg-emerald-400"
          style={{ width: size * 0.22, height: size * 0.22 }}
        />
      )}
    </div>
  )
}

/* Verified badge */
export function Verified({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="inline-block align-middle" aria-label="Verified">
      <path
        fill="var(--brand-2)"
        d="M12 1.5l2.5 2.1 3.2-.3 1.1 3 2.8 1.6-.9 3.1 1.5 2.8-2.3 2.2.3 3.2-3 1.1-1.6 2.8-3.1-.9-2.8 1.5-2.2-2.3-3.2.3-1.1-3L1.7 16l.9-3.1L1.1 10.1l2.3-2.2L3.1 4.7l3-1.1 1.6-2.8 3.1.9L12 1.5z"
      />
      <path
        fill="white"
        d="M10.5 14.6l-2-2-1.4 1.4 3.4 3.4 6-6-1.4-1.4z"
      />
    </svg>
  )
}

/* Glass icon button — used in headers, toolbars */
export function IconButton({
  children,
  className,
  active,
  ...rest
}: HTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'glass-pill grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition-all duration-200 active:scale-90',
        active && 'text-foreground',
        className,
      )}
      {...(rest as object)}
    >
      {children}
    </button>
  )
}

/* Format helpers */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  const diff = (now.getTime() - ts) / (1000 * 60 * 60 * 24)
  if (diff < 7) {
    return d.toLocaleDateString([], { weekday: 'short' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function formatChatListTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  const diff = (now.getTime() - ts) / (1000 * 60 * 60 * 24)
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'numeric', day: 'numeric' })
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}
