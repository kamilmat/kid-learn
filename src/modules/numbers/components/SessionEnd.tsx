import { useEffect } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'
import { IskraHero } from '@/shared/ui/IskraHero'

type Props = {
  counters: { correct: number; wrong: number; dontKnow: number }
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onExit: () => void
  onTree: () => void
}

export function SessionEnd({ counters, audioBus, onExit, onTree }: Props) {
  useEffect(() => {
    audioBus.stop()
    void audioBus.play('session-end-good')
  }, [audioBus])

  const isPerfect = counters.wrong === 0 && counters.dontKnow === 0 && counters.correct > 0

  const exitTap = useTapHandler({ onTap: onExit })
  const treeTap = useTapHandler({ onTap: onTree })

  return (
    <div
      data-testid="session-end"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 32,
      }}
    >
      <div aria-hidden="true">
        <IskraHero
          size={isPerfect ? 180 : 140}
          state={isPerfect ? 'dance' : 'happy'}
          intensity="torch"
        />
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: '2.5em',
          margin: 0,
          color: colors.text,
        }}
      >
        Świetna sesja!
      </h2>
      <div
        data-testid="session-end-counters"
        style={{ display: 'flex', gap: 24, fontSize: 48 }}
      >
        <span aria-label={`${counters.correct} poprawnych`}>
          ✅ {counters.correct}
        </span>
        <span aria-label={`${counters.wrong} błędów`}>
          ❌ {counters.wrong}
        </span>
        <span aria-label={`${counters.dontKnow} nie wiem`}>
          🤷 {counters.dontKnow}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          data-testid="session-end-tree"
          aria-label="Drzewko mistrzostwa"
          {...treeTap}
          style={btnStyle('#dcfce7', '#16a34a', '#166534')}
        >
          🌱 Drzewko
        </button>
        <button
          type="button"
          data-testid="session-end-exit"
          aria-label="Wyjdź"
          {...exitTap}
          style={btnStyle('#fff', colors.accentBlue, colors.text)}
        >
          → Wyjdź
        </button>
      </div>
    </div>
  )
}

function btnStyle(bg: string, border: string, color: string) {
  return {
    minHeight: 72,
    minWidth: 200,
    padding: '0 32px',
    borderRadius: radii.kid,
    background: bg,
    color,
    border: `4px solid ${border}`,
    fontSize: 28,
    fontFamily: 'var(--font-handwritten)',
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  } as const
}
