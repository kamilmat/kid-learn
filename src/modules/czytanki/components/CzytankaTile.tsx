import { useTapHandler } from '@/shared/ui/useTapHandler'
import { LEVEL_TILE_BG, LEVEL_TILE_BORDER } from '@/shared/ui/levelIcons'
import type { Level } from '@/shared/settings/types'
import { radii } from '@/app/theme'
import type { Czytanka, CzytankaGroup } from '../data/types'

export const GROUP_LEVEL: Record<CzytankaGroup, Level> = { 1: 'iskierka', 2: 'plomyk', 3: 'ognik', 4: 'pochodnia' }

export function CzytankaTile({ czytanka, opened, onOpen }: { czytanka: Czytanka; opened: boolean; onOpen: (id: string) => void }) {
  const tap = useTapHandler({ onTap: () => onOpen(czytanka.id) })
  const level = GROUP_LEVEL[czytanka.group]
  return (
    <button type="button" data-testid={`tile-${czytanka.id}`} id={`tile-${czytanka.id}`} aria-label={czytanka.title} {...tap}
      style={{
        position: 'relative', width: '100%', aspectRatio: '1', minHeight: 120,
        borderRadius: radii.kid * 1.5, background: LEVEL_TILE_BG[level], border: `4px solid ${LEVEL_TILE_BORDER[level]}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, cursor: 'pointer',
        touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent',
      }}>
      <span aria-hidden="true">{czytanka.emoji}</span>
      {opened && <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 8, fontSize: 22 }}>⭐</span>}
    </button>
  )
}
