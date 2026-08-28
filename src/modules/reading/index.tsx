import { useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { KidNav } from '@/shared/ui/KidNav'
import { useSettings } from '@/shared/settings/settingsStore'
import type { Level } from '@/shared/settings/types'
import { ReadingLevelSelect } from './components/ReadingLevelSelect'
import { SessionView } from './components/SessionView'
import { WordAlbum } from './components/WordAlbum'
import { useReading } from './store/readingStore'

const VALID_LEVELS: ReadonlySet<Level> = new Set<Level>([
  'iskierka',
  'plomyk',
  'ognik',
  'pochodnia',
])

export function ReadingModule({ audioBus = defaultAudioBus }: { audioBus?: Pick<AudioBus, 'play' | 'stop'> } = {}) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* KidNav renderujemy W ŚRODKU route'ów — ekran sesji podmienia jego
          akcje (⬅️/🏠 najpierw zapisują częściowy postęp SRS). */}
      <Routes>
        <Route index element={<ReadingIndex audioBus={audioBus} />} />
        <Route path="session/:level" element={<ReadingSession audioBus={audioBus} />} />
        <Route path="album" element={<ReadingAlbum audioBus={audioBus} />} />
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

function ReadingIndex({ audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const navigate = useNavigate()
  const setLastUsed = useReading((s) => s.setLastUsedLevel)
  return (
    <Screen nav={<KidNav />}>
      <ReadingLevelSelect
        audioBus={audioBus}
        onSelect={(level) => {
          setLastUsed(level)
          // replace — wyjście z sesji też robi replace na LevelSelect, więc
          // historia to [Home, sesja] → [Home, LevelSelect]: jedno "wstecz"
          // wraca do Home zamiast trafiać w duplikat LevelSelect.
          navigate(`session/${level}`, { replace: true })
        }}
      />
    </Screen>
  )
}

type ReadingSessionProps = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
}

function ReadingSession({ audioBus }: ReadingSessionProps) {
  const params = useParams<{ level: string }>()
  const navigate = useNavigate()
  const settings = useSettings((s) => s.settings)

  const level = (params.level ?? '') as Level
  const isValidLevel = VALID_LEVELS.has(level)

  // replace: bez tego ⬅️ z ekranu wyboru poziomu wracało w sesję (auto-start)
  const handleExit = useCallback(() => {
    navigate('..', { replace: true, state: { fromExit: true } })
  }, [navigate])

  const handleAlbum = useCallback(() => {
    navigate('../album', { replace: true })
  }, [navigate])

  // KidNav w sesji: najpierw zapis częściowego postępu, dopiero potem wyjście.
  // Bez tego ⬅️ (domyślnie `navigate(-1)`) wyrzucało na Home i gubiło SRS.
  const quitRef = useRef<(() => void) | null>(null)
  const handleNavBack = useCallback(() => {
    quitRef.current?.()
    navigate('..', { replace: true, state: { fromExit: true } })
  }, [navigate])
  const handleNavHome = useCallback(() => {
    quitRef.current?.()
    navigate('/')
  }, [navigate])

  if (!isValidLevel) {
    return <Navigate to=".." replace />
  }

  return (
    <Screen nav={<KidNav onBack={handleNavBack} onHome={handleNavHome} />}>
      <SessionView
        level={level}
        audioBus={audioBus}
        settings={settings}
        onExit={handleExit}
        onAlbum={handleAlbum}
        quitRef={quitRef}
      />
    </Screen>
  )
}

function ReadingAlbum({ audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const navigate = useNavigate()
  return (
    <Screen nav={<KidNav />}>
      <WordAlbum audioBus={audioBus} onExit={() => navigate('..', { replace: true })} />
    </Screen>
  )
}

export default ReadingModule
