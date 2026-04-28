import { describe, expect, it } from 'vitest'
import { SCENES_BY_WORD, pickRandomScene, getSceneById } from './scenes'

describe('scenes', () => {
  it('20 Płomyk words have at least 1 scene', () => {
    const PLOMYK = ['MAMA', 'TATA', 'LALA', 'KURA', 'NORA', 'ROSA', 'LATO', 'BABA', 'MAPA', 'TAMA',
                    'NUTA', 'RAMA', 'KORA', 'KOSA', 'SOWA', 'KOTY', 'LAMA', 'KAWA', 'KASA', 'DUDA']
    for (const w of PLOMYK) {
      expect(SCENES_BY_WORD[w]?.length ?? 0, `${w} should have at least 1 scene`).toBeGreaterThanOrEqual(1)
    }
  })

  it('5 Ognik favourites have at least 2 variants', () => {
    const OGNIK_FAV = ['SAMOCHÓD', 'ŻABA', 'BANAN', 'RYBKA', 'KOTEK']
    for (const w of OGNIK_FAV) {
      expect(SCENES_BY_WORD[w]?.length ?? 0, `${w} should have at least 2 scenes`).toBeGreaterThanOrEqual(2)
    }
  })

  it('total scenes >= 30 (premiere tier minimum)', () => {
    const total = Object.values(SCENES_BY_WORD).reduce((sum, scenes) => sum + scenes.length, 0)
    expect(total).toBeGreaterThanOrEqual(30)
  })

  it('total scenes >= 50 (premiere tier target)', () => {
    const total = Object.values(SCENES_BY_WORD).reduce((sum, scenes) => sum + scenes.length, 0)
    expect(total).toBeGreaterThanOrEqual(50)
  })

  it('pickRandomScene returns null for unknown word', () => {
    expect(pickRandomScene('NIEZNANE', [])).toBeNull()
  })

  it('pickRandomScene returns a scene for MAMA', () => {
    const s = pickRandomScene('MAMA', [])
    expect(s).not.toBeNull()
    expect(s?.id.startsWith('mama')).toBe(true)
  })

  it('pickRandomScene prefers unseen variants', () => {
    const allMamaIds = SCENES_BY_WORD.MAMA?.map(s => s.id) ?? []
    if (allMamaIds.length >= 2) {
      const seen = [allMamaIds[0]!]
      const result = pickRandomScene('MAMA', seen)
      expect(result?.id).not.toBe(allMamaIds[0])
    }
  })

  it('pickRandomScene falls back to any variant when all seen', () => {
    const allMamaIds = SCENES_BY_WORD.MAMA?.map(s => s.id) ?? []
    const result = pickRandomScene('MAMA', allMamaIds)
    expect(result).not.toBeNull()
  })

  it('getSceneById finds a scene', () => {
    expect(getSceneById('mama-v1')?.emoji).toBe('👩‍👧')
  })

  it('getSceneById returns null for unknown id', () => {
    expect(getSceneById('nonexistent-scene')).toBeNull()
  })

  it('all scenes have unique ids', () => {
    const allIds = Object.values(SCENES_BY_WORD).flat().map(s => s.id)
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('all scenes have at least one keyframe', () => {
    const allScenes = Object.values(SCENES_BY_WORD).flat()
    for (const scene of allScenes) {
      expect(scene.keyframes.length, `scene ${scene.id} should have keyframes`).toBeGreaterThanOrEqual(1)
    }
  })

  it('all scene ids match their word prefix pattern', () => {
    for (const [, scenes] of Object.entries(SCENES_BY_WORD)) {
      for (const scene of scenes) {
        expect(scene.id).toMatch(/^[a-z]+-v\d+$/)
      }
    }
  })
})
