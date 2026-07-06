'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Camera, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Avatar } from '@/components/glass'

type AuraCard = {
  id: string
  photoUrl: string
  caption: string | null
  createdAt: string
  poster: {
    id: string
    name: string
    username: string | null
    avatarA: string
    avatarB: string
    avatarUrl: string | null
  }
}

export function AuraProfileScreen() {
  const back = useApp((s) => s.back)
  const activeAuraUserId = useApp((s) => s.activeAuraUserId)
  const me = useApp((s) => s.me)
  const addAuraCard = useApp((s) => s.addAuraCard)
  const [profile, setProfile] = useState<{
    user: { id: string; name: string; username: string | null; bio: string | null; avatarA: string; avatarB: string; avatarUrl: string | null; avatarInitials: string }
    cards: AuraCard[]
    canPost: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userId = activeAuraUserId ?? me?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetch(`/api/aura/profile?userId=${userId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.user) setProfile(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId) return
    if (file.size > 4.5 * 1024 * 1024) { alert('Image too large (max 4.5MB)'); return }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const res = await addAuraCard(userId, dataUrl, caption.trim() || undefined)
      setUploading(false)
      if (res.ok) {
        setCaption('')
        fetch(`/api/aura/profile?userId=${userId}`, { credentials: 'include' })
          .then((r) => r.json())
          .then((data) => { if (data.user) setProfile(data) })
      } else { alert(res.error ?? 'Upload failed') }
    }
    reader.readAsDataURL(file)
  }

  if (loading || !profile) return <div className="grid min-h-dvh place-items-center"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
  const { user, cards, canPost } = profile
  const isSelf = user.id === me?.id

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <header className="sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="glass-strong flex items-center gap-2 rounded-3xl p-2">
          <button type="button" onClick={back} className="grid h-10 w-10 place-items-center rounded-full active:scale-90"><ArrowLeft size={20} /></button>
          <div className="flex-1 text-sm font-semibold">{isSelf ? 'Your Aura' : `${user.name}'s Aura`}</div>
          {canPost && (
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground active:scale-95 disabled:opacity-50">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              {uploading ? 'Uploading…' : 'Add photo'}
            </button>
          )}
        </div>
      </header>
      <div className="flex-1 px-3 pb-32 pt-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass specular mb-4 flex flex-col items-center rounded-3xl p-6 text-center">
          <Avatar initials={user.avatarInitials} color={[user.avatarA, user.avatarB]} size={88} avatarUrl={user.avatarUrl} />
          <h2 className="mt-3 text-xl font-semibold">{user.name}</h2>
          {user.username && <p className="text-sm text-primary">@{user.username}</p>}
          {user.bio && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{user.bio}</p>}
          <div className="mt-2 rounded-full bg-foreground/8 px-3 py-1 text-[11px] font-medium text-muted-foreground">{cards.length} {cards.length === 1 ? 'photo' : 'photos'} in aura</div>
        </motion.div>
        {canPost && (
          <div className="mb-3">
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption to your next photo…" maxLength={200} className="w-full rounded-2xl bg-white/40 px-4 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" />
          </div>
        )}
        {cards.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 px-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-foreground/8"><Camera size={24} className="text-muted-foreground" /></div>
            <div className="text-sm font-medium">No photos yet</div>
            <div className="max-w-xs text-xs text-muted-foreground">{canPost ? (isSelf ? 'Add your first photo to start your Aura.' : `Be the first to add a photo to ${user.name}'s Aura!`) : 'Connect with this person to add photos.'}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card, i) => (
              <motion.div key={card.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass specular overflow-hidden rounded-3xl">
                <div className="relative"><img src={card.photoUrl} alt={card.caption ?? 'aura photo'} className="w-full" /></div>
                {(card.caption || !isSelf) && (
                  <div className="flex items-center gap-2 p-3">
                    {!isSelf && <Avatar initials={card.poster.name.slice(0, 2).toUpperCase()} color={[card.poster.avatarA, card.poster.avatarB]} size={28} avatarUrl={card.poster.avatarUrl} />}
                    <div className="min-w-0 flex-1">
                      {card.caption && <div className="text-sm">{card.caption}</div>}
                      {!isSelf && <div className="text-[11px] text-muted-foreground">by {card.poster.name}</div>}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
