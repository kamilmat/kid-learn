// SessionEnd — ekran końca sesji.
// Sekcja 6.6 spec: animacja Iskry, podsumowanie, opcja powtórki/wyjścia,
// sugestia awansu poziomu jeśli >=80% poprawnych.

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { colors, radii, tapTargets } from '@/app/theme'
import { toUpper } from '@/modules/letters/data/alphabet'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import type { SessionEvent } from '@/modules/letters/types'
import { IskraHero } from '@/shared/ui/IskraHero'
import { detectPerfectSession } from '@/modules/letters/hooks/useSession.pickers'
import { hasEnoughForToday } from '@/shared/stats/enoughForToday'

export type SessionEndProps = {
  iskierki: number
  totalQuestions: number
  sessionLength: number
  events: SessionEvent[]
  onRestart: () => void
  onExit: () => void
  audioBus?: Pick<AudioBus, 'play'>
}

type LetterStat = { letter: string; correct: number; total: number }

function BreakdownCell({
  icon,
  label,
  value,
  percent,
  color,
  testId,
}: {
  icon: string
  label: string
  value: number
  percent?: number
  color: string
  testId: string
}) {
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
      <div aria-hidden="true" style={{ fontSize: 36, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {percent !== undefined && (
        <div style={{ fontSize: 12, color: '#7a7a82' }}>{percent}%</div>
      )}
      <div style={{ fontSize: 13, color: '#444' }}>{label}</div>
    </div>
  )
}

type OutcomeCounts = {
  correct: number
  wrong: number
  dontKnow: number
  timeout: number
  total: number
}

function summarize(events: SessionEvent[]): {
  best: string[]
  worst: string[]
  correctRate: number
  counts: OutcomeCounts
} {
  const stats = new Map<string, LetterStat>()
  const counts: OutcomeCounts = { correct: 0, wrong: 0, dontKnow: 0, timeout: 0, total: 0 }
  let lastTarget: string | null = null
  for (const ev of events) {
    if (ev.type === 'question-start') {
      lastTarget = ev.targetLetter
      const cur = stats.get(ev.targetLetter) ?? {
        letter: ev.targetLetter,
        correct: 0,
        total: 0,
      }
      cur.total += 1
      stats.set(ev.targetLetter, cur)
    } else if (ev.type === 'answer' && lastTarget !== null) {
      const target = lastTarget
      // Pytanie skonsumowane — druga próba (poprawka po błędzie) nie ma
      // własnego question-start, więc bez tego resetu przypisałaby się do
      // tego samego targetu i podwoiłaby total.
      lastTarget = null
      // Poprawka po błędzie (attempt 2) NIE wpada do statystyk — inaczej
      // błąd+poprawka liczyłyby się jako 2 pytania i litera wyglądałaby na
      // "opanowaną" mimo pierwszej pomyłki.
      if (ev.attempt === 2) continue
      counts[ev.outcome] += 1
      counts.total += 1
      const cur = stats.get(target)
      if (cur && ev.outcome === 'correct') {
        cur.correct += 1
      }
    }
  }
  const list = [...stats.values()]
  const total = list.reduce((acc, s) => acc + s.total, 0)
  const correct = list.reduce((acc, s) => acc + s.correct, 0)
  const correctRate = total > 0 ? correct / total : 0
  const sorted = [...list].sort(
    (a, b) => b.correct / Math.max(b.total, 1) - a.correct / Math.max(a.total, 1),
  )
  const best = sorted
    .filter((s) => s.correct === s.total && s.total > 0)
    .slice(0, 3)
    .map((s) => toUpper(s.letter))
  const worst = sorted
    .filter((s) => s.correct < s.total)
    .slice(-3)
    .map((s) => toUpper(s.letter))
  return { best, worst, correctRate, counts }
}

export function SessionEnd({
  iskierki,
  totalQuestions,
  sessionLength,
  events,
  onRestart,
  onExit,
  audioBus = defaultAudioBus,
}: SessionEndProps) {
  const { best, worst, correctRate, counts } = useMemo(() => summarize(events), [events])
  const suggestLevelUp = correctRate >= 0.8 && totalQuestions > 0
  const isPerfect = useMemo(
    () => detectPerfectSession(events, sessionLength),
    [events, sessionLength],
  )

  // „Na dziś wystarczy" — dwie krótkie sesje biją jedną długą. Liczymy sesje ze
  // WSZYSTKICH modułów (dziecko mogło już grać w Cyferki). Stan liczony raz na
  // mount: log bieżącej sesji jest już zapisany, zanim ten ekran się pojawi.
  const [enough] = useState(() => hasEnoughForToday(Date.now()))

  useEffect(() => {
    if (suggestLevelUp) {
      void audioBus.play('level-up-suggest')
    }
    // Cue leci PO `session-end` z `useSession.finishSession` — AudioBus to
    // kolejka FIFO, więc dokleja się na końcu zamiast go przerywać.
    if (enough) {
      void audioBus.play('session-stop-enough')
    }
  }, [audioBus, suggestLevelUp, enough])

  return (
    <div
      data-testid="session-end"
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
      <div data-testid="iskra-end" aria-hidden="true">
        <IskraHero
          size={isPerfect ? 180 : 140}
          state={isPerfect ? 'dance' : 'happy'}
          intensity={isPerfect ? 'torch' : 'flame'}
          oneshotKey={isPerfect ? 'perfect' : 'normal'}
        />
      </div>
      {isPerfect && (
        <div
          data-testid="perfect-sparkle"
          aria-hidden="true"
          style={{ fontSize: 48 }}
        >
          ✨ 🎉 ✨
        </div>
      )}
      <div style={{ fontSize: 36, fontWeight: 700 }}>Skończyłeś!</div>
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
        Zebraliśmy razem {iskierki} iskierek!
      </div>
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
          value={counts.correct}
          percent={counts.total > 0 ? Math.round((counts.correct / counts.total) * 100) : 0}
          color={colors.accentGreen}
          testId="breakdown-correct"
        />
        <BreakdownCell
          icon="❌"
          label="Pomyłki"
          value={counts.wrong}
          color={colors.accentOrange}
          testId="breakdown-wrong"
        />
        <BreakdownCell
          icon="🤷"
          label="Nie wiem"
          value={counts.dontKnow + counts.timeout}
          color="#7a7a82"
          testId="breakdown-dontknow"
        />
      </div>
      {best.length > 0 && (
        <div data-testid="best-letters" style={{ fontSize: 18 }}>
          Świetnie szło Ci: {best.join(', ')}
        </div>
      )}
      {worst.length > 0 && (
        <div data-testid="worst-letters" style={{ fontSize: 18 }}>
          Poćwiczysz: {worst.join(', ')}
        </div>
      )}
      {suggestLevelUp && (
        <div
          data-testid="level-up-suggest"
          style={{
            fontSize: 18,
            background: `${colors.accentGreen}22`,
            padding: '8px 16px',
            borderRadius: radii.kid,
          }}
        >
          Spróbuj wyższego poziomu!
        </div>
      )}
      {/* Koniec na dziś: 🏠 przejmuje rolę głównego przycisku, „jeszcze raz"
          schodzi na bok. Nie blokujemy powtórki — tylko przestajemy ją
          podpowiadać. Oba targety dalej ≥60×60. */}
      <div
        data-testid="session-end-actions"
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: enough ? 'column' : 'row',
          marginTop: 16,
        }}
      >
        {/* NIE dodajemy nav-tap — to TTS "klik" 1.4s co miesza się
            z audio następnego ekranu (quiz-intro lub home audio). */}
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
              data-testid="restart-button"
              aria-label="Jeszcze raz"
              onClick={onRestart}
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
              jeszcze raz
            </button>
          </>
        ) : (
          <>
            <Button size="large" data-testid="restart-button" onClick={onRestart}>
              Jeszcze raz
            </Button>
            <Button
              size="large"
              variant="secondary"
              data-testid="exit-button"
              onClick={onExit}
            >
              Wyjdź
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
