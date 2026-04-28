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
import type { Level, Settings } from '@/shared/settings/types'
import type {
  ReadingQuestion,
  SyllableState,
  WordState,
  SyllableFillVariant,
} from '../types'
import { LEVEL_TO_EXERCISE } from '../types'
import { getReadingPool } from '../data/levelPools'
import { ALL_SYLLABLES, getSyllableAudioKey } from '../data/syllables'
import { ALL_WORDS, getWordById, getWordsByLevel } from '../data/words'
import { pickNextItem } from '@/shared/srs/select'
import { nextBox, nextRecentWrong } from '@/shared/srs/update'
import { useReading } from '../store/readingStore'
import type { Outcome } from '@/shared/srs/types'

// Stała liczba pytań na sesję
const QUESTIONS_PER_SESSION = 8

// Domyślna liczba dystraktorów dla syllable-match i word-choice
const CHOICE_COUNT = 4

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

type Hook = {
  status: Status
  totalQuestions: number
  currentQuestionIndex: number
  currentQuestion: ReadingQuestion | null
  feedbackVariant: FeedbackVariant
  paused: boolean
  results: SessionResult | null

  start: () => void
  submitAnswer: (answer: string) => void
  submitDontKnow: () => void
  recordDropError: () => void
  skipFeedback: () => void
  pause: () => void
  resume: () => void
  repeatAudio: () => void

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

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = result[i]
    const b = result[j]
    if (a !== undefined && b !== undefined) {
      result[i] = b
      result[j] = a
    }
  }
  return result
}

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)] as T
}

// Generuje N unikalnych losowych elementów z tablicy wykluczając podane id
function pickRandomDistinct<T extends { id: string }>(
  pool: readonly T[],
  count: number,
  exclude: string[],
  rng: () => number,
): T[] {
  const available = pool.filter((x) => !exclude.includes(x.id))
  const shuffled = shuffleArray(available, rng)
  return shuffled.slice(0, count)
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
  const choices = shuffleArray(
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
  const choices = shuffleArray(
    [word.text, ...distractors.map((d) => d.text)],
    rng,
  )

  return { type: 'word-choice', targetWord: word.text, choices }
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

  // Dystraktorzy sylab z puli Iskierka
  const missingId = getSyllableAudioKey(missingSyllable)
  const distractors = pickRandomDistinct(ALL_SYLLABLES, CHOICE_COUNT - 1, [missingId], rng)
  const choices = shuffleArray(
    [missingSyllable, ...distractors.map((d) => d.text)],
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

// Odgrywa audio promptu dla aktualnego pytania
function playPromptAudio(
  question: ReadingQuestion,
  audioBus: Pick<AudioBus, 'play' | 'stop'>,
): void {
  audioBus.stop()
  switch (question.type) {
    case 'syllable-match':
      void audioBus.play(getSyllableAudioKey(question.targetSyllable))
      break
    case 'word-assembly':
      // Krótka zachęta + sekwencja sylab
      void audioBus.play(`reading-plomyk-intro`)
      void audioBus.play(`word-${question.targetWord}`)
      break
    case 'word-choice':
      void audioBus.play(`word-${question.targetWord}`)
      break
    case 'syllable-fill':
      void audioBus.play(`word-${question.targetWord}`)
      break
  }
}

export function useReadingSession({ level, audioBus, settings, rng = Math.random, now = () => Date.now() }: Args): Hook {
  const store = useReading()

  const [status, setStatus] = useState<Status>('idle')
  const [currentQuestion, setCurrentQuestion] = useState<ReadingQuestion | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [feedbackVariant, setFeedbackVariant] = useState<FeedbackVariant>(null)
  const [paused, setPaused] = useState(false)
  const [results, setResults] = useState<SessionResult | null>(null)
  const [pickedScene, setPickedScene] = useState<{ wordId: string; sceneId: string } | null>(null)

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

  // Wild celebration jitter — obliczany raz na sesję
  const wildJitterRef = useRef(0)

  // Zapamiętuje status sprzed pauzy (asking lub feedback) — potrzebne do prawidłowego resume
  const prePauseStatusRef = useRef<Status>('idle')

  // Synchronizuj ref ze stanem
  statusRef.current = status
  currentQuestionRef.current = currentQuestion
  currentQuestionIndexRef.current = currentQuestionIndex

  // Buduje mapę SRS states dla puli Iskierka (syllables)
  const buildSyllableStates = useCallback((): Record<string, SyllableState> => {
    const states: Record<string, SyllableState> = {}
    for (const syl of ALL_SYLLABLES) {
      const persisted = store.syllables[syl.id]
      states[syl.id] = persisted ?? makeInitialSyllableState(syl.id)
    }
    return states
  }, [store.syllables])

  // Buduje mapę SRS states dla puli słów danego poziomu
  const buildWordStates = useCallback(
    (lvl: Level): Record<string, WordState> => {
      const states: Record<string, WordState> = {}
      const words = getWordsByLevel(lvl)
      for (const w of words) {
        const persisted = store.words[w.id]
        states[w.id] = persisted ?? makeInitialWordState(w.id, lvl)
      }
      return states
    },
    [store.words],
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

      // Aktualizuj SRS
      switch (q.type) {
        case 'syllable-match': {
          const sylId = getSyllableAudioKey(q.targetSyllable)
          updateSyllableState(sylId, outcome)
          break
        }
        case 'word-assembly': {
          const wordId = ALL_WORDS.find((w) => w.text === q.targetWord)?.id ?? `word-${q.targetWord}`
          const newlyMastered = updateWordState(wordId, outcome)
          if (newlyMastered) {
            newAlbumWordsRef.current = [...newAlbumWordsRef.current, wordId]
          }
          break
        }
        case 'word-choice': {
          const wordId = ALL_WORDS.find((w) => w.text === q.targetWord)?.id ?? `word-${q.targetWord}`
          const newlyMastered = updateWordState(wordId, outcome)
          if (newlyMastered) {
            newAlbumWordsRef.current = [...newAlbumWordsRef.current, wordId]
          }
          break
        }
        case 'syllable-fill': {
          const wordId = ALL_WORDS.find((w) => w.text === q.targetWord)?.id ?? `word-${q.targetWord}`
          const newlyMastered = updateWordState(wordId, outcome)
          if (newlyMastered) {
            newAlbumWordsRef.current = [...newAlbumWordsRef.current, wordId]
          }
          break
        }
      }

      // Zaktualizuj liczniki
      if (isCorrect) {
        correctCountRef.current += 1
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
          void audioBus.play('sfx-mastery-fanfara')
          return
        }
        void audioBus.play('sfx-correct-ding')
      } else if (outcome === 'wrong') {
        wrongCountRef.current += 1
        void audioBus.play('reading-wrong-prefix')
        // Powtórz słowo/sylabę po korekcie
        switch (q.type) {
          case 'syllable-match':
            void audioBus.play(getSyllableAudioKey(q.targetSyllable))
            break
          case 'word-assembly':
          case 'word-choice':
          case 'syllable-fill':
            void audioBus.play(`word-${q.targetWord}`)
            break
        }
      } else if (outcome === 'dontKnow') {
        dontKnowCountRef.current += 1
        void audioBus.play('reading-dont-know')
        switch (q.type) {
          case 'syllable-match':
            void audioBus.play(getSyllableAudioKey(q.targetSyllable))
            break
          case 'word-assembly':
          case 'word-choice':
          case 'syllable-fill':
            void audioBus.play(`word-${q.targetWord}`)
            break
        }
      }

      setFeedbackVariant(isCorrect ? 'correct' : outcome === 'wrong' ? 'wrong' : 'dontKnow')
      setStatus('feedback')
      statusRef.current = 'feedback'
    },
    [audioBus, settings, updateSyllableState, updateWordState],
  )

  // Przechodzi do następnego pytania lub kończy sesję
  const advance = useCallback((): void => {
    const nextIndex = currentQuestionIndexRef.current + 1
    if (nextIndex >= QUESTIONS_PER_SESSION) {
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
      // Zapisz wyniki do store
      const sessionLog = {
        startedAt: startedAtRef.current,
        endedAt: now(),
        level,
        events: [],
      }
      // Używamy getState() żeby mieć synchroniczny dostęp do store
      const storeState = useReading.getState()
      storeState.applySessionResults(syllableStatesRef.current, wordStatesRef.current, sessionLog)
      // Dodaj nowe słowa do albumu + sprawdź milestone ceremonii
      const prevAlbumCount = useReading.getState().albumUnlocked.length
      for (const wordId of newAlbumWordsRef.current) {
        useReading.getState().addToAlbum(wordId)
      }
      const newAlbumCount = useReading.getState().albumUnlocked.length
      const CEREMONY_MILESTONES = [10, 20, 30, 40, 50, 60]
      for (const m of CEREMONY_MILESTONES) {
        if (prevAlbumCount < m && newAlbumCount >= m) {
          useReading.getState().setPendingCeremony(m)
          break
        }
      }

      setResults(sessionResults)
      setCurrentQuestion(null)
      setFeedbackVariant(null)
      setStatus('complete')
      statusRef.current = 'complete'
      return
    }
    generateQuestion(nextIndex)
  }, [generateQuestion, level, now])

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

    // Oblicz jitter dla tej sesji: ±2
    wildJitterRef.current = Math.floor(rng() * 5) - 2  // -2, -1, 0, 1, 2

    // Inicjalizuj SRS states z persisted store lub default
    syllableStatesRef.current = buildSyllableStates()
    if (level !== 'iskierka') {
      wordStatesRef.current = buildWordStates(level)
    }

    // Wyczyść kolejkę audio z poprzednich sesji/intro
    audioBus.stop()

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

  const skipFeedback = useCallback((): void => {
    if (statusRef.current !== 'feedback') return
    audioBus.stop()
    advance()
  }, [advance, audioBus])

  const pause = useCallback((): void => {
    if (statusRef.current === 'asking' || statusRef.current === 'feedback') {
      prePauseStatusRef.current = statusRef.current
      setPaused(true)
      setStatus('paused')
      statusRef.current = 'paused'
      void audioBus.play('nav-pause')
    }
  }, [audioBus])

  const resume = useCallback((): void => {
    if (statusRef.current === 'paused') {
      setPaused(false)
      // Przywróć status sprzed pauzy (asking lub feedback) — inaczej skipFeedback() guard nie przejdzie
      const restored = prePauseStatusRef.current
      setStatus(restored)
      statusRef.current = restored
      void audioBus.play('nav-resume')
    }
  }, [audioBus])

  const repeatAudio = useCallback((): void => {
    const q = currentQuestionRef.current
    if (!q) return
    playPromptAudio(q, audioBus)
  }, [audioBus])

  return {
    status,
    totalQuestions: QUESTIONS_PER_SESSION,
    currentQuestionIndex,
    currentQuestion,
    feedbackVariant,
    paused,
    results,
    start,
    submitAnswer,
    submitDontKnow,
    recordDropError,
    skipFeedback,
    pause,
    resume,
    repeatAudio,
    pickedScene,
  }
}
