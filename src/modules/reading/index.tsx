import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { KidNav } from '@/shared/ui/KidNav'
import { ReadingLevelSelect } from './components/ReadingLevelSelect'
import { useReading } from './store/readingStore'

export function ReadingModule({ audioBus = defaultAudioBus }: { audioBus?: Pick<AudioBus, 'play' | 'stop'> } = {}) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <KidNav />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route index element={<ReadingIndex audioBus={audioBus} />} />
          <Route path="session/:level" element={<div data-testid="reading-session-placeholder">Session — TODO Phase 6</div>} />
          <Route path="album" element={<div data-testid="reading-album-placeholder">Album — TODO Phase 9</div>} />
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

export default ReadingModule
