// Cue nawigacji (np. "czytanki-ui-next") musi przeżyć unmount ekranu, który go
// wywołał — komponent źródłowy znika w tym samym tick'u co nawigacja, więc nie
// może sam odtworzyć dźwięku z opóźnieniem (jego timeout zostałby wyczyszczony
// przez własny unmount cleanup). Zamiast tego zapisujemy klucz tutaj, a odbiera
// go docelowy ekran po zamontowaniu.
let pending: string | null = null

export function setPendingCue(key: string): void {
  pending = key
}

export function takePendingCue(): string | null {
  const key = pending
  pending = null
  return key
}
