export type FastClickDetector = {
  /**
   * Rejestruje kliknięcie/odpowiedź. Zwraca `true` gdy w bieżącym sliding window
   * mamy `requiredCount` kliknięć, z których każde nastąpiło <thresholdMs po poprzednim.
   * Po zwróceniu `true` stan jest resetowany (kolejny burst osobny flag).
   */
  recordClick(timestamp: number): boolean
  /** Czyści wewnętrzny bufor. */
  reset(): void
}

/**
 * Detektor szybkich kliknięć — sliding window.
 * Flag gdy `requiredCount` (default 3) odpowiedzi pod rząd, każda <`thresholdMs` (default 1000) po poprzedniej.
 */
export function createFastClickDetector(
  thresholdMs: number = 1000,
  requiredCount: number = 3,
): FastClickDetector {
  // Trzymamy ostatnie timestampy spełniające warunek "krótki odstęp od poprzedniego".
  let recent: number[] = []

  return {
    recordClick(timestamp: number): boolean {
      const last = recent.length > 0 ? recent[recent.length - 1]! : null
      if (last === null || timestamp - last < thresholdMs) {
        recent.push(timestamp)
      } else {
        // Łańcuch przerwany — zaczynamy od tego eventu.
        recent = [timestamp]
      }

      if (recent.length >= requiredCount) {
        recent = []
        return true
      }
      return false
    },
    reset(): void {
      recent = []
    },
  }
}
