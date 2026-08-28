import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors, radii, tapTargets } from '@/app/theme'
import { getSyllableColor } from '@/shared/ui/syllableColors'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { usePageVisibility } from '@/shared/engagement/usePageVisibility'
import type { Czytanka, CzytankaGroup } from '../data/types'
import { syllableAudioKey, wordAudioKey } from '../data/audioKeys'
import { useCzytanki } from '../store/czytankiStore'
import { SyllableButton } from './SyllableButton'
import { CzytankaScene } from './CzytankaScene'
import { useReadAloud } from '../hooks/useReadAloud'

const FONT_BY_GROUP: Record<CzytankaGroup, number> = { 1: 64, 2: 54, 3: 46, 4: 40 }
const WORD_HIGHLIGHT_MS = 600

type Props = {
  czytanka: Czytanka
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onPrev?: () => void
  onNext?: () => void
}

const roundBtn = {
  width: 72, height: 72, borderRadius: 36, border: `3px solid ${colors.accentBlue}`,
  background: '#fff', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
} as const

export function CzytankaView({ czytanka, audioBus, onPrev, onNext }: Props) {
  const markOpened = useCzytanki((s) => s.markOpened)
  const hasSeenIntro = useCzytanki((s) => s.hasSeenIntro)
  const markIntroSeen = useCzytanki((s) => s.markIntroSeen)
  const [heldWord, setHeldWord] = useState<{ s: number; w: number } | null>(null)
  const { activeWord, reading, toggle, stop } = useReadAloud({ czytanka, audioBus })
  const holdTimeoutRef = useRef<number | null>(null)
  const navCueTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    markOpened(czytanka.id)
    audioBus.stop()
    // Odtwarzamy intro z opóźnieniem PO stop() — a flagę "widziane" ustawiamy
    // dopiero w tym samym deferred callbacku, żeby StrictMode w dev (mount →
    // unmount → mount) nie spalił jednorazowego intro na pierwszym, odrzuconym mouncie.
    let introTimeout: number | undefined
    if (!hasSeenIntro('czytanka-first')) {
      introTimeout = window.setTimeout(() => {
        markIntroSeen('czytanka-first')
        void audioBus.play('czytanki-intro')
      }, 0)
    }
    return () => {
      if (introTimeout !== undefined) window.clearTimeout(introTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [czytanka.id])

  // Audio nie może grać dalej po opuszczeniu ekranu (np. tap wstecz w trakcie odtwarzania),
  // a odłożone w czasie cue nawigacji/podświetlenia słowa nie mogą odpalić się po unmount.
  useEffect(() => () => {
    stop()
    if (holdTimeoutRef.current !== null) window.clearTimeout(holdTimeoutRef.current)
    if (navCueTimeoutRef.current !== null) window.clearTimeout(navCueTimeoutRef.current)
  }, [stop])

  usePageVisibility({ onHidden: stop, onVisible: () => {}, enabled: true })

  const tapSyllable = useCallback((syl: string) => {
    stop()
    void audioBus.play(syllableAudioKey(syl))
  }, [audioBus, stop])

  const holdWord = useCallback((s: number, w: number, syllables: readonly string[]) => {
    stop()
    setHeldWord({ s, w })
    void audioBus.play(wordAudioKey(syllables))
    if (holdTimeoutRef.current !== null) window.clearTimeout(holdTimeoutRef.current)
    holdTimeoutRef.current = window.setTimeout(() => {
      setHeldWord(null)
      holdTimeoutRef.current = null
    }, WORD_HIGHLIGHT_MS)
  }, [audioBus, stop])

  // stop() zabija kolejkę AudioBus — grając cue nawigacji synchronicznie zaraz
  // po stop() nigdy by nie wystartowało. Odkładamy je o jeden tick.
  const prevTap = useTapHandler({
    onTap: () => {
      stop()
      onPrev?.()
      navCueTimeoutRef.current = window.setTimeout(() => { void audioBus.play('czytanki-ui-prev') }, 0)
    },
    disabled: !onPrev,
  })
  const nextTap = useTapHandler({
    onTap: () => {
      stop()
      onNext?.()
      navCueTimeoutRef.current = window.setTimeout(() => { void audioBus.play('czytanki-ui-next') }, 0)
    },
    disabled: !onNext,
  })
  const readTap = useTapHandler({ onTap: toggle })

  const fontSize = FONT_BY_GROUP[czytanka.group]

  return (
    <div data-testid="czytanka-view" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: `0 ${tapTargets.minMargin}px ${tapTargets.minMargin}px`, position: 'relative' }}>
      <div style={{ flex: '0 0 40%', minHeight: 0, position: 'relative' }}>
        <CzytankaScene scene={czytanka.scene} />
        {onPrev && <button type="button" aria-label="Poprzednia czytanka" {...prevTap} style={{ ...roundBtn, position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}>◀</button>}
        {onNext && <button type="button" aria-label="Następna czytanka" {...nextTap} style={{ ...roundBtn, position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>▶</button>}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.2em', overflow: 'hidden', paddingBottom: 88 }}>
        {czytanka.sentences.map((sent, s) => (
          <div key={s} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.7em' }}>
            {sent.map((word, w) => {
              const isActive = (activeWord?.s === s && activeWord.w === w) || (heldWord?.s === s && heldWord.w === w)
              return (
                <span key={w} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.15em' }}>
                  {word.syllables.map((syl, i) => (
                    <SyllableButton key={i} text={syl} color={getSyllableColor(i)} fontSize={fontSize} highlighted={isActive}
                      onTap={() => tapSyllable(syl)} onLongPress={() => holdWord(s, w, word.syllables)} />
                  ))}
                  {word.punct && <span aria-hidden="true" style={{ fontFamily: 'var(--font-block)', fontWeight: 700, fontSize, color: colors.text }}>{word.punct}</span>}
                </span>
              )
            })}
          </div>
        ))}
      </div>

      <button type="button" aria-label={reading ? 'Zatrzymaj' : 'Przeczytaj całość'} data-testid="read-aloud" {...readTap}
        style={{ ...roundBtn, position: 'absolute', right: tapTargets.minMargin, bottom: tapTargets.minMargin, background: reading ? '#fde047' : '#fff', borderRadius: radii.kid }}>
        {reading ? '⏹' : '🔊'}
      </button>
    </div>
  )
}
