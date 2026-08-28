import { useCallback, useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { KidNav } from '@/shared/ui/KidNav'
import { CZYTANKI, getCzytankaById } from './data/czytanki'
import { CzytankaList } from './components/CzytankaList'
import { CzytankaView } from './components/CzytankaView'

type Bus = Pick<AudioBus, 'play' | 'stop'>

export function CzytankiModule({ audioBus = defaultAudioBus }: { audioBus?: Bus } = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  // Po nawigacji strzałkami prev/next w czytance historia rośnie —
  // "wstecz" ma zawsze wracać do listy, nie cofać po historii ekranów czytanki.
  const isListRoute = location.pathname === '/czytanki' || location.pathname === '/czytanki/'
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isListRoute ? <KidNav /> : <KidNav onBack={() => navigate('/czytanki')} />}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route index element={<ListRoute audioBus={audioBus} />} />
          <Route path=":id" element={<ViewRoute audioBus={audioBus} />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  )
}

function ListRoute({ audioBus }: { audioBus: Bus }) {
  const navigate = useNavigate()
  const cueTimeoutRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (cueTimeoutRef.current !== null) window.clearTimeout(cueTimeoutRef.current)
  }, [])

  // stop() zabija kolejkę AudioBus — grając cue synchronicznie zaraz po stop()
  // nigdy by nie wystartowało. Odkładamy je o jeden tick.
  const onOpen = useCallback((id: string) => {
    audioBus.stop()
    navigate(id)
    cueTimeoutRef.current = window.setTimeout(() => { void audioBus.play('czytanki-ui-open') }, 0)
  }, [audioBus, navigate])
  return <CzytankaList audioBus={audioBus} onOpen={onOpen} />
}

function ViewRoute({ audioBus }: { audioBus: Bus }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const czytanka = id ? getCzytankaById(id) : undefined
  if (!czytanka) return <Navigate to=".." replace />
  const idx = CZYTANKI.indexOf(czytanka)
  const prev = CZYTANKI[idx - 1]
  const next = CZYTANKI[idx + 1]
  // `exactOptionalPropertyTypes` nie pozwala jawnie przekazać `undefined` do
  // opcjonalnego propa — spread'ujemy warunkowo zamiast `onPrev={x ? … : undefined}`.
  return (
    <CzytankaView
      key={czytanka.id}
      czytanka={czytanka}
      audioBus={audioBus}
      {...(prev ? { onPrev: () => { void navigate(`../${prev.id}`, { relative: 'path' }) } } : {})}
      {...(next ? { onNext: () => { void navigate(`../${next.id}`, { relative: 'path' }) } } : {})}
    />
  )
}

export default CzytankiModule
