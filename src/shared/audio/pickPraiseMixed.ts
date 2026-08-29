import { pickNoRepeat } from './pickNoRepeat'

/**
 * Rzut monetą między pochwałą PROCESOWĄ („uważnie słuchałeś") a WYNIKOWĄ
 * („brawo"), potem `pickNoRepeat` WEWNĄTRZ wybranej listy. `lastKey` pamięta
 * klucz niezależnie od listy, więc dwie pochwały pod rząd nigdy nie są takie
 * same. WHY 50/50: same wynikowe oceniają dziecko, same procesowe nużą.
 */
export function pickPraiseMixed<T extends string>(
  outcomeKeys: readonly T[],
  processKeys: readonly T[],
  lastKey: T | null,
  rng: () => number,
): T {
  const useProcess = rng() < 0.5
  const list = useProcess ? processKeys : outcomeKeys
  if (list.length === 0) return pickNoRepeat(useProcess ? outcomeKeys : processKeys, lastKey, rng)
  return pickNoRepeat(list, lastKey, rng)
}
