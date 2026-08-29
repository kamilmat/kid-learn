import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors, radii } from '@/app/theme'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { useReducedMotion } from '@/shared/ui/useReducedMotion'
import { useCzytanki } from '../store/czytankiStore'
import { questionAudioKey } from '../data/audioKeys'
import { takePendingCue } from '../audio/pendingCue'
import type { Comprehension } from '../data/types'

// Tyle 👏 zostaje na ekranie, zanim overlay zniknie — pochwała musi zdążyć wybrzmieć.
const PRAISE_MS = 1500
const TILE_PX = 120

type Props = {
  czytankaId: string
  comprehension: Comprehension
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onClose: () => void
}

type OptionTileProps = {
  emoji: string
  index: number
  disabled: boolean
  animate: boolean
  onPick: (index: number) => void
}

function OptionTile({ emoji, index, disabled, animate, onPick }: OptionTileProps) {
  const tap = useTapHandler({ onTap: () => onPick(index), disabled })
  return (
    <button
      type="button"
      data-testid="comprehension-option"
      data-option-index={index}
      aria-label={`Odpowiedź ${index + 1}`}
      {...tap}
      style={{
        width: TILE_PX, height: TILE_PX, borderRadius: radii.kid,
        border: `4px solid ${colors.accentBlue}`, background: '#fff', fontSize: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none',
        WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent',
        transition: animate ? 'transform 220ms ease-out' : undefined,
      }}
    >
      <span aria-hidden="true">{emoji}</span>
    </button>
  )
}

export function ComprehensionQuestion({ czytankaId, comprehension, audioBus, onClose }: Props) {
  const markQuestionAnswered = useCzytanki((s) => s.markQuestionAnswered)
  const reducedMotion = useReducedMotion()
  // Indeks kafelka, który odpadł po pierwszej pomyłce (null = wszystkie trzy widoczne).
  const [rejected, setRejected] = useState<number | null>(null)
  const [praising, setPraising] = useState(false)
  const closeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('czytanki-q-intro')
    void audioBus.play(questionAudioKey(czytankaId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [czytankaId])

  // Wyjście w trakcie pytania (tap wstecz, nawigacja) nie może zostawić grającego
  // audio ani cue odłożonego dla ekranu, który już nie zostanie zamontowany.
  useEffect(() => () => {
    audioBus.stop()
    takePendingCue()
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const praise = useCallback(() => {
    setPraising(true)
    audioBus.stop()
    void audioBus.play('czytanki-q-praise')
    markQuestionAnswered(czytankaId)
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      onClose()
    }, PRAISE_MS)
  }, [audioBus, czytankaId, markQuestionAnswered, onClose])

  const onPick = useCallback(
    (index: number) => {
      if (praising) return
      // Druga próba zawsze kończy się 👏 — dziecko ma wyjść z pytania z sukcesem.
      if (index === comprehension.answer || rejected !== null) {
        praise()
        return
      }
      setRejected(index)
      audioBus.stop()
      void audioBus.play('czytanki-q-again')
    },
    [audioBus, comprehension.answer, praising, praise, rejected],
  )

  const repeatTap = useTapHandler({
    onTap: () => {
      if (praising) return
      audioBus.stop()
      void audioBus.play(questionAudioKey(czytankaId))
    },
  })

  return (
    <div
      data-testid="comprehension-overlay"
      role="dialog"
      aria-label="Pytanie o czytankę"
      style={{
        position: 'fixed', inset: 0, zIndex: 1500, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28,
        background: 'rgba(254, 249, 242, 0.96)',
      }}
    >
      {praising ? (
        <span data-testid="comprehension-praise" aria-hidden="true" style={{ fontSize: 160, lineHeight: 1 }}>
          👏
        </span>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {comprehension.options.map((emoji, i) =>
              i === rejected ? null : (
                <OptionTile
                  key={i}
                  emoji={emoji}
                  index={i}
                  disabled={praising}
                  animate={rejected !== null && !reducedMotion}
                  onPick={onPick}
                />
              ),
            )}
          </div>
          <button
            type="button"
            data-testid="comprehension-repeat"
            aria-label="Powtórz pytanie"
            {...repeatTap}
            style={{
              width: 60, height: 60, borderRadius: 30, border: `3px solid ${colors.accentBlue}`,
              background: '#fff', fontSize: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation',
              userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span aria-hidden="true">🔊</span>
          </button>
        </>
      )}
    </div>
  )
}
