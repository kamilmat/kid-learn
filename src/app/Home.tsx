/**
 * Home — ekran główny Iskierek (sekcje 5, 17 spec).
 *
 * Layout:
 *   - Tytuł "Iskierki"
 *   - Centralna duża IskraMascot (idle, flame)
 *   - Siatka kafelków modułów (MVP: "Litery" + placeholder "Wkrótce")
 *   - Para "rodzicowa" (⚙ + 📊) w prawym dolnym rogu, mała i przytłumiona
 *
 * Onboarding głosowy (5.2):
 *   Przy pierwszym wejściu lektor mówi `welcome` → po krótkiej pauzie
 *   `home-intro`. Klucz w localStorage: `iskierki-home-introduced-v1`.
 *
 * Home jest specjalny — bez KidNav (to root, nie ma "wstecz").
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { audioBus } from '@/shared/audio/AudioBus'
import { IskraMascot } from '@/shared/ui/IskraMascot'
import { colors, radii, tapTargets } from '@/app/theme'

const HOME_INTRO_KEY = 'iskierki-home-introduced-v1'
const INTRO_GAP_MS = 600

export function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false
    try {
      if (window.localStorage.getItem(HOME_INTRO_KEY) !== null) {
        return
      }
      window.localStorage.setItem(HOME_INTRO_KEY, '1')
    } catch {
      // localStorage niedostępne (privacy mode) — pomijamy intro, nie crashujemy.
      return
    }
    void (async () => {
      try {
        await audioBus.play('welcome')
        if (cancelled) return
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, INTRO_GAP_MS)
        })
        if (cancelled) return
        await audioBus.play('home-intro')
      } catch {
        // audio niedostępne — cicho ignoruj.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLettersClick = () => {
    navigate('/letters')
  }

  return (
    <div
      data-testid="page-home"
      style={{
        minHeight: '100vh',
        position: 'relative',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
        background: colors.bg,
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-handwritten)",
          fontSize: '3em',
          fontWeight: 700,
          margin: 0,
          marginTop: 24,
          color: colors.text,
          letterSpacing: 1,
        }}
      >
        Iskierki
      </h1>

      <div data-testid="home-mascot">
        <IskraMascot size={200} state="idle" intensity="flame" />
      </div>

      <div
        data-testid="home-modules"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24,
          width: '100%',
          maxWidth: 720,
          marginTop: 16,
        }}
      >
        <button
          type="button"
          data-testid="module-letters"
          onClick={handleLettersClick}
          style={{
            minHeight: 220,
            padding: 24,
            borderRadius: radii.kid * 1.5,
            background: '#ffffff',
            border: `3px solid ${colors.accentBlue}`,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            color: colors.text,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-handwritten)",
              fontSize: 88,
              lineHeight: 1,
              fontWeight: 700,
              color: colors.accentBlue,
            }}
          >
            Aa
          </span>
          <IskraMascot size={56} state="idle" intensity="spark" />
          <span style={{ fontSize: 24, fontWeight: 600 }}>Litery</span>
        </button>

        <div
          data-testid="module-placeholder"
          aria-disabled="true"
          style={{
            minHeight: 220,
            padding: 24,
            borderRadius: radii.kid * 1.5,
            background: '#fdf3e3',
            border: `3px dashed ${colors.accentOrange}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            opacity: 0.6,
            color: colors.text,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 64, lineHeight: 1 }}>
            ✨
          </span>
          <span style={{ fontSize: 20, fontWeight: 600 }}>Wkrótce więcej!</span>
        </div>
      </div>

      {/* "Rodzicowa strefa" — prawy dolny róg, drobna i przytłumiona. */}
      <div
        data-testid="parent-zone"
        style={{
          position: 'fixed',
          right: tapTargets.minMargin,
          bottom: tapTargets.minMargin,
          display: 'flex',
          gap: 8,
          opacity: 0.85,
        }}
      >
        <button
          type="button"
          aria-label="Ustawienia"
          data-testid="link-settings"
          onClick={() => navigate('/settings')}
          style={parentButtonStyle}
        >
          <span aria-hidden="true">⚙</span>
        </button>
        <button
          type="button"
          aria-label="Raport"
          data-testid="link-report"
          onClick={() => navigate('/report')}
          style={parentButtonStyle}
        >
          <span aria-hidden="true">📊</span>
        </button>
      </div>
    </div>
  )
}

const parentButtonStyle = {
  width: 56,
  height: 56,
  fontSize: 32,
  borderRadius: 14,
  border: `2px solid ${colors.accentBlue}55`,
  background: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: colors.text,
  padding: 0,
  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
} as const
