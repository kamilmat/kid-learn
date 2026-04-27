// SessionEnd — ekran końca sesji.
// Sekcja 6.6 spec: animacja Iskry, podsumowanie, opcja powtórki/wyjścia,
// sugestia awansu poziomu jeśli >=80% poprawnych.

import { useEffect, useMemo } from 'react'
import { Button } from '@/shared/ui/Button'
import { colors, radii } from '@/app/theme'
import { toUpper } from '@/modules/letters/data/alphabet'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import type { SessionEvent } from '@/modules/letters/types'
import { IskraMascot } from '@/shared/ui/IskraMascot'
import { detectPerfectSession } from '@/modules/letters/hooks/useSession.pickers'

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

function summarize(events: SessionEvent[]): {
  best: string[]
  worst: string[]
  correctRate: number
} {
  const stats = new Map<string, LetterStat>()
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
      const cur = stats.get(lastTarget)
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
  return { best, worst, correctRate }
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
  const { best, worst, correctRate } = useMemo(() => summarize(events), [events])
  const suggestLevelUp = correctRate >= 0.8 && totalQuestions > 0
  const isPerfect = useMemo(
    () => detectPerfectSession(events, sessionLength),
    [events, sessionLength],
  )

  useEffect(() => {
    if (suggestLevelUp) {
      void audioBus.play('level-up-suggest')
    }
  }, [audioBus, suggestLevelUp])

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
        <IskraMascot
          size={isPerfect ? 180 : 120}
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
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginTop: 16,
        }}
      >
        {/* NIE dodajemy nav-tap — to TTS "klik" 1.4s co miesza się
            z audio następnego ekranu (quiz-intro lub home audio). */}
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
      </div>
    </div>
  )
}
