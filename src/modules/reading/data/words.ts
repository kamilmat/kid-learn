import type { Level } from '@/shared/settings/types'

export type WordData = {
  id: string                  // 'word-MAMA'
  text: string                // 'MAMA'
  level: Level
  syllables: string[]         // dla Płomyk: ['MA', 'MA']; dla innych: best-effort decomposition
  albumEmoji: string          // fallback emoji w albumie
}

export const ALL_WORDS: readonly WordData[] = [
  // ===== PŁOMYK (20 słów, 2-sylabowe) =====
  { id: 'word-MAMA', text: 'MAMA', level: 'plomyk', syllables: ['MA', 'MA'], albumEmoji: '👩‍👧' },
  { id: 'word-TATA', text: 'TATA', level: 'plomyk', syllables: ['TA', 'TA'], albumEmoji: '👨‍👧' },
  { id: 'word-LALA', text: 'LALA', level: 'plomyk', syllables: ['LA', 'LA'], albumEmoji: '🧸' },
  { id: 'word-KURA', text: 'KURA', level: 'plomyk', syllables: ['KU', 'RA'], albumEmoji: '🐔' },
  { id: 'word-NORA', text: 'NORA', level: 'plomyk', syllables: ['NO', 'RA'], albumEmoji: '🕳️' },
  { id: 'word-ROSA', text: 'ROSA', level: 'plomyk', syllables: ['RO', 'SA'], albumEmoji: '💧' },
  { id: 'word-LATO', text: 'LATO', level: 'plomyk', syllables: ['LA', 'TO'], albumEmoji: '☀️' },
  { id: 'word-BABA', text: 'BABA', level: 'plomyk', syllables: ['BA', 'BA'], albumEmoji: '👵' },
  { id: 'word-MAPA', text: 'MAPA', level: 'plomyk', syllables: ['MA', 'PA'], albumEmoji: '🗺️' },
  { id: 'word-TAMA', text: 'TAMA', level: 'plomyk', syllables: ['TA', 'MA'], albumEmoji: '🦫' },
  { id: 'word-NUTA', text: 'NUTA', level: 'plomyk', syllables: ['NU', 'TA'], albumEmoji: '🎵' },
  { id: 'word-RAMA', text: 'RAMA', level: 'plomyk', syllables: ['RA', 'MA'], albumEmoji: '🖼️' },
  { id: 'word-KORA', text: 'KORA', level: 'plomyk', syllables: ['KO', 'RA'], albumEmoji: '🌳' },
  { id: 'word-KOSA', text: 'KOSA', level: 'plomyk', syllables: ['KO', 'SA'], albumEmoji: '👱‍♀️' },
  { id: 'word-SOWA', text: 'SOWA', level: 'plomyk', syllables: ['SO', 'WA'], albumEmoji: '🦉' },
  { id: 'word-KOTY', text: 'KOTY', level: 'plomyk', syllables: ['KO', 'TY'], albumEmoji: '🐱' },
  { id: 'word-LAMA', text: 'LAMA', level: 'plomyk', syllables: ['LA', 'MA'], albumEmoji: '🦙' },
  { id: 'word-KAWA', text: 'KAWA', level: 'plomyk', syllables: ['KA', 'WA'], albumEmoji: '☕' },
  { id: 'word-KASA', text: 'KASA', level: 'plomyk', syllables: ['KA', 'SA'], albumEmoji: '💰' },
  { id: 'word-DUDA', text: 'DUDA', level: 'plomyk', syllables: ['DU', 'DA'], albumEmoji: '🎶' },

  // ===== OGNIK (25 słów) =====
  { id: 'word-SZAFA', text: 'SZAFA', level: 'ognik', syllables: ['SZA', 'FA'], albumEmoji: '🚪' },
  { id: 'word-CZAPKA', text: 'CZAPKA', level: 'ognik', syllables: ['CZAP', 'KA'], albumEmoji: '🧢' },
  { id: 'word-MASZYNA', text: 'MASZYNA', level: 'ognik', syllables: ['MA', 'SZY', 'NA'], albumEmoji: '⚙️' },
  { id: 'word-MUSZKA', text: 'MUSZKA', level: 'ognik', syllables: ['MUSZ', 'KA'], albumEmoji: '🎀' },
  { id: 'word-RZEKA', text: 'RZEKA', level: 'ognik', syllables: ['RZE', 'KA'], albumEmoji: '🏞️' },
  { id: 'word-ŻABA', text: 'ŻABA', level: 'ognik', syllables: ['ŻA', 'BA'], albumEmoji: '🐸' },
  { id: 'word-CHŁOPIEC', text: 'CHŁOPIEC', level: 'ognik', syllables: ['CHŁO', 'PIEC'], albumEmoji: '👦' },
  { id: 'word-PARASOL', text: 'PARASOL', level: 'ognik', syllables: ['PA', 'RA', 'SOL'], albumEmoji: '☂️' },
  { id: 'word-BANAN', text: 'BANAN', level: 'ognik', syllables: ['BA', 'NAN'], albumEmoji: '🍌' },
  { id: 'word-KOSZULA', text: 'KOSZULA', level: 'ognik', syllables: ['KO', 'SZU', 'LA'], albumEmoji: '👕' },
  { id: 'word-SAMOCHÓD', text: 'SAMOCHÓD', level: 'ognik', syllables: ['SA', 'MO', 'CHÓD'], albumEmoji: '🚗' },
  { id: 'word-KOMPUTER', text: 'KOMPUTER', level: 'ognik', syllables: ['KOM', 'PU', 'TER'], albumEmoji: '💻' },
  { id: 'word-TELEFON', text: 'TELEFON', level: 'ognik', syllables: ['TE', 'LE', 'FON'], albumEmoji: '📱' },
  { id: 'word-ZABAWKA', text: 'ZABAWKA', level: 'ognik', syllables: ['ZA', 'BAW', 'KA'], albumEmoji: '🪀' },
  { id: 'word-LAMPA', text: 'LAMPA', level: 'ognik', syllables: ['LAM', 'PA'], albumEmoji: '💡' },
  { id: 'word-ROWER', text: 'ROWER', level: 'ognik', syllables: ['RO', 'WER'], albumEmoji: '🚲' },
  { id: 'word-AUTO', text: 'AUTO', level: 'ognik', syllables: ['AU', 'TO'], albumEmoji: '🚙' },
  { id: 'word-RYBKA', text: 'RYBKA', level: 'ognik', syllables: ['RYB', 'KA'], albumEmoji: '🐠' },
  { id: 'word-KOTEK', text: 'KOTEK', level: 'ognik', syllables: ['KO', 'TEK'], albumEmoji: '🐈' },
  { id: 'word-BUTELKA', text: 'BUTELKA', level: 'ognik', syllables: ['BU', 'TEL', 'KA'], albumEmoji: '🍼' },
  { id: 'word-SZALIK', text: 'SZALIK', level: 'ognik', syllables: ['SZA', 'LIK'], albumEmoji: '🧣' },
  { id: 'word-LIZAK', text: 'LIZAK', level: 'ognik', syllables: ['LI', 'ZAK'], albumEmoji: '🍭' },
  { id: 'word-MIŚ', text: 'MIŚ', level: 'ognik', syllables: ['MIŚ'], albumEmoji: '🧸' },
  { id: 'word-GĘŚ', text: 'GĘŚ', level: 'ognik', syllables: ['GĘŚ'], albumEmoji: '🦢' },
  { id: 'word-KOŃ', text: 'KOŃ', level: 'ognik', syllables: ['KOŃ'], albumEmoji: '🐴' },

  // ===== POCHODNIA (22 słowa) =====
  { id: 'word-KAPELUSZ', text: 'KAPELUSZ', level: 'pochodnia', syllables: ['KA', 'PE', 'LUSZ'], albumEmoji: '🎩' },
  { id: 'word-ZIELONY', text: 'ZIELONY', level: 'pochodnia', syllables: ['ZIE', 'LO', 'NY'], albumEmoji: '🟢' },
  { id: 'word-ŚLIWKA', text: 'ŚLIWKA', level: 'pochodnia', syllables: ['ŚLIW', 'KA'], albumEmoji: '🫐' },
  { id: 'word-SIANO', text: 'SIANO', level: 'pochodnia', syllables: ['SIA', 'NO'], albumEmoji: '🌾' },
  { id: 'word-CIASTKO', text: 'CIASTKO', level: 'pochodnia', syllables: ['CIAST', 'KO'], albumEmoji: '🍪' },
  { id: 'word-PIENIĄDZ', text: 'PIENIĄDZ', level: 'pochodnia', syllables: ['PIE', 'NIĄDZ'], albumEmoji: '💵' },
  { id: 'word-DZIECKO', text: 'DZIECKO', level: 'pochodnia', syllables: ['DZIEC', 'KO'], albumEmoji: '👶' },
  { id: 'word-LOKOMOTYWA', text: 'LOKOMOTYWA', level: 'pochodnia', syllables: ['LO', 'KO', 'MO', 'TY', 'WA'], albumEmoji: '🚂' },
  { id: 'word-POMIDOR', text: 'POMIDOR', level: 'pochodnia', syllables: ['PO', 'MI', 'DOR'], albumEmoji: '🍅' },
  { id: 'word-OGÓREK', text: 'OGÓREK', level: 'pochodnia', syllables: ['O', 'GÓ', 'REK'], albumEmoji: '🥒' },
  { id: 'word-MARCHEW', text: 'MARCHEW', level: 'pochodnia', syllables: ['MAR', 'CHEW'], albumEmoji: '🥕' },
  { id: 'word-ZIEMNIAK', text: 'ZIEMNIAK', level: 'pochodnia', syllables: ['ZIEM', 'NIAK'], albumEmoji: '🥔' },
  { id: 'word-CEBULA', text: 'CEBULA', level: 'pochodnia', syllables: ['CE', 'BU', 'LA'], albumEmoji: '🧅' },
  { id: 'word-SAŁATA', text: 'SAŁATA', level: 'pochodnia', syllables: ['SA', 'ŁA', 'TA'], albumEmoji: '🥬' },
  { id: 'word-KAPUSTA', text: 'KAPUSTA', level: 'pochodnia', syllables: ['KA', 'PU', 'STA'], albumEmoji: '🥬' },
  { id: 'word-ARBUZ', text: 'ARBUZ', level: 'pochodnia', syllables: ['AR', 'BUZ'], albumEmoji: '🍉' },
  { id: 'word-MELON', text: 'MELON', level: 'pochodnia', syllables: ['ME', 'LON'], albumEmoji: '🍈' },
  { id: 'word-BANANY', text: 'BANANY', level: 'pochodnia', syllables: ['BA', 'NA', 'NY'], albumEmoji: '🍌' },
  { id: 'word-KSIĘŻYC', text: 'KSIĘŻYC', level: 'pochodnia', syllables: ['KSIĘ', 'ŻYC'], albumEmoji: '🌙' },
  { id: 'word-NIEDŹWIEDŹ', text: 'NIEDŹWIEDŹ', level: 'pochodnia', syllables: ['NIE', 'DŹWIEDŹ'], albumEmoji: '🐻' },
  { id: 'word-CZWARTEK', text: 'CZWARTEK', level: 'pochodnia', syllables: ['CZWAR', 'TEK'], albumEmoji: '📅' },
  { id: 'word-CZEKOLADA', text: 'CZEKOLADA', level: 'pochodnia', syllables: ['CZE', 'KO', 'LA', 'DA'], albumEmoji: '🍫' },
] as const

export function getWordsByLevel(level: Level): readonly WordData[] {
  return ALL_WORDS.filter(w => w.level === level)
}

export function getWordById(id: string): WordData | undefined {
  return ALL_WORDS.find(w => w.id === id)
}

export function getWordAudioKey(word: string): string {
  return `word-${word}`
}
