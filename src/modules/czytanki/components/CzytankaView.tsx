import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors, radii, tapTargets } from '@/app/theme'
import { getSyllableColor } from '@/shared/ui/syllableColors'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { usePageVisibility } from '@/shared/engagement/usePageVisibility'
import type { Czytanka, CzytankaGroup } from '../data/types'
import { syllableAudioKey, wordAudioKey } from '../data/audioKeys'
import { useCzytanki } from '../store/czytankiStore'
import { setPendingCue, takePendingCue } from '../audio/pendingCue'
import { SyllableButton } from './SyllableButton'
import { CzytankaScene } from './CzytankaScene'
import { useReadAloud } from '../hooks/useReadAloud'

const FONT_BY_GROUP: Record<CzytankaGroup, number> = { 1: 64, 2: 54, 3: 46, 4: 40 }
// Dłuższe czytanki dostają mniejszą scenę — tekst jest tu treścią, scena tłem.
const SCENE_PCT_BY_GROUP: Record<CzytankaGroup, number> = { 1: 40, 2: 40, 3: 38, 4: 34 }
const MIN_FONT = 26
const SCENE_BASIS_MIN = 18
const SCENE_BASIS_STEP = 6
const FONT_STEP = 2
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

  useEffect(() => {
    markOpened(czytanka.id)
    audioBus.stop()
    // Odbieramy odłożone cue nawigacji (ustawione przez ekran, z którego
    // przyszliśmy — on sam zdążył się odmontować) i ew. intro w jednym
    // deferred callbacku. StrictMode w dev (mount → unmount → mount) czyści
    // ten timeout na pierwszym, odrzuconym mouncie, więc cue/flaga "widziane"
    // nie są konsumowane/palone zanim ekran naprawdę zostanie zamontowany.
    const mountTimeout = window.setTimeout(() => {
      const cue = takePendingCue()
      if (cue) void audioBus.play(cue)
      if (!hasSeenIntro('czytanka-first')) {
        // Flaga dopiero po faktycznym odtworzeniu (play() → true).
        void audioBus.play('czytanki-intro').then((played) => {
          if (played) markIntroSeen('czytanka-first')
        })
      }
    }, 0)
    return () => window.clearTimeout(mountTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [czytanka.id])

  // Audio nie może grać dalej po opuszczeniu ekranu (np. tap wstecz w trakcie odtwarzania),
  // a odłożone podświetlenie słowa nie może odpalić się po unmount.
  useEffect(() => () => {
    stop()
    if (holdTimeoutRef.current !== null) window.clearTimeout(holdTimeoutRef.current)
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

  // Ten ekran znika w tym samym tick'u co nawigacja — nie może samo odtworzyć
  // cue z opóźnieniem (własny unmount wyczyściłby jego timeout). Zamiast tego
  // zostawiamy klucz w pendingCue; odbierze go docelowy ekran po zamontowaniu.
  const prevTap = useTapHandler({
    onTap: () => {
      stop()
      setPendingCue('czytanki-ui-prev')
      onPrev?.()
    },
    disabled: !onPrev,
  })
  const nextTap = useTapHandler({
    onTap: () => {
      stop()
      setPendingCue('czytanki-ui-next')
      onNext?.()
    },
    disabled: !onNext,
  })
  const readTap = useTapHandler({ onTap: toggle })

  // Bez scrolla i bez przycinania: zaczynamy od rozmiaru dla grupy i zmniejszamy
  // krokami, aż wszystkie zdania zmieszczą się w dostępnej wysokości. Zależy od
  // orientacji i długości zdań (zawijanie), więc liczone z realnego layoutu.
  const baseFont = FONT_BY_GROUP[czytanka.group]
  const boxRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(baseFont)
  // Bump wymusza ponowny pomiar także wtedy, gdy fontSize się nie zmienia
  // (reset do baseFont po obrocie ekranu) — inaczej efekt z deps nie odpali.
  const [fitPass, setFitPass] = useState(0)
  // Gdy tekst nie mieści się nawet przy MIN_FONT (długie czytanki w portrait),
  // oddajemy mu miejsce kosztem sceny — scena jest tłem, tekst jest celem.
  const [sceneBasis, setSceneBasis] = useState(SCENE_PCT_BY_GROUP[czytanka.group])

  const refit = useCallback(() => {
    setFontSize(baseFont)
    setSceneBasis(SCENE_PCT_BY_GROUP[czytanka.group])
    setFitPass((n) => n + 1)
  }, [baseFont, czytanka.group])

  useLayoutEffect(() => { refit() }, [czytanka.id, refit])

  // resize/orientationchange potrafią odpalić kilka razy pod rząd (np. obrót
  // iPada) — rAF zbija je do jednego refitu na klatkę zamiast serii rekalkulacji.
  useEffect(() => {
    let raf: number | null = null
    const scheduleRefit = () => {
      if (raf !== null) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        raf = null
        refit()
      })
    }
    window.addEventListener('resize', scheduleRefit)
    window.addEventListener('orientationchange', scheduleRefit)
    return () => {
      window.removeEventListener('resize', scheduleRefit)
      window.removeEventListener('orientationchange', scheduleRefit)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [refit])

  useLayoutEffect(() => {
    const box = boxRef.current
    const text = textRef.current
    if (!box || !text) return
    const available = box.clientHeight
    if (available <= 0) return
    if (text.offsetHeight <= available) return
    if (fontSize > MIN_FONT) {
      setFontSize((f) => Math.max(MIN_FONT, f - FONT_STEP))
    } else if (sceneBasis > SCENE_BASIS_MIN) {
      setSceneBasis((b) => Math.max(SCENE_BASIS_MIN, b - SCENE_BASIS_STEP))
    }
  }, [fontSize, sceneBasis, fitPass])

  return (
    <div data-testid="czytanka-view" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: `0 ${tapTargets.minMargin}px ${tapTargets.minMargin}px`, position: 'relative' }}>
      <div style={{ flex: `0 0 ${sceneBasis}%`, minHeight: 0, position: 'relative' }}>
        <CzytankaScene scene={czytanka.scene} />
        {onPrev && <button type="button" aria-label="Poprzednia czytanka" {...prevTap} style={{ ...roundBtn, position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}>◀</button>}
        {onNext && <button type="button" aria-label="Następna czytanka" {...nextTap} style={{ ...roundBtn, position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>▶</button>}
        <button type="button" aria-label={reading ? 'Zatrzymaj' : 'Przeczytaj całość'} data-testid="read-aloud" {...readTap}
          style={{ ...roundBtn, position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', background: reading ? '#fde047' : '#fff', borderRadius: radii.kid }}>
          {reading ? '⏹' : '🔊'}
        </button>
      </div>

      <div ref={boxRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
        <div ref={textRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2em', fontSize, margin: 'auto 0' }}>
          {czytanka.sentences.map((sent, s) => (
            <div key={s} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.2em 0.5em' }}>
              {sent.map((word, w) => {
                const isActive = (activeWord?.s === s && activeWord.w === w) || (heldWord?.s === s && heldWord.w === w)
                return (
                  <span key={w} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                    {/* Obwolutka wyrazu — dziecko widzi, które sylaby tworzą jedno słowo. */}
                    <span
                      data-testid="word"
                      style={{
                        display: 'inline-flex', alignItems: 'baseline', gap: '0.12em',
                        padding: '0.04em 0.22em', borderRadius: '0.4em',
                        background: isActive ? '#fde047' : '#ffffff',
                        border: `3px solid ${isActive ? '#f59e0b' : '#cfd8e6'}`,
                        boxShadow: '0 2px 0 #e2e8f0',
                        transition: 'background 150ms, border-color 150ms',
                      }}
                    >
                      {word.syllables.map((syl, i) => (
                        <SyllableButton key={i} text={syl} color={getSyllableColor(i)} fontSize={fontSize} highlighted={false}
                          onTap={() => tapSyllable(syl)} onLongPress={() => holdWord(s, w, word.syllables)} />
                      ))}
                    </span>
                    {word.punct && <span aria-hidden="true" style={{ fontFamily: 'var(--font-block)', fontWeight: 700, fontSize, color: colors.text, marginLeft: '0.08em' }}>{word.punct}</span>}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
