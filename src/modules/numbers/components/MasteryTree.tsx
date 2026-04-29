import { useNumbers } from '../store/numbersStore'
import { CONCEPTS } from '../data/concepts'
import { CONCEPT_LABELS } from '../data/conceptLabels'
import type { ConceptId, ConceptMasteryState } from '../types'
import { colors } from '@/app/theme'

const LEAF_EMOJI: Record<ConceptMasteryState, string> = {
  unseen: '·',
  learning: '🌱',
  mastered: '🍃',
}

// Mini-ikona reprezentująca temat konceptu (matematyczny piktogram).
// Dziecko nieczytające widzi po ikonie czego dotyczy karta.
const CONCEPT_ICONS: Record<ConceptId, string> = {
  'iskierka-counting-5': '🖐️',
  'iskierka-counting-10': '🔟',
  'iskierka-subitizing-6': '🎲',
  'iskierka-rhythm': '🥁',
  'iskierka-adding-concrete': '🍎',
  'plomyk-bonds-5': '🔗',
  'plomyk-bonds-10': '🔗',
  'plomyk-tenframe': '🔢',
  'plomyk-addsub-10': '➕',
  'plomyk-factfamily': '👨‍👩‍👧',
  'ognik-doubles': '👯',
  'ognik-neardoubles': '👫',
  'ognik-make10': '🎯',
  'ognik-factfamily-20': '👨‍👩‍👧‍👦',
  'pochodnia-skipcount-2': '🦘',
  'pochodnia-skipcount-5': '🦘',
  'pochodnia-skipcount-10': '🦘',
  'pochodnia-equalgroups': '🟰',
  'pochodnia-arrays': '🔲',
  'pochodnia-commutativity': '🔄',
}

const STAGES: Array<{ emoji: string; minMastered: number; label: string }> = [
  { emoji: '🌱', minMastered: 0, label: 'sadzonka' },
  { emoji: '🪴', minMastered: 5, label: 'doniczka' },
  { emoji: '🌿', minMastered: 10, label: 'zielony' },
  { emoji: '🌳', minMastered: 15, label: 'drzewko' },
  { emoji: '🌲', minMastered: 20, label: 'mistrzostwo' },
]

function activeStageIndex(masteredCount: number): number {
  let idx = 0
  for (let i = STAGES.length - 1; i >= 0; i--) {
    const stage = STAGES[i]
    if (stage && masteredCount >= stage.minMastered) {
      idx = i
      break
    }
  }
  return idx
}

export function MasteryTree() {
  const concepts = useNumbers((s) => s.concepts)
  const allConcepts = Object.values(CONCEPTS)
  const masteredCount = allConcepts.filter(
    (c) => concepts[c.id]?.state === 'mastered',
  ).length
  const totalCount = allConcepts.length
  const activeIdx = activeStageIndex(masteredCount)

  return (
    <div
      data-testid="mastery-tree-root"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        gap: 16,
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

      {/* Ścieżka 5 etapów wzrostu — aktywny powiększony, przeszłe wybielone, przyszłe wyszare */}
      <div
        data-testid="stages-path"
        aria-label={`Etap: ${STAGES[activeIdx]?.label ?? ''}`}
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          padding: '8px 16px',
          background: '#ffffff',
          borderRadius: 16,
          border: '2px solid #e2e2e8',
        }}
      >
        {STAGES.map((stage, idx) => {
          const isActive = idx === activeIdx
          const isPast = idx < activeIdx
          return (
            <div
              key={stage.emoji}
              data-testid={`stage-${idx}`}
              data-active={isActive}
              style={{
                fontSize: isActive ? 64 : 32,
                opacity: isActive ? 1 : isPast ? 0.7 : 0.3,
                transition: 'all 200ms',
                filter: isPast ? 'none' : isActive ? 'none' : 'grayscale(0.4)',
              }}
            >
              {stage.emoji}
            </div>
          )
        })}
      </div>

      <div
        data-testid="mastery-summary"
        style={{
          fontFamily: 'var(--font-handwritten)',
          fontSize: 32,
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
                padding: 10,
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
                fontSize: 13,
                color: colors.text,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
                {CONCEPT_ICONS[c.id]}
              </span>
              <span style={{ flex: 1, lineHeight: 1.2 }}>{CONCEPT_LABELS[c.id]}</span>
              <span aria-hidden="true" style={{ fontSize: 18, flexShrink: 0 }}>
                {LEAF_EMOJI[state]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
