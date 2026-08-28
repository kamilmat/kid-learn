// Letters module — entry point.
//
// Sekcje 11 (poziomy) i 6 (pętla nauki) spec:
//   - `/letters`              → ekran wyboru poziomu (LevelSelect)
//   - `/letters/session/:level` → sesja nauki dla wybranego poziomu (SessionView)
//
// Onboarding głosowy (sekcja 5.2):
//   - `letters-intro`     1× przy pierwszym wejściu na ekran wyboru
//   - `quiz-intro`        1× przy pierwszym wejściu na ekran sesji
//   - `dont-know-intro`   1× w sekwencji po `quiz-intro`
//
// KidNav — wpięty w sticky pasku górnym przez App.tsx; tu nie duplikujemy
// (App już renderuje `<KidNav />` poza `<Routes />`). Zostawiamy hook do
// mountu lokalnego KidNav tylko gdyby moduł był używany standalone.

import { useCallback, useEffect, useMemo } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { playIntroOnce } from '@/shared/audio/playIntroOnce'
import { useSettings } from '@/shared/settings/settingsStore'
import type { Level } from '@/shared/settings/types'
import { KidNav } from '@/shared/ui/KidNav'
import type { LetterState } from '@/shared/srs/types'
import type { SessionLog } from '@/shared/stats/types'

import { LevelSelect } from './components/LevelSelect'
import { SessionView } from './components/SessionView'
import {
  selectLetterStateMap,
  useLetters,
  type LettersState,
} from './store/lettersStore'

const VALID_LEVELS: ReadonlySet<Level> = new Set<Level>([
  'iskierka',
  'plomyk',
  'ognik',
  'pochodnia',
])

const LETTERS_INTRO_KEY = 'letters-intro'
const QUIZ_INTRO_KEY = 'quiz-intro'
const DONT_KNOW_INTRO_KEY = 'dont-know-intro'

// Module-level flag: czy w tej tab/page-load wykonaliśmy już auto-navigate
// na defaultLevel. useRef komponentu nie wystarczy bo LettersIndex remountuje
// się po Wróć z sesji. Reset przy reload strony (intencjonalne — rodzic może
// chcieć żeby auto-nav zadziałał ponownie po zmianie defaultLevel).
let autoNavApplied = false

export type LettersModuleProps = {
  /** Wstrzykiwany audioBus — dla testów. */
  audioBus?: Pick<AudioBus, 'play' | 'stop'>
  /** Nadpisanie KidNav (default: standardowy KidNav z react-router). */
  showNav?: boolean
}

export function LettersModule({
  audioBus = defaultAudioBus,
  showNav = true,
}: LettersModuleProps = {}) {
  return (
    <div
      data-testid="letters-module"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {showNav && <KidNav />}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route index element={<LettersIndex audioBus={audioBus} />} />
          <Route
            path="session/:level"
            element={<LettersSession audioBus={audioBus} />}
          />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  )
}

// ---------- Index — wybór poziomu ----------

type LettersIndexProps = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
}

function LettersIndex({ audioBus }: LettersIndexProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const setLastUsedLevel = useLetters((s) => s.setLastUsedLevel)
  const markIntroSeen = useLetters((s) => s.markIntroSeen)
  const hasSeenIntro = useLetters((s) => s.hasSeenIntro)
  const defaultLevel = useSettings((s) => s.settings.defaultLevel)
  const lastUsedLevel = useLetters((s) => s.lastUsedLevel)

  // Auto-navigate do defaultLevel (lub lastUsedLevel) tylko raz per
  // page-load. autoNavApplied (module-level) chroni przed ponownym auto-nav
  // gdy user wraca z sesji do LevelSelect. fromExit dodatkowo zabezpiecza
  // przed auto-nav w nawigacji przez Wróć (state inherited przy navigate('..')).
  useEffect(() => {
    if (autoNavApplied) return
    autoNavApplied = true
    const fromExit = (location.state as { fromExit?: boolean } | null)?.fromExit
    if (fromExit) return
    const targetLevel: Level | null =
      defaultLevel === 'last-used' ? lastUsedLevel : defaultLevel
    if (targetLevel) {
      setLastUsedLevel(targetLevel)
      // replace — patrz handleSelect: wyjście z sesji samo robi replace na
      // LevelSelect, więc push zostawiałby duplikat w historii.
      navigate(`session/${targetLevel}`, { replace: true })
    }
  }, [defaultLevel, lastUsedLevel, location.state, navigate, setLastUsedLevel])

  // Onboarding `letters-intro` — 1× per `seenIntros`.
  useEffect(() => {
    // Flaga "widziane" dopiero po faktycznym odtworzeniu (play() → true).
    void playIntroOnce(audioBus, LETTERS_INTRO_KEY, hasSeenIntro, markIntroSeen)
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelect = useCallback(
    (level: Level) => {
      setLastUsedLevel(level)
      // replace — wejście w sesję podmienia LevelSelect zamiast go dokładać.
      // Wyjście z sesji też robi replace (na LevelSelect), więc historia to
      // [Home, sesja] → [Home, LevelSelect]: jedno "wstecz" wraca do Home.
      // Push w obie strony dawał [Home, LevelSelect, LevelSelect].
      navigate(`session/${level}`, { replace: true })
    },
    [navigate, setLastUsedLevel],
  )

  return <LevelSelect onSelect={handleSelect} audioBus={audioBus} />
}

// ---------- Session — pojedyncza sesja dla danego poziomu ----------

type LettersSessionProps = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
}

function LettersSession({ audioBus }: LettersSessionProps) {
  const params = useParams<{ level: string }>()
  const navigate = useNavigate()

  const settings = useSettings((s) => s.settings)
  const applySessionResults = useLetters((s) => s.applySessionResults)
  const markIntroSeen = useLetters((s) => s.markIntroSeen)
  const hasSeenIntro = useLetters((s) => s.hasSeenIntro)

  // Selektory zamiast subskrypcji całego store'u — bez tego każdy zapis
  // (markIntroSeen, applySessionResults…) przerenderowywał sesję i przebudowywał
  // initialStates.
  const letters = useLetters((s) => s.letters)
  const sessions = useLetters((s) => s.sessions)
  const seenIntros = useLetters((s) => s.seenIntros)
  const lastUsedLevel = useLetters((s) => s.lastUsedLevel)
  const level = (params.level ?? '') as Level
  const isValidLevel = VALID_LEVELS.has(level)

  // Lazy init aktywnej puli — gwarancja że każda aktywna litera ma initial state
  const initialStates = useMemo(() => {
    const snapshot: LettersState = { letters, sessions, seenIntros, lastUsedLevel }
    return selectLetterStateMap(snapshot, isValidLevel ? level : 'iskierka', settings)
  }, [isValidLevel, lastUsedLevel, letters, level, seenIntros, sessions, settings])

  // Onboardingi sesji — `quiz-intro` + `dont-know-intro`, sekwencja, 1× per klucz.
  useEffect(() => {
    if (!isValidLevel) return
    void playIntroOnce(audioBus, QUIZ_INTRO_KEY, hasSeenIntro, markIntroSeen)
    void playIntroOnce(audioBus, DONT_KNOW_INTRO_KEY, hasSeenIntro, markIntroSeen)
    // mount-only (nawet jeśli level zmieni się w URL — i tak remountujemy przez key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidLevel])

  const handleExit = useCallback(() => {
    // state.fromExit informuje LettersIndex że to powrót, żeby nie aktywował
    // auto-navigate na defaultLevel (zapętlenie sesji).
    // replace — inaczej ⬅️ z LevelSelect wraca do sesji, która auto-startuje.
    navigate('..', { state: { fromExit: true }, replace: true })
  }, [navigate])

  const handleSessionComplete = useCallback(
    (log: SessionLog, updatedStates: Record<string, LetterState>) => {
      applySessionResults(updatedStates, log)
    },
    [applySessionResults],
  )

  if (!isValidLevel) {
    return <Navigate to=".." replace />
  }

  return (
    <SessionView
      level={level}
      settings={settings}
      initialStates={initialStates}
      onExit={handleExit}
      onSessionComplete={handleSessionComplete}
      audioBus={audioBus}
    />
  )
}

// Default export = moduł (dla łatwego routingu w App.tsx jeśli potrzebne).
export default LettersModule
