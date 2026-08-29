/**
 * Home — ekran główny Iskierek.
 *
 * Layout:
 *   - Tytuł "Iskierki"
 *   - Siatka 4 kafelków: Litery (moduł 1), Czytanie (moduł 2), Cyferki (moduł 3), Czytanki (moduł 4)
 *   - Para "rodzicowa" (⚙ + 📊) w prawym dolnym rogu, mała i przytłumiona
 *
 * Onboarding głosowy (1× per klucz z lettersStore/readingStore seenIntros).
 * Home jest specjalny — bez KidNav (to root, nie ma "wstecz").
 */

import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { audioBus } from '@/shared/audio/AudioBus'
import { playIntroOnce } from '@/shared/audio/playIntroOnce'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { IskraHero } from '@/shared/ui/IskraHero'
import { colors, radii, tapTargets } from '@/app/theme'
import { getSyllableCue } from '@/shared/ui/syllableColors'
import { useLetters } from '@/modules/letters/store/lettersStore'
import { dayKey } from '@/modules/letters/data/dailyLetter'
import { useReading } from '@/modules/reading/store/readingStore'
import { useNumbers } from '@/modules/numbers/store/numbersStore'
import { useCzytanki } from '@/modules/czytanki/store/czytankiStore'

// Kolor NIE MOŻE być jedynym nośnikiem granicy sylaby (WCAG 1.4.1) — jak w
// czytankach, każdy indeks dostaje też własny styl podkreślenia.
function syllableStyle(index: number): { color: string; borderBottom: string } {
  const cue = getSyllableCue(index)
  return { color: cue.color, borderBottom: `3px ${cue.underline} ${cue.color}` }
}

export function Home() {
  const navigate = useNavigate()
  const lettersIntroSeen = useLetters((s) => s.hasSeenIntro('home-letters-intro'))
  const readingIntroSeen = useReading((s) => s.hasSeenIntro('home-reading-intro'))
  const numbersIntroSeen = useNumbers((s) => s.hasSeenIntro('home-numbers-intro'))
  const czytankiIntroSeen = useCzytanki((s) => s.hasSeenIntro('home-czytanki-intro'))
  const dailyIntroSeen = useLetters((s) => s.hasSeenIntro('home-daily-letter'))
  const dailyLetter = useLetters((s) => s.dailyLetter)
  const dailyDoneDayKey = useLetters((s) => s.dailyDoneDayKey)
  const markLettersIntro = useLetters((s) => s.markIntroSeen)
  const markReadingIntro = useReading((s) => s.markIntroSeen)
  const markNumbersIntro = useNumbers((s) => s.markIntroSeen)
  const markCzytankiIntro = useCzytanki((s) => s.markIntroSeen)

  // Onboarding głosowy — pierwsze odwiedzenie home wymaga jednego z intro
  useEffect(() => {
    // Flagę "widziane" palimy dopiero gdy intro faktycznie dograło (play()
    // → true). Inaczej pierwszy wjazd z zablokowanym autoplay / brakiem pliku
    // kasował onboarding na zawsze. `playIntroOnce` dokłada guard na czas
    // trwania play() — bez niego podwójny efekt StrictMode grał intro dwa razy.
    const playIntro = (key: string, seen: boolean, mark: (k: string) => void) => {
      void playIntroOnce(audioBus, key, () => seen, mark)
    }
    if (!lettersIntroSeen) {
      playIntro('home-letters-intro', lettersIntroSeen, markLettersIntro)
    } else if (!readingIntroSeen) {
      playIntro('home-reading-intro', readingIntroSeen, markReadingIntro)
    } else if (!numbersIntroSeen) {
      playIntro('home-numbers-intro', numbersIntroSeen, markNumbersIntro)
    } else if (!czytankiIntroSeen) {
      playIntro('home-czytanki-intro', czytankiIntroSeen, markCzytankiIntro)
    } else if (!dailyIntroSeen) {
      playIntro('home-daily-letter', dailyIntroSeen, markLettersIntro)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // „Każdy klik mówi co zrobił" — nav-tap potwierdza tap w kafelek. Przy okazji
  // to synchroniczne play() w geście odblokowuje audio na iOS Safari (wcześniej
  // robił to cichy klip z unlock(), ale po obejrzeniu intro kafelki milczały).
  // Intro modułu dokleja się za nav-tap w kolejce FIFO.
  const goToModule = useCallback(
    (path: string) => {
      audioBus.stop()
      void audioBus.play('nav-tap')
      navigate(path)
    },
    [navigate],
  )

  const handleLetters = useCallback(() => goToModule('/letters'), [goToModule])
  const handleReading = useCallback(() => goToModule('/reading'), [goToModule])
  const handleNumbers = useCallback(() => goToModule('/numbers'), [goToModule])
  const handleCzytanki = useCallback(() => goToModule('/czytanki'), [goToModule])

  const today = dayKey(Date.now())
  const dailyDone = dailyDoneDayKey === today
  const todaysLetter = dailyLetter?.dayKey === today ? dailyLetter.letter : null

  const handleDailyLetter = useCallback(() => {
    if (dailyDone) {
      // Zrobione dziś — zamiast wpuszczać w drugą mikrosesję mówimy dlaczego.
      audioBus.stop()
      void audioBus.play('letters-daily-done')
      return
    }
    goToModule('/letters/daily')
  }, [dailyDone, goToModule])

  const lettersTap = useTapHandler({ onTap: handleLetters })
  const dailyTap = useTapHandler({ onTap: handleDailyLetter })
  const readingTap = useTapHandler({ onTap: handleReading })
  const numbersTap = useTapHandler({ onTap: handleNumbers })
  const czytankiTap = useTapHandler({ onTap: handleCzytanki })
  const settingsTap = useTapHandler({ onTap: () => navigate('/settings') })
  const reportTap = useTapHandler({ onTap: () => navigate('/report') })

  return (
    <div
      data-testid="page-home"
      style={{
        // '100%' zamiast '100vh' — na iOS Safari 100vh liczy się do paska URL,
        // przez co Home dostawał kilkanaście pikseli scrolla.
        minHeight: '100%',
        position: 'relative',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // Siatka 2×2 kafelków + pasek „Literka dnia" muszą zmieścić się bez
        // scrolla na iPadzie w orientacji poziomej (820 px) — stąd ciasne
        // odstępy i kafelki 188 zamiast 196 (pasek zjadł zapas).
        gap: 20,
        background: colors.bg,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 4,
        }}
      >
        {/* 160, nie 180 — kafelki rosną z contentu (~239 px), więc zapas na
            pasek „Literka dnia" trzeba było wziąć z nagłówka. */}
        <IskraHero size={160} state="idle" intensity="fire" idleVariant="wave" />
        <h1
          style={{
            fontFamily: 'var(--font-handwritten)',
            fontSize: '3em',
            fontWeight: 700,
            margin: 0,
            color: colors.text,
            letterSpacing: 1,
          }}
        >
          Iskierki
        </h1>
      </div>

      <div
        data-testid="home-modules"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          width: '100%',
          maxWidth: 820,
          marginTop: 4,
        }}
      >
        {/* Kafelek: Litery (moduł 1) — wizualnie kolorowe ABC dla nieczytających */}
        <button
          type="button"
          data-testid="module-letters"
          aria-label="Litery"
          {...lettersTap}
          style={{
            minHeight: 188,
            padding: 16,
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
            <span style={syllableStyle(0)}>A</span>
            <span style={syllableStyle(1)}>B</span>
            <span style={syllableStyle(2)}>C</span>
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
            minHeight: 188,
            padding: 16,
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
            <span style={syllableStyle(0)}>MA</span>
            <span style={syllableStyle(1)}>MA</span>
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
            minHeight: 188,
            padding: 16,
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
            <span style={{ color: getSyllableCue(0).color }}>1</span>
            <span style={{ color: getSyllableCue(1).color }}>2</span>
            <span style={{ color: getSyllableCue(2).color }}>3</span>
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

        {/* Kafelek: Czytanki (moduł 4) — wizualnie zdanie z kolorowanymi sylabami */}
        <button
          type="button"
          data-testid="module-czytanki"
          aria-label="Czytanki"
          {...czytankiTap}
          style={{
            minHeight: 188,
            padding: 16,
            borderRadius: radii.kid * 1.5,
            background: '#f3e8ff',
            border: '4px solid #9333ea',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: '#6b21a8',
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div aria-hidden="true" style={{ fontSize: 96, lineHeight: 1 }}>📚</div>
          <div
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-block)',
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '0.06em',
              lineHeight: 1,
              display: 'flex',
              gap: 6,
            }}
          >
            <span>
              <span style={syllableStyle(0)}>TA</span>
              <span style={syllableStyle(1)}>TA</span>
            </span>
            <span style={syllableStyle(0)}>MA</span>
            <span>
              <span style={syllableStyle(0)}>KO</span>
              <span style={syllableStyle(1)}>TA</span>
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-handwritten)',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            Czytanki
          </span>
        </button>
      </div>

      {/* „Literka dnia" — wąski pasek pod siatką; jedna literka, króciutko.
          Nie kafelek: to codzienna mikrosesja, nie piąty moduł. */}
      <button
        type="button"
        data-testid="home-daily-letter"
        aria-label="Literka dnia"
        {...dailyTap}
        style={{
          width: '100%',
          maxWidth: 820,
          minHeight: 64,
          marginTop: 4,
          padding: '8px 16px',
          borderRadius: radii.kid,
          background: '#ecfdf5',
          border: '4px solid #10b981',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: '#065f46',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 32, lineHeight: 1 }}>
          {dailyDone ? '✔' : '✨'}
        </span>
        {todaysLetter !== null && (
          <span
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-handwritten)',
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {todaysLetter.toUpperCase()}
          </span>
        )}
      </button>

      {/* "Rodzicowa strefa" — prawy dolny róg, drobna i przytłumiona. */}
      <div
        data-testid="parent-zone"
        style={{
          position: 'fixed',
          right: tapTargets.minMargin,
          bottom: tapTargets.minMargin,
          // viewport-fit=cover → bez insetów guziki wchodzą pod home-indicator.
          paddingRight: 'env(safe-area-inset-right, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
