import { useNumbers } from '../store/numbersStore'
import { CONCEPTS } from '../data/concepts'
import { CONCEPT_LABELS } from '../data/conceptLabels'
import type { ConceptMasteryState } from '../types'
import { colors } from '@/app/theme'

const LEAF_EMOJI: Record<ConceptMasteryState, string> = {
  unseen: '·',
  learning: '🌱',
  mastered: '🍃',
}

export function MasteryTree() {
  const concepts = useNumbers((s) => s.concepts)
  const allConcepts = Object.values(CONCEPTS)
  const masteredCount = allConcepts.filter(
    (c) => concepts[c.id]?.state === 'mastered',
  ).length
  const totalCount = allConcepts.length
  const treeStage =
    masteredCount === 0
      ? '🌱'
      : masteredCount < 5
      ? '🪴'
      : masteredCount < 10
      ? '🌿'
      : masteredCount < 15
      ? '🌳'
      : '🌲'

  return (
    <div
      data-testid="mastery-tree-root"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        gap: 24,
        overflowY: 'auto',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: '2em',
          color: colors.text,
          margin: 0,
        }}
      >
        Drzewko mistrzostwa
      </h2>
      <div style={{ fontSize: 200 }} aria-label={`Drzewko: ${masteredCount} z ${totalCount}`}>
        {treeStage}
      </div>
      <div
        data-testid="mastery-summary"
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: 28,
          color: colors.text,
        }}
      >
        {masteredCount} / {totalCount}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 8,
          width: '100%',
          maxWidth: 720,
        }}
      >
        {allConcepts.map((c) => {
          const m = concepts[c.id]
          const state: ConceptMasteryState = m?.state ?? 'unseen'
          return (
            <div
              key={c.id}
              data-testid={`mastery-cell-${c.id}`}
              data-state={state}
              style={{
                padding: 12,
                borderRadius: 8,
                background:
                  state === 'mastered'
                    ? '#dcfce7'
                    : state === 'learning'
                    ? '#fef9c3'
                    : '#f3f4f6',
                border: `2px solid ${
                  state === 'mastered'
                    ? '#16a34a'
                    : state === 'learning'
                    ? '#ca8a04'
                    : '#d1d5db'
                }`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                color: colors.text,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 24 }}>
                {LEAF_EMOJI[state]}
              </span>
              <span style={{ flex: 1 }}>{CONCEPT_LABELS[c.id]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
