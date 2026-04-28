import { useNumbers } from '../store/numbersStore'
import { CONCEPTS } from '../data/concepts'
import type { ConceptId, ConceptMasteryState } from '../types'
import { colors } from '@/app/theme'

const LEAF_EMOJI: Record<ConceptMasteryState, string> = {
  unseen: '·',
  learning: '🌱',
  mastered: '🍃',
}

const CONCEPT_LABELS: Record<ConceptId, string> = {
  'iskierka-counting-5': 'Liczenie do 5',
  'iskierka-counting-10': 'Liczenie do 10',
  'iskierka-subitizing-6': 'Subitizing 1-6',
  'iskierka-rhythm': 'Rytm liczbowy',
  'iskierka-adding-concrete': 'Dokładanie',
  'plomyk-bonds-5': 'Rozkład 5',
  'plomyk-bonds-10': 'Rozkład 6-10',
  'plomyk-tenframe': 'Ten frame',
  'plomyk-addsub-10': '+/− do 10',
  'plomyk-factfamily': 'Rodzina liczb',
  'ognik-doubles': 'Podwójki',
  'ognik-neardoubles': 'Prawie-podwójki',
  'ognik-make10': 'Zrób 10',
  'ognik-factfamily-20': 'Rodzina liczb do 20',
  'pochodnia-skipcount-2': 'Po 2',
  'pochodnia-skipcount-5': 'Po 5',
  'pochodnia-skipcount-10': 'Po 10',
  'pochodnia-equalgroups': 'Równe grupy',
  'pochodnia-arrays': 'Rzędy i kolumny',
  'pochodnia-commutativity': 'Mnożenie',
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
