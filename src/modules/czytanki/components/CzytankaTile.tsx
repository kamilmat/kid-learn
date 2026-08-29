import { useTapHandler } from '@/shared/ui/useTapHandler'
import { LEVEL_TILE_BG, LEVEL_TILE_BORDER } from '@/shared/ui/levelIcons'
import type { Level } from '@/shared/settings/types'
import { radii } from '@/app/theme'
import type { Czytanka, CzytankaGroup } from '../data/types'

export const GROUP_LEVEL: Record<CzytankaGroup, Level> = { 1: 'iskierka', 2: 'plomyk', 3: 'ognik', 4: 'pochodnia' }

// Ile kropek maksymalnie — dla dziecka "dużo" kończy się na trzech, a więcej
// i tak nie zmieściłoby się czytelnie w rogu kafelka.
const MAX_DOTS = 3

export function CzytankaTile({ czytanka, opened, readCount = 0, onOpen }: {
  czytanka: Czytanka
  opened: boolean
  /** Ile razy czytanka była czytana — kropki od drugiego razu. */
  readCount?: number
  onOpen: (id: string) => void
}) {
  const tap = useTapHandler({ onTap: () => onOpen(czytanka.id) })
  const level = GROUP_LEVEL[czytanka.group]
  const dots = Math.min(readCount, MAX_DOTS)
  return (
    <button type="button" data-testid={`tile-${czytanka.id}`} id={`tile-${czytanka.id}`} aria-label={czytanka.title} {...tap}
      style={{
        position: 'relative', width: '100%', aspectRatio: '1', minHeight: 120,
        borderRadius: radii.kid * 1.5, background: LEVEL_TILE_BG[level], border: `4px solid ${LEVEL_TILE_BORDER[level]}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, cursor: 'pointer',
        touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent',
      }}>
      <span aria-hidden="true">{czytanka.emoji}</span>
      {(opened || readCount >= 1) && <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 8, fontSize: 22 }}>⭐</span>}
      {readCount >= 2 && (
        // Cyfra wymagałaby czytania — kropki dziecko policzy wzrokiem.
        <span data-testid={`reads-${czytanka.id}`} aria-hidden="true"
          style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 4 }}>
          {Array.from({ length: dots }, (_, i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: LEVEL_TILE_BORDER[level] }} />
          ))}
        </span>
      )}
    </button>
  )
}
