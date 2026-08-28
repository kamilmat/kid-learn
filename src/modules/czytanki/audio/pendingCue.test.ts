import { describe, expect, it } from 'vitest'
import { setPendingCue, takePendingCue } from './pendingCue'

describe('pendingCue', () => {
  it('zwraca ustawiony klucz raz, potem null', () => {
    setPendingCue('czytanki-ui-next')
    expect(takePendingCue()).toBe('czytanki-ui-next')
    expect(takePendingCue()).toBeNull()
  })
})
