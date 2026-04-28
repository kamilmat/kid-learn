import { useEffect } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii } from '@/app/theme'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onResume: () => void
  onExit: () => void
}

export function PauseOverlay({ audioBus, onResume, onExit }: Props) {
  useEffect(() => {
    audioBus.stop()
  }, [audioBus])

  const resumeTap = useTapHandler({ onTap: onResume })
  const exitTap = useTapHandler({ onTap: onExit })

  return (
    <div
      data-testid="pause-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: radii.kid * 1.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          minWidth: 280,
        }}
      >
        <div aria-hidden="true" style={{ fontSize: 80 }}>
          ⏸️
        </div>
        <button
          type="button"
          data-testid="pause-resume"
          aria-label="Wznów"
          {...resumeTap}
          style={btnStyle('#dcfce7', '#16a34a', '#166534')}
        >
          ▶ Wznów
        </button>
        <button
          type="button"
          data-testid="pause-exit"
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
    minHeight: 64,
    minWidth: 200,
    padding: '0 24px',
    borderRadius: radii.kid,
    background: bg,
    color,
    border: `3px solid ${border}`,
    fontSize: 24,
    fontFamily: 'var(--font-handwritten)',
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  } as const
}
