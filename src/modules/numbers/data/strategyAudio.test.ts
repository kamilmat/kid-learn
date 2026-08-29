import { describe, it, expect } from 'vitest'
import { strategyAudioKey } from './strategyAudio'

describe('strategyAudioKey', () => {
  it('count-on', () => {
    expect(strategyAudioKey('iskierka-adding-concrete', '+')).toBe('strategy-count-on')
    expect(strategyAudioKey('plomyk-addsub-10', '+')).toBe('strategy-count-on')
  })
  it('count-back przy minusie', () =>
    expect(strategyAudioKey('plomyk-addsub-10', '-')).toBe('strategy-count-back'))
  it('doubles / near-doubles', () => {
    expect(strategyAudioKey('ognik-doubles', '+')).toBe('strategy-doubles')
    expect(strategyAudioKey('ognik-neardoubles', '+')).toBe('strategy-near-doubles')
  })
  it('make10 i tenframe', () => {
    expect(strategyAudioKey('ognik-make10', '+')).toBe('strategy-make10')
    expect(strategyAudioKey('plomyk-tenframe', '+')).toBe('strategy-make10')
  })
  it('bez strategii → null', () => {
    expect(strategyAudioKey('iskierka-rhythm', '+')).toBeNull()
    expect(strategyAudioKey('pochodnia-arrays', '+')).toBeNull()
  })
})
