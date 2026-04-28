import { useCallback } from 'react'
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
      <KidNav />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route index element={<ReadingIndex audioBus={audioBus} />} />
          <Route path="session/:level" element={<ReadingSession audioBus={audioBus} />} />
          <Route path="album" element={<ReadingAlbum audioBus={audioBus} />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  )
}

function ReadingIndex({ audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const navigate = useNavigate()
  const setLastUsed = useReading((s) => s.setLastUsedLevel)
  return (
    <ReadingLevelSelect
      audioBus={audioBus}
      onSelect={(level) => {
        setLastUsed(level)
        navigate(`session/${level}`)
      }}
    />
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

  const handleExit = useCallback(() => {
    navigate('..', { state: { fromExit: true } })
  }, [navigate])

  const handleAlbum = useCallback(() => {
    navigate('../album')
  }, [navigate])

  if (!isValidLevel) {
    return <Navigate to=".." replace />
  }

  return (
    <SessionView
      level={level}
      audioBus={audioBus}
      settings={settings}
      onExit={handleExit}
      onAlbum={handleAlbum}
    />
  )
}

function ReadingAlbum({ audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const navigate = useNavigate()
  return <WordAlbum audioBus={audioBus} onExit={() => navigate('..')} />
}

export default ReadingModule
