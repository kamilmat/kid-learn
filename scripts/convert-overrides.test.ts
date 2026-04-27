import { describe, expect, it } from 'vitest'
import { decideConvert } from './convert-overrides'

describe('decideConvert', () => {
  it('konwertuje gdy mp3 nie istnieje', () => {
    expect(decideConvert({ webmExists: true, webmMtime: 100, mp3Exists: false, mp3Mtime: 0 })).toEqual({ convert: true, reason: 'no-mp3' })
  })

  it('konwertuje gdy webm jest nowszy niż mp3', () => {
    expect(decideConvert({ webmExists: true, webmMtime: 200, mp3Exists: true, mp3Mtime: 100 })).toEqual({ convert: true, reason: 'webm-newer' })
  })

  it('pomija gdy mp3 jest aktualne (nowsze lub równe webm)', () => {
    expect(decideConvert({ webmExists: true, webmMtime: 100, mp3Exists: true, mp3Mtime: 100 })).toEqual({ convert: false, reason: 'up-to-date' })
    expect(decideConvert({ webmExists: true, webmMtime: 100, mp3Exists: true, mp3Mtime: 200 })).toEqual({ convert: false, reason: 'up-to-date' })
  })

  it('zwraca błąd gdy webm nie istnieje', () => {
    expect(decideConvert({ webmExists: false, webmMtime: 0, mp3Exists: false, mp3Mtime: 0 })).toEqual({ convert: false, reason: 'no-webm' })
  })
})
