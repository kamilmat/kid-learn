// scenes.ts — mini-scenki słów (Phase 7, premiere tier).
// 20 Płomyk × 2-3 wariantów + 5 Ognik favourites × 2-3 wariantów = ~50 scenek.

export type SceneKeyframe = {
  name: string
  css: string
}

export type Scene = {
  id: string                        // unique: 'mama-v1', 'mama-v2'
  emoji: string                     // primary emoji to animate
  durationMs: number                // 2000-3000 typical
  keyframes: SceneKeyframe[]        // CSS keyframes definitions (first one is applied to emoji)
  audio: string[]                   // sequence of audio keys
  effects?: string[]                // particle effects: 'hearts', 'stars', 'sparkle'
}

export const SCENES_BY_WORD: Record<string, Scene[]> = {
  // ===== PŁOMYK 20 słów × 2-3 wariantów ≈ 40-50 scenek =====

  MAMA: [
    {
      id: 'mama-v1', emoji: '👩‍👧', durationMs: 2000,
      keyframes: [{ name: 'mamaHug', css: '@keyframes mamaHug { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15) rotate(-3deg); } }' }],
      audio: ['word-MAMA'],
      effects: ['hearts'],
    },
    {
      id: 'mama-v2', emoji: '👩', durationMs: 2500,
      keyframes: [{ name: 'mamaWave', css: '@keyframes mamaWave { 0% { transform: rotate(0); } 25% { transform: rotate(15deg); } 50% { transform: rotate(0); } 75% { transform: rotate(15deg); } 100% { transform: rotate(0); } }' }],
      audio: ['word-MAMA'],
      effects: ['hearts'],
    },
  ],

  TATA: [
    {
      id: 'tata-v1', emoji: '👨', durationMs: 2200,
      keyframes: [{ name: 'tataBounce', css: '@keyframes tataBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }' }],
      audio: ['word-TATA'],
    },
    {
      id: 'tata-v2', emoji: '👨‍👧', durationMs: 2500,
      keyframes: [{ name: 'tataPlay', css: '@keyframes tataPlay { 0% { transform: rotate(0); } 50% { transform: rotate(8deg) translateX(20px); } 100% { transform: rotate(0); } }' }],
      audio: ['word-TATA'],
      effects: ['stars'],
    },
  ],

  LALA: [
    {
      id: 'lala-v1', emoji: '🧸', durationMs: 2000,
      keyframes: [{ name: 'lalaWiggle', css: '@keyframes lalaWiggle { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }' }],
      audio: ['word-LALA'],
    },
    {
      id: 'lala-v2', emoji: '🪆', durationMs: 2200,
      keyframes: [{ name: 'lalaSpin', css: '@keyframes lalaSpin { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }' }],
      audio: ['word-LALA'],
      effects: ['stars'],
    },
  ],

  KURA: [
    {
      id: 'kura-v1', emoji: '🐔', durationMs: 2300,
      keyframes: [{ name: 'kuraPeck', css: '@keyframes kuraPeck { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(20deg) translateY(10px); } 60% { transform: rotate(-10deg); } }' }],
      audio: ['word-KURA'],
    },
    {
      id: 'kura-v2', emoji: '🐔', durationMs: 2500,
      keyframes: [{ name: 'kuraRun', css: '@keyframes kuraRun { 0% { transform: translateX(-100px); } 100% { transform: translateX(100px); } }' }],
      audio: ['word-KURA'],
    },
  ],

  NORA: [
    {
      id: 'nora-v1', emoji: '🦊', durationMs: 2200,
      keyframes: [{ name: 'noraPeek', css: '@keyframes noraPeek { 0%, 100% { transform: translateY(50px) scale(0.6); opacity: 0.4; } 50% { transform: translateY(0) scale(1); opacity: 1; } }' }],
      audio: ['word-NORA'],
    },
    {
      id: 'nora-v2', emoji: '🐰', durationMs: 2400,
      keyframes: [{ name: 'noraBunny', css: '@keyframes noraBunny { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-30px) scale(0.8); } 55% { transform: translateY(10px) scale(1.1); } }' }],
      audio: ['word-NORA'],
    },
  ],

  ROSA: [
    {
      id: 'rosa-v1', emoji: '💧', durationMs: 2300,
      keyframes: [{ name: 'rosaFall', css: '@keyframes rosaFall { 0% { transform: translateY(-100px) scale(0.6); } 100% { transform: translateY(50px) scale(1); } }' }],
      audio: ['word-ROSA'],
    },
    {
      id: 'rosa-v2', emoji: '🌿', durationMs: 2200,
      keyframes: [{ name: 'rosaSway', css: '@keyframes rosaSway { 0%, 100% { transform: rotate(0); } 33% { transform: rotate(-8deg); } 66% { transform: rotate(8deg); } }' }],
      audio: ['word-ROSA'],
    },
  ],

  LATO: [
    {
      id: 'lato-v1', emoji: '☀️', durationMs: 2500,
      keyframes: [{ name: 'latoShine', css: '@keyframes latoShine { 0%, 100% { transform: scale(1) rotate(0); } 50% { transform: scale(1.2) rotate(180deg); } }' }],
      audio: ['word-LATO'],
      effects: ['stars'],
    },
    {
      id: 'lato-v2', emoji: '🌻', durationMs: 2300,
      keyframes: [{ name: 'latoBloom', css: '@keyframes latoBloom { 0% { transform: scale(0.5); } 100% { transform: scale(1.1); } }' }],
      audio: ['word-LATO'],
    },
  ],

  BABA: [
    {
      id: 'baba-v1', emoji: '👵', durationMs: 2200,
      keyframes: [{ name: 'babaWave', css: '@keyframes babaWave { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(15deg); } }' }],
      audio: ['word-BABA'],
      effects: ['hearts'],
    },
    {
      id: 'baba-v2', emoji: '👵', durationMs: 2400,
      keyframes: [{ name: 'babaNod', css: '@keyframes babaNod { 0%, 100% { transform: translateY(0); } 30% { transform: translateY(-8px); } 60% { transform: translateY(4px); } }' }],
      audio: ['word-BABA'],
      effects: ['hearts'],
    },
  ],

  MAPA: [
    {
      id: 'mapa-v1', emoji: '🗺️', durationMs: 2500,
      keyframes: [{ name: 'mapaUnfold', css: '@keyframes mapaUnfold { 0% { transform: scaleX(0.2); } 100% { transform: scaleX(1); } }' }],
      audio: ['word-MAPA'],
    },
    {
      id: 'mapa-v2', emoji: '🧭', durationMs: 2300,
      keyframes: [{ name: 'mapaCompass', css: '@keyframes mapaCompass { 0% { transform: rotate(0); } 100% { transform: rotate(720deg); } }' }],
      audio: ['word-MAPA'],
    },
  ],

  TAMA: [
    {
      id: 'tama-v1', emoji: '🦫', durationMs: 2400,
      keyframes: [{ name: 'tamaWork', css: '@keyframes tamaWork { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-15deg) scale(1.1); } }' }],
      audio: ['word-TAMA'],
    },
    {
      id: 'tama-v2', emoji: '🌊', durationMs: 2300,
      keyframes: [{ name: 'tamaWave', css: '@keyframes tamaWave { 0% { transform: translateX(-30px) scaleX(0.8); } 50% { transform: translateX(20px) scaleX(1.1); } 100% { transform: translateX(-10px) scaleX(0.9); } }' }],
      audio: ['word-TAMA'],
    },
  ],

  NUTA: [
    {
      id: 'nuta-v1', emoji: '🎵', durationMs: 2200,
      keyframes: [{ name: 'nutaFloat', css: '@keyframes nutaFloat { 0% { transform: translateY(20px); } 100% { transform: translateY(-50px); } }' }],
      audio: ['word-NUTA'],
    },
    {
      id: 'nuta-v2', emoji: '🎶', durationMs: 2400,
      keyframes: [{ name: 'nutaDance', css: '@keyframes nutaDance { 0%, 100% { transform: translateY(0) rotate(0); } 25% { transform: translateY(-15px) rotate(-10deg); } 75% { transform: translateY(-15px) rotate(10deg); } }' }],
      audio: ['word-NUTA'],
    },
  ],

  RAMA: [
    {
      id: 'rama-v1', emoji: '🖼️', durationMs: 2300,
      keyframes: [{ name: 'ramaShine', css: '@keyframes ramaShine { 0%, 100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.1); filter: brightness(1.4); } }' }],
      audio: ['word-RAMA'],
      effects: ['sparkle'],
    },
    {
      id: 'rama-v2', emoji: '🎨', durationMs: 2500,
      keyframes: [{ name: 'ramaPaint', css: '@keyframes ramaPaint { 0% { transform: rotate(-15deg) scale(0.8); } 50% { transform: rotate(5deg) scale(1.1); } 100% { transform: rotate(-5deg) scale(1); } }' }],
      audio: ['word-RAMA'],
    },
  ],

  KORA: [
    {
      id: 'kora-v1', emoji: '🌳', durationMs: 2400,
      keyframes: [{ name: 'koraGrow', css: '@keyframes koraGrow { 0% { transform: scale(0.5) translateY(50px); } 100% { transform: scale(1.1) translateY(0); } }' }],
      audio: ['word-KORA'],
    },
    {
      id: 'kora-v2', emoji: '🌲', durationMs: 2300,
      keyframes: [{ name: 'koraSway', css: '@keyframes koraSway { 0%, 100% { transform: rotate(0); } 33% { transform: rotate(-5deg); } 66% { transform: rotate(5deg); } }' }],
      audio: ['word-KORA'],
    },
  ],

  KOSA: [
    {
      id: 'kosa-v1', emoji: '🌾', durationMs: 2300,
      keyframes: [{ name: 'kosaSwing', css: '@keyframes kosaSwing { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }' }],
      audio: ['word-KOSA'],
    },
    {
      id: 'kosa-v2', emoji: '🌾', durationMs: 2500,
      keyframes: [{ name: 'kosaMow', css: '@keyframes kosaMow { 0% { transform: translateX(-80px) rotate(30deg); } 100% { transform: translateX(80px) rotate(-10deg); } }' }],
      audio: ['word-KOSA'],
    },
  ],

  SOWA: [
    {
      id: 'sowa-v1', emoji: '🦉', durationMs: 2400,
      keyframes: [{ name: 'sowaTurn', css: '@keyframes sowaTurn { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(-30deg); } 70% { transform: rotate(30deg); } }' }],
      audio: ['word-SOWA'],
    },
    {
      id: 'sowa-v2', emoji: '🦉', durationMs: 2500,
      keyframes: [{ name: 'sowaBlink', css: '@keyframes sowaBlink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }' }],
      audio: ['word-SOWA'],
    },
  ],

  KOTY: [
    {
      id: 'koty-v1', emoji: '🐱', durationMs: 2500,
      keyframes: [{ name: 'kotyRun', css: '@keyframes kotyRun { 0% { transform: translateX(-150px); } 100% { transform: translateX(150px); } }' }],
      audio: ['word-KOTY'],
    },
    {
      id: 'koty-v2', emoji: '🐱', durationMs: 2800,
      keyframes: [{ name: 'kotyTumble', css: '@keyframes kotyTumble { 0%, 30% { transform: translateX(-100px) rotate(0); } 60% { transform: translateX(0) rotate(0); } 80% { transform: translateX(20px) rotate(180deg) translateY(-10px); } 100% { transform: translateX(40px) rotate(360deg); } }' }],
      audio: ['word-KOTY'],
    },
    {
      id: 'koty-v3', emoji: '😻', durationMs: 2400,
      keyframes: [{ name: 'kotyYawn', css: '@keyframes kotyYawn { 0%, 50% { transform: scale(1); } 70% { transform: scale(1.2); } 100% { transform: scale(0.95); } }' }],
      audio: ['word-KOTY'],
    },
  ],

  LAMA: [
    {
      id: 'lama-v1', emoji: '🦙', durationMs: 2400,
      keyframes: [{ name: 'lamaWalk', css: '@keyframes lamaWalk { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(30px); } }' }],
      audio: ['word-LAMA'],
    },
    {
      id: 'lama-v2', emoji: '🦙', durationMs: 2600,
      keyframes: [{ name: 'lamaHead', css: '@keyframes lamaHead { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(15deg); } }' }],
      audio: ['word-LAMA'],
    },
  ],

  KAWA: [
    {
      id: 'kawa-v1', emoji: '☕', durationMs: 2300,
      keyframes: [{ name: 'kawaSteam', css: '@keyframes kawaSteam { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08) translateY(-5px); } }' }],
      audio: ['word-KAWA'],
    },
    {
      id: 'kawa-v2', emoji: '☕', durationMs: 2500,
      keyframes: [{ name: 'kawaSip', css: '@keyframes kawaSip { 0% { transform: rotate(0); } 40% { transform: rotate(-20deg); } 70% { transform: rotate(0); } 100% { transform: rotate(0); } }' }],
      audio: ['word-KAWA'],
    },
  ],

  KASA: [
    {
      id: 'kasa-v1', emoji: '💰', durationMs: 2200,
      keyframes: [{ name: 'kasaShake', css: '@keyframes kasaShake { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-8deg); } 75% { transform: rotate(8deg); } }' }],
      audio: ['word-KASA'],
      effects: ['sparkle'],
    },
    {
      id: 'kasa-v2', emoji: '🏧', durationMs: 2400,
      keyframes: [{ name: 'kasaBlink', css: '@keyframes kasaBlink { 0%, 60%, 100% { transform: scale(1); } 30% { transform: scale(1.1); filter: brightness(1.3); } }' }],
      audio: ['word-KASA'],
    },
  ],

  DUDA: [
    {
      id: 'duda-v1', emoji: '🎶', durationMs: 2400,
      keyframes: [{ name: 'dudaPlay', css: '@keyframes dudaPlay { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-10px) rotate(-5deg); } 75% { transform: translateY(-10px) rotate(5deg); } }' }],
      audio: ['word-DUDA'],
      effects: ['stars'],
    },
    {
      id: 'duda-v2', emoji: '🎵', durationMs: 2600,
      keyframes: [{ name: 'dudaFloat', css: '@keyframes dudaFloat { 0% { transform: translateY(30px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-60px); opacity: 0; } }' }],
      audio: ['word-DUDA'],
    },
  ],

  // ===== OGNIK 5 favourites × 2-3 wariantów ≈ 10-15 scenek =====

  SAMOCHÓD: [
    {
      id: 'samochod-v1', emoji: '🚗', durationMs: 2500,
      keyframes: [{ name: 'samochodDrive', css: '@keyframes samochodDrive { 0% { transform: translateX(-150px); } 100% { transform: translateX(150px); } }' }],
      audio: ['word-SAMOCHÓD'],
    },
    {
      id: 'samochod-v2', emoji: '🚙', durationMs: 2800,
      keyframes: [{ name: 'samochodHonk', css: '@keyframes samochodHonk { 0%, 100% { transform: scale(1); } 30%, 50% { transform: scale(1.15); } }' }],
      audio: ['word-SAMOCHÓD'],
    },
    {
      id: 'samochod-v3', emoji: '🏎️', durationMs: 2200,
      keyframes: [{ name: 'samochodRace', css: '@keyframes samochodRace { 0% { transform: translateX(-200px) scaleX(0.8); } 80% { transform: translateX(180px) scaleX(0.8); } 100% { transform: translateX(200px) scaleX(0.8); } }' }],
      audio: ['word-SAMOCHÓD'],
    },
  ],

  ŻABA: [
    {
      id: 'zaba-v1', emoji: '🐸', durationMs: 2400,
      keyframes: [{ name: 'zabaJump', css: '@keyframes zabaJump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-50px) scale(1.1); } }' }],
      audio: ['word-ŻABA'],
    },
    {
      id: 'zaba-v2', emoji: '🐸', durationMs: 2600,
      keyframes: [{ name: 'zabaCroak', css: '@keyframes zabaCroak { 0%, 100% { transform: scale(1); } 30% { transform: scale(1.15) translateY(-5px); } 60% { transform: scale(0.95); } }' }],
      audio: ['word-ŻABA'],
    },
    {
      id: 'zaba-v3', emoji: '🐸', durationMs: 2500,
      keyframes: [{ name: 'zabaLily', css: '@keyframes zabaLily { 0% { transform: translateY(0) rotate(0); } 40% { transform: translateY(-40px) rotate(-10deg); } 70% { transform: translateY(-60px) rotate(5deg); } 100% { transform: translateY(-80px) rotate(0); opacity: 0; } }' }],
      audio: ['word-ŻABA'],
    },
  ],

  BANAN: [
    {
      id: 'banan-v1', emoji: '🍌', durationMs: 2300,
      keyframes: [{ name: 'bananSwing', css: '@keyframes bananSwing { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }' }],
      audio: ['word-BANAN'],
    },
    {
      id: 'banan-v2', emoji: '🐒', durationMs: 2500,
      keyframes: [{ name: 'bananMonkey', css: '@keyframes bananMonkey { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px) rotate(15deg); } }' }],
      audio: ['word-BANAN'],
    },
    {
      id: 'banan-v3', emoji: '🍌', durationMs: 2400,
      keyframes: [{ name: 'bananPeel', css: '@keyframes bananPeel { 0% { transform: scale(0.5) rotate(-30deg); } 60% { transform: scale(1.2) rotate(5deg); } 100% { transform: scale(1) rotate(0); } }' }],
      audio: ['word-BANAN'],
    },
  ],

  RYBKA: [
    {
      id: 'rybka-v1', emoji: '🐠', durationMs: 2400,
      keyframes: [{ name: 'rybkaSwim', css: '@keyframes rybkaSwim { 0% { transform: translateX(-100px); } 50% { transform: translateX(50px) translateY(-20px); } 100% { transform: translateX(150px); } }' }],
      audio: ['word-RYBKA'],
    },
    {
      id: 'rybka-v2', emoji: '🐟', durationMs: 2600,
      keyframes: [{ name: 'rybkaDance', css: '@keyframes rybkaDance { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-15deg) translateY(-10px); } 75% { transform: rotate(15deg) translateY(10px); } }' }],
      audio: ['word-RYBKA'],
    },
    {
      id: 'rybka-v3', emoji: '🐡', durationMs: 2500,
      keyframes: [{ name: 'rybkaPuff', css: '@keyframes rybkaPuff { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); } }' }],
      audio: ['word-RYBKA'],
    },
  ],

  KOTEK: [
    {
      id: 'kotek-v1', emoji: '🐈', durationMs: 2400,
      keyframes: [{ name: 'kotekPlay', css: '@keyframes kotekPlay { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-25px) scale(1.1); } }' }],
      audio: ['word-KOTEK'],
    },
    {
      id: 'kotek-v2', emoji: '🐈‍⬛', durationMs: 2600,
      keyframes: [{ name: 'kotekStretch', css: '@keyframes kotekStretch { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.4) scaleY(0.9); } }' }],
      audio: ['word-KOTEK'],
    },
    {
      id: 'kotek-v3', emoji: '😸', durationMs: 2300,
      keyframes: [{ name: 'kotekPurr', css: '@keyframes kotekPurr { 0%, 100% { transform: scale(1) rotate(0); } 25% { transform: scale(1.05) rotate(-3deg); } 75% { transform: scale(1.05) rotate(3deg); } }' }],
      audio: ['word-KOTEK'],
      effects: ['hearts'],
    },
  ],
}

export function pickRandomScene(wordText: string, seenVariants: string[] = []): Scene | null {
  const scenes = SCENES_BY_WORD[wordText]
  if (!scenes || scenes.length === 0) return null
  const unseen = scenes.filter(s => !seenVariants.includes(s.id))
  const pool = unseen.length > 0 ? unseen : scenes
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getSceneById(sceneId: string): Scene | null {
  for (const scenes of Object.values(SCENES_BY_WORD)) {
    const found = scenes.find(s => s.id === sceneId)
    if (found) return found
  }
  return null
}
