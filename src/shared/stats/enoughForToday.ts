// „Na dziś wystarczy" — odczyt ze store'ów wszystkich modułów.
//
// Osobno od `todaySessions.ts`, żeby ta czysta funkcja (używana przez
// `exporter.ts`) nie ciągnęła za sobą trzech store'ów z persistem.

import { useLetters } from '@/modules/letters/store/lettersStore'
import { useNumbers } from '@/modules/numbers/store/numbersStore'
import { useReading } from '@/modules/reading/store/readingStore'

import { toUnifiedSessions } from './aggregate'
import { completedSessionsToday, ENOUGH_SESSIONS_TODAY } from './todaySessions'

/**
 * Czy dziecko ma już dziś dość. Wołane z ekranów końca sesji — ekran montuje
 * się PO zapisaniu logu, więc bieżąca sesja jest już policzona.
 */
export function hasEnoughForToday(now: number): boolean {
  const sessions = toUnifiedSessions({
    letters: useLetters.getState().sessions,
    reading: useReading.getState().sessions,
    numbers: useNumbers.getState().sessions,
  })
  return completedSessionsToday(sessions, now) >= ENOUGH_SESSIONS_TODAY
}
