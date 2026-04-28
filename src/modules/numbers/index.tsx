import { useCallback } from 'react'
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
      <KidNav />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route index element={<NumbersIndex audioBus={audioBus} />} />
          <Route path="session/:level" element={<NumbersSession audioBus={audioBus} />} />
          <Route path="tree" element={<MasteryTree />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  )
}

function NumbersIndex({ audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const navigate = useNavigate()
  const setLastUsed = useNumbers((s) => s.setLastUsedLevel)
  return (
    <NumbersLevelSelect
      audioBus={audioBus}
      onSelect={(level) => {
        setLastUsed(level)
        navigate(`session/${level}`)
      }}
      onTree={() => navigate('tree')}
    />
  )
}

function NumbersSession({ audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const params = useParams<{ level: string }>()
  const navigate = useNavigate()
  const settings = useSettings((s) => s.settings)

  const level = (params.level ?? '') as Level
  const isValid = VALID_LEVELS.has(level)

  const handleExit = useCallback(() => {
    navigate('..')
  }, [navigate])

  const handleTree = useCallback(() => {
    navigate('../tree')
  }, [navigate])

  if (!isValid) return <Navigate to=".." replace />

  return (
    <SessionView
      level={level}
      audioBus={audioBus}
      settings={settings}
      onExit={handleExit}
      onTree={handleTree}
    />
  )
}

export default NumbersModule
