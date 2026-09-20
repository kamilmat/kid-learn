import { useCallback, useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { audioBus as defaultAudioBus } from '@/shared/audio/AudioBus'
import { KidNav } from '@/shared/ui/KidNav'
import { CZYTANKI, GROUP_ORDER, getCzytankaById, getCzytankaIndex, getCzytankiByGroup } from './data/czytanki'
import type { CzytankaGroup } from './data/types'
import { czytankaWeightFn } from './data/deckWeight'
import { useCzytanki } from './store/czytankiStore'
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
  // Ta sama pułapka co przy ▶ w czytance: nawigacja jest asynchroniczna, więc
  // drugi tap zdążyłby pobrać kolejną kartę z talii i wyrzucić ją bez pokazania.
  const drawingRef = useRef(false)

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
  const draw = useDraw()
  const onDraw = useCallback((group: CzytankaGroup) => {
    if (drawingRef.current) return
    const id = draw(group)
    if (!id) return
    drawingRef.current = true
    audioBus.stop()
    // iOS: pierwszy synchroniczny play() w gestcie odblokowuje element.
    audioBus.unlock()
    // Który poziom wybrało dziecko — tak samo jak zakładka w trybie „wszystkie”.
    void audioBus.play(`czytanki-ui-level-${group}`)
    setPendingCue('czytanki-ui-open')
    navigate(`${id}?${RANDOM_PARAM}=${group}`)
  }, [audioBus, draw, navigate])
  return <CzytankaList audioBus={audioBus} onOpen={onOpen} onDraw={onDraw} />
}

// `?los=<grupa>` — czytanka otwarta z talii 🎲: ▶ losuje dalej zamiast iść po kolei.
const RANDOM_PARAM = 'los'

function useDraw() {
  const drawNext = useCzytanki((s) => s.drawNext)
  return useCallback((group: CzytankaGroup) => {
    const ids = getCzytankiByGroup(group).map((c) => c.id)
    // Wagi liczone przy losowaniu, nie przy renderze — tapy z ostatniej
    // czytanki są już wtedy zapisane (flush na wyjściu z ekranu).
    return drawNext(group, ids, czytankaWeightFn(useCzytanki.getState().wordTaps))
  }, [drawNext])
}

function parseRandomGroup(value: string | null): CzytankaGroup | null {
  const n = Number(value)
  return (GROUP_ORDER as readonly number[]).includes(n) ? (n as CzytankaGroup) : null
}

function ViewRoute({ audioBus }: { audioBus: Bus }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const draw = useDraw()
  const drawingRef = useRef(false)
  // Nowa czytanka jest już na ekranie — kolejne ▶ może losować dalej.
  useEffect(() => { drawingRef.current = false }, [id])
  const czytanka = id ? getCzytankaById(id) : undefined
  if (!czytanka) return <Navigate to=".." replace />
  // `?los=2` na czytance z grupy 3 (ręcznie podrasowany URL) losowałoby dalej
  // z obcej grupy — bierzemy pod uwagę tylko parametr zgodny z czytanką.
  const paramGroup = parseRandomGroup(searchParams.get(RANDOM_PARAM))
  const randomGroup = paramGroup === czytanka.group ? paramGroup : null
  if (randomGroup !== null) {
    const drawNextCzytanka = () => {
      // Dziecko stuka ▶ seriami: bez tej blokady każdy tap przesuwa talię,
      // więc karty znikają z rundy bez pokazania (nawigacja jest asynchroniczna).
      if (drawingRef.current) return
      drawingRef.current = true
      const nextId = draw(randomGroup)
      if (nextId) void navigate(`../${nextId}?${RANDOM_PARAM}=${randomGroup}`, { relative: 'path', replace: true })
      else drawingRef.current = false
    }
    return <CzytankaView key={czytanka.id} czytanka={czytanka} audioBus={audioBus} onNext={drawNextCzytanka} revealSceneAfterRead />
  }
  const idx = getCzytankaIndex(czytanka.id)
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
