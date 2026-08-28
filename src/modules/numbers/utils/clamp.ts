/**
 * Przycina wartość do zakresu [min, max] i zaokrągla w dół.
 *
 * Ćwiczenia dostają `payload.args` z generatora pytań — clamp chroni układ
 * przed absurdami (np. 40 kropek w ten-frame) gdy fakt ma nietypowe argumenty.
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)))
}
