import { useCallback, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { KidNav } from '@/shared/ui/KidNav'
import { CZYTANKI, getCzytankaById } from './data/czytanki'
import { setPendingCue, takePendingCue } from './audio/pendingCue'
import { CzytankaList } from './components/CzytankaList'
import { CzytankaView } from './components/CzytankaView'

type Bus = Pick<AudioBus, 'play' | 'stop' | 'unlock' | 'setPlaybackRate'>

export function CzytankiModule({ audioBus = defaultAudioBus }: { audioBus?: Bus } = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  // Nawigacja strzałkami prev/next w czytance (i "wstecz" do listy) używa
  // { replace: true } zamiast pusha — inaczej każdy tap ◀▶ dokłada wpis do
  // historii i przycisk "wstecz" przeglądarki/systemu musiałby przeklikać
  // wszystkie odwiedzone czytanki zamiast wyjść od razu do listy.
  const isListRoute = location.pathname === '/czytanki' || location.pathname === '/czytanki/'
  useEffect(() => () => { takePendingCue() }, [])
  // Wstecz z czytanki: cofnij w historii (strzałki ◀▶ robią replace, więc
  // poprzedni wpis to lista). `navigate('/czytanki', { replace: true })`
  // zostawiało duplikat listy w historii. Gdy weszliśmy deep-linkiem
  // (brak wcześniejszego wpisu) — replace na listę.
  const backToList = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
    } else {
      navigate('/czytanki', { replace: true })
    }
  }, [navigate])
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isListRoute ? <KidNav /> : <KidNav onBack={backToList} />}
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

  // Lista znika w tym samym tick'u co nawigacja — cue odbierze i odtworzy
  // dopiero docelowy ekran (CzytankaView) po zamontowaniu, przez pendingCue.
  const onOpen = useCallback((id: string) => {
    audioBus.stop()
    // iOS: pierwszy synchroniczny play() w gestcie odblokowuje element —
    // cue 'czytanki-ui-open' zagra dopiero po mouncie CzytankaView (poza gestem).
    audioBus.unlock()
    setPendingCue('czytanki-ui-open')
    navigate(id)
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
      {...(prev ? { onPrev: () => { void navigate(`../${prev.id}`, { relative: 'path', replace: true }) } } : {})}
      {...(next ? { onNext: () => { void navigate(`../${next.id}`, { relative: 'path', replace: true }) } } : {})}
    />
  )
}

export default CzytankiModule
