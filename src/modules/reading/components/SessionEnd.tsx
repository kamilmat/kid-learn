// SessionEnd — ekran końca sesji czytania.
// Phase 6.6.3: podsumowanie wyników + iskierki + nowe słowa w albumie.

import { useMemo } from 'react'
import { colors, radii } from '@/app/theme'
import { Button } from '@/shared/ui/Button'
import { IskraMascot } from '@/shared/ui/IskraMascot'
import type { SessionResult } from '../hooks/useReadingSession'

export type SessionEndProps = {
  results: SessionResult
  onExit: () => void
  onAlbum: () => void
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

export function SessionEnd({ results, onExit, onAlbum }: SessionEndProps) {
  const correctCount = results.outcomes['correct'] ?? 0
  const wrongCount = results.outcomes['wrong'] ?? 0
  const dontKnowCount = results.outcomes['dontKnow'] ?? 0
  const isPerfect = useMemo(
    () => wrongCount === 0 && dontKnowCount === 0 && correctCount > 0,
    [correctCount, wrongCount, dontKnowCount],
  )

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
        <IskraMascot
          size={isPerfect ? 180 : 120}
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
            {results.newAlbumWords.map((wordId) => (
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
                {wordId.replace(/^word-/, '')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginTop: 16,
          flexWrap: 'wrap',
        }}
      >
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
      </div>
    </div>
  )
}
