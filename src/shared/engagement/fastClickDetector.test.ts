import { describe, expect, it } from 'vitest'
import { createFastClickDetector } from './fastClickDetector'

describe('createFastClickDetector', () => {
  it('flag-uje 3 szybkie kliknięcia <1s odstępu', () => {
    const d = createFastClickDetector(1000, 3)
    expect(d.recordClick(0)).toBe(false)
    expect(d.recordClick(500)).toBe(false)
    expect(d.recordClick(1200)).toBe(true)
  })

  it('nie flag-uje gdy odstęp >=thresholdMs przerwie łańcuch', () => {
    const d = createFastClickDetector(1000, 3)
    expect(d.recordClick(0)).toBe(false)
    expect(d.recordClick(500)).toBe(false)
    // 2000 - 500 = 1500 → przerwa za duża, łańcuch zerwany.
    expect(d.recordClick(2000)).toBe(false)
    expect(d.recordClick(2500)).toBe(false)
    expect(d.recordClick(3000)).toBe(true)
  })

  it('po flagu resetuje state i wymaga kolejnego pełnego burst-u', () => {
    const d = createFastClickDetector(1000, 3)
    d.recordClick(0)
    d.recordClick(100)
    expect(d.recordClick(200)).toBe(true)
    // Następny click — sam, brak kontynuacji.
    expect(d.recordClick(300)).toBe(false)
    expect(d.recordClick(400)).toBe(false)
    expect(d.recordClick(500)).toBe(true)
  })

  it('reset() czyści bufor', () => {
    const d = createFastClickDetector(1000, 3)
    d.recordClick(0)
    d.recordClick(100)
    d.reset()
    expect(d.recordClick(150)).toBe(false)
    expect(d.recordClick(200)).toBe(false)
    expect(d.recordClick(250)).toBe(true)
  })

  it('default thresholds (1000ms, 3 kliknięcia)', () => {
    const d = createFastClickDetector()
    expect(d.recordClick(0)).toBe(false)
    expect(d.recordClick(900)).toBe(false)
    expect(d.recordClick(1500)).toBe(true)
  })

  it('konfigurowalne thresholds', () => {
    const d = createFastClickDetector(500, 5)
    expect(d.recordClick(0)).toBe(false)
    expect(d.recordClick(100)).toBe(false)
    expect(d.recordClick(200)).toBe(false)
    expect(d.recordClick(300)).toBe(false)
    expect(d.recordClick(400)).toBe(true)
  })
})
