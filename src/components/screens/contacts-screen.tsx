'use client'

import { UserPlus, Users, Sparkles } from 'lucide-react'
import { useApp } from '@/lib/store'

export function ContactsScreen() {
  const me = useApp((s) => s.me)
  const navigate = useApp((s) => s.navigate)

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="glass rounded-3xl p-3">
          <div className="flex items-center justify-between">
            <h1 className="px-1 text-2xl font-semibold tracking-tight">Contacts</h1>
            <button
              type="button"
              onClick={() => navigate('new-chat')}
              className="glass-pill grid h-10 w-10 place-items-center rounded-full active:scale-90"
              aria-label="Add contact"
            >
              <UserPlus size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mt-3 flex-1 px-3 pb-32">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate('new-chat')}
            className="glass specular flex items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.99]"
          >
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' }}
            >
              <Users size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold">Start by phone</div>
              <div className="text-[11px] text-muted-foreground">DM any Lumen user</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate('new-chat')}
            className="glass specular flex items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.99]"
          >
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, var(--brand-3), var(--brand-1))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold">Invite friends</div>
              <div className="text-[11px] text-muted-foreground">Share invite code</div>
            </div>
          </button>
        </div>

        <div className="mt-12 flex flex-col items-center gap-2 px-4 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground/8">
            <Users size={22} className="text-muted-foreground" />
          </div>
          <div className="text-sm font-medium">No contacts yet</div>
          <div className="max-w-xs text-xs text-muted-foreground">
            Start a chat with someone by their phone number — they'll show up here once you've talked.
          </div>
          <button
            type="button"
            onClick={() => navigate('new-chat')}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Start a new chat →
          </button>
        </div>

        <div className="mt-8 flex items-center gap-2 px-2 text-xs text-muted-foreground">
          <span>Logged in as {me?.name ?? 'user'} ({me?.phone}).</span>
        </div>
      </div>
    </div>
  )
}
