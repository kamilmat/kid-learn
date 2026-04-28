import type { ComponentType } from 'react'
import { RocketBlast } from '../components/celebrations/RocketBlast'
import { FallingFruits } from '../components/celebrations/FallingFruits'
import { ScreenFlip } from '../components/celebrations/ScreenFlip'
import { DancingAvocado } from '../components/celebrations/DancingAvocado'
import { RainbowRun } from '../components/celebrations/RainbowRun'

export type WildCelebrationDef = {
  id: string
  durationMs: number
  Component: ComponentType<{ onComplete: () => void }>
  audio: string[]
}

export const WILD_CELEBRATIONS: WildCelebrationDef[] = [
  { id: 'rocket', durationMs: 2000, Component: RocketBlast, audio: ['sfx-mastery-fanfara', 'iskra-piuuu'] },
  { id: 'fruits', durationMs: 2500, Component: FallingFruits, audio: ['sfx-mastery-fanfara'] },
  { id: 'flip', durationMs: 1500, Component: ScreenFlip, audio: ['sfx-mastery-fanfara'] },
  { id: 'avocado', durationMs: 2000, Component: DancingAvocado, audio: ['sfx-mastery-fanfara', 'iskra-haha'] },
  { id: 'rainbow', durationMs: 2500, Component: RainbowRun, audio: ['sfx-mastery-fanfara'] },
]

export function pickRandomWildCelebration(rng: () => number = Math.random): WildCelebrationDef {
  return WILD_CELEBRATIONS[Math.floor(rng() * WILD_CELEBRATIONS.length)]!
}
