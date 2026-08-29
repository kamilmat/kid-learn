import { describe, expect, it } from 'vitest'
import { suggestLevel } from './levelSuggestion'

describe('suggestLevel', () => {
  it('sugeruje awans przy wysokim ratio i wysokim avgBox', () => {
    expect(suggestLevel({ correctRatio: 0.85, avgBox: 3.6, previousRatios: [] })).toBe('up')
  })

  it('brak sugestii gdy avgBox za niski mimo dobrego ratio', () => {
    expect(suggestLevel({ correctRatio: 0.9, avgBox: 2.9, previousRatios: [] })).toBeNull()
  })

  it('brak sugestii cofnięcia po jednej słabej sesji', () => {
    expect(suggestLevel({ correctRatio: 0.3, avgBox: 2, previousRatios: [] })).toBeNull()
  })

  it('sugeruje cofnięcie dopiero po drugiej słabej sesji z rzędu', () => {
    expect(suggestLevel({ correctRatio: 0.3, avgBox: 2, previousRatios: [0.35] })).toBe('down')
  })

  it('brak sugestii cofnięcia gdy poprzednia sesja była dobra', () => {
    expect(suggestLevel({ correctRatio: 0.4, avgBox: 2, previousRatios: [0.9] })).toBeNull()
  })
})
