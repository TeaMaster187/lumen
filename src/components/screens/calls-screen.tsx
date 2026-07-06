'use client'

import { Phone, Video, Info } from 'lucide-react'
import { useApp } from '@/lib/store'

export function CallsScreen() {
  const me = useApp((s) => s.me)
  const navigate = useApp((s) => s.navigate)

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="glass rounded-3xl px-4 py-3">
          <h1 className="text-2xl font-semibold tracking-tight">Calls</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Voice &amp; video calls</p>
        </div>
      </header>

      <div className="mt-3 flex-1 px-3 pb-32">
        <div className="glass specular mb-3 flex items-center gap-3 rounded-3xl p-4">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' }}
          >
            <Phone size={22} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Start a new call</div>
            <div className="text-xs text-muted-foreground">Voice or video</div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-2 px-4 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground/8">
            <Video size={22} className="text-muted-foreground" />
          </div>
          <div className="text-sm font-medium">No recent calls</div>
          <div className="max-w-xs text-xs text-muted-foreground">
            Calls you make or receive will appear here. Open a chat and tap the phone icon to call.
          </div>
          <button
            type="button"
            onClick={() => navigate('chats')}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Go to chats →
          </button>
        </div>

        <div className="mt-8 flex items-center gap-2 px-2 text-xs text-muted-foreground">
          <Info size={12} />
          <span>Logged in as {me?.name ?? 'user'} ({me?.phone}).</span>
        </div>
      </div>
    </div>
  )
}
