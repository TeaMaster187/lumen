'use client'

/**
 * AuroraBackground — Layer 0
 * Three slowly drifting color blobs tinted by the active theme palette.
 * Sits behind every screen and is what gives the glass surfaces their color.
 *
 * Uses CSS animation (defined in globals.css) for the drift and a CSS-only
 * fade-in via @starting-style alternative — we rely on the body being mounted
 * before this renders (it's part of the root layout).
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="aurora-root pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base wash */}
      <div className="absolute inset-0 bg-background transition-colors duration-700" />

      {/* Color blobs */}
      <div
        className="aurora-blob-1 absolute -top-1/4 -left-1/4 h-[80vh] w-[80vh] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            'radial-gradient(circle at center, var(--brand-1), transparent 60%)',
          opacity: 0.55,
        }}
      />
      <div
        className="aurora-blob-2 absolute top-1/3 -right-1/4 h-[70vh] w-[70vh] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            'radial-gradient(circle at center, var(--brand-2), transparent 60%)',
          opacity: 0.45,
        }}
      />
      <div
        className="aurora-blob-3 absolute -bottom-1/4 left-1/4 h-[70vh] w-[70vh] rounded-full blur-3xl will-change-transform"
        style={{
          background:
            'radial-gradient(circle at center, var(--brand-3), transparent 60%)',
          opacity: 0.5,
        }}
      />

      {/* Subtle noise/grain to add tactility to glass */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E\")",
        }}
      />
    </div>
  )
}
