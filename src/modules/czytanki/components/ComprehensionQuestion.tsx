import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors, radii } from '@/app/theme'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { useCzytanki } from '../store/czytankiStore'
import { questionAudioKey } from '../data/audioKeys'
import type { Comprehension } from '../data/types'

// 👏 znika dopiero, gdy pochwała wybrzmi: `play()` rozstrzyga się na `ended`,
// więc czekamy na nią zamiast zgadywać długość klipu (2,9 s > stare 1,5 s
// ucinało pochwałę w połowie słowa, bo unmount woła `audioBus.stop()`).
const PRAISE_MIN_MS = 1500
// Bezpiecznik: brak pliku, zablokowany autoplay albo nienaturalnie długi klip
// nie mogą zatrzasnąć dziecka w overlayu.
const PRAISE_MAX_MS = 5000
const TILE_PX = 120
const CLOSE_PX = 60

type Props = {
  czytankaId: string
  comprehension: Comprehension
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onClose: () => void
}

type OptionTileProps = {
  emoji: string
  index: number
  onPick: (index: number) => void
}

function OptionTile({ emoji, index, onPick }: OptionTileProps) {
  const tap = useTapHandler({ onTap: () => onPick(index) })
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
      }}
    >
      <span aria-hidden="true">{emoji}</span>
    </button>
  )
}

export function ComprehensionQuestion({ czytankaId, comprehension, audioBus, onClose }: Props) {
  const markQuestionAnswered = useCzytanki((s) => s.markQuestionAnswered)
  // Indeks kafelka, który odpadł po pierwszej pomyłce (null = wszystkie trzy widoczne).
  const [rejected, setRejected] = useState<number | null>(null)
  const [praising, setPraising] = useState(false)
  const timersRef = useRef<number[]>([])
  const closedRef = useRef(false)
  // Zamknięcie tapem ✋ samo startuje cue pożegnalne — unmount nie może go uciąć.
  const dismissingRef = useRef(false)

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('czytanki-q-intro')
    void audioBus.play(questionAudioKey(czytankaId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [czytankaId])

  // Wyjście w trakcie pytania (tap wstecz, nawigacja) nie może zostawić grającego
  // audio ani timera, który zawoła `onClose()` po odmontowaniu.
  // `pendingCue` NIE jest tu czyszczone: overlay sam nigdy go nie ustawia, więc
  // zabranie go tylko połknęłoby cue odłożone przez ekran pod spodem.
  useEffect(() => () => {
    closedRef.current = true
    if (!dismissingRef.current) audioBus.stop()
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = useCallback(() => {
    if (closedRef.current) return
    closedRef.current = true
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
    onClose()
  }, [onClose])

  const praise = useCallback(() => {
    setPraising(true)
    audioBus.stop()
    markQuestionAnswered(czytankaId)
    const startedAt = Date.now()
    timersRef.current.push(window.setTimeout(close, PRAISE_MAX_MS))
    void audioBus.play('czytanki-q-praise').then(() => {
      if (closedRef.current) return
      const rest = Math.max(0, PRAISE_MIN_MS - (Date.now() - startedAt))
      timersRef.current.push(window.setTimeout(close, rest))
    })
  }, [audioBus, close, czytankaId, markQuestionAnswered])

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
      // „Posłuchaj jeszcze raz" musi mieć czego słuchać — pytanie leci zaraz po.
      void audioBus.play(questionAudioKey(czytankaId))
    },
    [audioBus, comprehension.answer, czytankaId, praising, praise, rejected],
  )

  const repeatTap = useTapHandler({
    onTap: () => {
      if (praising) return
      audioBus.stop()
      void audioBus.play(questionAudioKey(czytankaId))
    },
  })

  const closeTap = useTapHandler({
    onTap: () => {
      if (praising) return
      audioBus.stop()
      dismissingRef.current = true
      void audioBus.play('czytanki-ui-open')
      close()
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
      {!praising && (
        <button
          type="button"
          data-testid="comprehension-close"
          aria-label="Zamknij"
          {...closeTap}
          style={{
            position: 'absolute', top: 16, left: 16,
            width: CLOSE_PX, height: CLOSE_PX, borderRadius: CLOSE_PX / 2,
            border: `3px solid ${colors.accentBlue}`, background: '#fff', fontSize: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none',
            WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span aria-hidden="true">✋</span>
        </button>
      )}
      {praising ? (
        <span data-testid="comprehension-praise" aria-hidden="true" style={{ fontSize: 160, lineHeight: 1 }}>
          👏
        </span>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {comprehension.options.map((emoji, i) =>
              i === rejected ? null : <OptionTile key={i} emoji={emoji} index={i} onPick={onPick} />,
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
