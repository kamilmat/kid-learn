// Losowanie klucza audio bez powtórki z poprzednim — wspólne dla wszystkich
// modułów (pochwały, reakcje). WHY: dziecko natychmiast wyłapuje, że ta sama
// pochwała leci dwa razy pod rząd, i przestaje jej słuchać.

/**
 * Zwraca element puli różny od `last` (o ile pula ma > 1 element). Gdy
 * losowanie trafi w `last`, bierzemy następny modulo — rozkład pozostaje
 * praktycznie równomierny, a kod jest deterministyczny przy wstrzykniętym rng.
 */
export function pickNoRepeat<T>(pool: readonly T[], last: T | null, rng: () => number): T {
  const idx = Math.floor(rng() * pool.length)
  const candidate = pool[idx] as T
  if (candidate !== last || pool.length < 2) return candidate
  return pool[(idx + 1) % pool.length] as T
}
