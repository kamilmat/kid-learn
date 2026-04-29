import { useNumbers } from '@/modules/numbers/store/numbersStore'
import { CONCEPTS } from '@/modules/numbers/data/concepts'
import { CONCEPT_LABELS } from '@/modules/numbers/data/conceptLabels'
import type { ConceptId, MathFactId, MathFactState } from '@/modules/numbers/types'

const cardStyle = {
  padding: 16,
  background: '#ffffff',
  border: '1px solid #e2e2e8',
  borderRadius: 12,
} as const

type ConceptGroupKey =
  | 'counting'
  | 'subitizing'
  | 'bonds'
  | 'addsub'
  | 'doubles'
  | 'make10'
  | 'skipcount'
  | 'multiplication'

const CONCEPT_GROUPS: Record<ConceptGroupKey, { label: string; concepts: ConceptId[] }> = {
  counting: { label: 'Liczenie', concepts: ['iskierka-counting-5', 'iskierka-counting-10'] },
  subitizing: { label: 'Subitizing/Rytm', concepts: ['iskierka-subitizing-6', 'iskierka-rhythm'] },
  bonds: { label: 'Rozkłady', concepts: ['plomyk-bonds-5', 'plomyk-bonds-10'] },
  addsub: { label: '+/− do 10', concepts: ['iskierka-adding-concrete', 'plomyk-tenframe', 'plomyk-addsub-10'] },
  doubles: { label: 'Podwójki', concepts: ['ognik-doubles', 'ognik-neardoubles'] },
  make10: { label: 'Zrób 10', concepts: ['ognik-make10'] },
  skipcount: { label: 'Skip count', concepts: ['pochodnia-skipcount-2', 'pochodnia-skipcount-5', 'pochodnia-skipcount-10'] },
  multiplication: { label: 'Mnożenie', concepts: ['plomyk-factfamily', 'ognik-factfamily-20', 'pochodnia-equalgroups', 'pochodnia-arrays', 'pochodnia-commutativity'] },
}

export function formatFactId(id: MathFactId): string {
  // Format z numbers/types.ts: <type>-<args>
  const parts = id.split('-')
  const type = parts[0]
  switch (type) {
    case 'bond': return `${parts[2]}+${parts[3]}`
    case 'add': return `${parts[1]}+${parts[2]}`
    case 'sub': return `${parts[1]}-${parts[2]}`
    case 'double': return `${parts[1]}+${parts[1]}`
    case 'neardouble': return `${parts[1]}+${parts[2]}`
    case 'make10': return `${parts[1]}+${parts[2]}`
    case 'mult': return `${parts[1]}×${parts[2]}`
    case 'array': {
      const dims = parts[1]?.split('x')
      return dims && dims.length === 2 ? `${dims[0]}×${dims[1]}` : id
    }
    case 'tenframe': return `TF·${parts[1]}`
    case 'skip2':
    case 'skip5':
    case 'skip10': {
      const step = type.replace('skip', '')
      return `+${step}`
    }
    default: return id
  }
}

function difficultyColor(avg: number | null): string {
  if (avg === null) return '#f3f4f6'
  if (avg <= 1) return '#d1fae5'
  if (avg <= 3) return '#fef3c7'
  return '#fee2e2'
}

type NumbersStatsProps = {
  onOpenTree?: () => void
}

export function NumbersStats({ onOpenTree }: NumbersStatsProps = {}) {
  const concepts = useNumbers((s) => s.concepts)
  const facts = useNumbers((s) => s.facts)

  const allConcepts = Object.values(CONCEPTS)
  const totalConcepts = allConcepts.length

  const masteredList = allConcepts.filter((c) => concepts[c.id]?.state === 'mastered')
  const learningCount = allConcepts.filter((c) => concepts[c.id]?.state === 'learning').length
  const untouchedCount = totalConcepts - masteredList.length - learningCount

  const allFactStates: MathFactState[] = Object.values(facts)
  const difficultFacts = allFactStates
    .filter((f) => f.recentWrong > 0)
    .sort((a, b) => {
      if (b.recentWrong !== a.recentWrong) return b.recentWrong - a.recentWrong
      return a.box - b.box
    })
    .slice(0, 10)

  const heatmap = (Object.keys(CONCEPT_GROUPS) as ConceptGroupKey[]).map((groupKey) => {
    const group = CONCEPT_GROUPS[groupKey]
    const groupFacts = allFactStates.filter((f) => group.concepts.includes(f.conceptId))
    if (groupFacts.length === 0) {
      return { key: groupKey, label: group.label, avg: null as number | null, n: 0 }
    }
    const sum = groupFacts.reduce((s, f) => s + (f.recentWrong + (5 - f.box)), 0)
    return { key: groupKey, label: group.label, avg: sum / groupFacts.length, n: groupFacts.length }
  })

  return (
    <section
      data-testid="numbers-stats-section"
      style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}
    >
      <h2 style={{ margin: 0, fontSize: 20 }}>Matematyka (moduł 3)</h2>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Koncepty</h3>
        <p style={{ margin: '0 0 4px' }}>
          Opanowane: {masteredList.length} / {totalConcepts}
        </p>
        {masteredList.length > 0 && (
          <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: 13 }}>
            {masteredList.slice(0, 10).map((c) => CONCEPT_LABELS[c.id]).join(', ')}
            {masteredList.length > 10 ? ` +${masteredList.length - 10}` : ''}
          </p>
        )}
        <p style={{ margin: '0 0 4px' }}>W nauce: {learningCount}</p>
        <p style={{ margin: '0 0 8px' }}>Nietknięte: {untouchedCount}</p>
        {onOpenTree && (
          <button
            type="button"
            data-testid="numbers-stats-tree-link"
            onClick={onOpenTree}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: '#1d4ed8',
              cursor: 'pointer',
              fontSize: 14,
              textDecoration: 'underline',
            }}
          >
            Zobacz drzewko →
          </button>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Najtrudniejsze fakty (top 10)</h3>
        {difficultFacts.length === 0 ? (
          <p style={{ margin: 0, color: '#059669' }}>Brak trudnych faktów — wszystko idzie!</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {difficultFacts.map((f) => (
              <div
                key={f.id}
                data-testid={`difficult-fact-${f.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span>{formatFactId(f.id)}</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: '#7c2d12' }}>
                  {f.recentWrong}× wrong
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Heatmapa typów konceptów</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
          Kolor: zielony = łatwe, żółty = średnie, czerwony = trudne. n = liczba faktów z danymi.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
          }}
        >
          {heatmap.map((cell) => (
            <div
              key={cell.key}
              data-testid={`concept-group-cell-${cell.key}`}
              style={{
                padding: 8,
                borderRadius: 8,
                textAlign: 'center' as const,
                fontWeight: 700,
                fontSize: 14,
                background: difficultyColor(cell.avg),
              }}
            >
              {cell.label}
              <div style={{ fontSize: 10, fontWeight: 400 }}>n={cell.n}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
