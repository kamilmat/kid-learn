/**
 * Home — ekran główny Iskierek.
 *
 * Layout:
 *   - Tytuł "Iskierki"
 *   - Siatka 2 kafelków: Litery (moduł 1) + Czytanie (moduł 2)
 *   - Para "rodzicowa" (⚙ + 📊) w prawym dolnym rogu, mała i przytłumiona
 *
 * Onboarding głosowy (1× per klucz z lettersStore/readingStore seenIntros).
 * Home jest specjalny — bez KidNav (to root, nie ma "wstecz").
 */

import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { audioBus } from '@/shared/audio/AudioBus'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii, tapTargets } from '@/app/theme'
import { useLetters } from '@/modules/letters/store/lettersStore'
import { useReading } from '@/modules/reading/store/readingStore'
import { useNumbers } from '@/modules/numbers/store/numbersStore'

export function Home() {
  const navigate = useNavigate()
  const lettersIntroSeen = useLetters((s) => s.hasSeenIntro('home-letters-intro'))
  const readingIntroSeen = useReading((s) => s.hasSeenIntro('home-reading-intro'))
  const numbersIntroSeen = useNumbers((s) => s.hasSeenIntro('home-numbers-intro'))
  const markLettersIntro = useLetters((s) => s.markIntroSeen)
  const markReadingIntro = useReading((s) => s.markIntroSeen)
  const markNumbersIntro = useNumbers((s) => s.markIntroSeen)

  // Onboarding głosowy — pierwsze odwiedzenie home wymaga jednego z intro
  useEffect(() => {
    if (!lettersIntroSeen) {
      void audioBus.play('home-letters-intro')
      markLettersIntro('home-letters-intro')
    } else if (!readingIntroSeen) {
      void audioBus.play('home-reading-intro')
      markReadingIntro('home-reading-intro')
    } else if (!numbersIntroSeen) {
      void audioBus.play('home-numbers-intro')
      markNumbersIntro('home-numbers-intro')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLetters = useCallback(() => {
    // Bez nav-tap "klik" — moduł sam zagra swoje intro/audio.
    audioBus.stop()
    navigate('/letters')
  }, [navigate])

  const handleReading = useCallback(() => {
    audioBus.stop()
    navigate('/reading')
  }, [navigate])

  const handleNumbers = useCallback(() => {
    audioBus.stop()
    navigate('/numbers')
  }, [navigate])

  const lettersTap = useTapHandler({ onTap: handleLetters })
  const readingTap = useTapHandler({ onTap: handleReading })
  const numbersTap = useTapHandler({ onTap: handleNumbers })
  const settingsTap = useTapHandler({ onTap: () => navigate('/settings') })
  const reportTap = useTapHandler({ onTap: () => navigate('/report') })

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
          fontFamily: 'var(--font-handwritten)',
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

      <div
        data-testid="home-modules"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24,
          width: '100%',
          maxWidth: 760,
          marginTop: 16,
        }}
      >
        {/* Kafelek: Litery (moduł 1) — wizualnie kolorowe ABC dla nieczytających */}
        <button
          type="button"
          data-testid="module-letters"
          aria-label="Litery"
          {...lettersTap}
          style={{
            minHeight: 280,
            padding: 24,
            borderRadius: radii.kid * 1.5,
            background: '#fef3c7',
            border: '4px solid #f59e0b',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: '#92400e',
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-block)',
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: '0.08em',
              lineHeight: 1,
              display: 'flex',
              gap: 4,
            }}
          >
            <span style={{ color: '#1d4ed8' }}>A</span>
            <span style={{ color: '#dc2626' }}>B</span>
            <span style={{ color: '#16a34a' }}>C</span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-handwritten)',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            Litery
          </span>
        </button>

        {/* Kafelek: Czytanie (moduł 2) — wizualnie książka + przykład sylab */}
        <button
          type="button"
          data-testid="module-reading"
          aria-label="Czytanie"
          {...readingTap}
          style={{
            minHeight: 280,
            padding: 24,
            borderRadius: radii.kid * 1.5,
            background: '#dbeafe',
            border: '4px solid #3b82f6',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: '#1e40af',
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div aria-hidden="true" style={{ fontSize: 96, lineHeight: 1 }}>📖</div>
          <div
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-block)',
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '0.06em',
              lineHeight: 1,
            }}
          >
            <span style={{ color: '#1d4ed8' }}>MA</span>
            <span style={{ color: '#dc2626' }}>MA</span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-handwritten)',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            Czytanie
          </span>
        </button>

        {/* Kafelek: Cyferki (moduł 3) — wizualnie kolorowe 1 2 3 */}
        <button
          type="button"
          data-testid="module-numbers"
          aria-label="Cyferki"
          {...numbersTap}
          style={{
            minHeight: 280,
            padding: 24,
            borderRadius: radii.kid * 1.5,
            background: '#dcfce7',
            border: '4px solid #16a34a',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: '#166534',
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-block)',
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: '0.08em',
              lineHeight: 1,
              display: 'flex',
              gap: 4,
            }}
          >
            <span style={{ color: '#1d4ed8' }}>1</span>
            <span style={{ color: '#dc2626' }}>2</span>
            <span style={{ color: '#16a34a' }}>3</span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-handwritten)',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            Cyferki
          </span>
        </button>
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
          {...settingsTap}
          style={parentButtonStyle}
        >
          <span aria-hidden="true">⚙</span>
        </button>
        <button
          type="button"
          aria-label="Raport"
          data-testid="link-report"
          {...reportTap}
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
  touchAction: 'manipulation',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
} as const
