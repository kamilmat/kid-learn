// useReadingSession — orkiestrator sesji czytania.
// Sekcje 6 (pętla nauki), 7 (SRS), 11 (wild celebrations) spec.
//
// Obsługuje 4 typy ćwiczeń zależnie od poziomu:
//   - iskierka: syllable-match (dopasuj sylabę z 4 opcji)
//   - plomyk:   word-assembly (ułóż słowo z sylab przez drag)
//   - ognik:    word-choice (wskaż właściwe słowo z 4 opcji)
//   - pochodnia: syllable-fill (uzupełnij brakującą sylabę)
//
// Wild celebration: co settings.reading.wildCelebrationFreq ± 2 poprawnych odpowiedzi
// w sesji, trigger jest wywoływany raz; po dismissal pauza jest kontynuowana.

import { useCallback, useRef, useState } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { playIntroOnce } from '@/shared/audio/playIntroOnce'
import { pickNoRepeat } from '@/shared/audio/pickNoRepeat'
import type { Level, Settings } from '@/shared/settings/types'
import type {
  ReadingQuestion,
  ReadingSessionEvent,
  SyllableState,
  WordState,
  SyllableFillVariant,
} from '../types'
import { LEVEL_TO_EXERCISE } from '../types'
import { getReadingPool } from '../data/levelPools'
import { ALL_SYLLABLES, getSyllableAudioKey } from '../data/syllables'
import { ALL_WORDS, getWordById, getWordsByLevel, getWordAudioKey } from '../data/words'
import { pickNextItem } from '@/shared/srs/select'
import { pickRandom, shuffled } from '@/shared/srs/distractors'
import { nextBox, nextRecentWrong } from '@/shared/srs/update'
import { useReading } from '../store/readingStore'
import type { Outcome } from '@/shared/srs/types'

// Domyślna liczba pytań na sesję (override: settings.reading.questionsPerSession[level])
const DEFAULT_QUESTIONS_PER_SESSION = 8

// Minimalny czas trzymania overlaya feedbacku — nawet gdy audio już wybrzmiało,
// 7-latek potrzebuje chwili na zobaczenie wyniku zanim ekran się zmieni.
export const MIN_FEEDBACK_MS = 1200

// Domyślna liczba dystraktorów dla syllable-match i word-choice
const CHOICE_COUNT = 4

// Progi ceremonii albumu (liczba odblokowanych kart)
const CEREMONY_MILESTONES = [10, 20, 30, 40, 50, 60]

// Pochwały czytania — po poprawnej odpowiedzi. Samo `sfx-correct-ding` było
// zbyt suche: dziecko potrzebuje słownej reakcji jak w module liter.
export const READING_PRAISE_KEYS = [
  'reading-praise-1',
  'reading-praise-2',
  'reading-praise-3',
  'reading-praise-4',
  'reading-praise-5',
  'reading-praise-6',
] as const

export type Status = 'idle' | 'asking' | 'feedback' | 'paused' | 'complete' | 'wild-celebration'
export type FeedbackVariant = null | 'correct' | 'wrong' | 'dontKnow' | 'wild'

export type SessionResult = {
  outcomes: Record<string, number>        // by outcome type: correct/wrong/dontKnow
  iskierkiEarned: number                  // poprawne odpowiedzi
  newAlbumWords: string[]                 // word ids unlocked this session
  durationMs: number
}

type Args = {
  level: Level
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  settings: Settings
  rng?: () => number
  now?: () => number
}

export type QuestionOutcome = 'correct' | 'wrong' | 'dontKnow'

type Hook = {
  status: Status
  totalQuestions: number
  currentQuestionIndex: number
  currentQuestion: ReadingQuestion | null
  feedbackVariant: FeedbackVariant
  paused: boolean
  results: SessionResult | null
  /** Bieżąca liczba iskierek (poprawnych odpowiedzi) w sesji — aktualizowana na bieżąco */
  iskierkiEarned: number
  /** Wyniki zakończonych pytań (indeks i < currentQuestionIndex) */
  questionOutcomes: QuestionOutcome[]

  start: () => void
  submitAnswer: (answer: string) => void
  submitDontKnow: () => void
  recordDropError: () => void
  /** `viaTap=true` gdy dziecko tapnęło overlay (gra cue), false przy auto-advance. */
  skipFeedback: (viaTap?: boolean) => void
  pause: () => void
  resume: () => void
  repeatAudio: () => void
  /** Zapisuje częściowe wyniki sesji (wyjście przez pauzę / SessionEnd). Idempotentne. */
  quit: () => void
  /** Rozwiązuje się gdy kolejka audio feedbacku bieżącego pytania wybrzmiała. */
  waitForFeedbackAudio: () => Promise<void>

  pickedScene: { wordId: string; sceneId: string } | null
}

// Buduje initial SyllableState dla danej sylaby
function makeInitialSyllableState(syllableId: string): SyllableState {
  return {
    id: syllableId,
    syllable: syllableId.replace('syl-', ''),
    box: 1,
    lastSeen: 0,
    recentWrong: 0,
    totalSeen: 0,
    totalCorrect: 0,
    totalWrong: 0,
  }
}

// Buduje initial WordState dla danego słowa
function makeInitialWordState(wordId: string, level: Level): WordState {
  const word = getWordById(wordId)
  return {
    id: wordId,
    word: word?.text ?? wordId,
    box: 1,
    lastSeen: 0,
    recentWrong: 0,
    totalSeen: 0,
    totalCorrect: 0,
    totalWrong: 0,
    level,
    album: false,
  }
}

// Generuje N unikalnych losowych elementów z tablicy wykluczając podane id
function pickRandomDistinct<T extends { id: string }>(
  pool: readonly T[],
  count: number,
  exclude: string[],
  rng: () => number,
): T[] {
  const available = pool.filter((x) => !exclude.includes(x.id))
  return shuffled(available, rng).slice(0, count)
}

// Generuje pytanie syllable-match (Iskierka)
function generateSyllableMatch(
  statesMap: Record<string, SyllableState>,
  activePool: string[],
  lastTarget: string | null,
  rng: () => number,
  now: number,
): Extract<ReadingQuestion, { type: 'syllable-match' }> {
  const targetId = pickNextItem(statesMap, activePool, lastTarget, now, rng)
  const targetSyllable = targetId.replace('syl-', '')
  // 3 dystraktorów z puli sylab (różne od targetu)
  const distractors = pickRandomDistinct(ALL_SYLLABLES, CHOICE_COUNT - 1, [targetId], rng)
  const choices = shuffled(
    [targetSyllable, ...distractors.map((d) => d.text)],
    rng,
  )
  return { type: 'syllable-match', targetSyllable, choices }
}

// Generuje pytanie word-assembly (Płomyk)
function generateWordAssembly(
  statesMap: Record<string, WordState>,
  activePool: string[],
  lastTarget: string | null,
  rng: () => number,
  now: number,
): Extract<ReadingQuestion, { type: 'word-assembly' }> {
  const targetId = pickNextItem(statesMap, activePool, lastTarget, now, rng)
  const word = getWordById(targetId)
  if (!word) throw new Error(`generateWordAssembly: brak słowa "${targetId}"`)

  // 2-3 dystraktorów sylab z puli Iskierka nie już w słowie
  const targetSyllableIds = word.syllables.map((s) => getSyllableAudioKey(s))
  const distractorCount = 2 + (rng() < 0.5 ? 0 : 1) // 2 lub 3
  const distractors = pickRandomDistinct(ALL_SYLLABLES, distractorCount, targetSyllableIds, rng)

  return {
    type: 'word-assembly',
    targetWord: word.text,
    syllables: [...word.syllables],
    distractors: distractors.map((d) => d.text),
  }
}

// Generuje pytanie word-choice (Ognik)
function generateWordChoice(
  statesMap: Record<string, WordState>,
  activePool: string[],
  lastTarget: string | null,
  rng: () => number,
  now: number,
): Extract<ReadingQuestion, { type: 'word-choice' }> {
  const targetId = pickNextItem(statesMap, activePool, lastTarget, now, rng)
  const word = getWordById(targetId)
  if (!word) throw new Error(`generateWordChoice: brak słowa "${targetId}"`)

  // 3 dystraktorów z puli tego poziomu
  const levelWords = getWordsByLevel(word.level)
  const distractors = pickRandomDistinct(levelWords, CHOICE_COUNT - 1, [targetId], rng)
  const choices = shuffled(
    [word.text, ...distractors.map((d) => d.text)],
    rng,
  )

  return { type: 'word-choice', targetWord: word.text, choices }
}

// Pula unikalnych sylab ze wszystkich słów (wszystkie poziomy) — bogatsza niż ALL_SYLLABLES.
// Obliczana raz przy załadowaniu modułu — używana do dopasowania długości dystraktorów.
const ALL_WORD_SYLLABLES: string[] = (() => {
  const set = new Set<string>()
  for (const word of ALL_WORDS) {
    for (const syl of word.syllables) {
      set.add(syl)
    }
  }
  return Array.from(set)
})()

// Wybiera N dystraktorów dla syllable-fill preferując sylaby o długości zbliżonej do targetu (±1).
// Jeśli za mało kandydatów ±1, rozszerza tolerancję do ±2, a na końcu bierze całą pulę.
function pickSyllableFillDistractors(
  missingSyllable: string,
  count: number,
  rng: () => number,
): string[] {
  const targetLen = missingSyllable.length

  const byTolerance = (tol: number) =>
    ALL_WORD_SYLLABLES.filter(
      (s) => s !== missingSyllable && Math.abs(s.length - targetLen) <= tol,
    )

  const preferred1 = byTolerance(1)
  const preferred2 = byTolerance(2)
  const fallback = ALL_WORD_SYLLABLES.filter((s) => s !== missingSyllable)

  const pool =
    preferred1.length >= count
      ? preferred1
      : preferred2.length >= count
        ? preferred2
        : fallback

  return shuffled(pool, rng).slice(0, count)
}

// Generuje pytanie syllable-fill (Pochodnia)
function generateSyllableFill(
  statesMap: Record<string, WordState>,
  activePool: string[],
  lastTarget: string | null,
  rng: () => number,
  now: number,
): Extract<ReadingQuestion, { type: 'syllable-fill' }> {
  const targetId = pickNextItem(statesMap, activePool, lastTarget, now, rng)
  const word = getWordById(targetId)
  if (!word) throw new Error(`generateSyllableFill: brak słowa "${targetId}"`)

  const syllablesArr = word.syllables
  // missingPosition: last preferowane dla niskiego boxa, first dla wysokiego
  const state = statesMap[targetId]
  const isHighBox = state && state.box >= 4
  let missingPosition: SyllableFillVariant
  if (syllablesArr.length === 1) {
    missingPosition = 'first'
  } else if (syllablesArr.length === 2) {
    // tylko first lub last
    missingPosition = isHighBox ? 'first' : 'last'
  } else {
    // wielosylabowe: last preferred dla low box, first dla high box, middle też dostępne
    const positions: SyllableFillVariant[] = isHighBox
      ? ['first', 'middle']
      : ['last', 'middle']
    missingPosition = pickRandom(positions, rng)
  }

  let missingIndex: number
  if (missingPosition === 'first') {
    missingIndex = 0
  } else if (missingPosition === 'last') {
    missingIndex = syllablesArr.length - 1
  } else {
    // middle: środkowy element (roundDown dla parzystej liczby)
    missingIndex = Math.floor(syllablesArr.length / 2)
  }

  const missingSyllable = syllablesArr[missingIndex] ?? syllablesArr[0] ?? ''
  const visibleSyllables = syllablesArr.filter((_, i) => i !== missingIndex)

  // Dystraktorzy dobrani z bogatej puli z dopasowaniem długości (bug-fix: nie MA/TA dla DŹWIEDŹ)
  const distractorTexts = pickSyllableFillDistractors(missingSyllable, CHOICE_COUNT - 1, rng)
  const choices = shuffled(
    [missingSyllable, ...distractorTexts],
    rng,
  )

  return {
    type: 'syllable-fill',
    targetWord: word.text,
    missingPosition,
    missingSyllable,
    choices,
    visibleSyllables,
  }
}

// Kolejkuje audio promptu. NIE woła `stop()` — kolejka AudioBus jest FIFO, więc
// prompt gra po tym co już zakolejkowano (intro poziomu w `start()`, cue `nav-tap`
// przy tapnięciu w feedback). Kto potrzebuje uciszyć poprzednie audio, woła
// `audioBus.stop()` jawnie (start, skipFeedback, repeatAudio, pause).
function playPromptAudio(
  question: ReadingQuestion,
  audioBus: Pick<AudioBus, 'play' | 'stop'>,
): void {
  switch (question.type) {
    case 'syllable-match':
      void audioBus.play(getSyllableAudioKey(question.targetSyllable))
      break
    case 'word-assembly':
      // Krótka zachęta + sekwencja sylab
      void audioBus.play(`reading-plomyk-intro`)
      void audioBus.play(getWordAudioKey(question.targetWord))
      break
    case 'word-choice':
      void audioBus.play(getWordAudioKey(question.targetWord))
      break
    case 'syllable-fill':
      void audioBus.play(getWordAudioKey(question.targetWord))
      break
  }
}

export function useReadingSession({ level, audioBus, settings, rng = Math.random, now = () => Date.now() }: Args): Hook {
  // Selektory zamiast `useReading()` — hook rerenderuje się tylko przy zmianie
  // map SRS, a nie przy każdym zapisie do store'u (album, ceremonie, licznik).
  const persistedSyllables = useReading((st) => st.syllables)
  const persistedWords = useReading((st) => st.words)

  const [status, setStatus] = useState<Status>('idle')
  const [currentQuestion, setCurrentQuestion] = useState<ReadingQuestion | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [feedbackVariant, setFeedbackVariant] = useState<FeedbackVariant>(null)
  const [paused, setPaused] = useState(false)
  const [results, setResults] = useState<SessionResult | null>(null)
  const [pickedScene, setPickedScene] = useState<{ wordId: string; sceneId: string } | null>(null)
  const [iskierkiEarned, setIskierkiEarned] = useState(0)
  const [questionOutcomes, setQuestionOutcomes] = useState<QuestionOutcome[]>([])

  // Internal refs — unikamy stale closures w callbackach
  const statusRef = useRef<Status>('idle')
  const currentQuestionRef = useRef<ReadingQuestion | null>(null)
  const currentQuestionIndexRef = useRef(0)
  const startedAtRef = useRef<number>(0)
  const lastTargetRef = useRef<string | null>(null)

  // SRS states dla aktualnej sesji — mutowane inplace, zapisywane do store na końcu
  const syllableStatesRef = useRef<Record<string, SyllableState>>({})
  const wordStatesRef = useRef<Record<string, WordState>>({})

  // Outcome counters
  const correctCountRef = useRef(0)
  const wrongCountRef = useRef(0)
  const dontKnowCountRef = useRef(0)

  // Album tracking — nowe słowa zdobyte w sesji
  const newAlbumWordsRef = useRef<string[]>([])

  // Wynik aktualnego pytania — ustawiany w handleOutcome, pushowany w advance
  const pendingOutcomeRef = useRef<QuestionOutcome | null>(null)

  // Wild celebration jitter — obliczany raz na sesję
  const wildJitterRef = useRef(0)

  // Zapamiętuje status sprzed pauzy (asking lub feedback) — potrzebne do prawidłowego resume
  const prePauseStatusRef = useRef<Status>('idle')

  // Log eventów per pytanie (R5) — trafia do SessionLog w store
  const eventsRef = useRef<ReadingSessionEvent[]>([])
  const questionStartedAtRef = useRef(0)

  // Sesja już zapisana do store (complete albo quit) — chroni przed podwójnym zapisem
  const finishedRef = useRef(false)

  // Kolejka audio feedbacku bieżącego pytania — overlay czeka na jej koniec (R1)
  const feedbackAudioRef = useRef<Promise<unknown>>(Promise.resolve())

  // Ostatnia zagrana pochwała — picker nie powtarza jej dwa razy pod rząd
  const lastPraiseRef = useRef<string | null>(null)

  const questionsPerSession =
    settings.reading.questionsPerSession[level] ?? DEFAULT_QUESTIONS_PER_SESSION

  // Synchronizuj ref ze stanem
  statusRef.current = status
  currentQuestionRef.current = currentQuestion
  currentQuestionIndexRef.current = currentQuestionIndex

  // Buduje mapę SRS states dla puli Iskierka (syllables)
  const buildSyllableStates = useCallback((): Record<string, SyllableState> => {
    const states: Record<string, SyllableState> = {}
    for (const syl of ALL_SYLLABLES) {
      const persisted = persistedSyllables[syl.id]
      states[syl.id] = persisted ?? makeInitialSyllableState(syl.id)
    }
    return states
  }, [persistedSyllables])

  // Buduje mapę SRS states dla puli słów danego poziomu
  const buildWordStates = useCallback(
    (lvl: Level): Record<string, WordState> => {
      const states: Record<string, WordState> = {}
      const words = getWordsByLevel(lvl)
      for (const w of words) {
        const persisted = persistedWords[w.id]
        states[w.id] = persisted ?? makeInitialWordState(w.id, lvl)
      }
      return states
    },
    [persistedWords],
  )

  // Generuje następne pytanie i ustawia state
  const generateQuestion = useCallback(
    (questionIndex: number): void => {
      const pool = getReadingPool(level)
      const exerciseType = LEVEL_TO_EXERCISE[level]

      let question: ReadingQuestion
      const nowMs = now()

      try {
        switch (exerciseType) {
          case 'syllable-match': {
            const q = generateSyllableMatch(
              syllableStatesRef.current,
              pool.itemIds,
              lastTargetRef.current,
              rng,
              nowMs,
            )
            lastTargetRef.current = getSyllableAudioKey(q.targetSyllable)
            question = q
            break
          }
          case 'word-assembly': {
            const q = generateWordAssembly(
              wordStatesRef.current,
              pool.itemIds,
              lastTargetRef.current,
              rng,
              nowMs,
            )
            lastTargetRef.current = `word-${q.targetWord}`
            question = q
            break
          }
          case 'word-choice': {
            const q = generateWordChoice(
              wordStatesRef.current,
              pool.itemIds,
              lastTargetRef.current,
              rng,
              nowMs,
            )
            lastTargetRef.current = `word-${q.targetWord}`
            question = q
            break
          }
          case 'syllable-fill': {
            const q = generateSyllableFill(
              wordStatesRef.current,
              pool.itemIds,
              lastTargetRef.current,
              rng,
              nowMs,
            )
            lastTargetRef.current = `word-${q.targetWord}`
            question = q
            break
          }
        }
      } catch {
        // Fallback — nie powinno się zdarzyć jeśli pule mają elementy
        throw new Error(`useReadingSession: nie można wygenerować pytania dla "${level}"`)
      }

      questionStartedAtRef.current = nowMs
      currentQuestionIndexRef.current = questionIndex
      setCurrentQuestionIndex(questionIndex)
      setCurrentQuestion(question)
      setFeedbackVariant(null)
      setStatus('asking')
      statusRef.current = 'asking'

      // Odgraj audio promptu dla nowego pytania
      playPromptAudio(question, audioBus)
    },
    [level, audioBus, rng, now],
  )

  // Aktualizuje SRS state dla sylaby
  const updateSyllableState = useCallback((syllableId: string, outcome: Outcome): void => {
    const current = syllableStatesRef.current[syllableId]
    if (!current) return
    const nowMs = now()
    const updated: SyllableState = {
      ...current,
      box: nextBox(current.box, outcome),
      recentWrong: nextRecentWrong(current.recentWrong, outcome),
      lastSeen: nowMs,
      totalSeen: current.totalSeen + 1,
      totalCorrect: outcome === 'correct' ? current.totalCorrect + 1 : current.totalCorrect,
      totalWrong: outcome === 'wrong' ? current.totalWrong + 1 : current.totalWrong,
    }
    syllableStatesRef.current = { ...syllableStatesRef.current, [syllableId]: updated }
  }, [now])

  // Aktualizuje SRS state dla słowa
  const updateWordState = useCallback((wordId: string, outcome: Outcome): boolean => {
    const current = wordStatesRef.current[wordId]
    if (!current) return false
    const nowMs = now()
    const prevBox = current.box
    const newBox = nextBox(prevBox, outcome)
    const updated: WordState = {
      ...current,
      box: newBox,
      recentWrong: nextRecentWrong(current.recentWrong, outcome),
      lastSeen: nowMs,
      totalSeen: current.totalSeen + 1,
      totalCorrect: outcome === 'correct' ? current.totalCorrect + 1 : current.totalCorrect,
      totalWrong: outcome === 'wrong' ? current.totalWrong + 1 : current.totalWrong,
    }
    wordStatesRef.current = { ...wordStatesRef.current, [wordId]: updated }
    // Zwraca true jeśli właśnie osiągnięto box 5 po raz pierwszy
    return newBox === 5 && prevBox < 5 && !current.album
  }, [now])

  // Obsługuje outcome (correct/wrong/dontKnow) dla aktualnego pytania
  const handleOutcome = useCallback(
    (outcome: Outcome): void => {
      const q = currentQuestionRef.current
      if (!q) return

      const isCorrect = outcome === 'correct'
      // Nowa karta w albumie — cue audio dokleja się do kolejki feedbacku
      let unlockedAlbumCard = false

      // Aktualizuj SRS
      let targetId: string
      if (q.type === 'syllable-match') {
        targetId = getSyllableAudioKey(q.targetSyllable)
        updateSyllableState(targetId, outcome)
      } else {
        targetId = ALL_WORDS.find((w) => w.text === q.targetWord)?.id ?? `word-${q.targetWord}`
        const newlyMastered = updateWordState(targetId, outcome)
        if (newlyMastered) {
          newAlbumWordsRef.current = [...newAlbumWordsRef.current, targetId]
          unlockedAlbumCard = true
        }
      }

      // Event pytania — raport rodzica potrzebuje per-item historii, nie tylko sum
      const answeredAt = now()
      eventsRef.current = [
        ...eventsRef.current,
        {
          questionIndex: currentQuestionIndexRef.current,
          exerciseType: q.type,
          targetId,
          outcome,
          responseMs: Math.max(0, answeredAt - questionStartedAtRef.current),
          timestamp: answeredAt,
        },
      ]

      // Zapisz wynik pytania (pushowany do questionOutcomes w advance)
      pendingOutcomeRef.current = isCorrect ? 'correct' : outcome === 'wrong' ? 'wrong' : 'dontKnow'

      // Zaktualizuj liczniki
      const plays: Promise<unknown>[] = []
      if (isCorrect) {
        correctCountRef.current += 1
        setIskierkiEarned(correctCountRef.current)
        // Wild celebration check — używamy getState() żeby mieć aktualne wartości
        // po synchronicznym incrementWildCounter (store.set jest sync)
        const readingStore = useReading.getState()
        readingStore.incrementWildCounter()
        const currentCounter = useReading.getState().wildCelebrationCounter
        const freq = settings.reading.wildCelebrationFreq
        const threshold = freq + wildJitterRef.current
        if (currentCounter >= threshold) {
          // Trigger wild celebration — ustawiamy status=feedback z wariantem 'wild'
          // skipFeedback/advance flow przejdzie do następnego pytania lub końca sesji
          setFeedbackVariant('wild')
          setStatus('feedback')
          statusRef.current = 'feedback'
          useReading.getState().resetWildCounter()
          // sfx-mastery-fanfara is the existing fanfara key (sfx-fanfara-special deferred to SFX library)
          const wildPlays: Promise<unknown>[] = [audioBus.play('sfx-mastery-fanfara')]
          if (unlockedAlbumCard) wildPlays.push(audioBus.play('reading-album-unlock'))
          feedbackAudioRef.current = Promise.all(wildPlays)
          return
        }
        plays.push(audioBus.play('sfx-correct-ding'))
        const praiseKey = pickNoRepeat(READING_PRAISE_KEYS, lastPraiseRef.current, rng)
        lastPraiseRef.current = praiseKey
        plays.push(audioBus.play(praiseKey))
      } else if (outcome === 'wrong') {
        wrongCountRef.current += 1
        plays.push(audioBus.play('reading-wrong-prefix'))
        // Powtórz słowo/sylabę po korekcie
        plays.push(
          q.type === 'syllable-match'
            ? audioBus.play(getSyllableAudioKey(q.targetSyllable))
            : audioBus.play(getWordAudioKey(q.targetWord)),
        )
      } else if (outcome === 'dontKnow') {
        dontKnowCountRef.current += 1
        plays.push(audioBus.play('reading-dont-know'))
        plays.push(
          q.type === 'syllable-match'
            ? audioBus.play(getSyllableAudioKey(q.targetSyllable))
            : audioBus.play(getWordAudioKey(q.targetWord)),
        )
      }

      if (unlockedAlbumCard) plays.push(audioBus.play('reading-album-unlock'))

      // Overlay feedbacku auto-advance'uje gdy ta kolejka wybrzmi (min. MIN_FEEDBACK_MS)
      feedbackAudioRef.current = Promise.all(plays)

      setFeedbackVariant(isCorrect ? 'correct' : outcome === 'wrong' ? 'wrong' : 'dontKnow')
      setStatus('feedback')
      statusRef.current = 'feedback'
    },
    [audioBus, now, rng, settings, updateSyllableState, updateWordState],
  )

  // Zapisuje wyniki sesji do store — wołane na końcu sesji ORAZ przy wyjściu
  // przez pauzę (inaczej częściowy postęp SRS przepadał). Idempotentne.
  const persistSession = useCallback((): void => {
    if (finishedRef.current) return
    finishedRef.current = true
    const sessionLog = {
      startedAt: startedAtRef.current,
      endedAt: now(),
      level,
      events: eventsRef.current,
    }
    // Używamy getState() żeby mieć synchroniczny dostęp do store
    useReading.getState().applySessionResults(
      syllableStatesRef.current,
      wordStatesRef.current,
      sessionLog,
    )
    // Dodaj nowe słowa do albumu + sprawdź milestone ceremonii
    const prevAlbumCount = useReading.getState().albumUnlocked.length
    for (const wordId of newAlbumWordsRef.current) {
      useReading.getState().addToAlbum(wordId)
    }
    const newAlbumCount = useReading.getState().albumUnlocked.length
    for (const m of CEREMONY_MILESTONES) {
      if (prevAlbumCount < m && newAlbumCount >= m) {
        useReading.getState().setPendingCeremony(m)
        break
      }
    }
  }, [level, now])

  // Przechodzi do następnego pytania lub kończy sesję
  const advance = useCallback((): void => {
    // Pushuj wynik zakończonego pytania do questionOutcomes
    if (pendingOutcomeRef.current !== null) {
      const outcome = pendingOutcomeRef.current
      pendingOutcomeRef.current = null
      setQuestionOutcomes((prev) => [...prev, outcome])
    }

    const nextIndex = currentQuestionIndexRef.current + 1
    if (nextIndex >= questionsPerSession) {
      // Sesja zakończona
      const durationMs = now() - startedAtRef.current
      const sessionResults: SessionResult = {
        outcomes: {
          correct: correctCountRef.current,
          wrong: wrongCountRef.current,
          dontKnow: dontKnowCountRef.current,
        },
        iskierkiEarned: correctCountRef.current,
        newAlbumWords: [...newAlbumWordsRef.current],
        durationMs,
      }
      persistSession()

      setResults(sessionResults)
      setCurrentQuestion(null)
      setFeedbackVariant(null)
      setStatus('complete')
      statusRef.current = 'complete'
      return
    }
    generateQuestion(nextIndex)
  }, [generateQuestion, now, persistSession, questionsPerSession])

  const start = useCallback((): void => {
    // Reset stanu
    correctCountRef.current = 0
    wrongCountRef.current = 0
    dontKnowCountRef.current = 0
    newAlbumWordsRef.current = []
    lastTargetRef.current = null
    startedAtRef.current = now()
    setResults(null)
    setPickedScene(null)
    setIskierkiEarned(0)
    setQuestionOutcomes([])
    pendingOutcomeRef.current = null
    eventsRef.current = []
    finishedRef.current = false
    feedbackAudioRef.current = Promise.resolve()
    lastPraiseRef.current = null

    // Oblicz jitter dla tej sesji: ±2
    wildJitterRef.current = Math.floor(rng() * 5) - 2  // -2, -1, 0, 1, 2

    // Licznik wild celebration jest persistowany — bez resetu nowa sesja startowała
    // z licznikiem z poprzedniej i potrafiła odpalić fajerwerki na pierwszym pytaniu.
    useReading.getState().resetWildCounter()

    // Inicjalizuj SRS states z persisted store lub default
    syllableStatesRef.current = buildSyllableStates()
    if (level !== 'iskierka') {
      wordStatesRef.current = buildWordStates(level)
    }

    // Wyczyść kolejkę audio z poprzednich sesji/intro
    audioBus.stop()

    // Onboarding głosowy poziomu — 1× per poziom. Kolejkowany TU (a nie w efekcie
    // SessionView), bo `stop()` powyżej ucinał intro w tym samym mouncie i palił
    // flagę na zawsze. Flaga zapala się dopiero gdy audio dograło do końca.
    const introKey = `reading-${level}-intro`
    void playIntroOnce(
      audioBus,
      introKey,
      (k) => useReading.getState().hasSeenIntro(k),
      (k) => useReading.getState().markIntroSeen(k),
    )

    // Prompt pierwszego pytania dokleja się za intro (kolejka FIFO)
    generateQuestion(0)
  }, [audioBus, buildSyllableStates, buildWordStates, generateQuestion, level, now, rng])

  const submitAnswer = useCallback(
    (answer: string): void => {
      if (statusRef.current !== 'asking') return
      const q = currentQuestionRef.current
      if (!q) return

      let isCorrect = false
      switch (q.type) {
        case 'syllable-match':
          isCorrect = answer === q.targetSyllable
          break
        case 'word-assembly':
          isCorrect = answer === q.targetWord
          break
        case 'word-choice':
          isCorrect = answer === q.targetWord
          break
        case 'syllable-fill':
          isCorrect = answer === q.missingSyllable
          break
      }

      handleOutcome(isCorrect ? 'correct' : 'wrong')
    },
    [handleOutcome],
  )

  const submitDontKnow = useCallback((): void => {
    if (statusRef.current !== 'asking') return
    handleOutcome('dontKnow')
  }, [handleOutcome])

  // recordDropError: liczy błędny drop ale nie kończy pytania (dla word-assembly)
  const recordDropError = useCallback((): void => {
    if (statusRef.current !== 'asking') return
    // Inkrementuj counter błędów (nie ma efektu na status)
    // correction-prefix jako zastępnik sfx-drop-error (SFX library deferred)
    void audioBus.play('correction-prefix')
  }, [audioBus])

  const skipFeedback = useCallback((viaTap = false): void => {
    if (statusRef.current !== 'feedback') return
    audioBus.stop()
    // „Każdy klik mówi co zrobił" — krótkie cue potwierdzające tap; prompt
    // następnego pytania dokleja się za nim w kolejce FIFO.
    if (viaTap) void audioBus.play('nav-tap')
    advance()
  }, [advance, audioBus])

  const pause = useCallback((): void => {
    if (statusRef.current === 'asking' || statusRef.current === 'feedback') {
      prePauseStatusRef.current = statusRef.current
      setPaused(true)
      setStatus('paused')
      statusRef.current = 'paused'
      // Bez stop() prompt/feedback mówił dalej zza overlaya pauzy
      audioBus.stop()
      void audioBus.play('nav-pause')
    }
  }, [audioBus])

  const resume = useCallback((): void => {
    if (statusRef.current !== 'paused') return
    setPaused(false)
    // Przywróć status sprzed pauzy (asking lub feedback) — inaczej skipFeedback() guard nie przejdzie
    const restored = prePauseStatusRef.current
    setStatus(restored)
    statusRef.current = restored
    void audioBus.play('nav-resume')
    // Pauza w trakcie feedbacku ucięła kolejkę audio (`stop()` w pause), więc
    // po wznowieniu overlay stałby w ciszy — a przy wariancie 'wild' nikt już
    // nie zawołałby skipFeedback i sesja zostawała zakleszczona na zawsze.
    // Przechodzimy od razu do następnego pytania (odpowiedź jest zalogowana).
    if (restored === 'feedback') advance()
  }, [advance, audioBus])

  const repeatAudio = useCallback((): void => {
    const q = currentQuestionRef.current
    if (!q) return
    audioBus.stop()
    playPromptAudio(q, audioBus)
  }, [audioBus])

  const quitSession = useCallback((): void => {
    // Nic nie odpowiedziano — nie zaśmiecamy historii pustą sesją
    if (finishedRef.current || eventsRef.current.length === 0) return
    audioBus.stop()
    persistSession()
  }, [audioBus, persistSession])

  const waitForFeedbackAudio = useCallback(
    (): Promise<void> => Promise.resolve(feedbackAudioRef.current).then(() => undefined),
    [],
  )

  return {
    status,
    totalQuestions: questionsPerSession,
    currentQuestionIndex,
    currentQuestion,
    feedbackVariant,
    paused,
    results,
    iskierkiEarned,
    questionOutcomes,
    start,
    submitAnswer,
    submitDontKnow,
    recordDropError,
    skipFeedback,
    pause,
    resume,
    repeatAudio,
    quit: quitSession,
    waitForFeedbackAudio,
    pickedScene,
  }
}
