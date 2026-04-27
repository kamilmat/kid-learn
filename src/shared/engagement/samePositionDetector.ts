export type SlotPosition = 0 | 1 | 2 | 3

export type SamePositionDetector = {
  /**
   * Rejestruje pozycję slotu. Zwraca `true` gdy ta sama pozycja wystąpiła `threshold` razy z rzędu.
   * Po flagu stan się resetuje.
   */
  recordPosition(position: SlotPosition): boolean
  reset(): void
}

/**
 * Detektor identycznych pozycji — `threshold` (default 5) tap-ów w ten sam slot z rzędu.
 */
export function createSamePositionDetector(threshold: number = 5): SamePositionDetector {
  let last: SlotPosition | null = null
  let streak = 0

  return {
    recordPosition(position: SlotPosition): boolean {
      if (last === position) {
        streak += 1
      } else {
        last = position
        streak = 1
      }
      if (streak >= threshold) {
        last = null
        streak = 0
        return true
      }
      return false
    },
    reset(): void {
      last = null
      streak = 0
    },
  }
}
