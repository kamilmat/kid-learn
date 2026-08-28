import { useEffect } from 'react'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { IskraMascot } from '@/shared/ui/IskraMascot'
import { LevelIconView, LevelStars } from '@/shared/ui/levelIcons'
import { colors } from '@/app/theme'
import { CZYTANKI, GROUP_ORDER, getCzytankiByGroup } from '../data/czytanki'
import { useCzytanki } from '../store/czytankiStore'
import { CzytankaTile, GROUP_LEVEL } from './CzytankaTile'

export function CzytankaList({ audioBus, onOpen }: { audioBus: Pick<AudioBus, 'play' | 'stop'>; onOpen: (id: string) => void }) {
  const openedIds = useCzytanki((s) => s.openedIds)
  const lastOpenedId = useCzytanki((s) => s.lastOpenedId)
  const hasSeenIntro = useCzytanki((s) => s.hasSeenIntro)
  const markIntroSeen = useCzytanki((s) => s.markIntroSeen)

  useEffect(() => {
    if (!hasSeenIntro('czytanki-list-intro')) {
      markIntroSeen('czytanki-list-intro')
      audioBus.stop()
      void audioBus.play('czytanki-list-intro')
    }
    if (lastOpenedId) document.getElementById(`tile-${lastOpenedId}`)?.scrollIntoView({ block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div data-testid="czytanki-list" style={{ height: '100%', overflowY: 'auto', scrollbarGutter: 'stable', padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <IskraMascot size={72} state="idle" />
        <span aria-hidden="true" style={{ fontSize: 48 }}>📖</span>
        <span style={{ fontFamily: 'var(--font-handwritten)', fontSize: 28, color: colors.text, opacity: 0.6 }}>{openedIds.length} / {CZYTANKI.length}</span>
      </div>
      {GROUP_ORDER.map((g) => {
        const level = GROUP_LEVEL[g]
        return (
          <section key={g} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
              <LevelIconView level={level} size={32} />
              <LevelStars level={level} size={20} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
              {getCzytankiByGroup(g).map((c) => (
                <CzytankaTile key={c.id} czytanka={c} opened={openedIds.includes(c.id)} onOpen={onOpen} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
