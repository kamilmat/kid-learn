import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { playIntroOnce } from '@/shared/audio/playIntroOnce'
import { IskraMascot } from '@/shared/ui/IskraMascot'
import { LevelIconView, LevelStars, LEVEL_TILE_BG, LEVEL_TILE_BORDER } from '@/shared/ui/levelIcons'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { useSettings } from '@/shared/settings/settingsStore'
import { colors, radii } from '@/app/theme'
import { CZYTANKI, GROUP_ORDER, getCzytankaById, getCzytankiByGroup } from '../data/czytanki'
import type { CzytankaGroup } from '../data/types'
import { useCzytanki } from '../store/czytankiStore'
import { takePendingCue } from '../audio/pendingCue'
import { CzytankaTile, GROUP_LEVEL } from './CzytankaTile'

const TILE_MIN = 128
const GAP = 14
const ARROW = 72
// Powyżej tylu stron kropki przestają być czytelne — zamiast nich pasek.
const MAX_DOTS = 12

const roundBtn = {
  width: ARROW, height: ARROW, borderRadius: ARROW / 2, border: `3px solid ${colors.accentBlue}`,
  background: '#fff', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
  WebkitTapHighlightColor: 'transparent', flex: '0 0 auto',
} as const

type Bus = Pick<AudioBus, 'play' | 'stop'>

function levelCue(g: CzytankaGroup): string {
  return `czytanki-ui-level-${g}`
}

function GroupTab({ group, active, onPick }: { group: CzytankaGroup; active: boolean; onPick: (g: CzytankaGroup) => void }) {
  const level = GROUP_LEVEL[group]
  const tap = useTapHandler({ onTap: () => onPick(group) })
  return (
    <button type="button" data-testid={`group-tab-${group}`} aria-pressed={active} aria-label={`Poziom ${group}`} {...tap}
      style={{
        minWidth: 96, height: 64, padding: '0 12px', borderRadius: radii.kid,
        border: `4px solid ${active ? LEVEL_TILE_BORDER[level] : 'transparent'}`,
        background: active ? LEVEL_TILE_BG[level] : '#fff', display: 'flex', alignItems: 'center', gap: 6,
        justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none',
        WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent', opacity: active ? 1 : 0.75,
      }}>
      <LevelIconView level={level} size={30} />
      <LevelStars level={level} size={14} />
    </button>
  )
}

function RandomLevelButton({ group, onPick }: { group: CzytankaGroup; onPick: (g: CzytankaGroup) => void }) {
  const level = GROUP_LEVEL[group]
  const tap = useTapHandler({ onTap: () => onPick(group) })
  return (
    <button type="button" data-testid={`random-level-${group}`} aria-label={`Losuj czytankę, poziom ${group}`} {...tap}
      style={{
        borderRadius: radii.kid * 1.5, background: LEVEL_TILE_BG[level], border: `5px solid ${LEVEL_TILE_BORDER[level]}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent', minHeight: 140,
      }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LevelIconView level={level} size={64} />
        <span aria-hidden="true" style={{ fontSize: 56 }}>🎲</span>
      </span>
      <LevelStars level={level} size={24} />
    </button>
  )
}

/** Siatka jednej strony: rozmiar strony wynika z pomiaru miejsca — bez przewijania. */
function useGridSize(ref: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [size, setSize] = useState({ cols: 4, rows: 3, tile: TILE_MIN })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w <= 0 || h <= 0) return
      const cols = Math.max(1, Math.floor((w + GAP) / (TILE_MIN + GAP)))
      const rows = Math.max(1, Math.floor((h + GAP) / (TILE_MIN + GAP)))
      const tile = Math.floor(Math.min((w - GAP * (cols - 1)) / cols, (h - GAP * (rows - 1)) / rows))
      setSize((prev) => (prev.cols === cols && prev.rows === rows && prev.tile === tile ? prev : { cols, rows, tile }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // `enabled`: siatka znika w trybie 🎲 i wraca jako NOWY element — trzeba go obserwować od nowa.
  }, [ref, enabled])
  return size
}

function PageIndicator({ page, pages, group }: { page: number; pages: number; group: CzytankaGroup }) {
  const color = LEVEL_TILE_BORDER[GROUP_LEVEL[group]]
  if (pages <= 1) return null
  if (pages > MAX_DOTS) {
    return (
      <div data-testid="page-indicator" aria-hidden="true" style={{ width: 'min(420px, 70%)', height: 10, borderRadius: 5, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ width: `${((page + 1) / pages) * 100}%`, height: '100%', background: color, borderRadius: 5 }} />
      </div>
    )
  }
  return (
    <div data-testid="page-indicator" aria-hidden="true" style={{ display: 'flex', gap: 8 }}>
      {Array.from({ length: pages }, (_, i) => (
        <span key={i} style={{ width: 12, height: 12, borderRadius: 6, background: i === page ? color : '#d1d5db' }} />
      ))}
    </div>
  )
}

export function CzytankaList({ audioBus, onOpen, onDraw }: {
  audioBus: Bus
  onOpen: (id: string) => void
  /** Tryb 🎲: wylosuj czytankę z talii grupy i ją otwórz. */
  onDraw: (group: CzytankaGroup) => void
}) {
  const openedIds = useCzytanki((s) => s.openedIds)
  const readCounts = useCzytanki((s) => s.readCounts)
  const lastOpenedId = useCzytanki((s) => s.lastOpenedId)
  const hasSeenIntro = useCzytanki((s) => s.hasSeenIntro)
  const markIntroSeen = useCzytanki((s) => s.markIntroSeen)
  const czytankiSettings = useSettings((s) => s.settings.czytanki)
  const updateSetting = useSettings((s) => s.updateSetting)
  const randomMode = czytankiSettings.randomMode
  const opened = useMemo(() => new Set(openedIds), [openedIds])

  // Powrót z czytanki otwiera zakładkę i stronę, na której ona leży.
  const last = lastOpenedId ? getCzytankaById(lastOpenedId) : undefined
  const [group, setGroup] = useState<CzytankaGroup>(last?.group ?? 1)
  // Indeks pierwszej widocznej czytanki (nie numer strony) — po obrocie iPada
  // zmienia się rozmiar strony, a dziecko ma zostać przy tych samych kafelkach.
  const [anchor, setAnchor] = useState(() => (last ? getCzytankiByGroup(last.group).indexOf(last) : 0))

  const gridRef = useRef<HTMLDivElement>(null)
  const { cols, rows, tile } = useGridSize(gridRef, !randomMode)
  const pageSize = cols * rows
  const items = getCzytankiByGroup(group)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(pages - 1, Math.floor(Math.max(0, anchor) / pageSize))
  const visible = items.slice(page * pageSize, (page + 1) * pageSize)

  useEffect(() => {
    audioBus.stop()
    // Odbieramy odłożone cue nawigacji (np. powrót z czytanki) i ew. intro w
    // jednym deferred callbacku — StrictMode w dev czyści ten timeout na
    // pierwszym, odrzuconym mouncie, więc flaga "widziane" nie zostaje spalona
    // zanim lista naprawdę zostanie zamontowana.
    const introTimeout = window.setTimeout(() => {
      const cue = takePendingCue()
      if (cue) void audioBus.play(cue)
      void playIntroOnce(audioBus, 'czytanki-list-intro', hasSeenIntro, markIntroSeen)
    }, 0)
    return () => window.clearTimeout(introTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickGroup = (g: CzytankaGroup) => {
    audioBus.stop()
    void audioBus.play(levelCue(g))
    setGroup(g)
    setAnchor(last?.group === g ? getCzytankiByGroup(g).indexOf(last) : 0)
  }
  const goPage = (delta: number) => {
    const next = page + delta
    if (next < 0 || next >= pages) return
    audioBus.stop()
    void audioBus.play(delta > 0 ? 'czytanki-ui-page-next' : 'czytanki-ui-page-prev')
    setAnchor(next * pageSize)
  }
  const prevTap = useTapHandler({ onTap: () => goPage(-1), disabled: page === 0 })
  const nextTap = useTapHandler({ onTap: () => goPage(1), disabled: page >= pages - 1 })
  const randomTap = useTapHandler({
    onTap: () => {
      const next = !randomMode
      audioBus.stop()
      updateSetting('czytanki', { ...czytankiSettings, randomMode: next })
      void audioBus.play(next ? 'czytanki-ui-random-on' : 'czytanki-ui-random-off')
    },
  })

  return (
    <div data-testid="czytanki-list" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: '0 24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <IskraMascot size={64} state="idle" />
        <span aria-hidden="true" style={{ fontSize: 44 }}>📖</span>
        <span style={{ fontFamily: 'var(--font-handwritten)', fontSize: 26, color: colors.text, opacity: 0.6 }}>{openedIds.length} / {CZYTANKI.length}</span>
        <button type="button" data-testid="random-toggle" aria-pressed={randomMode}
          aria-label={randomMode ? 'Pokaż wszystkie czytanki' : 'Losuj czytanki'} {...randomTap}
          style={{
            marginLeft: 'auto', width: 64, height: 64, borderRadius: 32, border: `3px solid ${colors.accentBlue}`,
            background: randomMode ? '#bbf7d0' : '#fff', fontSize: 34, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation', userSelect: 'none',
            WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent',
          }}>
          <span aria-hidden="true">🎲</span>
        </button>
      </div>

      {randomMode ? (
        <div data-testid="random-levels" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gridAutoRows: '1fr', gap: 18 }}>
          {GROUP_ORDER.map((g) => <RandomLevelButton key={g} group={g} onPick={onDraw} />)}
        </div>
      ) : (
        <>
          <div role="tablist" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {GROUP_ORDER.map((g) => <GroupTab key={g} group={g} active={g === group} onPick={pickGroup} />)}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" aria-label="Poprzednia strona" data-testid="page-prev" {...prevTap}
              style={{ ...roundBtn, visibility: page === 0 ? 'hidden' : 'visible' }}>◀</button>
            <div ref={gridRef} style={{ flex: 1, height: '100%', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div data-testid="czytanki-page" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${tile}px)`, gridAutoRows: `${tile}px`, gap: GAP }}>
                {visible.map((c) => (
                  <CzytankaTile key={c.id} czytanka={c} opened={opened.has(c.id)} readCount={readCounts[c.id] ?? 0} onOpen={onOpen} />
                ))}
              </div>
            </div>
            <button type="button" aria-label="Następna strona" data-testid="page-next" {...nextTap}
              style={{ ...roundBtn, visibility: page >= pages - 1 ? 'hidden' : 'visible' }}>▶</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', minHeight: 12 }}>
            <PageIndicator page={page} pages={pages} group={group} />
          </div>
        </>
      )}
    </div>
  )
}
