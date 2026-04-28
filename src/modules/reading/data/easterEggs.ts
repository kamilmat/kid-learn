export type EasterEggCategory = 'mild' | 'silly'

export type EasterEgg = {
  id: string
  audio: string                                    // klucz audio (TTS Marek lub manual SFX)
  animation: { name: string; css: string }        // CSS keyframes
  durationMs: number
  category: EasterEggCategory
}

export const EASTER_EGGS: EasterEgg[] = [
  {
    id: 'apsik',
    audio: 'iskra-apsik',
    animation: {
      name: 'sneezeShake',
      css: '@keyframes sneezeShake { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-15deg) translateY(-20px) scale(1.1); } }',
    },
    durationMs: 1200,
    category: 'mild',
  },
  {
    id: 'hiccup',
    audio: 'iskra-hik',
    animation: {
      name: 'hiccupBounce',
      css: '@keyframes hiccupBounce { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-8px) scale(1.05); } }',
    },
    durationMs: 2000,
    category: 'mild',
  },
  {
    id: 'mlask',
    audio: 'iskra-mlask',
    animation: {
      name: 'chewingShake',
      css: '@keyframes chewingShake { 0%, 100% { transform: scale(1); } 30% { transform: scale(0.95) rotate(2deg); } 60% { transform: scale(1.05) rotate(-2deg); } }',
    },
    durationMs: 1500,
    category: 'mild',
  },
  {
    id: 'brrr',
    audio: 'iskra-brrr',
    animation: {
      name: 'shiverShake',
      css: '@keyframes shiverShake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }',
    },
    durationMs: 1500,
    category: 'mild',
  },
  {
    id: 'salto',
    audio: 'iskra-ojej',
    animation: {
      name: 'backflipLand',
      css: '@keyframes backflipLand { 0% { transform: rotate(0); } 50% { transform: rotate(360deg) translateY(-30px); } 100% { transform: rotate(360deg) translateY(0); } }',
    },
    durationMs: 1800,
    category: 'mild',
  },
  {
    id: 'gibberish',
    audio: 'iskra-plamplam',
    animation: {
      name: 'wiggleWalk',
      css: '@keyframes wiggleWalk { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-5deg) translateX(-3px); } 75% { transform: rotate(5deg) translateX(3px); } }',
    },
    durationMs: 1600,
    category: 'mild',
  },
  {
    id: 'burp',
    audio: 'iskra-uuups',
    animation: {
      name: 'bellySwell',
      css: '@keyframes bellySwell { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.25, 0.85); } }',
    },
    durationMs: 1200,
    category: 'silly',
  },
  {
    id: 'sparkle-fart',
    audio: 'iskra-fyt-fyt',
    animation: {
      name: 'sparkleFartCloud',
      css: '@keyframes sparkleFartCloud { 0% { transform: translateY(0); filter: blur(0); opacity: 1; } 100% { transform: translateY(-20px); filter: blur(2px); opacity: 0.5; } }',
    },
    durationMs: 1400,
    category: 'silly',
  },
]

export function pickRandomEasterEgg(humorMode: 'on' | 'off', rng: () => number = Math.random): EasterEgg {
  const pool = humorMode === 'on'
    ? EASTER_EGGS
    : EASTER_EGGS.filter(e => e.category === 'mild')
  return pool[Math.floor(rng() * pool.length)]!
}
