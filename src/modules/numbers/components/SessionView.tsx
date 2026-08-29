import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { CSSProperties, RefObject } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import type { Settings, Level } from '@/shared/settings/types'
import { useIdleDetector } from '@/shared/engagement/useIdleDetector'
import { usePageVisibility } from '@/shared/engagement/usePageVisibility'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { colors, radii, tapTargets } from '@/app/theme'
import { useNumbersSession, type SessionStatus } from '../hooks/useNumbersSession'
import { useNumbers } from '../store/numbersStore'
import { extractCorrectValue } from '../data/correctValue'
import { pickIconSet } from '../data/concreteSets'
import { promptAudioKeys, thinkingAloudKey } from '../data/promptAudio'
import { NUMBERS_PRAISE_KEYS, type NumbersPraiseKey } from '../data/praise'
import {
  MAX_STRATEGY_CUES_PER_SESSION,
  shouldChargeStrategyBudget,
  strategyAudioKey,
} from '../data/strategyAudio'
import type { AnswerOutcome, ExerciseType, Question } from '../types'
import { ConceptIntro } from './intros/ConceptIntro'
import { SessionEnd } from './SessionEnd'
import { PauseOverlay } from '@/shared/ui/PauseOverlay'
import { CountObjectsExercise } from './exercises/CountObjectsExercise'
import { SubitizeFlashExercise } from './exercises/SubitizeFlashExercise'
import { MatchDigitDotsExercise } from './exercises/MatchDigitDotsExercise'
import { NumberRhythmExercise } from './exercises/NumberRhythmExercise'
import { ConcreteAddExercise } from './exercises/ConcreteAddExercise'
import { NumberBondBuilder } from './exercises/NumberBondBuilder'
import { TenFrameFill } from './exercises/TenFrameFill'
import { ConcreteAddSubtract } from './exercises/ConcreteAddSubtract'
import { FactFamilyTriangle } from './exercises/FactFamilyTriangle'
import { DoublesExercise } from './exercises/DoublesExercise'
import { NearDoublesExercise } from './exercises/NearDoublesExercise'
import { Make10Exercise } from './exercises/Make10Exercise'
import { EqualGroupsExercise } from './exercises/EqualGroupsExercise'
import { SkipCountChase } from './exercises/SkipCountChase'
import { ArrayMatchExercise } from './exercises/ArrayMatchExercise'
import { SubtractMaintenance } from './exercises/SubtractMaintenance'

type Props = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  settings: Settings
  onExit: () => void
  onTree: () => void
  /**
   * Ref, do którego sesja wpina „zapisz częściowy postęp". KidNav w routingu
   * modułu woła go zanim odejdzie z ekranu — ⬅️/🏠 nie mogą gubić SRS.
   */
  quitRef?: RefObject<(() => void) | null>
}

// Minimalny czas overlayu feedbacku. Realne przejście następuje dopiero gdy
// kolejka audio (pochwała / "spróbuj jeszcze raz" + "tu było N") się domknie —
// stały timer ucinał korektę hypercorrection.
const MIN_FEEDBACK_MS = 2200
// Twardy limit — overlay nigdy nie może zablokować sesji, gdyby audio nie
// domknęło obietnicy.
const MAX_FEEDBACK_MS = 12_000
const IDLE_THRESHOLD_MS = 20_000

/**
 * Domyka obietnicę `play()` niezależnie od wyniku — czekamy na KONIEC klipu,
 * a brak pliku (404) czy `stop()` nie może zawiesić przejścia do następnego
 * pytania.
 */
function settled(promise: Promise<unknown> | undefined): Promise<void> {
  return Promise.resolve(promise).then(
    () => undefined,
    () => undefined,
  )
}

export function SessionView({ level, audioBus, settings, onExit, onTree, quitRef }: Props) {
  const session = useNumbersSession({
    level,
    audioBus,
    questionCount: settings.numbers.questionCount ?? settings.questionsPerSession,
    skipCountStep: settings.numbers.skipCountStep ?? 'mixed',
    treeCelebrationsOn: settings.numbers.treeCelebrationsOn ?? true,
    secondAttempt: settings.secondAttempt,
  })
  const seenIntros = useNumbers((s) => s.seenIntros)
  const markIntroSeen = useNumbers((s) => s.markIntroSeen)
  const startedRef = useRef(false)

  // Auto-start session na mount
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    session.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Anti-cheat: wyjście z zakładki / zablokowanie iPada → auto-pauza.
  usePageVisibility({
    enabled:
      session.status === 'asking' ||
      session.status === 'retry' ||
      session.status === 'feedback',
    onHidden: () => session.pause('visibility'),
    onVisible: () => {
      // Celowo bez auto-wznowienia — dziecko musi tapnąć Wznów.
    },
  })

  // `session` to nowy obiekt co render — flush trzymamy w refie, żeby efekt
  // unmountu miał zawsze aktualną wersję i nie restartował się co render.
  const flushFnRef = useRef(session.flush)
  flushFnRef.current = session.flush
  const flush = useCallback(() => {
    flushFnRef.current()
  }, [])

  // Wyjście dowolną drogą (KidNav ⬅️/🏠, wstecz przeglądarki, zmiana route'a)
  // musi utrwalić częściowy postęp. `flush` jest idempotentne.
  useEffect(() => {
    if (quitRef) quitRef.current = flush
    return () => {
      flush()
      if (quitRef) quitRef.current = null
    }
  }, [flush, quitRef])

  // Wyjście w trakcie sesji zapisuje częściowe wyniki (SRS by przepadł).
  const handleQuit = useCallback(() => {
    flush()
    onExit()
  }, [flush, onExit])

  const conceptsIntrosOn = settings.numbers.conceptIntros ?? true

  // Intro guard — pokaż ConceptIntro jeśli nie widziano dla tego konceptu
  const showIntro = useMemo(() => {
    if (!conceptsIntrosOn) return false
    if (!session.currentQuestion) return false
    if (session.status !== 'asking') return false
    const introKey = `intro-${session.currentQuestion.conceptId}`
    return !seenIntros.includes(introKey)
  }, [session.currentQuestion, session.status, seenIntros, conceptsIntrosOn])

  // Anti-cheat: idle 20 s bez interakcji → auto-pauza (jak w module liter).
  // ConceptIntro jest wyłączone z licznika — dziecko OGLĄDA worked example
  // i nic nie tapie, a auto-pauza ucinała je w pół zdania.
  useIdleDetector({
    thresholdMs: IDLE_THRESHOLD_MS,
    enabled: (session.status === 'asking' || session.status === 'retry') && !showIntro,
    onIdle: () => session.pause('idle'),
  })

  // Iskra „myśli na głos" — raz na sesję per typ ćwiczenia, PO promptcie
  // (efekt rodzica leci po efekcie ćwiczenia, więc kolejka FIFO ma dobrą kolejność).
  const thinkingAloudPlayedRef = useRef<Set<string>>(new Set())
  const thinkingAloudOn = settings.numbers.iskraThinkingAloud ?? true
  const currentExerciseType = session.currentQuestion?.exerciseType ?? null
  useEffect(() => {
    if (!thinkingAloudOn || showIntro || currentExerciseType === null) return
    const key = thinkingAloudKey(currentExerciseType)
    if (key === null || thinkingAloudPlayedRef.current.has(key)) return
    thinkingAloudPlayedRef.current.add(key)
    void audioBus.play(key)
  }, [thinkingAloudOn, showIntro, currentExerciseType, audioBus])

  // Nazwanie strategii po błędzie — limit na sesję, bo częściej brzmi jak
  // zrzędzenie. SessionView montuje się raz na sesję, więc ref startuje z zera.
  const strategyCuesRef = useRef(0)
  const strategyKey =
    session.lastOutcome !== null &&
    session.lastOutcome !== 'correct' &&
    session.currentQuestion !== null &&
    strategyCuesRef.current < MAX_STRATEGY_CUES_PER_SESSION
      ? strategyAudioKey(
          session.currentQuestion.conceptId,
          (session.currentQuestion.payload as { op?: '+' | '-' }).op ?? '+',
        )
      : null

  // Licznik rośnie w efekcie, nie w renderze. Klucz `questionIdx` sprawia, że
  // podwójne wywołanie efektu w StrictMode liczy jedną podpowiedź, nie dwie.
  // Budżet płacimy tylko za `wrong` — `dontKnow` nadal usłyszy strategię
  // (tworzy `strategyKey` powyżej), ale się nie liczy do limitu na sesję.
  const countedStrategyRef = useRef<string | null>(null)
  useEffect(() => {
    if (session.status !== 'feedback' || strategyKey === null) return
    const id = `${session.questionIdx}-${strategyKey}`
    if (countedStrategyRef.current === id) return
    countedStrategyRef.current = id
    if (session.lastOutcome !== null && shouldChargeStrategyBudget(session.lastOutcome)) {
      strategyCuesRef.current += 1
    }
  }, [session.status, session.questionIdx, strategyKey, session.lastOutcome])

  const handleRepeatPrompt = useCallback(() => {
    const keys = promptAudioKeys(session.currentQuestion)
    if (keys.length === 0) return
    // Stop przed play — powtórka ma restartować, nie kolejkować (jak w literach).
    audioBus.stop()
    // Kolejka jest FIFO — klucze lecą po sobie bez `await` i bez `stop()` w środku.
    for (const key of keys) void audioBus.play(key)
  }, [audioBus, session.currentQuestion])

  const handleDontKnow = useCallback(() => {
    // 🤷 w drugiej próbie = druga pomyłka: hiperkorekcja i lecimy dalej.
    if (session.status === 'retry') {
      session.answer('wrong', 2)
      return
    }
    session.answer('dontKnow')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.answer, session.status])

  const handleAnswer = useCallback(
    (outcome: AnswerOutcome, chosenValue?: number) => {
      session.answer(outcome, session.status === 'retry' ? 2 : 1, chosenValue)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.answer, session.status],
  )

  if (session.status === 'ended') {
    return (
      <SessionEnd
        counters={session.counters}
        audioBus={audioBus}
        onExit={onExit}
        onTree={onTree}
      />
    )
  }

  if (showIntro && session.currentQuestion) {
    return (
      <ConceptIntro
        conceptId={session.currentQuestion.conceptId}
        audioBus={audioBus}
        onContinue={() =>
          markIntroSeen(`intro-${session.currentQuestion!.conceptId}`)
        }
      />
    )
  }

  if (!session.currentQuestion) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        ⏳
      </div>
    )
  }

  const feedbackActive =
    session.status === 'feedback' ||
    (session.status === 'paused' && session.pausedFrom === 'feedback')
  // Pas korekty siedzi w PRZEPŁYWIE nad zadaniem, więc zadanie pod nim musi
  // pokazać POPRAWNĄ liczbę — dziecko widzi reprezentację tego, co słyszy
  // („tu było N").
  const revealValue =
    feedbackActive && session.lastOutcome !== null && session.lastOutcome !== 'correct'
      ? extractCorrectValue(session.currentQuestion)
      : null

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minHeight: 0,
      }}
    >
      <StatusBar
        counters={session.counters}
        currentIdx={session.questionIdx}
        total={session.questionCount}
        onPause={() => session.pause('manual')}
        onRepeatPrompt={handleRepeatPrompt}
        onDontKnow={handleDontKnow}
      />
      {/* Overlay ZOSTAJE zamontowany pod pauzą — unmount/remount kasował
          `nav-resume` (stop() w efekcie) i odliczał feedback od zera.
          Renderowany PRZED zadaniem: wariant korekty jest elementem przepływu
          (skraca miejsce na zadanie, nigdy go nie zasłania), a pochwała i tak
          jest absolutna na cały ekran — kolejność w DOM jej nie dotyczy. */}
      {feedbackActive && (
        <FeedbackOverlay
          outcome={session.lastOutcome ?? 'correct'}
          correctValue={extractCorrectValue(session.currentQuestion)}
          audioBus={audioBus}
          onAdvance={session.advance}
          paused={session.status === 'paused'}
          strategyKey={session.lastAttempt === 2 ? null : strategyKey}
          attempt={session.lastAttempt}
          {...(session.praiseKey !== null ? { praiseKey: session.praiseKey } : {})}
        />
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <ExerciseRouter
          question={session.currentQuestion}
          questionIdx={session.questionIdx}
          audioBus={audioBus}
          onAnswer={handleAnswer}
          revealValue={revealValue}
          {...(session.status === 'retry' && session.retryChoices !== null
            ? { restrictChoicesTo: session.retryChoices }
            : {})}
        />
      </div>
      {session.status === 'paused' && (
        <PauseOverlay
          onResume={session.resume}
          onQuit={handleQuit}
          position="absolute"
        />
      )}
    </div>
  )
}

type ExerciseProps = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  /**
   * Pełna sekwencja polecenia (liczby + operator + pytanie). Liczy ją router,
   * bo tylko on widzi całe `Question`; ćwiczenie zna jedynie `payload`.
   */
  promptKeys: string[]
  onAnswer: (outcome: AnswerOutcome, chosenValue?: number) => void
  /** Faza drugiej próby: dokładnie te dwie wartości zamiast dystraktorów. */
  restrictChoicesTo?: number[]
  /**
   * Feedback po pomyłce: liczba do POKAZANIA zamiast schowanej/odpowiedzianej
   * (`null` poza korektą). Ćwiczenia z reprezentacją liczby renderują
   * `revealValue ?? count`; reszta prop ignoruje.
   */
  revealValue?: number | null
  /**
   * Tylko `count-objects` — pozostałe ćwiczenia czytają `payload.args`.
   * Liczy to router, bo emoji i układ zależą od ziarna, którego ćwiczenie
   * nie umie samo wyprowadzić z faktu.
   */
  countObjects: { n: number; emoji: string; seed: number }
}

/** Ziarno układu obiektów: stałe w obrębie pytania, różne między pytaniami. */
function countSeed(factId: string, questionIdx: number): number {
  let h = 2166136261
  for (let i = 0; i < factId.length; i++) {
    h = Math.imul(h ^ factId.charCodeAt(i), 16777619)
  }
  return ((h >>> 0) % 100000) + questionIdx * 7919
}

function ExerciseRouter({
  question,
  questionIdx,
  audioBus,
  onAnswer,
  restrictChoicesTo,
  revealValue = null,
}: {
  question: Question
  questionIdx: number
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onAnswer: (outcome: AnswerOutcome, chosenValue?: number) => void
  restrictChoicesTo?: number[]
  revealValue?: number | null
}) {
  // Stabilna referencja — tablica trafia do deps `useEffect` ćwiczeń.
  const promptKeys = useMemo(() => promptAudioKeys(question), [question])
  const args = (question.payload as { args: number[] }).args
  const seed = countSeed(question.factId, questionIdx)
  const props: ExerciseProps = {
    audioBus,
    payload: question.payload as { args: number[] },
    promptKeys,
    onAnswer,
    revealValue,
    countObjects: { n: args[0] ?? 1, emoji: pickIconSet(seed).emoji, seed },
    ...(restrictChoicesTo !== undefined ? { restrictChoicesTo } : {}),
  }
  // Re-mount na zmianę question.factId — gwarantuje czysty stan ćwiczenia
  return <ExerciseSwitch key={question.factId} type={question.exerciseType} props={props} />
}

function ExerciseSwitch({
  type,
  props,
}: {
  type: ExerciseType
  props: ExerciseProps
}) {
  switch (type) {
    case 'count-objects':
      return (
        <CountObjectsExercise
          audioBus={props.audioBus}
          payload={props.countObjects}
          onAnswer={props.onAnswer}
          {...(props.restrictChoicesTo !== undefined
            ? { restrictChoicesTo: props.restrictChoicesTo }
            : {})}
        />
      )
    case 'subitize-flash':
      return <SubitizeFlashExercise {...props} />
    case 'match-digit-dots':
      return <MatchDigitDotsExercise {...props} />
    case 'number-rhythm':
      return <NumberRhythmExercise {...props} />
    case 'concrete-add':
      return <ConcreteAddExercise {...props} />
    case 'number-bond-builder':
      return <NumberBondBuilder {...props} />
    case 'ten-frame-fill':
      return <TenFrameFill {...props} />
    case 'concrete-add-subtract':
      return <ConcreteAddSubtract {...props} />
    case 'fact-family-triangle':
      return <FactFamilyTriangle {...props} />
    case 'doubles':
      return <DoublesExercise {...props} />
    case 'near-doubles':
      return <NearDoublesExercise {...props} />
    case 'make-10':
      return <Make10Exercise {...props} />
    case 'equal-groups':
      return <EqualGroupsExercise {...props} />
    case 'skip-count-chase':
      return <SkipCountChase {...props} />
    case 'array-match':
      return <ArrayMatchExercise {...props} />
    case 'subtract-maintenance':
      return <SubtractMaintenance {...props} />
  }
}

function StatusBar({
  counters,
  currentIdx,
  total,
  onPause,
  onRepeatPrompt,
  onDontKnow,
}: {
  counters: { correct: number; wrong: number; dontKnow: number }
  currentIdx: number
  total: number
  onPause: () => void
  onRepeatPrompt: () => void
  onDontKnow: () => void
}) {
  const pauseTap = useTapHandler({ onTap: onPause })
  const repeatTap = useTapHandler({ onTap: onRepeatPrompt })
  const dontKnowTap = useTapHandler({ onTap: onDontKnow })
  const dots = Array.from({ length: total }).map((_, i) => i < currentIdx)
  return (
    <div
      data-testid="status-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: `1px solid ${colors.text}22`,
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', gap: 12, fontSize: 18, fontFamily: 'var(--font-handwritten)' }}>
        <span aria-label={`${counters.correct} poprawnych`}>✅ {counters.correct}</span>
        <span aria-label={`${counters.wrong} błędów`}>❌ {counters.wrong}</span>
        <span aria-label={`${counters.dontKnow} nie wiem`}>🤷 {counters.dontKnow}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {dots.map((done, i) => (
          <span
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: done ? colors.accentBlue : '#e5e7eb',
              display: 'inline-block',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          data-testid="status-repeat"
          aria-label="Powtórz polecenie"
          {...repeatTap}
          style={{
            width: tapTargets.minSize,
            height: tapTargets.minSize,
            borderRadius: radii.kid,
            background: '#e0f2fe',
            border: `2px solid ${colors.accentBlue}`,
            fontSize: 22,
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          🔊
        </button>
        <button
          type="button"
          data-testid="status-dont-know"
          aria-label="Nie wiem"
          {...dontKnowTap}
          style={{
            width: tapTargets.minSize,
            height: tapTargets.minSize,
            borderRadius: radii.kid,
            background: '#f3f4f6',
            border: '2px solid #9ca3af',
            fontSize: 22,
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          🤷
        </button>
        <button
          type="button"
          data-testid="status-pause"
          aria-label="Pauza"
          {...pauseTap}
          style={{
            width: tapTargets.minSize,
            height: tapTargets.minSize,
            borderRadius: radii.kid,
            background: '#fef3c7',
            border: `2px solid #f59e0b`,
            fontSize: 22,
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ⏸
        </button>
      </div>
    </div>
  )
}

export function FeedbackOverlay({
  outcome,
  correctValue,
  audioBus,
  onAdvance,
  praiseKey,
  paused = false,
  strategyKey = null,
  attempt = 1,
}: {
  outcome: AnswerOutcome
  correctValue: number | null
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  onAdvance: () => void
  /** Pochwała wybrana przez hook sesji (wstrzykiwalne rng + brak powtórki). */
  praiseKey?: NumbersPraiseKey
  /** Pauza — wstrzymuje odliczanie; po wznowieniu audio leci raz jeszcze. */
  paused?: boolean
  /** Nazwa strategii grana po korekcie; null = limit sesji wyczerpany. */
  strategyKey?: string | null
  /** `2` = poprawka w drugiej próbie: cicha pochwała zamiast pełnej. */
  attempt?: 1 | 2
}) {
  const onAdvanceRef = useRef(onAdvance)
  // Prop czytany przez ref: rodzic dobija licznik jeszcze w trakcie feedbacku,
  // a zmiana klucza nie może przekolejkować całej ścieżki audio od nowa.
  const strategyKeyRef = useRef(strategyKey)
  strategyKeyRef.current = strategyKey
  useEffect(() => {
    onAdvanceRef.current = onAdvance
  }, [onAdvance])

  // Czas już „odsiedziany" na tym feedbacku i informacja czy audio już leciało.
  // Bez tego pauza resetowała odliczanie do pełnego MIN_FEEDBACK_MS, a stop()
  // przy wznowieniu zjadał cue `nav-resume`.
  const elapsedRef = useRef(0)
  const firstRunRef = useRef(true)
  useEffect(() => {
    elapsedRef.current = 0
    firstRunRef.current = true
  }, [outcome, correctValue, praiseKey, attempt])

  // Audio już wystawione dla BIEŻĄCEGO wystąpienia feedbacku (klucz treści +
  // lista obietnic `plays`). React w dev/StrictMode odpala ten efekt jako
  // setup→cleanup→setup przy pierwszym mouncie — bez tej pamięci druga kopia
  // dokładałaby DRUGI komplet `audioBus.play()` (dziecko słyszało `try-again`
  // dwa razy). Ta sama identyczność treści == druga kopia efektu, więc
  // ponownie wykorzystujemy JUŻ wystawione obietnice zamiast grać od nowa —
  // to odróżnia dubel StrictMode (identyczna treść, bez przejścia przez
  // pauzę) od prawdziwego wznowienia (identyczna treść, ale przez pauzę
  // czyścimy ten cache poniżej, więc audio celowo leci raz jeszcze).
  const activePlaysRef = useRef<{ identity: string; plays: Array<Promise<unknown>> } | null>(
    null,
  )

  useEffect(() => {
    if (paused) {
      activePlaysRef.current = null
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let safetyTimer: ReturnType<typeof setTimeout> | undefined
    const startedAt = Date.now()
    const alreadyElapsed = elapsedRef.current

    const identity = `${outcome}|${correctValue}|${praiseKey ?? ''}|${attempt}`
    let plays: Array<Promise<unknown>>

    if (activePlaysRef.current !== null && activePlaysRef.current.identity === identity) {
      // Dubel tej samej treści bez przejścia przez pauzę — odtwarzanie już
      // trwa (poprzedni run tego samego efektu je wystawił).
      plays = activePlaysRef.current.plays
    } else {
      // stop() tylko przy pierwszym wejściu — po wznowieniu kolejka zawiera
      // świeże `nav-resume`, którego nie wolno uciąć.
      if (firstRunRef.current) audioBus.stop()
      plays = []
      if (outcome === 'correct' && attempt === 2) {
        // Druga próba trafiona: cicha pochwała za autokorektę — bez pochwały
        // z puli, bo iskierki za to nie ma i fanfara byłaby obietnicą nagrody.
        plays.push(settled(audioBus.play('retry-correct')))
      } else if (outcome === 'correct') {
        const praise =
          praiseKey ?? NUMBERS_PRAISE_KEYS[Math.floor(Math.random() * NUMBERS_PRAISE_KEYS.length)]!
        plays.push(settled(audioBus.play(praise)))
      } else {
        plays.push(
          settled(audioBus.play(outcome === 'wrong' ? 'try-again-soft' : 'try-again')),
        )
        // Hypercorrection — kolejka jest FIFO, więc "tu było N" zagra zaraz po
        // korekcie; żadnego timera nie trzeba, a przejście czeka na koniec audio.
        if (correctValue !== null) {
          plays.push(settled(audioBus.play(`correct-show-${correctValue}`)))
        }
        // Strategia PO korekcie — najpierw wynik, potem narzędzie do liczenia.
        const strategy = strategyKeyRef.current
        if (strategy !== null) plays.push(settled(audioBus.play(strategy)))
      }
      activePlaysRef.current = { identity, plays }
    }
    firstRunRef.current = false

    // Bezpiecznik: gdyby audio nigdy nie zamknęło obietnicy (element bez
    // zdarzeń `ended`/`error`), sesja nie może utknąć na overlayu.
    const safety = new Promise<void>((resolve) => {
      safetyTimer = setTimeout(resolve, MAX_FEEDBACK_MS)
    })

    void Promise.race([Promise.all(plays), safety]).then(() => {
      if (cancelled) return
      const elapsed = alreadyElapsed + (Date.now() - startedAt)
      timer = setTimeout(
        () => {
          if (!cancelled) onAdvanceRef.current()
        },
        Math.max(0, MIN_FEEDBACK_MS - elapsed),
      )
    })

    return () => {
      cancelled = true
      elapsedRef.current = alreadyElapsed + (Date.now() - startedAt)
      if (timer !== undefined) clearTimeout(timer)
      if (safetyTimer !== undefined) clearTimeout(safetyTimer)
    }
  }, [outcome, correctValue, audioBus, praiseKey, paused, attempt])

  const emoji =
    outcome === 'correct' ? '✅' : outcome === 'wrong' ? '❌' : '🤷'

  // Korekta to PAS u góry, nie zasłona: dziecko musi widzieć zadanie z
  // odsłoniętą poprawną liczbą, gdy lektor mówi „tu było N". Pochwała zostaje
  // pełnoekranowa — to nagroda, nie moment nauki.
  const isCorrection = outcome !== 'correct'
  const commonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontFamily: 'var(--font-handwritten)',
    // 'auto' — overlay POCHŁANIA tapy w swoim obszarze. Pas korekty zajmuje
    // tylko górę ekranu, więc resztę zasłania przezroczysty scrim poniżej —
    // bez niego dziecko dotyka zadania (brudzi jego stan) zanim feedback minie.
    pointerEvents: 'auto',
  }
  const overlayStyle: CSSProperties = isCorrection
    ? {
        ...commonStyle,
        // W PRZEPŁYWIE pod StatusBarem, nie absolutnie nad zadaniem: pas nie
        // może zasłonić reprezentacji, którą właśnie odsłania („tu było N").
        position: 'relative',
        flex: '0 0 28%',
        minHeight: 96,
        width: '100%',
        background: 'rgba(239, 68, 68, 0.92)',
        gap: 24,
        // <2000 (PauseOverlay nad pasem), > scrim.
        zIndex: 900,
      }
    : {
        ...commonStyle,
        position: 'absolute',
        inset: 0,
        flexDirection: 'column',
        background: 'rgba(22, 163, 74, 0.85)',
        zIndex: 50,
      }

  return (
    <>
      {isCorrection && (
        <div
          data-testid="feedback-scrim"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'transparent',
            pointerEvents: 'auto',
            zIndex: 899,
          }}
        />
      )}
      <div data-testid="feedback-overlay" data-outcome={outcome} style={overlayStyle}>
        <div style={{ fontSize: isCorrection ? 64 : 160 }} aria-hidden="true">
          {emoji}
        </div>
        {isCorrection && correctValue !== null && (
          <div style={{ fontSize: 56, fontWeight: 800 }}>{correctValue}</div>
        )}
      </div>
    </>
  )
}

// Re-export for tests / external usage
export type { SessionStatus }
