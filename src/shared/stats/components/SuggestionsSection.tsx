// SuggestionsSection — sekcja 14.4 spec.
//
// Heurystyki tekstowe dla rodzica generowane lokalnie z `letters` + `sessions`.
// Pure function `generateSuggestions` jest re-eksportowana i używana także
// przez `exporter.ts` żeby treść UI ≡ markdown.

import type { LetterState } from '@/shared/srs/types'
import type { SessionLog, SessionEvent } from '@/shared/stats/types'
import { POLISH_ALPHABET, toUpper } from '@/modules/letters/data/alphabet'

const SUGGESTIONS_COLOR_TEXT = '#2d2d33'

export type SuggestionsSectionProps = {
  letters: Record<string, LetterState>
  sessions: SessionLog[]
}

/**
 * Score dla "siły" litery — im wyższy, tym lepiej.
 * (totalCorrect - (totalWrong + totalDontKnow + totalTimeout)).
 * Litery nieoglądane (totalSeen=0) dostają -Infinity → trafiają na koniec
 * (nie chcemy ich pokazywać jako "najsłabszych" gdy dziecko ich nie widziało).
 */
function letterScore(s: LetterState): number {
  if (s.totalSeen === 0) return -Infinity
  return s.totalCorrect - (s.totalWrong + s.totalDontKnow + s.totalTimeout)
}

/**
 * Score "negatywny" dla najsłabszych — im wyższy, tym słabsze.
 * Wymaga że litera była widziana co najmniej raz.
 */
function letterWeaknessScore(s: LetterState): number {
  if (s.totalSeen === 0) return -Infinity
  return s.totalWrong + s.totalDontKnow + s.totalTimeout - s.totalCorrect
}

function topNLetters(
  letters: Record<string, LetterState>,
  scoreFn: (s: LetterState) => number,
  n: number,
): string[] {
  const seen = Object.values(letters).filter((s) => s.totalSeen > 0)
  seen.sort((a, b) => scoreFn(b) - scoreFn(a))
  return seen.slice(0, n).map((s) => s.letter)
}

function formatLetterList(letters: string[]): string {
  return letters.map((l) => toUpper(l)).join(', ')
}

/**
 * Czy średni czas odpowiedzi rośnie? Bierzemy ostatnie 2 sesje (jeśli istnieją)
 * i porównujemy średnie responseMs z eventów answer.
 */
function avgResponseMs(events: SessionEvent[]): number {
  let sum = 0
  let count = 0
  for (const ev of events) {
    if (ev.type !== 'answer') continue
    sum += ev.responseMs
    count++
  }
  if (count === 0) return 0
  return sum / count
}

/** Zwraca true, jeśli ostatnia sesja jest wyraźnie wolniejsza od poprzedniej. */
export function isResponseTimeIncreasing(sessions: SessionLog[]): boolean {
  if (sessions.length < 2) return false
  const last = sessions[sessions.length - 1]!
  const prev = sessions[sessions.length - 2]!
  const lastAvg = avgResponseMs(last.events)
  const prevAvg = avgResponseMs(prev.events)
  if (prevAvg === 0 || lastAvg === 0) return false
  // 1.25x slower = wyraźny wzrost
  return lastAvg > prevAvg * 1.25
}

/**
 * Generuje listę tekstowych sugestii (PL) na podstawie danych dziecka.
 * Stałe rekomendacje (sleep, shared learning, częstotliwość) są zawsze.
 * Heurystyki dynamiczne (najsłabsze/najmocniejsze/zmęczenie) — gdy dane na to
 * pozwalają.
 */
export function generateSuggestions(
  letters: Record<string, LetterState>,
  sessions: SessionLog[],
): string[] {
  const out: string[] = []

  // Najsłabsze 3
  const weakest = topNLetters(letters, letterWeaknessScore, 3)
  if (weakest.length > 0) {
    out.push(
      `Najsłabsze litery: ${formatLetterList(weakest)} — warto je włączyć / poćwiczyć więcej.`,
    )
  }

  // Najmocniejsze 3
  const strongest = topNLetters(letters, letterScore, 3)
  if (strongest.length > 0) {
    out.push(`Świetnie poszło: ${formatLetterList(strongest)}.`)
  }

  if (isResponseTimeIncreasing(sessions)) {
    out.push('Średni czas odpowiedzi rośnie — może dziecko zmęczone, krótsza sesja?')
  }

  // Stałe rekomendacje (research-backed, sekcja 14.4)
  out.push('Krótka sesja przed snem pomaga utrwalić — sen konsoliduje pamięć.')
  out.push('Czasem siądź obok — dzieci uczą się szybciej z mentorem niż samodzielnie.')
  out.push('Optymalna częstość: 2× dziennie po 6-8 min > 1× 15 min.')

  return out
}

// Re-eksport stałej alfabetu dla testów (deterministic ordering w razie potrzeby)
export { POLISH_ALPHABET }

export function SuggestionsSection({
  letters,
  sessions,
}: SuggestionsSectionProps) {
  const suggestions = generateSuggestions(letters, sessions)

  return (
    <section
      data-testid="suggestions-section"
      style={{
        padding: 16,
        background: '#ffffff',
        border: '1px solid #e8e0d2',
        borderRadius: 12,
        color: SUGGESTIONS_COLOR_TEXT,
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>Sugestie</h2>
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
        {suggestions.map((s, i) => (
          <li key={i} data-testid="suggestion-item">
            {s}
          </li>
        ))}
      </ul>
    </section>
  )
}
