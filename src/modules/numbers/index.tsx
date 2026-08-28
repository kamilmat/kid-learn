import { useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { KidNav } from '@/shared/ui/KidNav'
import { useSettings } from '@/shared/settings/settingsStore'
import type { Level } from '@/shared/settings/types'
import { NumbersLevelSelect } from './components/NumbersLevelSelect'
import { SessionView } from './components/SessionView'
import { MasteryTree } from './components/MasteryTree'
import { useNumbers } from './store/numbersStore'

const VALID_LEVELS: ReadonlySet<Level> = new Set<Level>([
  'iskierka',
  'plomyk',
  'ognik',
  'pochodnia',
])

type Props = { audioBus?: Pick<AudioBus, 'play' | 'stop'> }

export function NumbersModule({ audioBus = defaultAudioBus }: Props = {}) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* KidNav renderujemy W ŚRODKU route'ów — ekran sesji podmienia jego
          akcje (⬅️/🏠 najpierw zapisują częściowy postęp SRS). */}
      <Routes>
        <Route index element={<NumbersIndex audioBus={audioBus} />} />
        <Route path="session/:level" element={<NumbersSession audioBus={audioBus} />} />
        <Route
          path="tree"
          element={
            <Screen nav={<KidNav />}>
              <MasteryTree />
            </Screen>
          }
        />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  )
}

// Wspólny szkielet ekranu modułu: pasek nawigacji + reszta viewportu.
function Screen({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <>
      {nav}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </>
  )
}

function NumbersIndex({ audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const navigate = useNavigate()
  const setLastUsed = useNumbers((s) => s.setLastUsedLevel)
  return (
    <Screen nav={<KidNav />}>
      <NumbersLevelSelect
        audioBus={audioBus}
        onSelect={(level) => {
          setLastUsed(level)
          // replace — wyjście z sesji też robi replace na LevelSelect, więc
          // historia to [Home, sesja] → [Home, LevelSelect]: jedno "wstecz"
          // wraca do Home zamiast trafiać w duplikat LevelSelect.
          navigate(`session/${level}`, { replace: true })
        }}
        onTree={() => navigate('tree')}
      />
    </Screen>
  )
}

function NumbersSession({ audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const params = useParams<{ level: string }>()
  const navigate = useNavigate()
  const settings = useSettings((s) => s.settings)

  const level = (params.level ?? '') as Level
  const isValid = VALID_LEVELS.has(level)

  // replace — inaczej ⬅️ z level-selectu wraca do sesji, która sama startuje.
  const handleExit = useCallback(() => {
    navigate('..', { replace: true })
  }, [navigate])

  const handleTree = useCallback(() => {
    navigate('../tree', { replace: true })
  }, [navigate])

  // KidNav w sesji: najpierw zapis częściowego postępu, dopiero potem wyjście.
  // Bez tego ⬅️ (domyślnie `navigate(-1)`) wyrzucało na Home i gubiło SRS.
  const quitRef = useRef<(() => void) | null>(null)
  const handleNavBack = useCallback(() => {
    quitRef.current?.()
    navigate('..', { replace: true })
  }, [navigate])
  const handleNavHome = useCallback(() => {
    quitRef.current?.()
    navigate('/')
  }, [navigate])

  if (!isValid) return <Navigate to=".." replace />

  return (
    <Screen nav={<KidNav onBack={handleNavBack} onHome={handleNavHome} />}>
      <SessionView
        level={level}
        audioBus={audioBus}
        settings={settings}
        onExit={handleExit}
        onTree={handleTree}
        quitRef={quitRef}
      />
    </Screen>
  )
}

export default NumbersModule
