import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { KidNav } from '@/shared/ui/KidNav'
import type { Level } from '@/shared/settings/types'
import { NumbersLevelSelect } from './components/NumbersLevelSelect'
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
          <Route path="tree" element={<NumbersTreePlaceholder />} />
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

function NumbersSession({ audioBus: _audioBus }: { audioBus: Pick<AudioBus, 'play' | 'stop'> }) {
  const params = useParams<{ level: string }>()
  const level = (params.level ?? '') as Level
  if (!VALID_LEVELS.has(level)) return <Navigate to=".." replace />
  return (
    <div
      data-testid="numbers-session-placeholder"
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 32,
        fontFamily: 'var(--font-handwritten)',
      }}
    >
      Sesja {level} (do uzupełnienia)
    </div>
  )
}

function NumbersTreePlaceholder() {
  return (
    <div
      data-testid="numbers-tree-placeholder"
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 32,
        fontFamily: 'var(--font-handwritten)',
      }}
    >
      🌱 Drzewko mistrzostwa (do uzupełnienia)
    </div>
  )
}

export default NumbersModule
