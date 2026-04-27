import { describe, expect, it } from 'vitest'
import { createSamePositionDetector } from './samePositionDetector'

describe('createSamePositionDetector', () => {
  it('flag-uje 5 razy ten sam slot z rzędu', () => {
    const d = createSamePositionDetector(5)
    expect(d.recordPosition(0)).toBe(false)
    expect(d.recordPosition(0)).toBe(false)
    expect(d.recordPosition(0)).toBe(false)
    expect(d.recordPosition(0)).toBe(false)
    expect(d.recordPosition(0)).toBe(true)
  })

  it('nie flag-uje gdy pozycje się różnią', () => {
    const d = createSamePositionDetector(5)
    expect(d.recordPosition(0)).toBe(false)
    expect(d.recordPosition(1)).toBe(false)
    expect(d.recordPosition(0)).toBe(false)
    expect(d.recordPosition(1)).toBe(false)
    expect(d.recordPosition(0)).toBe(false)
  })

  it('przerwany łańcuch zaczyna od nowa', () => {
    const d = createSamePositionDetector(5)
    d.recordPosition(2)
    d.recordPosition(2)
    d.recordPosition(2)
    expect(d.recordPosition(3)).toBe(false)
    // Teraz potrzeba kolejnych 5 z rzędu.
    expect(d.recordPosition(3)).toBe(false)
    expect(d.recordPosition(3)).toBe(false)
    expect(d.recordPosition(3)).toBe(false)
    expect(d.recordPosition(3)).toBe(true)
  })

  it('po flagu resetuje stan', () => {
    const d = createSamePositionDetector(3)
    d.recordPosition(1)
    d.recordPosition(1)
    expect(d.recordPosition(1)).toBe(true)
    // Kolejny click ten sam slot — nowy łańcuch zaczyna od długości 1.
    expect(d.recordPosition(1)).toBe(false)
    expect(d.recordPosition(1)).toBe(false)
    expect(d.recordPosition(1)).toBe(true)
  })

  it('reset() czyści streak', () => {
    const d = createSamePositionDetector(3)
    d.recordPosition(0)
    d.recordPosition(0)
    d.reset()
    expect(d.recordPosition(0)).toBe(false)
    expect(d.recordPosition(0)).toBe(false)
    expect(d.recordPosition(0)).toBe(true)
  })

  it('default threshold = 5', () => {
    const d = createSamePositionDetector()
    expect(d.recordPosition(3)).toBe(false)
    expect(d.recordPosition(3)).toBe(false)
    expect(d.recordPosition(3)).toBe(false)
    expect(d.recordPosition(3)).toBe(false)
    expect(d.recordPosition(3)).toBe(true)
  })
})
