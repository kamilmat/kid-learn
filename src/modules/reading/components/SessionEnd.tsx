// SessionEnd — ekran końca sesji czytania.
// Phase 6.6.3: podsumowanie wyników + iskierki + nowe słowa w albumie.
// Phase 9: ceremonia odblokowywania albumu co 10 kart.

import { useEffect, useState } from 'react'
import { colors, radii, tapTargets } from '@/app/theme'
import { Button } from '@/shared/ui/Button'
import { IskraHero } from '@/shared/ui/IskraHero'
import { useReading } from '../store/readingStore'
import { ALL_WORDS } from '../data/words'
import { SyllableText } from './SyllableText'
import type { SessionResult } from '../hooks/useReadingSession'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Level } from '@/shared/settings/types'
import { hasEnoughForToday } from '@/shared/stats/enoughForToday'
import { getReadingPool } from '../data/levelPools'
import { suggestLevel } from '../data/levelSuggestion'

export type SessionEndProps = {
  results: SessionResult
  level: Level
  onExit: () => void
  onAlbum: () => void
  audioBus?: Pick<AudioBus, 'play' | 'stop'>
}

type BreakdownCellProps = {
  icon: string
  label: string
  value: number
  color: string
  testId: string
}

function BreakdownCell({ icon, label, value, color, testId }: BreakdownCellProps) {
  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '12px 18px',
        background: '#ffffff',
        borderRadius: radii.kid,
        border: `2px solid ${color}`,
        minWidth: 100,
      }}
    >
      <div aria-hidden="true" style={{ fontSize: 36, lineHeight: 1 }}>
        {icon}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: '#444' }}>{label}</div>
    </div>
  )
}

// CeremonyView — shows when album crosses a multiple-of-10 milestone.
function CeremonyView({
  milestone,
  onContinue,
  audioBus,
}: {
  milestone: number
  onContinue: () => void
  audioBus?: Pick<AudioBus, 'play' | 'stop'>
}) {
  // Play fanfare once on mount
  useEffect(() => {
    if (audioBus) void audioBus.play('sfx-mastery-fanfara')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Confetti particles — simple CSS-animated array
  const particles = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div
      data-testid="ceremony-view"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(254, 249, 242, 0.97)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        zIndex: 200,
        padding: 32,
        textAlign: 'center',
      }}
    >
      {/* Confetti particles */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-60px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map(i => (
          <div
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${(i * 8 + 4)}%`,
              top: `${10 + (i % 3) * 15}%`,
              fontSize: 20,
              animation: `confettiFall ${1.2 + (i % 4) * 0.3}s ease-in ${(i % 6) * 0.2}s infinite`,
            }}
          >
            {['🎉', '⭐', '✨', '🌟'][i % 4]}
          </div>
        ))}
      </div>

      <IskraHero size={160} state="dance" intensity="torch" oneshotKey={`ceremony-${milestone}`} />

      <div style={{ fontSize: 48, lineHeight: 1 }}>🎉</div>

      <div style={{ fontFamily: 'var(--font-handwritten)', fontSize: 40, fontWeight: 800, color: '#f59e0b' }}>
        ŁAAŁ!
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#2d2d33' }}>
        Masz już {milestone} kart!
      </div>
      <div style={{ fontSize: 18, color: '#6b7280' }}>
        Zbierasz słowa jak mistrz 🔥
      </div>

      <Button size="large" onClick={onContinue}>
        Świetnie!
      </Button>
    </div>
  )
}

export function SessionEnd({ results, level, onExit, onAlbum, audioBus }: SessionEndProps) {
  const ceremony = useReading(s => s.pendingCeremonyMilestone)
  const clearCeremony = useReading(s => s.clearPendingCeremony)
  const syllableStates = useReading(s => s.syllables)
  const wordStates = useReading(s => s.words)
  const sessions = useReading(s => s.sessions)
  const [ceremonyDismissed, setCeremonyDismissed] = useState(false)

  const showCeremony = ceremony !== null && !ceremonyDismissed

  // „Na dziś wystarczy" — liczone raz na mount, ze WSZYSTKICH modułów.
  // WHY hook przed wczesnym returnem ceremonii: kolejność hooków musi być
  // stała, a overlay ceremonii wraca z komponentu wcześniej.
  const [enough] = useState(() => hasEnoughForToday(Date.now()))

  useEffect(() => {
    // Nie wchodzimy w paradę fanfarze ceremonii — cue poczeka, aż dziecko ją
    // zamknie i zobaczy właściwe podsumowanie.
    if (!enough || showCeremony || !audioBus) return
    void audioBus.play('session-stop-enough')
  }, [audioBus, enough, showCeremony])

  const handleCeremonyContinue = () => {
    clearCeremony()
    setCeremonyDismissed(true)
  }

  const correctCount = results.outcomes['correct'] ?? 0
  const wrongCount = results.outcomes['wrong'] ?? 0
  const dontKnowCount = results.outcomes['dontKnow'] ?? 0
  // Prosty wyraz, nie useMemo — musi siedzieć PRZED wczesnym returnem
  // ceremonii, żeby kolejność hooków nie zależała od tego, czy ceremonia
  // jest aktywna (useMemo po wczesnym returnie = błąd kolejności hooków po
  // zamknięciu ceremonii).
  const isPerfect = wrongCount === 0 && dontKnowCount === 0 && correctCount > 0

  // Sugestia awansu/cofnięcia poziomu — informacyjna, plain const (ten sam
  // powód co isPerfect: musi żyć przed wczesnym returnem ceremonii, żeby
  // kolejność hooków nad nią (useReading) zostawała niezmienna).
  const totalAnswered = correctCount + wrongCount + dontKnowCount
  const correctRatio = totalAnswered > 0 ? correctCount / totalAnswered : 0
  const pool = getReadingPool(level)
  const poolBoxes = pool.itemIds.map((id) => {
    const state = level === 'iskierka' ? syllableStates[id] : wordStates[id]
    return state?.box ?? 1
  })
  const avgBox = poolBoxes.length > 0 ? poolBoxes.reduce((a, b) => a + b, 0) / poolBoxes.length : 0
  // Sesje tego poziomu bez bieżącej — applySessionResults dopisuje log
  // bieżącej sesji do `sessions` PRZED ustawieniem `results`, więc ostatni
  // wpis pasujący do poziomu to właśnie ta sesja, nie poprzednia.
  const levelSessions = sessions.filter((log) => log.level === level)
  const previousRatios = levelSessions.slice(0, -1).map((log) => {
    const total = log.events.length
    if (total === 0) return 0
    const correct = log.events.filter((e) => e.outcome === 'correct').length
    return correct / total
  })
  const levelSuggestion = suggestLevel({ correctRatio, avgBox, previousRatios })

  useEffect(() => {
    if (showCeremony || !audioBus || levelSuggestion === null) return
    void audioBus.play(levelSuggestion === 'up' ? 'reading-level-up' : 'reading-level-down')
  }, [audioBus, levelSuggestion, showCeremony])

  // Show ceremony overlay if milestone pending and not yet dismissed
  if (showCeremony && ceremony !== null) {
    return (
      <CeremonyView
        milestone={ceremony}
        onContinue={handleCeremonyContinue}
        {...(audioBus !== undefined ? { audioBus } : {})}
      />
    )
  }

  return (
    <div
      data-testid="reading-session-end"
      style={{
        padding: 24,
        maxWidth: 720,
        margin: '0 auto',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div aria-hidden="true">
        <IskraHero
          size={isPerfect ? 180 : 140}
          state={isPerfect ? 'dance' : 'happy'}
          intensity={isPerfect ? 'torch' : 'flame'}
          oneshotKey={isPerfect ? 'reading-perfect' : 'reading-normal'}
        />
      </div>

      {isPerfect && (
        <div aria-hidden="true" style={{ fontSize: 48 }}>
          ✨ 🎉 ✨
        </div>
      )}

      <div style={{ fontSize: 36, fontWeight: 700 }}>Skończyłeś!</div>

      {/* Iskierki zarobione */}
      <div
        data-testid="iskierki-summary"
        style={{
          fontSize: 28,
          background: '#ffffff',
          borderRadius: radii.kid,
          padding: '12px 24px',
          color: colors.text,
          border: `2px solid ${colors.accentBlue}`,
        }}
      >
        Zebraliśmy razem {results.iskierkiEarned} iskierek!
      </div>

      {/* Breakdown poprawne/błędy/nie wiem */}
      <div
        data-testid="outcome-breakdown"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <BreakdownCell
          icon="🔥"
          label="Świetnie"
          value={correctCount}
          color={colors.accentGreen}
          testId="breakdown-correct"
        />
        <BreakdownCell
          icon="❌"
          label="Pomyłki"
          value={wrongCount}
          color={colors.accentOrange}
          testId="breakdown-wrong"
        />
        <BreakdownCell
          icon="🤷"
          label="Nie wiem"
          value={dontKnowCount}
          color="#7a7a82"
          testId="breakdown-dontknow"
        />
      </div>

      {/* Sugestia awansu/cofnięcia poziomu — informacyjna, bez przycisku zmiany */}
      {levelSuggestion !== null && (
        <div
          data-testid="level-suggestion"
          aria-hidden="true"
          style={{ fontSize: 72, lineHeight: 1 }}
        >
          {levelSuggestion === 'up' ? '⬆' : '⬇'}
        </div>
      )}

      {/* Nowe słowa odblokowane w albumie */}
      {results.newAlbumWords.length > 0 && (
        <div
          data-testid="new-album-words"
          style={{
            background: `${colors.accentBlue}22`,
            borderRadius: radii.kid,
            padding: '12px 16px',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Nowe słowa w albumie! 📚
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {results.newAlbumWords.map((wordId) => {
              const word = ALL_WORDS.find((w) => w.id === wordId)
              const text = word?.text ?? wordId.replace(/^word-/, '')
              return (
                <span
                  key={wordId}
                  style={{
                    background: '#ffffff',
                    borderRadius: 8,
                    padding: '4px 12px',
                    fontSize: 18,
                    fontWeight: 700,
                    border: `2px solid ${colors.accentBlue}`,
                    fontFamily: 'var(--font-block)',
                  }}
                >
                  <SyllableText word={text} {...(word?.syllables ? { syllables: word.syllables } : {})} />
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA — koniec na dziś: 🏠 głównym przyciskiem, album schodzi na bok. */}
      <div
        data-testid="session-end-actions"
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 16,
          flexWrap: 'wrap',
          flexDirection: enough ? 'column' : 'row',
        }}
      >
        {enough ? (
          <>
            <button
              type="button"
              data-testid="exit-button"
              aria-label="Wróć do domu"
              onClick={onExit}
              style={{
                width: '100%',
                minHeight: tapTargets.minSize,
                borderRadius: radii.kid,
                border: `3px solid ${colors.accentGreen}`,
                background: colors.accentGreen,
                color: '#ffffff',
                fontSize: 30,
                fontWeight: 800,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              🏠
            </button>
            <button
              type="button"
              data-testid="album-button"
              aria-label="Zobacz album"
              onClick={onAlbum}
              style={{
                minWidth: tapTargets.minSize,
                minHeight: tapTargets.minSize,
                padding: '0 20px',
                borderRadius: radii.kid,
                border: '2px solid #d8d8de',
                background: 'transparent',
                color: '#7a7a82',
                fontSize: 18,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              📚 album
            </button>
          </>
        ) : (
          <>
            <Button
              size="large"
              data-testid="album-button"
              onClick={onAlbum}
            >
              📚 Zobacz album
            </Button>
            <Button
              size="large"
              variant="secondary"
              data-testid="exit-button"
              onClick={onExit}
            >
              🏠 Wróć
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
