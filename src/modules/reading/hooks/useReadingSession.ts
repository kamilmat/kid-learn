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
import { pickPraiseMixed } from '@/shared/audio/pickPraiseMixed'
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
import { syllablesForWord } from './blendSequence'
import { ALL_SYLLABLES, getSyllableAudioKey, getSyllableId } from '../data/syllables'
import { CONTRASTIVE_SYLLABLES } from '../data/contrastiveSyllables'
import { ALL_WORDS, NO_MEANING_WORDS, getWordById, getWordsByLevel, getWordAudioKey, type WordData } from '../data/words'
import { pickNextItem } from '@/shared/srs/select'
import { pickDistractors, pickRandom, shuffled } from '@/shared/srs/distractors'
import { nextBox, nextRecentWrong } from '@/shared/srs/update'
import { useReading } from '../store/readingStore'
import type { Outcome } from '@/shared/srs/types'
import { DEFAULT_QUESTIONS_PER_SESSION } from '../constants'

// Minimalny czas trzymania overlaya feedbacku — nawet gdy audio już wybrzmiało,
// 7-latek potrzebuje chwili na zobaczenie wyniku zanim ekran się zmieni.
export const MIN_FEEDBACK_MS = 1200

// Cisza między sylabami kroku syntezy. Bez niej „MA MA" zlewa się w „MAMA"
// zanim dziecko usłyszy, że to DWA klocki.
const BLEND_PAUSE_MS = 350

/** Krok syntezy: sylaby bieżącego słowa + ta, która właśnie brzmi. */
export type BlendState = { syllables: string[]; activeIndex: number | null }

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

export const READING_PRAISE_PROCESS_KEYS = [
  'reading-praise-proc-1',
  'reading-praise-proc-2',
  'reading-praise-proc-3',
  'reading-praise-proc-4',
  'reading-praise-proc-5',
  'reading-praise-proc-6',
] as const

export type ReadingPraiseKey =
  | (typeof READING_PRAISE_KEYS)[number]
  | (typeof READING_PRAISE_PROCESS_KEYS)[number]

export type Status =
  | 'idle'
  | 'asking'
  | 'feedback'
  | 'retry'
  | 'paused'
  | 'complete'
  | 'wild-celebration'
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
  /** Krok syntezy w trakcie feedbacku — `null` gdy nie gra. */
  blend: BlendState | null

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
  /** Jak `quit()`, ale bez `audioBus.stop()` — wyjście przez KidNav / unmount. */
  flush: () => void
  /** Rozwiązuje się gdy kolejka audio feedbacku bieżącego pytania wybrzmiała. */
  waitForFeedbackAudio: () => Promise<void>
  /**
   * Scenka słowa melduje swoją sekwencję audio. `resume()` czeka na nią przed
   * składaniem — inaczej klip słowa ze scenki wchodziłby między „Składamy:"
   * a pierwszą sylabę.
   */
  noteSceneAudio: (audio: Promise<unknown>) => void

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
  // Dystraktory kontrastywne (fonetycznie mylące) z fallbackiem na losowe, gdy
  // pula za mała (możliwe przy override) albo stan targetu nie istnieje.
  const targetState = statesMap[targetId]
  const poolTexts = activePool.map((id) => id.replace('syl-', ''))
  let distractorTexts: string[]
  try {
    if (!targetState) throw new Error('brak stanu sylaby')
    distractorTexts = pickDistractors(
      targetSyllable,
      poolTexts,
      targetState,
      CONTRASTIVE_SYLLABLES,
      rng,
      CHOICE_COUNT - 1,
      false,
    )
  } catch {
    // Pula < 4 sylaby (możliwe przy override) — wracamy do losowania.
    distractorTexts = pickRandomDistinct(ALL_SYLLABLES, CHOICE_COUNT - 1, [targetId], rng).map((d) => d.text)
  }
  const choices = shuffled([targetSyllable, ...distractorTexts], rng)
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
  const targetSyllableIds = word.syllables.map((s) => getSyllableId(s))
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

// Indeksy pytań (0-based) rezerwowane na sprawdzian rozumienia w Ogniku i Pochodni.
// Dwa na sesję: jeden wcześnie, jeden po połowie — rozumienie przeplata dekodowanie,
// zamiast siedzieć na końcu, gdy dziecko jest już zmęczone.
export const MEANING_QUESTION_INDICES: readonly number[] = [2, 5]

// Generuje pytanie word-meaning (obrazek → słowo) dla Ognika i Pochodni.
// Rzuca, gdy pula dystraktorów jest za mała — `generateQuestion` wraca wtedy
// po cichu do typu ćwiczenia poziomu.
// Eksportowane dla testów: przez hooka kolizja dystraktorów wychodzi raz na
// kilka przebiegów, a tu da się ją wywołać deterministycznie tysiąc razy.
export function generateWordMeaning(
  statesMap: Record<string, WordState>,
  activePool: string[],
  lastTarget: string | null,
  rng: () => number,
  now: number,
): Extract<ReadingQuestion, { type: 'word-meaning' }> {
  const eligible = activePool.filter((id) => {
    const w = getWordById(id)
    return w !== undefined && !NO_MEANING_WORDS.includes(w.text)
  })
  if (eligible.length === 0) throw new Error('word-meaning: brak kandydatów na target')

  const target = getWordById(pickNextItem(statesMap, eligible, lastTarget, now, rng))
  if (!target) throw new Error('word-meaning: brak słowa dla wybranego id')

  // Dystraktor musi być odróżnialny OBRAZKIEM (inne emoji) i NA OKO (inna
  // pierwsza sylaba) — inaczej zadanie da się rozwiązać zgadując po kształcie.
  const pool = ALL_WORDS.filter(
    (w) =>
      w.level === target.level &&
      w.id !== target.id &&
      w.albumEmoji !== target.albumEmoji &&
      w.syllables[0] !== target.syllables[0],
  )
  // Dystraktory muszą być rozróżnialne także MIĘDZY SOBĄ — i emoji
  // (SAŁATA/KAPUSTA = 🥬), i pierwszą sylabą. Bez tego drugiego warunku pula
  // potrafiła wystawić „KOSZULA, KOŃ, KOTEK" obok siebie: dziecko odczytuje
  // pierwszą sylabę, widzi trzy takie same i nie ma jak wybrać.
  const distractors: WordData[] = []
  const usedEmoji = new Set([target.albumEmoji])
  const usedFirstSyllable = new Set([target.syllables[0]])
  for (const w of shuffled(pool, rng)) {
    if (usedEmoji.has(w.albumEmoji)) continue
    if (usedFirstSyllable.has(w.syllables[0])) continue
    usedEmoji.add(w.albumEmoji)
    usedFirstSyllable.add(w.syllables[0])
    distractors.push(w)
    if (distractors.length === CHOICE_COUNT - 1) break
  }
  if (distractors.length < CHOICE_COUNT - 1) throw new Error('word-meaning: za mała pula')

  return {
    type: 'word-meaning',
    targetWord: target.text,
    choices: shuffled([target.text, ...distractors.map((w) => w.text)], rng),
  }
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

// Krok syntezy („Składamy: MA-MA") należy się pytaniom, w których celem jest
// przeczytanie słowa. `syllable-match` nie ma słowa, a `word-meaning` sprawdza
// rozumienie — tam składanie po fakcie tylko wydłuża feedback.
function isBlendable(
  question: ReadingQuestion,
): question is Extract<ReadingQuestion, { targetWord: string }> {
  return question.type !== 'syllable-match' && question.type !== 'word-meaning'
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
      // Krótka zachęta („Ułóż słowo:") — NIE intro poziomu, które przy każdym
      // pytaniu opowiadało od nowa „dzisiaj będziemy układać…".
      void audioBus.play('reading-assemble-prompt')
      void audioBus.play(getWordAudioKey(question.targetWord))
      break
    case 'word-choice':
      void audioBus.play(getWordAudioKey(question.targetWord))
      break
    case 'syllable-fill':
      void audioBus.play(getWordAudioKey(question.targetWord))
      break
    case 'word-meaning':
      // WYŁĄCZNIE prompt — wypowiedzenie targetu zamieniłoby sprawdzian
      // rozumienia z powrotem w zadanie słuchowe.
      void audioBus.play('reading-meaning-prompt')
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
  const [blend, setBlend] = useState<BlendState | null>(null)

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

  // Kiedy bieżący feedback stał się widoczny — razem z poniższym refem liczy,
  // ile z MIN_FEEDBACK_MS dziecko już zobaczyło przed pauzą, żeby resume() nie
  // musiał czekać więcej niż trzeba (ale też nie mniej — patrz resume()).
  const feedbackStartedAtRef = useRef<number>(0)
  const feedbackElapsedBeforePauseRef = useRef<number>(0)

  // Log eventów per pytanie (R5) — trafia do SessionLog w store
  const eventsRef = useRef<ReadingSessionEvent[]>([])
  const questionStartedAtRef = useRef(0)

  // Sesja już zapisana do store (complete albo quit) — chroni przed podwójnym zapisem
  const finishedRef = useRef(false)

  // Kolejka audio feedbacku bieżącego pytania — overlay czeka na jej koniec (R1)
  const feedbackAudioRef = useRef<Promise<unknown>>(Promise.resolve())

  // Wariant feedbacku w refie — `resume()` musi znać go synchronicznie, żeby
  // zdecydować czy powtórzyć korektę czy od razu przejść dalej.
  const feedbackVariantRef = useRef<FeedbackVariant>(null)

  // Ostatnia zagrana pochwała — picker nie powtarza jej dwa razy pod rząd
  const lastPraiseRef = useRef<ReadingPraiseKey | null>(null)

  // Druga próba po błędzie: pytanie przycięte do dwóch kafelków czeka tu, aż
  // wybrzmi feedback korekty. `retryPendingRef` chroni je przed `advance()` —
  // także gdy dziecko tapnie overlay albo złapie pauzę w trakcie feedbacku.
  const retryQuestionRef = useRef<ReadingQuestion | null>(null)
  const retryPendingRef = useRef(false)

  // Krok syntezy „Składamy: MA… MA… MAMA". Sekwencja jest asynchroniczna
  // (pauzy między sylabami), więc `blendRunIdRef` unieważnia ją tak jak
  // `useReadAloud` w czytankach: każde nowe uruchomienie / pauza / przejście
  // dalej podbija numer, a zawieszona pętla po wznowieniu widzi obcy id
  // i milcząco wychodzi. `blendWordRef` pamięta słowo dla `resume()`.
  const blendRunIdRef = useRef(0)
  const blendWordRef = useRef<string | null>(null)

  // Sekwencja audio scenki słowa (`WordScene` melduje ją przez `noteSceneAudio`).
  // `resume()` czeka na nią przed składaniem. Zawsze rozstrzygnięta obietnica
  // jest bezpieczna: `audioBus.play()` nigdy nie wisi, a `stop()` settluje ją cicho.
  const sceneAudioRef = useRef<Promise<unknown>>(Promise.resolve())

  // Per-poziom override > globalna kontrolka „Ile pytań" > stała modułu.
  const questionsPerSession =
    settings.reading.questionsPerSession[level] ??
    settings.questionsPerSession ??
    DEFAULT_QUESTIONS_PER_SESSION

  // Synchronizuj ref ze stanem
  statusRef.current = status
  currentQuestionRef.current = currentQuestion
  currentQuestionIndexRef.current = currentQuestionIndex
  feedbackVariantRef.current = feedbackVariant

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

      let question: ReadingQuestion | null = null
      const nowMs = now()

      // Sprawdzian rozumienia wchodzi na miejsce zwykłego pytania poziomu.
      if (
        (level === 'ognik' || level === 'pochodnia') &&
        MEANING_QUESTION_INDICES.includes(questionIndex) &&
        questionIndex < questionsPerSession
      ) {
        try {
          const q = generateWordMeaning(
            wordStatesRef.current,
            pool.itemIds,
            lastTargetRef.current,
            rng,
            nowMs,
          )
          lastTargetRef.current = `word-${q.targetWord}`
          question = q
        } catch {
          // Za mała pula — po cichu wracamy do ćwiczenia poziomu.
          question = null
        }
      }

      try {
        if (question === null) switch (exerciseType) {
          case 'syllable-match': {
            const q = generateSyllableMatch(
              syllableStatesRef.current,
              pool.itemIds,
              lastTargetRef.current,
              rng,
              nowMs,
            )
            lastTargetRef.current = getSyllableId(q.targetSyllable)
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
      if (question === null) {
        throw new Error(`useReadingSession: nie można wygenerować pytania dla "${level}"`)
      }

      // Nowe pytanie zamyka temat drugiej próby — zaległy ref przeniósłby
      // kafelki poprzedniego pytania na kolejny błąd.
      retryPendingRef.current = false
      retryQuestionRef.current = null

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
    [level, audioBus, rng, now, questionsPerSession],
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

  const noteSceneAudio = useCallback((audio: Promise<unknown>): void => {
    sceneAudioRef.current = audio
  }, [])

  /** Ubija trwającą sekwencję syntezy i chowa rząd sylab. */
  const cancelBlend = useCallback((): void => {
    blendRunIdRef.current += 1
    blendWordRef.current = null
    setBlend(null)
  }, [])

  /**
   * Krok syntezy: „Składamy:" → każda sylaba osobno (z ciszą) → całe słowo.
   * Podświetlenie sylaby przesuwa się obietnicą z `play()` (rozstrzyga się na
   * końcu klipu), nie sztywnym timerem — inaczej rozjeżdżałoby się z audio.
   *
   * `after` to audio już zakolejkowane dla tego feedbacku (ding + pochwała
   * albo korekta). Czekamy na nie, zanim zakolejkujemy „Składamy:" — scenka
   * słowa (`WordScene`) dokłada swój klip do FIFO chwilę po `handleOutcome`
   * i bez tego wcisnęłaby się MIĘDZY prefiks a pierwszą sylabę.
   *
   * Zwraca obietnicę całej sekwencji: `handleOutcome` wstawia ją do
   * `feedbackAudioRef`, żeby overlay nie zniknął w środku składania.
   */
  const playBlend = useCallback(
    (word: string, after: Promise<unknown>): Promise<void> => {
      const syllables = syllablesForWord(word)
      if (syllables.length === 0) return Promise.resolve(after).then(() => undefined)
      const id = ++blendRunIdRef.current
      // Słowo zapisujemy od razu (synchronicznie): pauza złapana jeszcze w trakcie
      // pochwały musi wiedzieć, że po wznowieniu jest co składać.
      blendWordRef.current = word
      return (async () => {
        await after
        if (blendRunIdRef.current !== id) return
        // Rząd sylab pojawia się DOPIERO gdy rusza jego audio — inaczej wisiał
        // na ekranie przez całą pochwałę i scenkę, w ciszy.
        setBlend({ syllables, activeIndex: null })
        await audioBus.play('reading-blend-prefix')
        for (let i = 0; i < syllables.length; i++) {
          if (blendRunIdRef.current !== id) return
          setBlend({ syllables, activeIndex: i })
          await audioBus.play(getSyllableAudioKey(syllables[i]!))
          await new Promise((r) => setTimeout(r, BLEND_PAUSE_MS))
        }
        if (blendRunIdRef.current !== id) return
        setBlend({ syllables, activeIndex: null })
        await audioBus.play(getWordAudioKey(word))
      })()
    },
    [audioBus],
  )

  /**
   * Kolejkuje audio korekty: prefiks („spróbuj jeszcze raz" / „nie wiesz…")
   * + ponowne wybrzmienie celu. Wydzielone, bo `resume()` po pauzie złapanej
   * w trakcie feedbacku musi odegrać to PONOWNIE — `pause()` robi `stop()`,
   * więc bez tego dziecko nigdy nie usłyszy poprawnej odpowiedzi.
   */
  const playCorrectionAudio = useCallback(
    (variant: 'wrong' | 'dontKnow', q: ReadingQuestion): Promise<unknown>[] => [
      audioBus.play(variant === 'wrong' ? 'reading-wrong-prefix' : 'reading-dont-know'),
      q.type === 'syllable-match'
        ? audioBus.play(getSyllableAudioKey(q.targetSyllable))
        : audioBus.play(getWordAudioKey(q.targetWord)),
    ],
    [audioBus],
  )

  // Obsługuje outcome (correct/wrong/dontKnow) dla aktualnego pytania.
  // `attempt === 2` to poprawka w drugiej próbie: nie rusza SRS, liczników,
  // iskierek ani kropek postępu — pierwsza pomyłka zostaje pomyłką.
  const handleOutcome = useCallback(
    (outcome: Outcome, attempt: 1 | 2 = 1, chosen?: string): void => {
      const q = currentQuestionRef.current
      if (!q) return

      const isCorrect = outcome === 'correct'
      const isFirstAttempt = attempt === 1
      // Nowa karta w albumie — cue audio dokleja się do kolejki feedbacku
      let unlockedAlbumCard = false

      // Aktualizuj SRS
      let targetId: string
      if (q.type === 'syllable-match') {
        targetId = getSyllableId(q.targetSyllable)
        if (isFirstAttempt) updateSyllableState(targetId, outcome)
      } else {
        targetId = ALL_WORDS.find((w) => w.text === q.targetWord)?.id ?? `word-${q.targetWord}`
        if (isFirstAttempt) {
          const newlyMastered = updateWordState(targetId, outcome)
          if (newlyMastered) {
            newAlbumWordsRef.current = [...newAlbumWordsRef.current, targetId]
            unlockedAlbumCard = true
          }
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
          ...(attempt === 2 ? { attempt: 2 as const } : {}),
        },
      ]

      // Zapisz wynik pytania (pushowany do questionOutcomes w advance).
      // Kropka postępu opisuje PIERWSZE podejście — poprawka nie zamalowuje błędu.
      if (isFirstAttempt) {
        pendingOutcomeRef.current = isCorrect
          ? 'correct'
          : outcome === 'wrong'
            ? 'wrong'
            : 'dontKnow'
      }

      // Druga próba trafiona: cicha pochwała za autokorektę — bez dinga,
      // bez pochwały z puli, bez iskierki i bez wild celebration.
      if (!isFirstAttempt) {
        const retryPlays: Promise<unknown>[] = isCorrect
          ? [audioBus.play('retry-correct')]
          : playCorrectionAudio(outcome === 'wrong' ? 'wrong' : 'dontKnow', q)
        const retryAudio = Promise.all(retryPlays)
        // Druga próba domyka pytanie — synteza należy się tak samo jak przy
        // pierwszym podejściu (przy pierwszym była wtedy pominięta).
        feedbackAudioRef.current =
          isBlendable(q) ? playBlend(q.targetWord, retryAudio) : retryAudio
        setFeedbackVariant(isCorrect ? 'correct' : outcome === 'wrong' ? 'wrong' : 'dontKnow')
        setStatus('feedback')
        statusRef.current = 'feedback'
        feedbackStartedAtRef.current = answeredAt
        feedbackElapsedBeforePauseRef.current = 0
        return
      }

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
          feedbackStartedAtRef.current = now()
          feedbackElapsedBeforePauseRef.current = 0
          useReading.getState().resetWildCounter()
          // sfx-mastery-fanfara is the existing fanfara key (sfx-fanfara-special deferred to SFX library)
          const wildPlays: Promise<unknown>[] = [audioBus.play('sfx-mastery-fanfara')]
          if (unlockedAlbumCard) wildPlays.push(audioBus.play('reading-album-unlock'))
          feedbackAudioRef.current = Promise.all(wildPlays)
          return
        }
        plays.push(audioBus.play('sfx-correct-ding'))
        const praiseKey = pickPraiseMixed(
          READING_PRAISE_KEYS,
          READING_PRAISE_PROCESS_KEYS,
          lastPraiseRef.current,
          rng,
        )
        lastPraiseRef.current = praiseKey
        plays.push(audioBus.play(praiseKey))
      } else if (outcome === 'wrong') {
        wrongCountRef.current += 1
        plays.push(...playCorrectionAudio('wrong', q))
      } else if (outcome === 'dontKnow') {
        dontKnowCountRef.current += 1
        plays.push(...playCorrectionAudio('dontKnow', q))
      }

      if (unlockedAlbumCard) plays.push(audioBus.play('reading-album-unlock'))

      // Pierwsza pomyłka z wyborem kafelka → druga próba zamiast przejścia dalej.
      // `word-assembly` (drag-drop) jest wyłączone: nie ma tam „dwóch opcji",
      // z których dziecko mogłoby wybrać. „Nie wiem" też nie — dziecko nie
      // postawiło hipotezy, więc nie ma czego korygować.
      if (
        outcome === 'wrong' &&
        settings.secondAttempt &&
        q.type !== 'word-assembly' &&
        chosen !== undefined
      ) {
        const correctChoice =
          q.type === 'syllable-match'
            ? q.targetSyllable
            : q.type === 'word-choice' || q.type === 'word-meaning'
              ? q.targetWord
              : q.missingSyllable
        plays.push(audioBus.play('try-again'))
        retryQuestionRef.current = {
          ...q,
          choices: shuffled(Array.from(new Set([correctChoice, chosen])), rng),
        }
        retryPendingRef.current = true
      }

      // Overlay feedbacku auto-advance'uje gdy ta kolejka wybrzmi (min. MIN_FEEDBACK_MS)
      const queued = Promise.all(plays)
      // Krok syntezy po KAŻDYM rozstrzygnięciu pytania słownego. Pomijamy go,
      // gdy czeka druga próba: dziecko ma jeszcze raz wskazać kafelek, a nie
      // wysłuchać rozwiązania — synteza przyjdzie po tamtym podejściu.
      feedbackAudioRef.current =
        isBlendable(q) && !retryPendingRef.current
          ? playBlend(q.targetWord, queued)
          : queued

      setFeedbackVariant(isCorrect ? 'correct' : outcome === 'wrong' ? 'wrong' : 'dontKnow')
      setStatus('feedback')
      statusRef.current = 'feedback'
      feedbackStartedAtRef.current = answeredAt
      feedbackElapsedBeforePauseRef.current = 0
    },
    [audioBus, now, playBlend, playCorrectionAudio, rng, settings, updateSyllableState, updateWordState],
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
    retryPendingRef.current = false
    retryQuestionRef.current = null
    cancelBlend()
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
  }, [cancelBlend, generateQuestion, now, persistSession, questionsPerSession])

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
    retryPendingRef.current = false
    retryQuestionRef.current = null
    cancelBlend()

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
      const st = statusRef.current
      if (st !== 'asking' && st !== 'retry') return
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
        case 'word-meaning':
          isCorrect = answer === q.targetWord
          break
      }

      handleOutcome(isCorrect ? 'correct' : 'wrong', st === 'retry' ? 2 : 1, answer)
    },
    [handleOutcome],
  )

  const submitDontKnow = useCallback((): void => {
    const st = statusRef.current
    if (st !== 'asking' && st !== 'retry') return
    // 🤷 w drugiej próbie = druga pomyłka: hiperkorekcja (cel jeszcze raz)
    // i lecimy dalej. Trzeciej próby nie ma.
    if (st === 'retry') {
      handleOutcome('wrong', 2)
      return
    }
    handleOutcome('dontKnow')
  }, [handleOutcome])

  // recordDropError: liczy błędny drop ale nie kończy pytania (dla word-assembly)
  const recordDropError = useCallback((): void => {
    if (statusRef.current !== 'asking') return
    // Inkrementuj counter błędów (nie ma efektu na status)
    // correction-prefix jako zastępnik sfx-drop-error (SFX library deferred)
    void audioBus.play('correction-prefix')
  }, [audioBus])

  /**
   * Wchodzi w drugą próbę: to samo pytanie z dwoma kafelkami (poprawny +
   * wybrany przez dziecko). Bez timera — autokorekta ma być momentem myślenia.
   * `replayCue` gra `try-again` ponownie, gdy poprzednie `stop()` je ucięło.
   */
  const enterRetry = useCallback(
    (replayCue: boolean): void => {
      const retryQuestion = retryQuestionRef.current
      if (retryQuestion === null) return
      retryPendingRef.current = false
      cancelBlend()
      setFeedbackVariant(null)
      feedbackVariantRef.current = null
      setCurrentQuestion(retryQuestion)
      currentQuestionRef.current = retryQuestion
      questionStartedAtRef.current = now()
      setStatus('retry')
      statusRef.current = 'retry'
      if (replayCue) void audioBus.play('try-again')
    },
    [audioBus, cancelBlend, now],
  )

  // Po wybrzmieniu feedbacku: druga próba (jeśli zaplanowana) albo dalej.
  const finishFeedback = useCallback(
    (replayCue: boolean): void => {
      if (retryPendingRef.current && retryQuestionRef.current !== null) {
        enterRetry(replayCue)
        return
      }
      advance()
    },
    [advance, enterRetry],
  )

  const skipFeedback = useCallback((viaTap = false): void => {
    if (statusRef.current !== 'feedback') return
    audioBus.stop()
    // „Każdy klik mówi co zrobił" — krótkie cue potwierdzające tap; prompt
    // następnego pytania dokleja się za nim w kolejce FIFO.
    if (viaTap) void audioBus.play('nav-tap')
    // Tap skraca wybrzmiewanie, ale NIE kasuje drugiej próby — jedna dodatkowa
    // próba należy się dziecku zawsze. `stop()` ucięło `try-again`, więc przy
    // tapie gramy je jeszcze raz.
    finishFeedback(viaTap)
  }, [audioBus, finishFeedback])

  const pause = useCallback((): void => {
    if (
      statusRef.current === 'asking' ||
      statusRef.current === 'feedback' ||
      statusRef.current === 'retry'
    ) {
      if (statusRef.current === 'feedback') {
        // Zamrażamy licznik na czas pauzy — resume() dolicza tylko RESZTĘ
        // MIN_FEEDBACK_MS, nie liczy czasu spędzonego na pauzie.
        feedbackElapsedBeforePauseRef.current = now() - feedbackStartedAtRef.current
      }
      // Sekwencja syntezy jest asynchroniczna — bez unieważnienia dograłaby
      // sylaby zza overlaya pauzy. `blendWordRef` zostaje: resume() odtwarza
      // ją OD POCZĄTKU, tak samo jak korektę.
      blendRunIdRef.current += 1
      setBlend((b) => (b === null ? b : { ...b, activeIndex: null }))
      prePauseStatusRef.current = statusRef.current
      setPaused(true)
      setStatus('paused')
      statusRef.current = 'paused'
      // Bez stop() prompt/feedback mówił dalej zza overlaya pauzy
      audioBus.stop()
      void audioBus.play('nav-pause')
    }
  }, [audioBus, now])

  const resume = useCallback((): void => {
    if (statusRef.current !== 'paused') return
    setPaused(false)
    // Przywróć status sprzed pauzy (asking lub feedback) — inaczej skipFeedback() guard nie przejdzie
    const restored = prePauseStatusRef.current
    setStatus(restored)
    statusRef.current = restored
    void audioBus.play('nav-resume')
    // Pauza złapana na ekranie drugiej próby: `pause()` zrobiło `stop()`, więc
    // bez ponownego `try-again` dziecko wraca do dwóch kafelków bez wyjaśnienia.
    if (restored === 'retry') {
      void audioBus.play('try-again')
      return
    }
    // Pauza w trakcie feedbacku ucięła kolejkę audio (`stop()` w pause), więc
    // po wznowieniu overlay stałby w ciszy — a przy wariancie 'wild' nikt już
    // nie zawołałby skipFeedback i sesja zostawała zakleszczona na zawsze.
    if (restored !== 'feedback') return

    const q = currentQuestionRef.current
    const variant = feedbackVariantRef.current
    if (q !== null && (variant === 'wrong' || variant === 'dontKnow')) {
      // Korekta jest sednem feedbacku — samo przejście dalej pozbawiłoby
      // dziecko jedynej szansy usłyszenia poprawnej sylaby/słowa. Kolejkujemy
      // ją ponownie (za `nav-resume`) i idziemy dalej dopiero gdy wybrzmi.
      const corrections = Promise.all(playCorrectionAudio(variant, q))
      const blendWord = blendWordRef.current
      const replay = blendWord !== null ? playBlend(blendWord, corrections) : corrections
      feedbackAudioRef.current = replay
      const questionIndexAtResume = currentQuestionIndexRef.current
      void replay.then(() => {
        // Overlay (remountowany po zdjęciu pauzy) mógł już zawołać skipFeedback
        // — wtedy status/indeks się zmieniły i drugi advance zjadłby pytanie.
        if (
          statusRef.current === 'feedback' &&
          currentQuestionIndexRef.current === questionIndexAtResume
        ) {
          // `pause()` ucięło `try-again` razem z korektą — retry musi je powtórzyć.
          finishFeedback(true)
        }
      })
      return
    }
    // Poprawna odpowiedź ze słowem: `pause()` ucięło krok syntezy w środku,
    // więc gramy go od początku i dopiero potem idziemy dalej. Czekamy na audio
    // scenki (`WordScene` remountuje się po zdjęciu pauzy) — bez tego jej klip
    // wchodziłby między „Składamy:" a pierwszą sylabę.
    const blendWordAfterCorrect = blendWordRef.current
    if (variant === 'correct' && blendWordAfterCorrect !== null) {
      const replay = playBlend(blendWordAfterCorrect, sceneAudioRef.current)
      feedbackAudioRef.current = replay
      const questionIndexAtResume = currentQuestionIndexRef.current
      void replay.then(() => {
        if (
          statusRef.current === 'feedback' &&
          currentQuestionIndexRef.current === questionIndexAtResume
        ) {
          finishFeedback(false)
        }
      })
      return
    }

    // correct / wild — nie ma audio do powtórzenia, ale dziecko wciąż musi
    // ZOBACZYĆ feedback co najmniej MIN_FEEDBACK_MS — natychmiastowy advance()
    // tutaj przeskakiwał pytanie w tej samej klatce co resume, zanim overlay
    // zdążył się w ogóle pokazać. Doliczamy tylko RESZTĘ: czas widoczny przed
    // pauzą (feedbackElapsedBeforePauseRef) już się liczył do minimum.
    const remaining = Math.max(
      0,
      MIN_FEEDBACK_MS - feedbackElapsedBeforePauseRef.current,
    )
    const questionIndexAtResume = currentQuestionIndexRef.current
    setTimeout(() => {
      // Jak wyżej — overlay mógł już zawołać skipFeedback samodzielnie.
      if (
        statusRef.current === 'feedback' &&
        currentQuestionIndexRef.current === questionIndexAtResume
      ) {
        finishFeedback(false)
      }
    }, remaining)
  }, [audioBus, finishFeedback, playBlend, playCorrectionAudio])

  const repeatAudio = useCallback((): void => {
    const q = currentQuestionRef.current
    if (!q) return
    audioBus.stop()
    playPromptAudio(q, audioBus)
  }, [audioBus])

  // Zapis częściowy bez efektów audio — wyjście przez KidNav / unmount.
  // `stop()` zabiłby świeżo zakolejkowane cue `nav-back` / `nav-home`.
  const flushSession = useCallback((): void => {
    // Sekwencja syntezy sama dokłada klipy do kolejki po każdym `await` —
    // samo `stop()` przy wyjściu jej nie ubija, tylko przyspiesza kolejny krok.
    cancelBlend()
    // Nic nie odpowiedziano — nie zaśmiecamy historii pustą sesją
    if (finishedRef.current || eventsRef.current.length === 0) return
    persistSession()
  }, [cancelBlend, persistSession])

  const quitSession = useCallback((): void => {
    cancelBlend()
    if (finishedRef.current || eventsRef.current.length === 0) return
    audioBus.stop()
    persistSession()
  }, [audioBus, cancelBlend, persistSession])

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
    blend,
    start,
    submitAnswer,
    submitDontKnow,
    recordDropError,
    skipFeedback,
    pause,
    resume,
    repeatAudio,
    quit: quitSession,
    flush: flushSession,
    waitForFeedbackAudio,
    noteSceneAudio,
    pickedScene,
  }
}
