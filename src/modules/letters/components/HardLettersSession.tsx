// HardLettersSession — „Trudne literki": powtórka celowana bez własnego poziomu.
//
// Config (case/style/kafelki/timer) bierzemy z najwyższego poziomu, na którym
// dziecko grało — powtórka ma być tak samo trudna wizualnie jak zwykła sesja,
// zawężamy tylko CELE pytań. Dystraktory dalej lecą z pełnej puli tego poziomu,
// żeby wybór 1-z-N nie stał się łatwiejszy niż normalnie.

import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import type { Settings } from '@/shared/settings/types'
import type { SessionLog as StatsSessionLog } from '@/shared/stats/types'
import type { LetterState, SessionLog } from '@/modules/letters/types'
import {
  HARD_LETTERS_CAP,
  configLevelForHard,
  selectHardLetters,
} from '@/modules/letters/data/hardLetters'
import { SessionView } from './SessionView'

const HARD_INTRO_KEY = 'letters-hard-intro'

export type HardLettersSessionProps = {
  settings: Settings
  /** Cała mapa `LetterState` ze store'u — z niej liczymy pulę trudnych. */
  letters: Record<string, LetterState>
  /** Historia sesji — z niej bierzemy poziom, z którego kopiujemy config. */
  sessions: readonly StatsSessionLog[]
  /** Inicjalne state'y dla PEŁNEJ puli poziomu (z `selectLetterStateMap`). */
  initialStates?: Record<string, LetterState>
  onExit: () => void
  onSessionComplete?: (
    log: SessionLog,
    updatedStates: Record<string, LetterState>,
  ) => void
  audioBus?: Pick<AudioBus, 'play' | 'stop'>
  quitRef?: RefObject<(() => void) | null>
  /** `now()` — fake clock w testach. */
  now?: () => number
}

export function HardLettersSession({
  settings,
  letters,
  sessions,
  initialStates,
  onExit,
  onSessionComplete,
  audioBus = defaultAudioBus,
  quitRef,
  now = () => Date.now(),
}: HardLettersSessionProps) {
  // Pula liczona raz na wejściu — gdyby reagowała na zapisy SRS w trakcie
  // sesji, `activeLetters`/`targetPool` zmieniałyby się w locie i resetowały
  // state'y w `useSession`.
  const nowRef = useRef(now)
  nowRef.current = now
  const hard = useMemo(
    () => selectHardLetters(letters, nowRef.current()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const level = useMemo(() => configLevelForHard(sessions), [sessions])

  // Za każdym wejściem (nie `playIntroOnce`) — dziecko musi wiedzieć, że to
  // inny tryb niż zwykła sesja, a wchodzi tu rzadko.
  useEffect(() => {
    void audioBus.play(HARD_INTRO_KEY)
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SessionView
      level={level}
      mode="hard"
      targetPool={hard}
      sessionLength={Math.min(HARD_LETTERS_CAP, hard.length)}
      settings={settings}
      {...(initialStates !== undefined ? { initialStates } : {})}
      onExit={onExit}
      {...(onSessionComplete !== undefined ? { onSessionComplete } : {})}
      audioBus={audioBus}
      {...(quitRef !== undefined ? { quitRef } : {})}
    />
  )
}
