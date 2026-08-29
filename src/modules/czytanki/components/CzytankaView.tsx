import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { playIntroOnce } from '@/shared/audio/playIntroOnce'
import { colors, radii, tapTargets } from '@/app/theme'
import { getSyllableCue } from '@/shared/ui/syllableColors'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { usePageVisibility } from '@/shared/engagement/usePageVisibility'
import { useSettings } from '@/shared/settings/settingsStore'
import type { Czytanka, CzytankaGroup } from '../data/types'
import { syllableAudioKey, wordAudioKey } from '../data/audioKeys'
import { useCzytanki } from '../store/czytankiStore'
import { setPendingCue, takePendingCue } from '../audio/pendingCue'
import { SyllableButton } from './SyllableButton'
import { CzytankaScene } from './CzytankaScene'
import { ComprehensionQuestion } from './ComprehensionQuestion'
import { useReadAloud } from '../hooks/useReadAloud'

const FONT_BY_GROUP: Record<CzytankaGroup, number> = { 1: 64, 2: 54, 3: 46, 4: 40 }
// Dłuższe czytanki dostają mniejszą scenę — tekst jest tu treścią, scena tłem.
const SCENE_PCT_BY_GROUP: Record<CzytankaGroup, number> = { 1: 40, 2: 40, 3: 38, 4: 34 }
const MIN_FONT = 26
const SCENE_BASIS_MIN = 18
const SCENE_BASIS_STEP = 6
// Margines bezpieczeństwa oszacowania — wysokość tekstu nie skaluje się idealnie
// liniowo z fontSize (zawijanie zmienia liczbę linii skokowo).
const FIT_SAFETY = 0.95
const WORD_HIGHLIGHT_MS = 600
// Zapomniana karta w tle nie może zaliczyć dziecku godzin "czytania".
const VISIT_CAP_MS = 10 * 60_000
// ❓ pojawia się dopiero, gdy dziecko naprawdę przeszło przez tekst: całe ▶
// albo tyle dotkniętych sylab. Pytanie po dwóch tapach byłoby zgadywanką.
const SYLLABLES_SEEN_RATIO = 0.6

function countSyllables(czytanka: Czytanka): number {
  let n = 0
  for (const sent of czytanka.sentences) for (const word of sent) n += word.syllables.length
  return n
}

type Props = {
  czytanka: Czytanka
  audioBus: Pick<AudioBus, 'play' | 'stop' | 'setPlaybackRate'>
  onPrev?: () => void
  onNext?: () => void
}

const roundBtn = {
  width: 72, height: 72, borderRadius: 36, border: `3px solid ${colors.accentBlue}`,
  background: '#fff', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
} as const

const toggleBtn = {
  width: 64, height: 64, borderRadius: 32, border: `3px solid ${colors.accentBlue}`,
  fontSize: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
} as const

export function CzytankaView({ czytanka, audioBus, onPrev, onNext }: Props) {
  const markOpened = useCzytanki((s) => s.markOpened)
  const hasSeenIntro = useCzytanki((s) => s.hasSeenIntro)
  const markIntroSeen = useCzytanki((s) => s.markIntroSeen)
  const recordVisit = useCzytanki((s) => s.recordVisit)
  const czytankiSettings = useSettings((s) => s.settings.czytanki)
  const updateSetting = useSettings((s) => s.updateSetting)
  const echoMode = czytankiSettings.echoMode
  const tempo = czytankiSettings.tempo
  const merged = czytankiSettings.mergedSyllables
  const answeredQuestionIds = useCzytanki((s) => s.answeredQuestionIds)
  const [heldWord, setHeldWord] = useState<{ s: number; w: number } | null>(null)
  // Sylaby dotknięte w TEJ wizycie — po wyjściu i powrocie dziecko przechodzi tekst od nowa.
  const [seenSyllables, setSeenSyllables] = useState<Set<string>>(() => new Set())
  const [readFinished, setReadFinished] = useState(false)
  const [questionOpen, setQuestionOpen] = useState(false)
  const { activeWord, reading, echoing, toggle, stop, skipEcho } = useReadAloud({
    czytanka,
    audioBus,
    echoMode,
    tempo,
    introKey: echoMode ? 'czytanki-echo-intro' : null,
    onFinished: () => setReadFinished(true),
  })
  const holdTimeoutRef = useRef<number | null>(null)
  // Tapy zliczamy w refie i zapisujemy batch'em na wyjściu — persist to zapis
  // do localStorage przy KAŻDYM set(), a dziecko stuka sylaby seriami.
  const tapsRef = useRef<Record<string, number>>({})
  const enteredAtRef = useRef(Date.now())

  const flushVisit = useCallback(() => {
    const ms = Math.min(VISIT_CAP_MS, Date.now() - enteredAtRef.current)
    const taps = tapsRef.current
    if (ms > 0 || Object.keys(taps).length > 0) recordVisit(czytanka.id, taps, ms)
    tapsRef.current = {}
    enteredAtRef.current = Date.now()
  }, [czytanka.id, recordVisit])

  const countWordTap = useCallback((syllables: readonly string[]) => {
    const slug = wordAudioKey(syllables).replace('cz-word-', '')
    tapsRef.current[slug] = (tapsRef.current[slug] ?? 0) + 1
  }, [])

  useEffect(() => {
    markOpened(czytanka.id)
    setSeenSyllables(new Set())
    setReadFinished(false)
    setQuestionOpen(false)
    enteredAtRef.current = Date.now()
    audioBus.stop()
    // Odbieramy odłożone cue nawigacji (ustawione przez ekran, z którego
    // przyszliśmy — on sam zdążył się odmontować) i ew. intro w jednym
    // deferred callbacku. StrictMode w dev (mount → unmount → mount) czyści
    // ten timeout na pierwszym, odrzuconym mouncie, więc cue/flaga "widziane"
    // nie są konsumowane/palone zanim ekran naprawdę zostanie zamontowany.
    const mountTimeout = window.setTimeout(() => {
      const cue = takePendingCue()
      if (cue) void audioBus.play(cue)
      void playIntroOnce(audioBus, 'czytanka-first', hasSeenIntro, markIntroSeen, 'czytanki-intro')
    }, 0)
    return () => window.clearTimeout(mountTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [czytanka.id])

  // Audio nie może grać dalej po opuszczeniu ekranu (np. tap wstecz w trakcie odtwarzania),
  // a odłożone podświetlenie słowa nie może odpalić się po unmount.
  useEffect(() => () => {
    stop()
    flushVisit()
    if (holdTimeoutRef.current !== null) window.clearTimeout(holdTimeoutRef.current)
  }, [stop, flushVisit])

  usePageVisibility({
    onHidden: () => {
      stop()
      flushVisit()
    },
    // Czas spędzony w innej karcie nie jest czasem czytania — liczymy od nowa.
    onVisible: () => {
      enteredAtRef.current = Date.now()
    },
    enabled: true,
  })

  // Tap w sylabę i long-press liczą się do tego samego SŁOWA — rodzic chce
  // wiedzieć, które wyrazy sprawiają trudność, nie które sylaby zostały stuknięte.
  const tapSyllable = useCallback((syl: string, syllables: readonly string[], key: string) => {
    stop()
    countWordTap(syllables)
    setSeenSyllables((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
    void audioBus.play(syllableAudioKey(syl))
  }, [audioBus, countWordTap, stop])

  const holdWord = useCallback((s: number, w: number, syllables: readonly string[]) => {
    stop()
    countWordTap(syllables)
    setHeldWord({ s, w })
    void audioBus.play(wordAudioKey(syllables))
    if (holdTimeoutRef.current !== null) window.clearTimeout(holdTimeoutRef.current)
    holdTimeoutRef.current = window.setTimeout(() => {
      setHeldWord(null)
      holdTimeoutRef.current = null
    }, WORD_HIGHLIGHT_MS)
  }, [audioBus, countWordTap, stop])

  // Ten ekran znika w tym samym tick'u co nawigacja — nie może samo odtworzyć
  // cue z opóźnieniem (własny unmount wyczyściłby jego timeout). Zamiast tego
  // zostawiamy klucz w pendingCue; odbierze go docelowy ekran po zamontowaniu.
  const prevTap = useTapHandler({
    onTap: () => {
      stop()
      flushVisit()
      setPendingCue('czytanki-ui-prev')
      onPrev?.()
    },
    disabled: !onPrev,
  })
  const nextTap = useTapHandler({
    onTap: () => {
      stop()
      flushVisit()
      setPendingCue('czytanki-ui-next')
      onNext?.()
    },
    disabled: !onNext,
  })
  const readTap = useTapHandler({ onTap: toggle })

  const echoTap = useTapHandler({
    onTap: () => {
      const next = !echoMode
      stop()
      updateSetting('czytanki', { ...czytankiSettings, echoMode: next })
      void audioBus.play(next ? 'czytanki-ui-echo-on' : 'czytanki-ui-echo-off')
    },
  })

  const tempoTap = useTapHandler({
    onTap: () => {
      const next = tempo === 'turtle' ? 'normal' : 'turtle'
      stop()
      updateSetting('czytanki', { ...czytankiSettings, tempo: next })
      void audioBus.play(next === 'turtle' ? 'czytanki-ui-slow' : 'czytanki-ui-normal')
    },
  })

  const mergeTap = useTapHandler({
    onTap: () => {
      const next = !merged
      stop()
      audioBus.stop()
      updateSetting('czytanki', { ...czytankiSettings, mergedSyllables: next })
      void audioBus.play(next ? 'czytanki-ui-merge-on' : 'czytanki-ui-merge-off')
    },
  })

  const echoSkipTap = useTapHandler({ onTap: skipEcho, disabled: echoing === null })

  const comprehension = czytanka.comprehension
  const syllablesThreshold = Math.ceil(SYLLABLES_SEEN_RATIO * countSyllables(czytanka))
  const questionReady =
    comprehension !== undefined && (readFinished || seenSyllables.size >= syllablesThreshold)
  const questionAnswered = answeredQuestionIds.includes(czytanka.id)

  const questionTap = useTapHandler({
    onTap: () => {
      stop()
      setQuestionOpen(true)
    },
    disabled: !questionReady,
  })

  // Bez scrolla i bez przycinania: mierzymy raz przy rozmiarze bazowym grupy
  // i liczymy docelowy fontSize z proporcji dostępne/potrzebne — zamiast serii
  // przebiegów layoutu po 2px. Zależy od orientacji i zawijania zdań, więc
  // pomiar idzie z realnego layoutu.
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

  // 0 = jeszcze nie oszacowano, 1 = po oszacowaniu, 2 = po korekcie (dalej tylko scena)
  const fitStepRef = useRef(0)

  const refit = useCallback(() => {
    fitStepRef.current = 0
    setFontSize(baseFont)
    setSceneBasis(SCENE_PCT_BY_GROUP[czytanka.group])
    setFitPass((n) => n + 1)
  }, [baseFont, czytanka.group])

  // `merged` zmienia odstępy i podkreślenia, więc wysokość bloku tekstu też —
  // bez ponownego fitu auto-fit zostaje przy rozmiarze policzonym dla drugiego trybu.
  useLayoutEffect(() => { refit() }, [czytanka.id, merged, refit])

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
    const needed = text.offsetHeight
    if (needed <= available) return

    // Oszacowanie + najwyżej jedna korekta; potem zostaje już tylko oddanie
    // miejsca scenie (długie czytanki w portrait nie mieszczą się nawet w MIN_FONT).
    if (fitStepRef.current < 2) {
      fitStepRef.current += 1
      const scaled = Math.max(
        MIN_FONT,
        Math.floor(fontSize * (available / needed) * FIT_SAFETY),
      )
      if (scaled < fontSize) {
        setFontSize(scaled)
        return
      }
      fitStepRef.current = 2
    }
    if (sceneBasis > SCENE_BASIS_MIN) {
      setSceneBasis((b) => Math.max(SCENE_BASIS_MIN, b - SCENE_BASIS_STEP))
    }
  }, [fontSize, sceneBasis, fitPass])

  return (
    <div data-testid="czytanka-view" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: `0 ${tapTargets.minMargin}px ${tapTargets.minMargin}px`, position: 'relative' }}>
      <div style={{ flex: `0 0 ${sceneBasis}%`, minHeight: 0, position: 'relative' }}>
        <CzytankaScene scene={czytanka.scene} />
        {onPrev && <button type="button" aria-label="Poprzednia czytanka" {...prevTap} style={{ ...roundBtn, position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}>◀</button>}
        {onNext && <button type="button" aria-label="Następna czytanka" {...nextTap} style={{ ...roundBtn, position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>▶</button>}
        <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" aria-label={echoMode ? 'Wyłącz powtarzanie' : 'Włącz powtarzanie'} aria-pressed={echoMode}
            data-testid="echo-toggle" {...echoTap}
            style={{ ...toggleBtn, background: echoMode ? '#bbf7d0' : '#fff' }}>
            🗣
          </button>
          <button type="button" aria-label={reading ? 'Zatrzymaj' : 'Przeczytaj całość'} data-testid="read-aloud" {...readTap}
            style={{ ...roundBtn, background: reading ? '#fde047' : '#fff', borderRadius: radii.kid }}>
            {reading ? '⏹' : '🔊'}
          </button>
          <button type="button" aria-label={tempo === 'turtle' ? 'Zwykłe tempo' : 'Wolne tempo'} aria-pressed={tempo === 'turtle'}
            data-testid="tempo-toggle" {...tempoTap}
            style={{ ...toggleBtn, background: tempo === 'turtle' ? '#bbf7d0' : '#fff' }}>
            🐢
          </button>
          <button type="button" aria-label={merged ? 'Rozdziel sylaby' : 'Scal sylaby'} aria-pressed={merged}
            data-testid="merge-syllables" {...mergeTap}
            style={{ ...toggleBtn, fontFamily: 'var(--font-block)', fontWeight: 700, fontSize: 14, letterSpacing: '0.02em', color: colors.text, background: merged ? '#bbf7d0' : '#fff' }}>
            {merged ? 'KOTA' : 'KO|TA'}
          </button>
          {questionReady && (
            <button type="button" aria-label="Pytanie o czytankę" data-testid="comprehension-open" {...questionTap}
              style={{ ...roundBtn, background: questionAnswered ? '#bbf7d0' : '#fff' }}>
              {questionAnswered ? '✔' : '❓'}
            </button>
          )}
        </div>
      </div>

      <div ref={boxRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', position: 'relative' }}>
        {echoing !== null && (
          // Pauza na powtórzenie — tap w tekst kończy ją natychmiast.
          <div
            data-testid="echo-overlay"
            aria-label="Powtórz zdanie"
            {...echoSkipTap}
            style={{
              position: 'absolute', inset: 0, zIndex: 5, display: 'flex',
              alignItems: 'flex-start', justifyContent: 'center', paddingTop: 4,
              background: 'rgba(255,255,255,0.35)', cursor: 'pointer', touchAction: 'manipulation',
            }}
          >
            <span className="cz-echo-icon" aria-hidden="true" style={{ fontSize: 64, lineHeight: 1 }}>🗣</span>
          </div>
        )}
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
                        display: 'inline-flex', alignItems: 'baseline', gap: merged ? 0 : '0.12em',
                        padding: '0.04em 0.22em', borderRadius: '0.4em',
                        background: isActive ? '#fde047' : '#ffffff',
                        border: `3px solid ${isActive ? '#f59e0b' : '#cfd8e6'}`,
                        boxShadow: '0 2px 0 #e2e8f0',
                        transition: 'background 150ms, border-color 150ms',
                      }}
                    >
                      {word.syllables.map((syl, i) => (
                        <SyllableButton key={i} text={syl} cue={getSyllableCue(i)} fontSize={fontSize} merged={merged}
                          onTap={() => tapSyllable(syl, word.syllables, `${s}-${w}-${i}`)} onLongPress={() => holdWord(s, w, word.syllables)} />
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

      {questionOpen && comprehension && (
        <ComprehensionQuestion
          czytankaId={czytanka.id}
          comprehension={comprehension}
          audioBus={audioBus}
          onClose={() => setQuestionOpen(false)}
        />
      )}
    </div>
  )
}
