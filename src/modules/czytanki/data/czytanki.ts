import type { Czytanka, CzytankaGroup, Word } from './types'

// Skrót: w('KO','TA','.') → { syllables: ['KO','TA'], punct: '.' }
function w(...parts: string[]): Word {
  const last = parts[parts.length - 1]
  if (last === '.' || last === '!' || last === '?' || last === ',') {
    return { syllables: parts.slice(0, -1), punct: last }
  }
  return { syllables: parts }
}

export const GROUP_ORDER: readonly CzytankaGroup[] = [1, 2, 3, 4]

export const CZYTANKI: readonly Czytanka[] = [
  // — grupa 1: 1 zdanie, 3 słowa, wyłącznie sylaby otwarte CV —
  {
    id: 'cz-01', group: 1, title: 'Kot taty', emoji: '🐱',
    sentences: [[w('TA', 'TA'), w('MA'), w('KO', 'TA', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '🧔', x: 35, y: 60, size: 110, anim: 'bob' },
      { emoji: '🐱', x: 65, y: 70, size: 90, anim: 'wiggle', delay: 0.5 },
      { emoji: '👩', x: 85, y: 62, size: 96, anim: 'sway', delay: 1 },
    ] },
    comprehension: { question: 'Kto ma kota?', options: ['🧔', '👩', '👵'], answer: 0 },
  },
  {
    id: 'cz-02', group: 1, title: 'Mama myje buty', emoji: '👟',
    sentences: [[w('MA', 'MA'), w('MY', 'JE'), w('BU', 'TY', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '👩', x: 30, y: 55, size: 110, anim: 'sway' },
      { emoji: '👟', x: 60, y: 72, size: 80, anim: 'wiggle', delay: 0.4 },
      { emoji: '🧼', x: 85, y: 68, size: 66, anim: 'pulse', delay: 0.9 },
      { emoji: '🧦', x: 44, y: 80, size: 62, anim: 'bob', delay: 1.3 },
    ] },
    comprehension: { question: 'Co myje mama?', options: ['🧦', '🧤', '👟'], answer: 2 },
  },
  {
    id: 'cz-03', group: 1, title: 'Balony Oli', emoji: '🎈',
    sentences: [[w('O', 'LA'), w('MA'), w('BA', 'LO', 'NY', '.')]],
    scene: { bg: 'sky', actors: [
      { emoji: '👧', x: 30, y: 72, size: 105, anim: 'bob' },
      { emoji: '🎈', x: 55, y: 40, size: 80, anim: 'float', delay: 0.2 },
      { emoji: '🎈', x: 80, y: 50, size: 70, anim: 'float', delay: 0.8 },
      { emoji: '🧸', x: 15, y: 78, size: 70, anim: 'bob', delay: 1.2 },
    ] },
    comprehension: { question: 'Co ma Ola?', options: ['🧸', '🎈', '🍭'], answer: 1 },
  },
  {
    id: 'cz-04', group: 1, title: 'Koza i maliny', emoji: '🐐',
    sentences: [[w('KO', 'ZA'), w('JE'), w('MA', 'LI', 'NY', '.')]],
    scene: { bg: 'meadow', actors: [
      { emoji: '🐐', x: 32, y: 65, size: 110, anim: 'bob' },
      { emoji: '🫐', x: 70, y: 72, size: 70, anim: 'pulse', delay: 0.6 },
      { emoji: '🐔', x: 85, y: 55, size: 72, anim: 'wiggle', delay: 1.1 },
    ] },
    comprehension: { question: 'Kto je maliny?', options: ['🐮', '🐔', '🐐'], answer: 2 },
  },
  {
    id: 'cz-05', group: 1, title: 'Kakao', emoji: '☕',
    sentences: [[w('MA', 'MA'), w('GO', 'TU', 'JE'), w('KA', 'KA', 'O', '.')]],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👩', x: 30, y: 55, size: 110, anim: 'sway' },
      { emoji: '🍫', x: 58, y: 70, size: 66, anim: 'none' },
      { emoji: '☕', x: 82, y: 62, size: 84, anim: 'pulse', delay: 0.7 },
      { emoji: '👵', x: 15, y: 72, size: 92, anim: 'bob', delay: 1.2 },
    ] },
    comprehension: { question: 'Kto gotuje kakao?', options: ['👩', '🧔', '👵'], answer: 0 },
  },
  {
    id: 'cz-06', group: 1, title: 'Tata rysuje koty', emoji: '✏️',
    sentences: [[w('TA', 'TA'), w('RY', 'SU', 'JE'), w('KO', 'TY', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '🧔', x: 28, y: 58, size: 110, anim: 'bob' },
      { emoji: '✏️', x: 55, y: 70, size: 70, anim: 'wiggle', delay: 0.3 },
      { emoji: '🐈', x: 82, y: 62, size: 80, anim: 'pulse', delay: 1 },
      { emoji: '🐟', x: 15, y: 78, size: 62, anim: 'float', delay: 1.4 },
    ] },
    comprehension: { question: 'Co rysuje tata?', options: ['🐟', '🐈', '🐦'], answer: 1 },
  },
  {
    id: 'cz-07', group: 1, title: 'Sok Uli', emoji: '🧃',
    sentences: [[w('U', 'LA'), w('PI', 'JE'), w('SO', 'KI', '.')]],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👧', x: 35, y: 60, size: 105, anim: 'bob' },
      { emoji: '🧃', x: 70, y: 68, size: 80, anim: 'sway', delay: 0.5 },
      { emoji: '🥛', x: 88, y: 70, size: 70, anim: 'pulse', delay: 1 },
    ] },
    comprehension: { question: 'Co pije Ula?', options: ['🥛', '🧃', '☕'], answer: 1 },
  },
  {
    id: 'cz-08', group: 1, title: 'Sowa i lato', emoji: '🦉',
    sentences: [[w('SO', 'WA'), w('LU', 'BI'), w('LA', 'TO', '.')]],
    scene: { bg: 'forest', actors: [
      { emoji: '🦉', x: 30, y: 45, size: 100, anim: 'bob' },
      { emoji: '🌳', x: 62, y: 60, size: 120, anim: 'sway', delay: 0.6 },
      { emoji: '☀️', x: 88, y: 36, size: 72, anim: 'pulse', delay: 1.2 },
      { emoji: '🐿️', x: 15, y: 72, size: 66, anim: 'wiggle', delay: 0.9 },
    ] },
    comprehension: { question: 'Kto lubi lato?', options: ['🦉', '🐿️', '🐌'], answer: 0 },
  },
  {
    id: 'cz-09', group: 1, title: 'Ada wozi lale', emoji: '🪆',
    sentences: [[w('A', 'DA'), w('WO', 'ZI'), w('LA', 'LE', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '👧', x: 30, y: 60, size: 105, anim: 'sway' },
      { emoji: '🪆', x: 58, y: 72, size: 78, anim: 'wiggle', delay: 0.4 },
      { emoji: '🛒', x: 85, y: 70, size: 70, anim: 'bob', delay: 0.9 },
      { emoji: '⚽', x: 15, y: 80, size: 64, anim: 'bob', delay: 1.2 },
    ] },
    comprehension: { question: 'Co wozi Ada?', options: ['⚽', '🧩', '🪆'], answer: 2 },
  },
  {
    id: 'cz-10', group: 1, title: 'Tola maluje domy', emoji: '🎨',
    sentences: [[w('TO', 'LA'), w('MA', 'LU', 'JE'), w('DO', 'MY', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '👧', x: 28, y: 58, size: 105, anim: 'bob' },
      { emoji: '🎨', x: 55, y: 72, size: 74, anim: 'wiggle', delay: 0.5 },
      { emoji: '🏡', x: 82, y: 55, size: 90, anim: 'none' },
      { emoji: '🚗', x: 15, y: 80, size: 64, anim: 'bob', delay: 1.1 },
    ] },
    comprehension: { question: 'Co maluje Tola?', options: ['🏡', '🚗', '⛵'], answer: 0 },
  },
  {
    id: 'cz-11', group: 1, title: 'Lody w przedszkolu', emoji: '🍦',
    sentences: [[w('PA', 'NI'), w('DA', 'JE'), w('LO', 'DY', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '👩‍🏫', x: 30, y: 58, size: 110, anim: 'sway' },
      { emoji: '🍦', x: 58, y: 66, size: 76, anim: 'pulse', delay: 0.3 },
      { emoji: '🧒', x: 85, y: 68, size: 92, anim: 'bob', delay: 0.8 },
      { emoji: '🍎', x: 15, y: 76, size: 62, anim: 'pulse', delay: 1.2 },
    ] },
    comprehension: { question: 'Co daje pani?', options: ['🍎', '🍪', '🍦'], answer: 2 },
  },
  {
    id: 'cz-12', group: 1, title: 'Pada i pada', emoji: '❄️',
    sentences: [[w('PA', 'DA'), w('I'), w('PA', 'DA', '.')]],
    scene: { bg: 'snow', actors: [
      { emoji: '❄️', x: 25, y: 40, size: 70, anim: 'float' },
      { emoji: '❄️', x: 55, y: 50, size: 64, anim: 'float', delay: 0.7 },
      { emoji: '⛄', x: 80, y: 70, size: 110, anim: 'bob', delay: 1.1 },
    ] },
  },
  {
    id: 'cz-13', group: 1, title: 'Fale', emoji: '🌊',
    sentences: [[w('O', 'LA'), w('LU', 'BI'), w('FA', 'LE', '.')]],
    scene: { bg: 'beach', actors: [
      { emoji: '👧', x: 30, y: 62, size: 105, anim: 'bob' },
      { emoji: '🌊', x: 62, y: 74, size: 100, anim: 'sway', delay: 0.4 },
      { emoji: '🐚', x: 88, y: 78, size: 64, anim: 'pulse', delay: 1 },
    ] },
    comprehension: { question: 'Co lubi Ola?', options: ['🌊', '🐚', '⛰️'], answer: 0 },
  },
  {
    id: 'cz-14', group: 1, title: 'Dobranoc', emoji: '🌙',
    sentences: [[w('LO', 'LA'), w('TU', 'LI'), w('KO', 'TA', '.')]],
    scene: { bg: 'night', actors: [
      { emoji: '🌙', x: 25, y: 38, size: 80, anim: 'float' },
      { emoji: '👧', x: 55, y: 65, size: 105, anim: 'sway', delay: 0.5 },
      { emoji: '🐱', x: 80, y: 72, size: 76, anim: 'pulse', delay: 1 },
      { emoji: '🐶', x: 15, y: 76, size: 70, anim: 'bob', delay: 1.4 },
    ] },
    comprehension: { question: 'Kogo tuli Lola?', options: ['🐶', '🐴', '🐱'], answer: 2 },
  },
  {
    id: 'cz-15', group: 1, title: 'Banany Eli', emoji: '🍌',
    sentences: [[w('E', 'LA'), w('JE'), w('BA', 'NA', 'NY', '.')]],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👧', x: 32, y: 60, size: 105, anim: 'bob' },
      { emoji: '🍌', x: 68, y: 70, size: 80, anim: 'wiggle', delay: 0.6 },
      { emoji: '🍎', x: 88, y: 72, size: 66, anim: 'pulse', delay: 1.1 },
    ] },
    comprehension: { question: 'Co je Ela?', options: ['🍎', '🍌', '🥕'], answer: 1 },
  },
  // — dokładka do grupy 1 (cz-61…cz-70): te same reguły, nowe zdania —
  {
    id: 'cz-61', group: 1, title: 'Lody Oli', emoji: '🍦',
    sentences: [[w('O', 'LA'), w('JE'), w('LO', 'DY', '.')]],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👧', x: 32, y: 60, size: 110, anim: 'bob' },
      { emoji: '🍦', x: 62, y: 68, size: 86, anim: 'pulse', delay: 0.4 },
      { emoji: '🍌', x: 85, y: 72, size: 70, anim: 'wiggle', delay: 0.9 },
    ] },
    comprehension: { question: 'Co je Ola?', options: ['🍌', '🍦', '🥛'], answer: 1 },
  },
  {
    id: 'cz-62', group: 1, title: 'Kakao taty', emoji: '☕',
    sentences: [[w('TA', 'TA'), w('PI', 'JE'), w('KA', 'KA', 'O', '.')]],
    scene: { bg: 'kitchen', actors: [
      { emoji: '🧔', x: 32, y: 58, size: 110, anim: 'sway' },
      { emoji: '☕', x: 60, y: 70, size: 84, anim: 'pulse', delay: 0.4 },
      { emoji: '🧃', x: 84, y: 70, size: 70, anim: 'bob', delay: 0.9 },
    ] },
    comprehension: { question: 'Co pije tata?', options: ['🧃', '🥛', '☕'], answer: 2 },
  },
  {
    id: 'cz-63', group: 1, title: 'Banany od mamy', emoji: '🍌',
    sentences: [[w('MA', 'MA'), w('KU', 'PI', 'ŁA'), w('BA', 'NA', 'NY', '.')]],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👩', x: 30, y: 58, size: 110, anim: 'sway' },
      { emoji: '🍌', x: 58, y: 70, size: 84, anim: 'wiggle', delay: 0.3 },
      { emoji: '🍅', x: 82, y: 72, size: 70, anim: 'pulse', delay: 0.8 },
    ] },
    comprehension: { question: 'Co kupiła mama?', options: ['🍌', '🍅', '🍐'], answer: 0 },
  },
  {
    id: 'cz-64', group: 1, title: 'Ula maluje koty', emoji: '🎨',
    sentences: [[w('U', 'LA'), w('MA', 'LU', 'JE'), w('KO', 'TY', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '👧', x: 30, y: 60, size: 105, anim: 'bob' },
      { emoji: '🐱', x: 60, y: 68, size: 80, anim: 'wiggle', delay: 0.4 },
      { emoji: '🐶', x: 84, y: 70, size: 74, anim: 'bob', delay: 0.9 },
    ] },
    comprehension: { question: 'Co maluje Ula?', options: ['🐶', '🐱', '🐴'], answer: 1 },
  },
  {
    id: 'cz-65', group: 1, title: 'Lale Ady', emoji: '🪆',
    sentences: [[w('A', 'DA'), w('MA'), w('LA', 'LE', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '👧', x: 32, y: 62, size: 105, anim: 'sway' },
      { emoji: '🪆', x: 60, y: 70, size: 80, anim: 'pulse', delay: 0.4 },
      { emoji: '🧸', x: 84, y: 70, size: 72, anim: 'bob', delay: 0.9 },
    ] },
    comprehension: { question: 'Co ma Ada?', options: ['🧸', '🎈', '🪆'], answer: 2 },
  },
  {
    id: 'cz-66', group: 1, title: 'Maliny Loli', emoji: '🫐',
    sentences: [[w('LO', 'LA'), w('LU', 'BI'), w('MA', 'LI', 'NY', '.')]],
    scene: { bg: 'meadow', actors: [
      { emoji: '👧', x: 30, y: 62, size: 105, anim: 'bob' },
      { emoji: '🫐', x: 60, y: 70, size: 76, anim: 'pulse', delay: 0.4 },
      { emoji: '🍌', x: 84, y: 68, size: 70, anim: 'wiggle', delay: 0.9 },
    ] },
    comprehension: { question: 'Co lubi Lola?', options: ['🫐', '🍌', '🍦'], answer: 0 },
  },
  {
    id: 'cz-67', group: 1, title: 'Tola myje pomidory', emoji: '🍅',
    sentences: [[w('TO', 'LA'), w('MY', 'JE'), w('PO', 'MI', 'DO', 'RY', '.')]],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👧', x: 32, y: 60, size: 105, anim: 'sway' },
      { emoji: '🍅', x: 60, y: 70, size: 80, anim: 'pulse', delay: 0.4 },
      { emoji: '🥛', x: 84, y: 70, size: 70, anim: 'bob', delay: 0.9 },
    ] },
    comprehension: { question: 'Co myje Tola?', options: ['🥛', '🍅', '🍐'], answer: 1 },
  },
  {
    id: 'cz-68', group: 1, title: 'Ada rysuje domy', emoji: '🏠',
    sentences: [[w('A', 'DA'), w('RY', 'SU', 'JE'), w('DO', 'MY', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '👧', x: 30, y: 60, size: 105, anim: 'bob' },
      { emoji: '🏠', x: 62, y: 66, size: 86, anim: 'pulse', delay: 0.4 },
      { emoji: '🐱', x: 86, y: 72, size: 70, anim: 'wiggle', delay: 0.9 },
    ] },
    comprehension: { question: 'Co rysuje Ada?', options: ['🐱', '🚗', '🏠'], answer: 2 },
  },
  {
    id: 'cz-69', group: 1, title: 'To moja mama', emoji: '👩',
    sentences: [[w('TO'), w('MO', 'JA'), w('MA', 'MA', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '👩', x: 42, y: 58, size: 120, anim: 'sway' },
      { emoji: '👧', x: 70, y: 66, size: 90, anim: 'bob', delay: 0.5 },
      { emoji: '🐱', x: 88, y: 74, size: 66, anim: 'wiggle', delay: 1 },
    ] },
    comprehension: { question: 'Kto to jest?', options: ['👩', '👧', '🧔'], answer: 0 },
  },
  {
    id: 'cz-70', group: 1, title: 'Pani pokazuje kota', emoji: '🐱',
    sentences: [[w('PA', 'NI'), w('PO', 'KA', 'ZU', 'JE'), w('KO', 'TA', '.')]],
    scene: { bg: 'room', actors: [
      { emoji: '👩', x: 32, y: 58, size: 110, anim: 'sway' },
      { emoji: '🐱', x: 62, y: 70, size: 82, anim: 'wiggle', delay: 0.4 },
      { emoji: '🐐', x: 86, y: 70, size: 72, anim: 'bob', delay: 0.9 },
    ] },
    comprehension: { question: 'Kogo pokazuje pani?', options: ['🐐', '🐱', '🦉'], answer: 1 },
  },

  // — grupa 2: 2 zdania po 3–4 słowa, sylaby zamknięte dozwolone —
  {
    id: 'cz-16', group: 2, title: 'Dom i pies', emoji: '🏠',
    sentences: [
      [w('TO'), w('JEST'), w('DOM', '.')],
      [w('W'), w('DO', 'MU'), w('JEST'), w('PIES', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🏠', x: 40, y: 55, size: 120, anim: 'none' },
      { emoji: '🐶', x: 70, y: 72, size: 90, anim: 'bob', delay: 0.3 },
      { emoji: '🌳', x: 15, y: 60, size: 100, anim: 'sway', delay: 0.8 },
    ] },
    comprehension: { question: 'Gdzie jest pies?', options: ['🏠', '🌳', '🚗'], answer: 0 },
  },
  {
    id: 'cz-17', group: 2, title: 'Kot na oknie', emoji: '🐱',
    sentences: [
      [w('KOT'), w('ŚPI'), w('NA'), w('OK', 'NIE', '.')],
      [w('JEST'), w('MU'), w('CIE', 'PŁO', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🪟', x: 32, y: 50, size: 110, anim: 'none' },
      { emoji: '🐱', x: 62, y: 62, size: 90, anim: 'pulse', delay: 0.5 },
      { emoji: '☀️', x: 88, y: 40, size: 68, anim: 'pulse', delay: 1.1 },
      { emoji: '🐶', x: 15, y: 74, size: 78, anim: 'bob', delay: 1.4 },
    ] },
    comprehension: { question: 'Kto śpi na oknie?', options: ['🐶', '🐭', '🐱'], answer: 2 },
  },
  {
    id: 'cz-18', group: 2, title: 'Las i lis', emoji: '🦊',
    sentences: [
      [w('W'), w('LE', 'SIE'), w('JEST'), w('LIS', '.')],
      [w('LIS'), w('MA'), w('RU', 'DY'), w('O', 'GON', '.')],
    ],
    scene: { bg: 'forest', actors: [
      { emoji: '🌲', x: 25, y: 55, size: 120, anim: 'sway' },
      { emoji: '🦊', x: 58, y: 70, size: 95, anim: 'wiggle', delay: 0.4 },
      { emoji: '🌲', x: 85, y: 58, size: 100, anim: 'sway', delay: 1 },
      { emoji: '🐻', x: 15, y: 74, size: 80, anim: 'bob', delay: 1.3 },
    ] },
    comprehension: { question: 'Kto ma rudy ogon?', options: ['🐻', '🦊', '🐗'], answer: 1 },
  },
  {
    id: 'cz-19', group: 2, title: 'Ola w parku', emoji: '🛝',
    sentences: [
      [w('O', 'LA'), w('BIE', 'GA'), w('PO'), w('PAR', 'KU', '.')],
      [w('TA', 'TA'), w('JEST'), w('O', 'BOK', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '👧', x: 28, y: 68, size: 100, anim: 'bob' },
      { emoji: '🛝', x: 58, y: 60, size: 110, anim: 'none' },
      { emoji: '🧔', x: 85, y: 65, size: 105, anim: 'sway', delay: 0.7 },
    ] },
    comprehension: { question: 'Kto biega po parku?', options: ['🧔', '👧', '👵'], answer: 1 },
  },
  {
    id: 'cz-20', group: 2, title: 'Kubek mleka', emoji: '🥛',
    sentences: [
      [w('TU'), w('JEST'), w('KU', 'BEK', '.')],
      [w('W'), w('KUB', 'KU'), w('JEST'), w('MLE', 'KO', '.')],
    ],
    scene: { bg: 'kitchen', actors: [
      { emoji: '🥛', x: 35, y: 62, size: 100, anim: 'pulse' },
      { emoji: '🍪', x: 70, y: 70, size: 72, anim: 'wiggle', delay: 0.6 },
      { emoji: '🧃', x: 88, y: 60, size: 70, anim: 'sway', delay: 1.1 },
    ] },
    comprehension: { question: 'Co jest w kubku?', options: ['🥛', '🧃', '☕'], answer: 0 },
  },
  {
    id: 'cz-21', group: 2, title: 'Nowy rower', emoji: '🚲',
    sentences: [
      [w('TO'), w('JEST'), w('MÓJ'), w('RO', 'WER', '.')],
      [w('RO', 'WER'), w('JEST'), w('NO', 'WY', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🚲', x: 35, y: 68, size: 115, anim: 'bob' },
      { emoji: '🧒', x: 70, y: 60, size: 100, anim: 'sway', delay: 0.5 },
      { emoji: '🛴', x: 15, y: 74, size: 78, anim: 'sway', delay: 1 },
    ] },
    comprehension: { question: 'Co jest nowe?', options: ['🚗', '🛴', '🚲'], answer: 2 },
  },
  {
    id: 'cz-22', group: 2, title: 'Koń na polu', emoji: '🐴',
    sentences: [
      [w('NA'), w('PO', 'LU'), w('JEST'), w('KOŃ', '.')],
      [w('KOŃ'), w('JEST'), w('DU', 'ŻY', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🐴', x: 35, y: 62, size: 120, anim: 'sway' },
      { emoji: '🌾', x: 72, y: 76, size: 76, anim: 'wiggle', delay: 0.8 },
      { emoji: '🐮', x: 15, y: 70, size: 90, anim: 'bob', delay: 1.2 },
    ] },
    comprehension: { question: 'Kto jest na polu?', options: ['🐮', '🐴', '🐷'], answer: 1 },
  },
  {
    id: 'cz-23', group: 2, title: 'Bałwan', emoji: '⛄',
    sentences: [
      [w('W'), w('ZI', 'MIE'), w('PA', 'DA'), w('ŚNIEG', '.')],
      [w('O', 'LA'), w('LE', 'PI'), w('BAŁ', 'WA', 'NA', '.')],
    ],
    scene: { bg: 'snow', actors: [
      { emoji: '👧', x: 30, y: 65, size: 100, anim: 'bob' },
      { emoji: '⛄', x: 62, y: 68, size: 115, anim: 'pulse', delay: 0.5 },
      { emoji: '❄️', x: 88, y: 42, size: 66, anim: 'float', delay: 1.2 },
    ] },
    comprehension: { question: 'Co lepi Ola?', options: ['⛄', '❄️', '🏰'], answer: 0 },
  },
  {
    id: 'cz-24', group: 2, title: 'Klocki', emoji: '🧱',
    sentences: [
      [w('O', 'LA'), w('MA'), w('KLOC', 'KI', '.')],
      [w('Z'), w('KLOC', 'KÓW'), w('RO', 'BI'), w('DOM', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '👧', x: 30, y: 62, size: 100, anim: 'sway' },
      { emoji: '🧱', x: 60, y: 74, size: 78, anim: 'wiggle', delay: 0.4 },
      { emoji: '🏠', x: 85, y: 60, size: 88, anim: 'none' },
      { emoji: '🚗', x: 15, y: 78, size: 66, anim: 'bob', delay: 1.2 },
    ] },
    comprehension: { question: 'Co robi z klocków?', options: ['🚗', '🏰', '🏠'], answer: 2 },
  },
  {
    id: 'cz-25', group: 2, title: 'Na plaży', emoji: '🏖️',
    sentences: [
      [w('TU'), w('JEST'), w('PLA', 'ŻA', '.')],
      [w('O', 'LA'), w('MA'), w('WIA', 'DER', 'KO', '.')],
    ],
    scene: { bg: 'beach', actors: [
      { emoji: '⛱️', x: 28, y: 55, size: 110, anim: 'sway' },
      { emoji: '👧', x: 58, y: 68, size: 100, anim: 'bob', delay: 0.4 },
      { emoji: '🪣', x: 85, y: 76, size: 70, anim: 'pulse', delay: 1 },
    ] },
    comprehension: { question: 'Co ma Ola?', options: ['🪣', '⛱️', '🎈'], answer: 0 },
  },
  {
    id: 'cz-26', group: 2, title: 'Noc', emoji: '🌙',
    sentences: [
      [w('W'), w('NO', 'CY'), w('JEST'), w('CIEM', 'NO', '.')],
      [w('O', 'LA'), w('ŚPI'), w('W'), w('ŁÓŻ', 'KU', '.')],
    ],
    scene: { bg: 'night', actors: [
      { emoji: '🌙', x: 25, y: 38, size: 78, anim: 'float' },
      { emoji: '🛏️', x: 60, y: 68, size: 115, anim: 'none' },
      { emoji: '😴', x: 88, y: 55, size: 70, anim: 'pulse', delay: 0.9 },
      { emoji: '🪑', x: 15, y: 72, size: 80, anim: 'none' },
    ] },
    comprehension: { question: 'Gdzie śpi Ola?', options: ['🛋️', '🛏️', '🪑'], answer: 1 },
  },
  {
    id: 'cz-27', group: 2, title: 'Auto taty', emoji: '🚗',
    sentences: [
      [w('TA', 'TA'), w('MA'), w('AU', 'TO', '.')],
      [w('AU', 'TO'), w('STO', 'I'), w('W'), w('GA', 'RA', 'ŻU', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🚗', x: 35, y: 68, size: 118, anim: 'bob' },
      { emoji: '🧔', x: 72, y: 60, size: 105, anim: 'sway', delay: 0.6 },
      { emoji: '👩', x: 15, y: 62, size: 96, anim: 'bob', delay: 1.1 },
    ] },
    comprehension: { question: 'Kto ma auto?', options: ['👩', '👵', '🧔'], answer: 2 },
  },
  {
    id: 'cz-28', group: 2, title: 'Pomidory', emoji: '🍅',
    sentences: [
      [w('MA', 'MA'), w('KU', 'PI', 'ŁA'), w('PO', 'MI', 'DO', 'RY', '.')],
      [w('O', 'LA'), w('MY', 'JE'), w('PO', 'MI', 'DO', 'RY', '.')],
    ],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👩', x: 28, y: 58, size: 108, anim: 'sway' },
      { emoji: '🍅', x: 58, y: 72, size: 76, anim: 'pulse', delay: 0.5 },
      { emoji: '👧', x: 85, y: 62, size: 96, anim: 'bob', delay: 1 },
      { emoji: '🥒', x: 15, y: 76, size: 64, anim: 'wiggle', delay: 1.3 },
    ] },
    comprehension: { question: 'Co kupiła mama?', options: ['🍅', '🥒', '🍆'], answer: 0 },
  },
  {
    id: 'cz-29', group: 2, title: 'Mój miś', emoji: '🧸',
    sentences: [
      [w('TO'), w('JEST'), w('MÓJ'), w('MIŚ', '.')],
      [w('MIŚ'), w('MA'), w('MA', 'ŁY'), w('NOS', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🧸', x: 38, y: 62, size: 118, anim: 'bob' },
      { emoji: '🧒', x: 72, y: 66, size: 100, anim: 'sway', delay: 0.7 },
      { emoji: '⚽', x: 15, y: 78, size: 64, anim: 'bob', delay: 1.2 },
    ] },
    comprehension: { question: 'Co ma mały nos?', options: ['🪆', '🧸', '⚽'], answer: 1 },
  },
  {
    id: 'cz-30', group: 2, title: 'Babcia piecze', emoji: '🍰',
    sentences: [
      [w('TU'), w('JEST'), w('MO', 'JA'), w('BAB', 'CIA', '.')],
      [w('BAB', 'CIA'), w('RO', 'BI'), w('SER', 'NIK', '.')],
    ],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👵', x: 30, y: 58, size: 110, anim: 'sway' },
      { emoji: '🍰', x: 62, y: 70, size: 80, anim: 'pulse', delay: 0.5 },
      { emoji: '👧', x: 88, y: 64, size: 92, anim: 'bob', delay: 1.1 },
      { emoji: '🍪', x: 15, y: 74, size: 62, anim: 'pulse', delay: 1.4 },
    ] },
    comprehension: { question: 'Co robi babcia?', options: ['🍪', '🍦', '🍰'], answer: 2 },
  },
  // — dokładka do grupy 2 (cz-71…cz-80) —
  {
    id: 'cz-71', group: 2, title: 'Burek na dywanie', emoji: '🐶',
    sentences: [
      [w('BU', 'REK'), w('ŚPI'), w('NA'), w('DY', 'WA', 'NIE', '.')],
      [w('PIES'), w('MA'), w('CIE', 'PŁY'), w('KOC', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🐶', x: 38, y: 68, size: 112, anim: 'bob' },
      { emoji: '🧸', x: 68, y: 72, size: 74, anim: 'pulse', delay: 0.5 },
      { emoji: '🐱', x: 86, y: 64, size: 70, anim: 'wiggle', delay: 1 },
    ] },
    comprehension: { question: 'Kto śpi na dywanie?', options: ['🐱', '🧸', '🐶'], answer: 2 },
  },
  {
    id: 'cz-72', group: 2, title: 'Sowa i księżyc', emoji: '🦉',
    sentences: [
      [w('W'), w('LE', 'SIE'), w('SIE', 'DZI'), w('SO', 'WA', '.')],
      [w('SO', 'WA'), w('PA', 'TRZY'), w('NA'), w('KSIĘ', 'ŻYC', '.')],
    ],
    scene: { bg: 'night', actors: [
      { emoji: '🦉', x: 34, y: 62, size: 108, anim: 'bob' },
      { emoji: '🌙', x: 68, y: 30, size: 84, anim: 'float', delay: 0.4 },
      { emoji: '⭐', x: 86, y: 42, size: 58, anim: 'pulse', delay: 0.9 },
      { emoji: '🌳', x: 14, y: 70, size: 80, anim: 'sway', delay: 1.3 },
    ] },
    comprehension: { question: 'Na co patrzy sowa?', options: ['🌙', '⭐', '🌳'], answer: 0 },
  },
  {
    id: 'cz-73', group: 2, title: 'Grusze w sadzie', emoji: '🍐',
    sentences: [
      [w('W'), w('SA', 'DZIE'), w('RO', 'SNĄ'), w('GRU', 'SZE', '.')],
      [w('GRUSZ', 'KI'), w('SĄ'), w('DOJ', 'RZA', 'ŁE', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🌳', x: 30, y: 58, size: 118, anim: 'sway' },
      { emoji: '🍐', x: 60, y: 66, size: 78, anim: 'pulse', delay: 0.5 },
      { emoji: '🍅', x: 84, y: 74, size: 66, anim: 'bob', delay: 1 },
    ] },
    comprehension: { question: 'Co rośnie w sadzie?', options: ['🍅', '🍐', '🍌'], answer: 1 },
  },
  {
    id: 'cz-74', group: 2, title: 'Małpy w zoo', emoji: '🐒',
    sentences: [
      [w('W'), w('ZO', 'O'), w('SĄ'), w('MAŁ', 'PY', '.')],
      [w('O', 'LA'), w('PA', 'TRZY'), w('NA'), w('MAŁ', 'PY', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🐒', x: 40, y: 56, size: 100, anim: 'wiggle' },
      { emoji: '🐘', x: 72, y: 66, size: 96, anim: 'bob', delay: 0.6 },
      { emoji: '👧', x: 16, y: 70, size: 92, anim: 'sway', delay: 1 },
    ] },
    comprehension: { question: 'Kogo Ola widzi w zoo?', options: ['🐘', '🦉', '🐒'], answer: 2 },
  },
  {
    id: 'cz-75', group: 2, title: 'Piłka i Burek', emoji: '⚽',
    sentences: [
      [w('TO', 'MEK'), w('RZU', 'CA'), w('PIŁ', 'KĘ', '.')],
      [w('BU', 'REK'), w('BIE', 'GA'), w('ZA'), w('PIŁ', 'KĄ', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '👦', x: 24, y: 62, size: 104, anim: 'bob' },
      { emoji: '⚽', x: 56, y: 74, size: 68, anim: 'pulse', delay: 0.4 },
      { emoji: '🐶', x: 80, y: 68, size: 92, anim: 'wiggle', delay: 0.8 },
      { emoji: '🎈', x: 92, y: 34, size: 56, anim: 'float', delay: 1.2 },
    ] },
    comprehension: { question: 'Za czym biega Burek?', options: ['⚽', '🎈', '🐱'], answer: 0 },
  },
  {
    id: 'cz-76', group: 2, title: 'Pociąg jedzie', emoji: '🚂',
    sentences: [
      [w('PO', 'CIĄG'), w('JE', 'DZIE'), w('DA', 'LE', 'KO', '.')],
      [w('JE', 'DZIE', 'MY'), w('DO'), w('BAB', 'CI', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🚂', x: 36, y: 66, size: 116, anim: 'bob' },
      { emoji: '🚌', x: 74, y: 72, size: 80, anim: 'sway', delay: 0.6 },
      { emoji: '👵', x: 92, y: 60, size: 70, anim: 'wiggle', delay: 1.1 },
    ] },
    comprehension: { question: 'Czym jedziemy do babci?', options: ['🚌', '🚂', '🚗'], answer: 1 },
  },
  {
    id: 'cz-77', group: 2, title: 'Muszelki nad morzem', emoji: '🐚',
    sentences: [
      [w('NAD'), w('MO', 'RZEM'), w('SĄ'), w('FA', 'LE', '.')],
      [w('O', 'LA'), w('ZBIE', 'RA'), w('MU', 'SZEL', 'KI', '.')],
    ],
    scene: { bg: 'beach', actors: [
      { emoji: '🌊', x: 30, y: 52, size: 110, anim: 'sway' },
      { emoji: '👧', x: 60, y: 68, size: 100, anim: 'bob', delay: 0.5 },
      { emoji: '🐚', x: 82, y: 78, size: 62, anim: 'pulse', delay: 0.9 },
      { emoji: '🪣', x: 16, y: 78, size: 62, anim: 'wiggle', delay: 1.3 },
    ] },
    comprehension: { question: 'Co zbiera Ola?', options: ['🌊', '🪣', '🐚'], answer: 2 },
  },
  {
    id: 'cz-78', group: 2, title: 'Lampa i książka', emoji: '💡',
    sentences: [
      [w('WIE', 'CZO', 'REM'), w('ŚWIE', 'CI'), w('LAM', 'PA', '.')],
      [w('O', 'LA'), w('CZY', 'TA'), w('W'), w('ŁÓŻ', 'KU', '.')],
    ],
    scene: { bg: 'night', actors: [
      { emoji: '💡', x: 26, y: 40, size: 76, anim: 'pulse' },
      { emoji: '👧', x: 56, y: 66, size: 104, anim: 'bob', delay: 0.5 },
      { emoji: '📖', x: 78, y: 72, size: 72, anim: 'sway', delay: 0.9 },
      { emoji: '🎨', x: 92, y: 80, size: 58, anim: 'wiggle', delay: 1.4 },
    ] },
    comprehension: { question: 'Co robi Ola w łóżku?', options: ['📖', '🎨', '⚽'], answer: 0 },
  },
  {
    id: 'cz-79', group: 2, title: 'Marchewki', emoji: '🥕',
    sentences: [
      [w('MA', 'MA'), w('MY', 'JE'), w('MAR', 'CHEW', 'KI', '.')],
      [w('O', 'LA'), w('JE'), w('MAR', 'CHEW', 'KĘ', '.')],
    ],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👩', x: 28, y: 58, size: 108, anim: 'sway' },
      { emoji: '🥕', x: 58, y: 70, size: 78, anim: 'pulse', delay: 0.4 },
      { emoji: '👧', x: 82, y: 64, size: 92, anim: 'bob', delay: 0.8 },
      { emoji: '🍅', x: 94, y: 78, size: 58, anim: 'wiggle', delay: 1.2 },
    ] },
    comprehension: { question: 'Co je Ola?', options: ['🍅', '🥕', '🍐'], answer: 1 },
  },
  {
    id: 'cz-80', group: 2, title: 'Ptak na drzewie', emoji: '🌳',
    sentences: [
      [w('W'), w('PAR', 'KU'), w('RO', 'SNĄ'), w('DRZE', 'WA', '.')],
      [w('NA'), w('DRZE', 'WIE'), w('ŚPIE', 'WA'), w('PTAK', '.')],
    ],
    scene: { bg: 'forest', actors: [
      { emoji: '🌳', x: 32, y: 56, size: 124, anim: 'sway' },
      { emoji: '🐦', x: 58, y: 40, size: 66, anim: 'float', delay: 0.5 },
      { emoji: '🐿️', x: 82, y: 72, size: 70, anim: 'wiggle', delay: 1 },
    ] },
    comprehension: { question: 'Kto śpiewa na drzewie?', options: ['🐿️', '🦉', '🐦'], answer: 2 },
  },

  // — grupa 3: 3–4 zdania po 3–5 słów, dwuznaki i ę/ą/ó —
  {
    id: 'cz-31', group: 3, title: 'Myszka w norce', emoji: '🐭',
    sentences: [
      [w('MYSZ', 'KA'), w('SIE', 'DZI'), w('W'), w('NOR', 'CE', '.')],
      [w('TU'), w('JEST'), w('CI', 'CHO', '.')],
      [w('KOT'), w('ŚPI'), w('NA'), w('KA', 'NA', 'PIE', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🐭', x: 25, y: 75, size: 70, anim: 'wiggle' },
      { emoji: '🛋️', x: 65, y: 60, size: 120, anim: 'none' },
      { emoji: '🐱', x: 90, y: 45, size: 80, anim: 'pulse', delay: 1 },
    ] },
    comprehension: { question: 'Kto śpi na kanapie?', options: ['🐱', '🐭', '🐰'], answer: 0 },
  },
  {
    id: 'cz-32', group: 3, title: 'Jesień w parku', emoji: '🍂',
    sentences: [
      [w('W'), w('PAR', 'KU'), w('PA', 'DA', 'JĄ'), w('LI', 'ŚCIE', '.')],
      [w('LI', 'ŚCIE'), w('SĄ'), w('ŻÓŁ', 'TE'), w('I'), w('CZER', 'WO', 'NE', '.')],
      [w('O', 'LA'), w('ZBIE', 'RA'), w('LI', 'ŚCIE', '.')],
      [w('MA', 'MA'), w('RO', 'BI'), w('Z'), w('NICH'), w('BU', 'KIET', '.')],
    ],
    scene: { bg: 'forest', actors: [
      { emoji: '🍂', x: 22, y: 45, size: 70, anim: 'float' },
      { emoji: '👧', x: 50, y: 68, size: 100, anim: 'bob', delay: 0.4 },
      { emoji: '🌳', x: 80, y: 55, size: 120, anim: 'sway', delay: 0.9 },
      { emoji: '🍄', x: 15, y: 80, size: 60, anim: 'pulse', delay: 1.3 },
    ] },
    comprehension: { question: 'Co zbiera Ola?', options: ['🌰', '🍂', '🍄'], answer: 1 },
  },
  {
    id: 'cz-33', group: 3, title: 'Deszcz za oknem', emoji: '🌧️',
    sentences: [
      [w('NA'), w('DWO', 'RZE'), w('PA', 'DA'), w('DESZCZ', '.')],
      [w('O', 'LA'), w('MA'), w('PA', 'RA', 'SOL', '.')],
      [w('PA', 'RA', 'SOL'), w('JEST'), w('ŻÓŁ', 'TY', '.')],
      [w('O', 'LA'), w('SKA', 'CZE'), w('PO'), w('KA', 'ŁU', 'ŻACH', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🌧️', x: 25, y: 40, size: 80, anim: 'float' },
      { emoji: '☂️', x: 55, y: 58, size: 90, anim: 'sway', delay: 0.5 },
      { emoji: '👧', x: 80, y: 70, size: 100, anim: 'bob', delay: 1 },
      { emoji: '🎒', x: 15, y: 74, size: 70, anim: 'bob', delay: 1.3 },
    ] },
    comprehension: { question: 'Co ma Ola?', options: ['🧤', '🎒', '☂️'], answer: 2 },
  },
  {
    id: 'cz-34', group: 3, title: 'Wiewiórka i orzechy', emoji: '🐿️',
    sentences: [
      [w('W'), w('LE', 'SIE'), w('MIESZ', 'KA'), w('WIE', 'WIÓR', 'KA', '.')],
      [w('WIE', 'WIÓR', 'KA'), w('ZBIE', 'RA'), w('O', 'RZE', 'CHY', '.')],
      [w('CHO', 'WA'), w('JE'), w('POD'), w('DRZE', 'WEM', '.')],
      [w('ZI', 'MĄ'), w('BĘ', 'DZIE'), w('MIA', 'ŁA'), w('CO'), w('JEŚĆ', '.')],
    ],
    scene: { bg: 'forest', actors: [
      { emoji: '🐿️', x: 28, y: 55, size: 90, anim: 'wiggle' },
      { emoji: '🌰', x: 55, y: 74, size: 66, anim: 'pulse', delay: 0.6 },
      { emoji: '🌳', x: 82, y: 50, size: 120, anim: 'sway', delay: 1 },
      { emoji: '🍎', x: 15, y: 78, size: 62, anim: 'pulse', delay: 1.3 },
    ] },
    comprehension: { question: 'Co zbiera wiewiórka?', options: ['🌰', '🍎', '🥕'], answer: 0 },
  },
  {
    id: 'cz-35', group: 3, title: 'Kaczki na stawie', emoji: '🦆',
    sentences: [
      [w('NA'), w('STA', 'WIE'), w('PŁY', 'WA', 'JĄ'), w('KACZ', 'KI', '.')],
      [w('DZIE', 'CI'), w('SY', 'PIĄ'), w('IM'), w('ZIAR', 'NO', '.')],
      [w('KACZ', 'KI'), w('GŁO', 'ŚNO'), w('KWA', 'CZĄ', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🦆', x: 25, y: 70, size: 90, anim: 'bob' },
      { emoji: '🦆', x: 50, y: 76, size: 76, anim: 'bob', delay: 0.5 },
      { emoji: '🧒', x: 80, y: 60, size: 100, anim: 'sway', delay: 1 },
      { emoji: '🐸', x: 15, y: 80, size: 62, anim: 'wiggle', delay: 1.3 },
    ] },
    comprehension: { question: 'Kto pływa na stawie?', options: ['🐟', '🐸', '🦆'], answer: 2 },
  },
  {
    id: 'cz-36', group: 3, title: 'Urodziny Oli', emoji: '🎂',
    sentences: [
      [w('O', 'LA'), w('MA'), w('U', 'RO', 'DZI', 'NY', '.')],
      [w('NA'), w('STO', 'LE'), w('STO', 'I'), w('TORT', '.')],
      [w('NA'), w('TOR', 'CIE'), w('PA', 'LĄ'), w('SIĘ'), w('ŚWIECZ', 'KI', '.')],
      [w('O', 'LA'), w('ZDMU', 'CHU', 'JE'), w('ŚWIECZ', 'KI', '!')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🎂', x: 32, y: 65, size: 110, anim: 'pulse' },
      { emoji: '👧', x: 62, y: 58, size: 105, anim: 'bob', delay: 0.4 },
      { emoji: '🎈', x: 88, y: 40, size: 70, anim: 'float', delay: 0.9 },
      { emoji: '🍞', x: 15, y: 76, size: 62, anim: 'none' },
    ] },
    comprehension: { question: 'Co stoi na stole?', options: ['🍞', '🎂', '🍲'], answer: 1 },
  },
  {
    id: 'cz-37', group: 3, title: 'Kotek i kłębek', emoji: '🧶',
    sentences: [
      [w('KO', 'TEK'), w('ZNA', 'LAZŁ'), w('KŁĘ', 'BEK', '.')],
      [w('TUR', 'LA'), w('GO'), w('PO'), w('PO', 'DŁO', 'DZE', '.')],
      [w('KŁĘ', 'BEK'), w('WPADŁ'), w('POD'), w('SZA', 'FĘ', '.')],
      [w('KO', 'TEK'), w('GO'), w('SZU', 'KA', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🐈', x: 28, y: 66, size: 100, anim: 'wiggle' },
      { emoji: '🧶', x: 58, y: 76, size: 74, anim: 'bob', delay: 0.5 },
      { emoji: '🪑', x: 85, y: 60, size: 100, anim: 'none' },
      { emoji: '⚽', x: 15, y: 80, size: 64, anim: 'bob', delay: 1.3 },
    ] },
    comprehension: { question: 'Co znalazł kotek?', options: ['🧶', '⚽', '🪀'], answer: 0 },
  },
  {
    id: 'cz-38', group: 3, title: 'Sanki', emoji: '🛷',
    sentences: [
      [w('ZI', 'MĄ'), w('SPADŁ'), w('ŚNIEG', '.')],
      [w('DZIE', 'CI'), w('BIO', 'RĄ'), w('SAN', 'KI', '.')],
      [w('ZJEŻ', 'DŻA', 'JĄ'), w('Z'), w('GÓR', 'KI', '.')],
      [w('PO', 'TEM'), w('PI', 'JĄ'), w('GO', 'RĄ', 'CĄ'), w('HER', 'BA', 'TĘ', '.')],
    ],
    scene: { bg: 'snow', actors: [
      { emoji: '🛷', x: 28, y: 70, size: 100, anim: 'bob' },
      { emoji: '🧒', x: 58, y: 60, size: 100, anim: 'wiggle', delay: 0.4 },
      { emoji: '🍵', x: 85, y: 72, size: 70, anim: 'pulse', delay: 1.2 },
      { emoji: '🥛', x: 15, y: 78, size: 62, anim: 'pulse', delay: 1.4 },
    ] },
    comprehension: { question: 'Co piją dzieci?', options: ['🥛', '🧃', '🍵'], answer: 2 },
  },
  {
    id: 'cz-39', group: 3, title: 'Ciastka babci', emoji: '🍪',
    sentences: [
      [w('BAB', 'CIA'), w('PIE', 'CZE'), w('CIAST', 'KA', '.')],
      [w('O', 'LA'), w('MIE', 'SZA'), w('CIA', 'STO', '.')],
      [w('W'), w('KUCH', 'NI'), w('ŁAD', 'NIE'), w('PACH', 'NIE', '.')],
      [w('CIAST', 'KA'), w('SĄ'), w('PYSZ', 'NE', '!')],
    ],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👵', x: 28, y: 58, size: 110, anim: 'sway' },
      { emoji: '🍪', x: 58, y: 72, size: 76, anim: 'pulse', delay: 0.5 },
      { emoji: '👧', x: 85, y: 62, size: 95, anim: 'bob', delay: 1 },
    ] },
    comprehension: { question: 'Kto piecze ciastka?', options: ['👧', '👵', '🧔'], answer: 1 },
  },
  {
    id: 'cz-40', group: 3, title: 'Jeż w ogrodzie', emoji: '🦔',
    sentences: [
      [w('W'), w('O', 'GRO', 'DZIE'), w('MIESZ', 'KA'), w('JEŻ', '.')],
      [w('JEŻ'), w('MA'), w('O', 'STRE'), w('KOL', 'CE', '.')],
      [w('W'), w('NO', 'CY'), w('SZU', 'KA'), w('ŚLI', 'MA', 'KÓW', '.')],
      [w('W'), w('DZIEŃ'), w('ŚPI'), w('POD'), w('LIŚĆ', 'MI', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🦔', x: 30, y: 72, size: 90, anim: 'wiggle' },
      { emoji: '🍃', x: 60, y: 60, size: 70, anim: 'float', delay: 0.6 },
      { emoji: '🐌', x: 85, y: 76, size: 66, anim: 'sway', delay: 1.1 },
      { emoji: '🐞', x: 15, y: 66, size: 58, anim: 'wiggle', delay: 1.4 },
    ] },
    comprehension: { question: 'Kogo szuka jeż?', options: ['🐌', '🐝', '🐞'], answer: 0 },
  },
  {
    id: 'cz-41', group: 3, title: 'Kałuża na drodze', emoji: '🚲',
    sentences: [
      [w('TO', 'MEK'), w('JE', 'DZIE'), w('NA'), w('RO', 'WE', 'RZE', '.')],
      [w('PRZED'), w('NIM'), w('JEST'), w('KA', 'ŁU', 'ŻA', '.')],
      [w('TO', 'MEK'), w('O', 'MI', 'JA'), w('KA', 'ŁU', 'ŻĘ', '.')],
      [w('NIE'), w('CHCE'), w('SIĘ'), w('ZMO', 'CZYĆ', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🚲', x: 30, y: 66, size: 110, anim: 'bob' },
      { emoji: '💧', x: 62, y: 78, size: 70, anim: 'pulse', delay: 0.5 },
      { emoji: '🌳', x: 88, y: 55, size: 110, anim: 'sway', delay: 1 },
      { emoji: '🛴', x: 15, y: 72, size: 74, anim: 'sway', delay: 1.3 },
    ] },
    comprehension: { question: 'Na czym jedzie Tomek?', options: ['🛴', '🚲', '🛷'], answer: 1 },
  },
  {
    id: 'cz-42', group: 3, title: 'Ptaki lecą', emoji: '🐦',
    sentences: [
      [w('JE', 'SIE', 'NIĄ'), w('PTA', 'KI'), w('LE', 'CĄ'), w('DA', 'LE', 'KO', '.')],
      [w('LE', 'CĄ'), w('WY', 'SO', 'KO'), w('NAD'), w('LA', 'SEM', '.')],
      [w('O', 'LA'), w('MA', 'CHA'), w('IM'), w('RĘ', 'KĄ', '.')],
      [w('WIO', 'SNĄ'), w('ZNÓW'), w('WRÓ', 'CĄ', '.')],
    ],
    scene: { bg: 'sky', actors: [
      { emoji: '🐦', x: 25, y: 38, size: 66, anim: 'float' },
      { emoji: '🐦', x: 50, y: 45, size: 70, anim: 'float', delay: 0.6 },
      { emoji: '👧', x: 80, y: 72, size: 100, anim: 'bob', delay: 1.1 },
      { emoji: '🦋', x: 15, y: 62, size: 60, anim: 'float', delay: 1.4 },
    ] },
    comprehension: { question: 'Kto leci nad lasem?', options: ['🦋', '🐝', '🐦'], answer: 2 },
  },
  {
    id: 'cz-43', group: 3, title: 'Muszelki', emoji: '🐚',
    sentences: [
      [w('NAD'), w('MO', 'RZEM'), w('JEST'), w('PIA', 'SEK', '.')],
      [w('O', 'LA'), w('ZBIE', 'RA'), w('MU', 'SZEL', 'KI', '.')],
      [w('FA', 'LE'), w('SĄ'), w('ZIM', 'NE', '.')],
      [w('SŁOŃ', 'CE'), w('MOC', 'NO'), w('GRZE', 'JE', '.')],
    ],
    scene: { bg: 'beach', actors: [
      { emoji: '🐚', x: 25, y: 76, size: 68, anim: 'pulse' },
      { emoji: '👧', x: 55, y: 66, size: 100, anim: 'bob', delay: 0.5 },
      { emoji: '☀️', x: 85, y: 38, size: 76, anim: 'pulse', delay: 1 },
      { emoji: '🪨', x: 15, y: 80, size: 58, anim: 'none' },
    ] },
    comprehension: { question: 'Co zbiera Ola?', options: ['🐚', '🪨', '🌰'], answer: 0 },
  },
  {
    id: 'cz-44', group: 3, title: 'Burek i piłka', emoji: '🐶',
    sentences: [
      [w('BU', 'REK'), w('TO'), w('WE', 'SO', 'ŁY'), w('PIES', '.')],
      [w('LU', 'BI'), w('BIE', 'GAĆ'), w('ZA'), w('PIŁ', 'KĄ', '.')],
      [w('TO', 'MEK'), w('RZU', 'CA'), w('PIŁ', 'KĘ'), w('DA', 'LE', 'KO', '.')],
      [w('BU', 'REK'), w('ZA', 'WSZE'), w('JĄ'), w('ZNAJ', 'DU', 'JE', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🐶', x: 28, y: 70, size: 100, anim: 'wiggle' },
      { emoji: '⚽', x: 58, y: 76, size: 72, anim: 'bob', delay: 0.4 },
      { emoji: '🧒', x: 85, y: 62, size: 100, anim: 'sway', delay: 0.9 },
      { emoji: '🪁', x: 15, y: 42, size: 70, anim: 'float', delay: 1.3 },
    ] },
    comprehension: { question: 'Za czym biega Burek?', options: ['🪁', '⚽', '🧶'], answer: 1 },
  },
  {
    id: 'cz-45', group: 3, title: 'Księżyc i gwiazdy', emoji: '🌙',
    sentences: [
      [w('NA'), w('NIE', 'BIE'), w('ŚWIE', 'CI'), w('KSIĘ', 'ŻYC', '.')],
      [w('O', 'BOK'), w('MRU', 'GA', 'JĄ'), w('GWIAZ', 'DY', '.')],
      [w('O', 'LA'), w('PA', 'TRZY'), w('PRZEZ'), w('OK', 'NO', '.')],
      [w('PO', 'TEM'), w('I', 'DZIE'), w('SPAĆ', '.')],
    ],
    scene: { bg: 'night', actors: [
      { emoji: '🌙', x: 25, y: 36, size: 82, anim: 'float' },
      { emoji: '⭐', x: 52, y: 45, size: 64, anim: 'pulse', delay: 0.6 },
      { emoji: '👧', x: 82, y: 68, size: 100, anim: 'bob', delay: 1.1 },
      { emoji: '🕯️', x: 15, y: 74, size: 62, anim: 'pulse', delay: 1.4 },
    ] },
    comprehension: { question: 'Co świeci na niebie?', options: ['🕯️', '💡', '🌙'], answer: 2 },
  },
  // — dokładka do grupy 3 (cz-81…cz-90) —
  {
    id: 'cz-81', group: 3, title: 'Myszka w kuchni', emoji: '🐭',
    sentences: [
      [w('W'), w('KUCH', 'NI'), w('MIESZ', 'KA'), w('MYSZ', 'KA', '.')],
      [w('MYSZ', 'KA'), w('JE'), w('ZIAR', 'NO', '.')],
      [w('KOT'), w('ŚPI'), w('NA'), w('KA', 'NA', 'PIE', '.')],
      [w('MYSZ', 'KA'), w('SZYB', 'KO'), w('U', 'CIE', 'KA', '.')],
    ],
    scene: { bg: 'kitchen', actors: [
      { emoji: '🐭', x: 30, y: 74, size: 76, anim: 'wiggle' },
      { emoji: '🌾', x: 52, y: 78, size: 62, anim: 'pulse', delay: 0.5 },
      { emoji: '🐱', x: 78, y: 62, size: 100, anim: 'bob', delay: 0.9 },
    ] },
    comprehension: { question: 'Kto śpi na kanapie?', options: ['🐱', '🐭', '🐶'], answer: 0 },
  },
  {
    id: 'cz-82', group: 3, title: 'Śniadanie', emoji: '🥪',
    sentences: [
      [w('RA', 'NO'), w('MA', 'MA'), w('RO', 'BI'), w('KA', 'NAP', 'KI', '.')],
      [w('NA'), w('CHLEB'), w('DA', 'JE'), w('MA', 'SŁO', '.')],
      [w('O', 'LA'), w('PI', 'JE'), w('KA', 'KA', 'O', '.')],
      [w('TA', 'TA'), w('PI', 'JE'), w('HER', 'BA', 'TĘ', '.')],
    ],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👩', x: 24, y: 58, size: 104, anim: 'sway' },
      { emoji: '🥪', x: 50, y: 72, size: 70, anim: 'pulse', delay: 0.4 },
      { emoji: '☕', x: 72, y: 70, size: 66, anim: 'bob', delay: 0.8 },
      { emoji: '🥛', x: 90, y: 76, size: 58, anim: 'wiggle', delay: 1.2 },
    ] },
    comprehension: { question: 'Co pije Ola?', options: ['🥛', '☕', '🧃'], answer: 1 },
  },
  {
    id: 'cz-83', group: 3, title: 'Spacer z Burkiem', emoji: '🐶',
    sentences: [
      [w('BU', 'REK'), w('I', 'DZIE'), w('NA'), w('SPA', 'CER', '.')],
      [w('BIE', 'GA'), w('PO'), w('PAR', 'KU', '.')],
      [w('TO', 'MEK'), w('RZU', 'CA'), w('PIŁ', 'KĘ'), w('DA', 'LE', 'KO', '.')],
      [w('BU', 'REK'), w('MER', 'DA'), w('O', 'GO', 'NEM', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🐶', x: 34, y: 68, size: 106, anim: 'bob' },
      { emoji: '👦', x: 12, y: 64, size: 96, anim: 'sway', delay: 0.4 },
      { emoji: '⚽', x: 66, y: 76, size: 64, anim: 'pulse', delay: 0.8 },
      { emoji: '🎈', x: 88, y: 36, size: 58, anim: 'float', delay: 1.2 },
    ] },
    comprehension: { question: 'Co rzuca Tomek?', options: ['🎈', '🐱', '⚽'], answer: 2 },
  },
  {
    id: 'cz-84', group: 3, title: 'Bałwan na podwórku', emoji: '⛄',
    sentences: [
      [w('W'), w('NO', 'CY'), w('SPADŁ'), w('ŚNIEG', '.')],
      [w('DZIE', 'CI'), w('LE', 'PIĄ'), w('BAŁ', 'WA', 'NA', '.')],
      [w('DA', 'JĄ'), w('MU'), w('MAR', 'CHEW', 'KĘ', '.')],
      [w('PO', 'TEM'), w('PI', 'JĄ'), w('HER', 'BA', 'TĘ', '.')],
    ],
    scene: { bg: 'snow', actors: [
      { emoji: '⛄', x: 38, y: 62, size: 116, anim: 'bob' },
      { emoji: '🥕', x: 62, y: 70, size: 56, anim: 'pulse', delay: 0.5 },
      { emoji: '👦', x: 14, y: 68, size: 92, anim: 'sway', delay: 0.9 },
      { emoji: '🍅', x: 88, y: 78, size: 52, anim: 'wiggle', delay: 1.3 },
    ] },
    comprehension: { question: 'Co dzieci dają bałwanowi?', options: ['🥕', '🍅', '🧣'], answer: 0 },
  },
  {
    id: 'cz-85', group: 3, title: 'Rower Tomka', emoji: '🚲',
    sentences: [
      [w('TO', 'MEK'), w('MA'), w('NO', 'WY'), w('RO', 'WER', '.')],
      [w('JE', 'DZIE'), w('NA'), w('RO', 'WE', 'RZE'), w('DO'), w('PAR', 'KU', '.')],
      [w('W'), w('PAR', 'KU'), w('BIE', 'GA'), w('BU', 'REK', '.')],
      [w('PO', 'TEM'), w('I', 'DZIE'), w('DO'), w('DO', 'MU', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🚲', x: 36, y: 68, size: 108, anim: 'bob' },
      { emoji: '👦', x: 14, y: 62, size: 96, anim: 'sway', delay: 0.4 },
      { emoji: '🐶', x: 70, y: 72, size: 86, anim: 'wiggle', delay: 0.9 },
      { emoji: '⚽', x: 90, y: 80, size: 56, anim: 'pulse', delay: 1.3 },
    ] },
    comprehension: { question: 'Co ma Tomek?', options: ['⚽', '🚲', '🚗'], answer: 1 },
  },
  {
    id: 'cz-86', group: 3, title: 'Wieczorna bajka', emoji: '📖',
    sentences: [
      [w('WIE', 'CZO', 'REM'), w('MA', 'MA'), w('CZY', 'TA'), w('BAJ', 'KĘ', '.')],
      [w('O', 'LA'), w('SIE', 'DZI'), w('NA'), w('ŁÓŻ', 'KU', '.')],
      [w('KOT'), w('ŚPI'), w('O', 'BOK', '.')],
      [w('PO', 'TEM'), w('O', 'LA'), w('I', 'DZIE'), w('SPAĆ', '.')],
    ],
    scene: { bg: 'night', actors: [
      { emoji: '👩', x: 28, y: 60, size: 106, anim: 'sway' },
      { emoji: '👧', x: 54, y: 66, size: 96, anim: 'bob', delay: 0.4 },
      { emoji: '🐱', x: 78, y: 74, size: 72, anim: 'wiggle', delay: 0.9 },
      { emoji: '🧸', x: 92, y: 78, size: 60, anim: 'pulse', delay: 1.3 },
    ] },
    comprehension: { question: 'Kto śpi obok Oli?', options: ['🧸', '🐶', '🐱'], answer: 2 },
  },
  {
    id: 'cz-87', group: 3, title: 'Chleb dla kaczek', emoji: '🦆',
    sentences: [
      [w('KACZ', 'KI'), w('PŁY', 'WA', 'JĄ'), w('PO'), w('STA', 'WIE', '.')],
      [w('O', 'LA'), w('MA'), w('CHLEB', '.')],
      [w('DZIE', 'CI'), w('DA', 'JĄ'), w('IM'), w('CHLEB', '.')],
      [w('KACZ', 'KI'), w('GŁO', 'ŚNO'), w('KWA', 'CZĄ', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🦆', x: 40, y: 68, size: 96, anim: 'bob' },
      { emoji: '🦆', x: 62, y: 74, size: 78, anim: 'bob', delay: 0.6 },
      { emoji: '👧', x: 16, y: 62, size: 96, anim: 'sway', delay: 1 },
      { emoji: '🍞', x: 86, y: 76, size: 58, anim: 'pulse', delay: 1.4 },
      { emoji: '🥕', x: 94, y: 60, size: 48, anim: 'wiggle', delay: 1.8 },
    ] },
    comprehension: { question: 'Co ma Ola?', options: ['🍞', '🥕', '🐚'], answer: 0 },
  },
  {
    id: 'cz-88', group: 3, title: 'Zamek z klocków', emoji: '🧱',
    sentences: [
      [w('O', 'LA'), w('MA'), w('DU', 'ŻO'), w('KLOC', 'KÓW', '.')],
      [w('Z'), w('KLOC', 'KÓW'), w('RO', 'BI'), w('ZA', 'MEK', '.')],
      [w('ZA', 'MEK'), w('MA'), w('WY', 'SO', 'KĄ'), w('WIE', 'ŻĘ', '.')],
      [w('TO', 'MEK'), w('RO', 'BI'), w('DOM', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🧱', x: 30, y: 74, size: 74, anim: 'pulse' },
      { emoji: '🏰', x: 56, y: 62, size: 100, anim: 'bob', delay: 0.5 },
      { emoji: '👧', x: 14, y: 62, size: 92, anim: 'sway', delay: 0.9 },
      { emoji: '👦', x: 80, y: 66, size: 88, anim: 'wiggle', delay: 1.3 },
      { emoji: '🏠', x: 94, y: 78, size: 58, anim: 'pulse', delay: 1.7 },
    ] },
    comprehension: { question: 'Co robi Tomek?', options: ['🏰', '🏠', '🚗'], answer: 1 },
  },
  {
    id: 'cz-89', group: 3, title: 'Herbata dla babci', emoji: '☕',
    sentences: [
      [w('BAB', 'CIA'), w('SIE', 'DZI'), w('PRZY'), w('STO', 'LE', '.')],
      [w('MA', 'MA'), w('SZY', 'KU', 'JE'), w('HER', 'BA', 'TĘ', '.')],
      [w('HER', 'BA', 'TA'), w('JEST'), w('CIE', 'PŁA', '.')],
      [w('BAB', 'CIA'), w('PI', 'JE'), w('HER', 'BA', 'TĘ', '.')],
    ],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👵', x: 32, y: 60, size: 108, anim: 'sway' },
      { emoji: '🍵', x: 60, y: 70, size: 72, anim: 'pulse', delay: 0.5 },
      { emoji: '👩', x: 82, y: 62, size: 96, anim: 'bob', delay: 0.9 },
      { emoji: '🥛', x: 94, y: 78, size: 54, anim: 'wiggle', delay: 1.3 },
    ] },
    comprehension: { question: 'Co pije babcia?', options: ['🥛', '🧃', '🍵'], answer: 2 },
  },
  {
    id: 'cz-90', group: 3, title: 'Obrazek dla babci', emoji: '🎨',
    sentences: [
      [w('O', 'LA'), w('MA', 'LU', 'JE'), w('O', 'BRA', 'ZEK', '.')],
      [w('O', 'BRA', 'ZEK'), w('JEST'), w('NIE', 'BIE', 'SKI', '.')],
      [w('MA', 'LU', 'JE'), w('NA'), w('NIM'), w('DOM', '.')],
      [w('DA', 'JE'), w('O', 'BRA', 'ZEK'), w('BAB', 'CI', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '👧', x: 30, y: 62, size: 104, anim: 'bob' },
      { emoji: '🎨', x: 56, y: 72, size: 72, anim: 'pulse', delay: 0.5 },
      { emoji: '🏠', x: 78, y: 60, size: 78, anim: 'sway', delay: 0.9 },
      { emoji: '🌳', x: 94, y: 70, size: 62, anim: 'wiggle', delay: 1.3 },
    ] },
    comprehension: { question: 'Co Ola maluje na obrazku?', options: ['🏠', '🌳', '🐱'], answer: 0 },
  },

  // — grupa 4: 5–6 zdań po 3–6 słów, słowa 3-sylabowe i zbitki spółgłoskowe —
  {
    id: 'cz-46', group: 4, title: 'Krowa na łące', emoji: '🐮',
    sentences: [
      [w('NA'), w('ŁĄ', 'CE'), w('STO', 'I'), w('KRO', 'WA', '.')],
      [w('KRO', 'WA'), w('JE'), w('ZIE', 'LO', 'NĄ'), w('TRA', 'WĘ', '.')],
      [w('O', 'BOK'), w('RO', 'ŚNIE'), w('DU', 'ŻE'), w('DRZE', 'WO', '.')],
      [w('NA'), w('DRZE', 'WIE'), w('SIE', 'DZI'), w('PTAK', '.')],
      [w('PTAK'), w('GŁO', 'ŚNO'), w('ŚPIE', 'WA', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🐮', x: 30, y: 70, size: 110, anim: 'sway' },
      { emoji: '🌳', x: 70, y: 55, size: 120, anim: 'sway', delay: 0.8 },
      { emoji: '🐦', x: 92, y: 40, size: 64, anim: 'float', delay: 0.2 },
      { emoji: '🌿', x: 15, y: 80, size: 62, anim: 'sway', delay: 1.2 },
      { emoji: '🍎', x: 55, y: 42, size: 58, anim: 'pulse', delay: 1.5 },
    ] },
    comprehension: { question: 'Co je krowa?', options: ['🌿', '🍎', '🥕'], answer: 0 },
  },
  {
    id: 'cz-47', group: 4, title: 'Wycieczka do lasu', emoji: '🌲',
    sentences: [
      [w('W'), w('SO', 'BO', 'TĘ'), w('I', 'DZIE', 'MY'), w('DO'), w('LA', 'SU', '.')],
      [w('W'), w('PLE', 'CA', 'KU'), w('MA', 'MY'), w('KA', 'NAP', 'KI', '.')],
      [w('NA'), w('ŚCIEŻ', 'CE'), w('WI', 'DZI', 'MY'), w('WIE', 'WIÓR', 'KĘ', '.')],
      [w('WIE', 'WIÓR', 'KA'), w('SZYB', 'KO'), w('U', 'CIE', 'KA'), w('NA'), w('DRZE', 'WO', '.')],
      [w('PO', 'TEM'), w('SIA', 'DA', 'MY'), w('NA'), w('PNIU', '.')],
      [w('JE', 'MY'), w('KA', 'NAP', 'KI'), w('I'), w('PI', 'JE', 'MY'), w('SOK', '.')],
    ],
    scene: { bg: 'forest', actors: [
      { emoji: '🌲', x: 20, y: 55, size: 120, anim: 'sway' },
      { emoji: '🐿️', x: 48, y: 50, size: 76, anim: 'wiggle', delay: 0.5 },
      { emoji: '🎒', x: 75, y: 72, size: 80, anim: 'bob', delay: 1 },
      { emoji: '🥪', x: 96, y: 78, size: 64, anim: 'pulse', delay: 1.4 },
      { emoji: '🦔', x: 14, y: 80, size: 62, anim: 'wiggle', delay: 1.7 },
    ] },
    comprehension: { question: 'Kogo widzimy na ścieżce?', options: ['🦊', '🐿️', '🦔'], answer: 1 },
  },
  {
    id: 'cz-48', group: 4, title: 'Obiad u babci', emoji: '🍲',
    sentences: [
      [w('BAB', 'CIA'), w('GO', 'TU', 'JE'), w('O', 'BIAD', '.')],
      [w('W'), w('GARN', 'KU'), w('BUL', 'GO', 'CZE'), w('ZU', 'PA', '.')],
      [w('PACH', 'NIE'), w('KO', 'PER', 'KIEM'), w('I'), w('MAR', 'CHEW', 'KĄ', '.')],
      [w('O', 'LA'), w('NA', 'KRY', 'WA'), w('DO'), w('STO', 'ŁU', '.')],
      [w('WSZY', 'SCY'), w('SIA', 'DA', 'JĄ'), w('PRZY'), w('STO', 'LE', '.')],
      [w('ZU', 'PA'), w('JEST'), w('BAR', 'DZO'), w('SMACZ', 'NA', '!')],
    ],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👵', x: 22, y: 58, size: 110, anim: 'sway' },
      { emoji: '🍲', x: 50, y: 70, size: 84, anim: 'pulse', delay: 0.4 },
      { emoji: '🥕', x: 75, y: 76, size: 66, anim: 'wiggle', delay: 0.9 },
      { emoji: '👧', x: 96, y: 62, size: 92, anim: 'bob', delay: 1.3 },
    ] },
    comprehension: { question: 'Co bulgocze w garnku?', options: ['🥕', '🍪', '🍲'], answer: 2 },
  },
  {
    id: 'cz-49', group: 4, title: 'Dzień w przedszkolu', emoji: '🎨',
    sentences: [
      [w('RA', 'NO'), w('I', 'DZIE', 'MY'), w('DO'), w('PRZED', 'SZKO', 'LA', '.')],
      [w('PA', 'NI'), w('CZY', 'TA'), w('NAM'), w('BAJ', 'KĘ', '.')],
      [w('PO', 'TEM'), w('MA', 'LU', 'JE', 'MY'), w('FAR', 'BA', 'MI', '.')],
      [w('MÓJ'), w('O', 'BRA', 'ZEK'), w('JEST'), w('NIE', 'BIE', 'SKI', '.')],
      [w('NA'), w('PO', 'DWÓR', 'KU'), w('BA', 'WI', 'MY'), w('SIĘ'), w('W'), w('BER', 'KA', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '👩‍🏫', x: 22, y: 58, size: 108, anim: 'sway' },
      { emoji: '📖', x: 50, y: 68, size: 78, anim: 'none' },
      { emoji: '🎨', x: 74, y: 74, size: 72, anim: 'wiggle', delay: 0.7 },
      { emoji: '🧒', x: 95, y: 60, size: 95, anim: 'bob', delay: 1.2 },
    ] },
    comprehension: { question: 'Kto czyta nam bajkę?', options: ['👩‍🏫', '🧒', '👵'], answer: 0 },
  },
  {
    id: 'cz-50', group: 4, title: 'Deszczowy dzień', emoji: '🌧️',
    sentences: [
      [w('ZA'), w('OK', 'NEM'), w('PA', 'DA'), w('DESZCZ', '.')],
      [w('NIE'), w('MO', 'ŻE', 'MY'), w('IŚĆ'), w('NA'), w('SPA', 'CER', '.')],
      [w('SIA', 'DA', 'MY'), w('NA'), w('DY', 'WA', 'NIE', '.')],
      [w('BU', 'DU', 'JE', 'MY'), w('ZA', 'MEK'), w('Z'), w('KLOC', 'KÓW', '.')],
      [w('ZA', 'MEK'), w('MA'), w('WY', 'SO', 'KĄ'), w('WIE', 'ŻĘ', '.')],
      [w('POD'), w('WIE', 'CZÓR'), w('DESZCZ'), w('U', 'STA', 'JE', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🌧️', x: 22, y: 40, size: 76, anim: 'float' },
      { emoji: '🪟', x: 48, y: 52, size: 100, anim: 'none' },
      { emoji: '🏰', x: 75, y: 70, size: 90, anim: 'pulse', delay: 0.8 },
      { emoji: '🧒', x: 96, y: 66, size: 92, anim: 'bob', delay: 1.2 },
      { emoji: '⛵', x: 14, y: 76, size: 62, anim: 'sway', delay: 1.6 },
    ] },
    comprehension: { question: 'Co budujemy z klocków?', options: ['🏠', '🏰', '⛵'], answer: 1 },
  },
  {
    id: 'cz-51', group: 4, title: 'Kotek na drzewie', emoji: '🐈',
    sentences: [
      [w('MA', 'ŁY'), w('KO', 'TEK'), w('WSZEDŁ'), w('NA'), w('DRZE', 'WO', '.')],
      [w('BAŁ'), w('SIĘ'), w('ZEJŚĆ'), w('NA'), w('DÓŁ', '.')],
      [w('O', 'LA'), w('ZA', 'WO', 'ŁA', 'ŁA'), w('TA', 'TĘ', '.')],
      [w('TA', 'TA'), w('PRZY', 'NIÓSŁ'), w('DRA', 'BI', 'NĘ', '.')],
      [w('ZDJĄŁ'), w('KOT', 'KA'), w('Z'), w('GA', 'ŁĘ', 'ZI', '.')],
      [w('KO', 'TEK'), w('GŁO', 'ŚNO'), w('MRU', 'CZAŁ', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🌳', x: 25, y: 50, size: 120, anim: 'sway' },
      { emoji: '🐈', x: 48, y: 38, size: 70, anim: 'pulse', delay: 0.5 },
      { emoji: '🪜', x: 72, y: 62, size: 90, anim: 'none' },
      { emoji: '🧔', x: 95, y: 70, size: 100, anim: 'bob', delay: 1 },
      { emoji: '🐦', x: 14, y: 40, size: 56, anim: 'float', delay: 1.5 },
    ] },
    comprehension: { question: 'Kto wszedł na drzewo?', options: ['🐿️', '🐦', '🐈'], answer: 2 },
  },
  {
    id: 'cz-52', group: 4, title: 'Zima na podwórku', emoji: '⛄',
    sentences: [
      [w('W'), w('NO', 'CY'), w('SPADŁ'), w('BIA', 'ŁY'), w('ŚNIEG', '.')],
      [w('RA', 'NO'), w('DZIE', 'CI'), w('WY', 'BIE', 'GŁY'), w('NA'), w('DWÓR', '.')],
      [w('LE', 'PIĄ'), w('WIEL', 'KIE', 'GO'), w('BAŁ', 'WA', 'NA', '.')],
      [w('DA', 'JĄ'), w('MU'), w('MAR', 'CHEW', 'KĘ'), w('ZA', 'MIAST'), w('NO', 'SA', '.')],
      [w('PO', 'TEM'), w('RZU', 'CA', 'JĄ'), w('SIĘ'), w('ŚNIEŻ', 'KA', 'MI', '.')],
      [w('W'), w('DO', 'MU'), w('CZE', 'KA'), w('CIE', 'PŁA'), w('HER', 'BA', 'TA', '.')],
    ],
    scene: { bg: 'snow', actors: [
      { emoji: '⛄', x: 22, y: 66, size: 115, anim: 'pulse' },
      { emoji: '🥕', x: 46, y: 58, size: 64, anim: 'wiggle', delay: 0.6 },
      { emoji: '🧒', x: 72, y: 70, size: 100, anim: 'bob', delay: 1 },
      { emoji: '❄️', x: 95, y: 40, size: 66, anim: 'float', delay: 1.4 },
      { emoji: '🧣', x: 14, y: 80, size: 60, anim: 'sway', delay: 1.7 },
    ] },
    comprehension: { question: 'Co dają zamiast nosa?', options: ['🥕', '🧣', '🎩'], answer: 0 },
  },
  {
    id: 'cz-53', group: 4, title: 'Urodziny psa', emoji: '🐕',
    sentences: [
      [w('DZI', 'SIAJ'), w('BU', 'REK'), w('MA'), w('U', 'RO', 'DZI', 'NY', '.')],
      [w('O', 'LA'), w('U', 'PIE', 'KŁA'), w('MU'), w('CIAST', 'KO', '.')],
      [w('CIAST', 'KO'), w('JEST'), w('Z'), w('MAR', 'CHEW', 'KI', '.')],
      [w('BU', 'REK'), w('MER', 'DA'), w('O', 'GO', 'NEM', '.')],
      [w('ZJADŁ'), w('CIAST', 'KO'), w('W'), w('SE', 'KUN', 'DĘ', '!')],
      [w('PO', 'TEM'), w('PO', 'SZLI'), w('NA'), w('SPA', 'CER', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🐕', x: 25, y: 68, size: 105, anim: 'wiggle' },
      { emoji: '🍪', x: 52, y: 74, size: 68, anim: 'pulse', delay: 0.5 },
      { emoji: '🎉', x: 76, y: 50, size: 76, anim: 'float', delay: 0.9 },
      { emoji: '👧', x: 96, y: 62, size: 95, anim: 'bob', delay: 1.3 },
      { emoji: '🍰', x: 14, y: 78, size: 62, anim: 'pulse', delay: 1.6 },
    ] },
    comprehension: { question: 'Co upiekła Ola?', options: ['🍰', '🍪', '🍞'], answer: 1 },
  },
  {
    id: 'cz-54', group: 4, title: 'Wycieczka do zoo', emoji: '🚌',
    sentences: [
      [w('JE', 'DZIE', 'MY'), w('AU', 'TO', 'BU', 'SEM'), w('DO'), w('ZO', 'O', '.')],
      [w('W'), w('ZO', 'O'), w('SĄ'), w('SŁO', 'NIE'), w('I'), w('MAŁ', 'PY', '.')],
      [w('SŁOŃ'), w('MA'), w('DŁU', 'GĄ'), w('TRĄ', 'BĘ', '.')],
      [w('MAŁ', 'PY'), w('SKA', 'CZĄ'), w('PO'), w('GA', 'ŁĘ', 'ZIACH', '.')],
      [w('O', 'LA'), w('RO', 'BI'), w('ZDJĘ', 'CIA', '.')],
      [w('PO', 'TEM'), w('WRA', 'CA', 'MY'), w('DO'), w('DO', 'MU', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🚌', x: 20, y: 70, size: 110, anim: 'bob' },
      { emoji: '🐘', x: 48, y: 62, size: 100, anim: 'sway', delay: 0.5 },
      { emoji: '🐒', x: 74, y: 50, size: 80, anim: 'wiggle', delay: 0.9 },
      { emoji: '📷', x: 96, y: 74, size: 66, anim: 'pulse', delay: 1.3 },
    ] },
    comprehension: { question: 'Kto ma długą trąbę?', options: ['🐒', '🦒', '🐘'], answer: 2 },
  },
  {
    id: 'cz-55', group: 4, title: 'W sadzie', emoji: '🍐',
    sentences: [
      [w('W'), w('SA', 'DZIE'), w('RO', 'SNĄ'), w('GRU', 'SZE', '.')],
      [w('NA'), w('GA', 'ŁĘ', 'ZIACH'), w('WI', 'SZĄ'), w('DOJ', 'RZA', 'ŁE'), w('O', 'WO', 'CE', '.')],
      [w('DZIA', 'DEK'), w('PRZY', 'NIÓSŁ'), w('DRA', 'BI', 'NĘ', '.')],
      [w('O', 'LA'), w('ZBIE', 'RA'), w('GRUSZ', 'KI'), w('DO'), w('KO', 'SZA', '.')],
      [w('BAB', 'CIA'), w('U', 'GO', 'TU', 'JE'), w('Z'), w('NICH'), w('KOM', 'POT', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🌳', x: 25, y: 52, size: 120, anim: 'sway' },
      { emoji: '🍐', x: 50, y: 45, size: 66, anim: 'pulse', delay: 0.5 },
      { emoji: '🧺', x: 74, y: 74, size: 76, anim: 'none' },
      { emoji: '👴', x: 96, y: 66, size: 100, anim: 'bob', delay: 1.1 },
      { emoji: '🍇', x: 14, y: 60, size: 58, anim: 'pulse', delay: 1.5 },
    ] },
    comprehension: { question: 'Co zbiera Ola?', options: ['🍐', '🍇', '🥕'], answer: 0 },
  },
  {
    id: 'cz-56', group: 4, title: 'Burza', emoji: '⛈️',
    sentences: [
      [w('NIE', 'BO'), w('ZRO', 'BI', 'ŁO'), w('SIĘ'), w('CIEM', 'NE', '.')],
      [w('ZE', 'RWAŁ'), w('SIĘ'), w('SIL', 'NY'), w('WIATR', '.')],
      [w('PO'), w('CHWI', 'LI'), w('ZA', 'GRZMIA', 'ŁO', '.')],
      [w('O', 'LA'), w('WZIĘ', 'ŁA'), w('CIE', 'PŁY'), w('KOC', '.')],
      [w('PIES'), w('WSKO', 'CZYŁ'), w('POD'), w('KOC', '.')],
      [w('BU', 'RZA'), w('SZYB', 'KO'), w('MI', 'NĘ', 'ŁA', '.')],
    ],
    scene: { bg: 'sky', actors: [
      { emoji: '⛈️', x: 25, y: 38, size: 84, anim: 'float' },
      { emoji: '⚡', x: 52, y: 46, size: 70, anim: 'pulse', delay: 0.4 },
      { emoji: '🛋️', x: 78, y: 70, size: 105, anim: 'none' },
      { emoji: '🐶', x: 98, y: 74, size: 76, anim: 'wiggle', delay: 1.1 },
      { emoji: '🐈', x: 14, y: 76, size: 66, anim: 'wiggle', delay: 1.6 },
    ] },
    comprehension: { question: 'Kto wskoczył pod koc?', options: ['🐈', '🐦', '🐶'], answer: 2 },
  },
  {
    id: 'cz-57', group: 4, title: 'Pociąg do babci', emoji: '🚂',
    sentences: [
      [w('NA'), w('PE', 'RO', 'NIE'), w('CZE', 'KA', 'MY'), w('NA'), w('PO', 'CIĄG', '.')],
      [w('PO', 'CIĄG'), w('WJEŻ', 'DŻA'), w('NA'), w('STA', 'CJĘ', '.')],
      [w('WSIA', 'DA', 'MY'), w('DO'), w('WA', 'GO', 'NU', '.')],
      [w('ZA'), w('OK', 'NEM'), w('MI', 'GA', 'JĄ'), w('DRZE', 'WA', '.')],
      [w('JE', 'DZIE', 'MY'), w('DO'), w('BAB', 'CI'), w('NA'), w('WIEŚ', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🚂', x: 25, y: 66, size: 115, anim: 'bob' },
      { emoji: '🌳', x: 55, y: 52, size: 100, anim: 'sway', delay: 0.6 },
      { emoji: '👵', x: 82, y: 70, size: 100, anim: 'pulse', delay: 1.1 },
      { emoji: '👩', x: 14, y: 72, size: 92, anim: 'bob', delay: 1.4 },
    ] },
    comprehension: { question: 'Do kogo jedziemy?', options: ['👩', '👵', '🧔'], answer: 1 },
  },
  {
    id: 'cz-58', group: 4, title: 'Wieczorna kąpiel', emoji: '🛁',
    sentences: [
      [w('WIE', 'CZO', 'REM'), w('MA', 'MA'), w('SZY', 'KU', 'JE'), w('KĄ', 'PIEL', '.')],
      [w('W'), w('WAN', 'NIE'), w('JEST'), w('DU', 'ŻO'), w('PIA', 'NY', '.')],
      [w('O', 'LA'), w('MY', 'JE'), w('WŁO', 'SY'), w('SZAM', 'PO', 'NEM', '.')],
      [w('PO', 'TEM'), w('WY', 'CIE', 'RA'), w('SIĘ'), w('RĘCZ', 'NI', 'KIEM', '.')],
      [w('ZA', 'KŁA', 'DA'), w('CIE', 'PŁĄ'), w('PI', 'ŻA', 'MĘ', '.')],
      [w('JEST'), w('GO', 'TO', 'WA'), w('DO'), w('SNU', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🛁', x: 25, y: 68, size: 115, anim: 'none' },
      { emoji: '🫧', x: 50, y: 48, size: 70, anim: 'float', delay: 0.5 },
      { emoji: '🧴', x: 74, y: 72, size: 66, anim: 'pulse', delay: 0.9 },
      { emoji: '👩', x: 96, y: 60, size: 100, anim: 'sway', delay: 1.3 },
      { emoji: '👧', x: 14, y: 74, size: 88, anim: 'bob', delay: 1.6 },
    ] },
    comprehension: { question: 'Kto szykuje kąpiel?', options: ['👩', '👧', '👵'], answer: 0 },
  },
  {
    id: 'cz-59', group: 4, title: 'Zakupy z mamą', emoji: '🛒',
    sentences: [
      [w('I', 'DZIE', 'MY'), w('Z'), w('MA', 'MĄ'), w('DO'), w('SKLE', 'PU', '.')],
      [w('MA', 'MA'), w('BIE', 'RZE'), w('KO', 'SZYK', '.')],
      [w('KU', 'PU', 'JE', 'MY'), w('CHLEB'), w('I'), w('MA', 'SŁO', '.')],
      [w('O', 'LA'), w('WY', 'BIE', 'RA'), w('JO', 'GURT', '.')],
      [w('PRZY'), w('KA', 'SIE'), w('PŁA', 'CI', 'MY'), w('KAR', 'TĄ', '.')],
      [w('WRA', 'CA', 'MY'), w('DO'), w('DO', 'MU'), w('Z'), w('ZA', 'KU', 'PA', 'MI', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🛒', x: 25, y: 70, size: 105, anim: 'bob' },
      { emoji: '🍞', x: 52, y: 74, size: 68, anim: 'pulse', delay: 0.5 },
      { emoji: '👩', x: 76, y: 58, size: 105, anim: 'sway', delay: 0.9 },
      { emoji: '👧', x: 98, y: 66, size: 92, anim: 'wiggle', delay: 1.3 },
      { emoji: '🍎', x: 14, y: 78, size: 60, anim: 'pulse', delay: 1.6 },
    ] },
    comprehension: { question: 'Co kupujemy w sklepie?', options: ['🥕', '🍎', '🍞'], answer: 2 },
  },
  {
    id: 'cz-60', group: 4, title: 'Gwiazdy na niebie', emoji: '🌟',
    sentences: [
      [w('WIE', 'CZO', 'REM'), w('WY', 'CHO', 'DZI', 'MY'), w('NA'), w('TA', 'RAS', '.')],
      [w('NIE', 'BO'), w('JEST'), w('PEŁ', 'NE'), w('GWIAZD', '.')],
      [w('TA', 'TA'), w('PO', 'KA', 'ZU', 'JE'), w('WIEL', 'KI'), w('WÓZ', '.')],
      [w('KSIĘ', 'ŻYC'), w('ŚWIE', 'CI'), w('JAK'), w('LAM', 'PA', '.')],
      [w('ZRO', 'BI', 'ŁO'), w('SIĘ'), w('CHŁOD', 'NO', '.')],
      [w('WRA', 'CA', 'MY'), w('DO'), w('CIE', 'PŁE', 'GO'), w('ŁÓŻ', 'KA', '.')],
    ],
    scene: { bg: 'night', actors: [
      { emoji: '🌟', x: 22, y: 38, size: 72, anim: 'pulse' },
      { emoji: '🌙', x: 48, y: 42, size: 80, anim: 'float', delay: 0.5 },
      { emoji: '🧔', x: 74, y: 68, size: 105, anim: 'sway', delay: 0.9 },
      { emoji: '👧', x: 96, y: 72, size: 92, anim: 'bob', delay: 1.3 },
    ] },
    comprehension: { question: 'Kto pokazuje Wielki Wóz?', options: ['👧', '🧔', '👵'], answer: 1 },
  },
  // — dokładka do grupy 4 (cz-91…cz-100) —
  {
    id: 'cz-91', group: 4, title: 'Dzień nad morzem', emoji: '🌊',
    sentences: [
      [w('NAD'), w('MO', 'RZEM'), w('ŚWIE', 'CI'), w('SŁOŃ', 'CE', '.')],
      [w('O', 'LA'), w('ZBIE', 'RA'), w('MU', 'SZEL', 'KI', '.')],
      [w('TO', 'MEK'), w('RZU', 'CA'), w('PIŁ', 'KĘ'), w('DA', 'LE', 'KO', '.')],
      [w('FA', 'LE'), w('SĄ'), w('ZIM', 'NE', '.')],
      [w('MA', 'MA'), w('DA', 'JE'), w('NAM'), w('KA', 'NAP', 'KI', '.')],
      [w('PO', 'TEM'), w('WRA', 'CA', 'MY'), w('DO'), w('DO', 'MU', '.')],
    ],
    scene: { bg: 'beach', actors: [
      { emoji: '🌊', x: 26, y: 50, size: 104, anim: 'sway' },
      { emoji: '👧', x: 52, y: 66, size: 96, anim: 'bob', delay: 0.5 },
      { emoji: '🐚', x: 72, y: 80, size: 56, anim: 'pulse', delay: 0.9 },
      { emoji: '⚽', x: 88, y: 68, size: 60, anim: 'wiggle', delay: 1.3 },
      { emoji: '🥪', x: 14, y: 80, size: 54, anim: 'pulse', delay: 1.7 },
    ] },
    comprehension: { question: 'Co zbiera Ola?', options: ['⚽', '🐚', '🥪'], answer: 1 },
  },
  {
    id: 'cz-92', group: 4, title: 'Poranek w domu', emoji: '🥪',
    sentences: [
      [w('RA', 'NO'), w('O', 'LA'), w('ZA', 'KŁA', 'DA'), w('BU', 'TY', '.')],
      [w('MA', 'MA'), w('RO', 'BI'), w('KA', 'NAP', 'KI', '.')],
      [w('JE', 'MY'), w('KA', 'NAP', 'KI'), w('I'), w('JO', 'GURT', '.')],
      [w('PI', 'JE', 'MY'), w('CIE', 'PŁĄ'), w('HER', 'BA', 'TĘ', '.')],
      [w('PO', 'TEM'), w('I', 'DZIE', 'MY'), w('DO'), w('PRZED', 'SZKO', 'LA', '.')],
      [w('TA', 'TA'), w('JE', 'DZIE'), w('DO'), w('SKLE', 'PU', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '👧', x: 28, y: 62, size: 100, anim: 'bob' },
      { emoji: '👟', x: 50, y: 78, size: 62, anim: 'pulse', delay: 0.5 },
      { emoji: '🧦', x: 66, y: 80, size: 52, anim: 'wiggle', delay: 0.9 },
      { emoji: '🥪', x: 84, y: 70, size: 62, anim: 'pulse', delay: 1.3 },
      { emoji: '👩', x: 12, y: 60, size: 96, anim: 'sway', delay: 1.7 },
    ] },
    comprehension: { question: 'Co Ola zakłada rano?', options: ['🧦', '🧣', '👟'], answer: 2 },
  },
  {
    id: 'cz-93', group: 4, title: 'Burek i kotek', emoji: '🐕',
    sentences: [
      [w('BU', 'REK'), w('LU', 'BI'), w('BIE', 'GAĆ', '.')],
      [w('W'), w('O', 'GRO', 'DZIE'), w('SIE', 'DZI'), w('KO', 'TEK', '.')],
      [w('BU', 'REK'), w('SZU', 'KA'), w('KOT', 'KA', '.')],
      [w('KO', 'TEK'), w('WSZEDŁ'), w('NA'), w('DRZE', 'WO', '.')],
      [w('BU', 'REK'), w('MER', 'DA'), w('O', 'GO', 'NEM', '.')],
      [w('PO', 'TEM'), w('KO', 'TEK'), w('ŚPI'), w('NA'), w('KA', 'NA', 'PIE', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🐶', x: 30, y: 70, size: 104, anim: 'bob' },
      { emoji: '🐱', x: 62, y: 46, size: 74, anim: 'wiggle', delay: 0.6 },
      { emoji: '🌳', x: 74, y: 62, size: 118, anim: 'sway', delay: 1 },
      { emoji: '🏠', x: 12, y: 64, size: 78, anim: 'pulse', delay: 1.4 },
    ] },
    comprehension: { question: 'Gdzie wszedł kotek?', options: ['🌳', '🏠', '🛏️'], answer: 0 },
  },
  {
    id: 'cz-94', group: 4, title: 'W ogrodzie u dziadka', emoji: '🥕',
    sentences: [
      [w('W'), w('O', 'GRO', 'DZIE'), w('RO', 'SNĄ'), w('MAR', 'CHEW', 'KI', '.')],
      [w('DZIA', 'DEK'), w('MA'), w('KO', 'SZYK', '.')],
      [w('O', 'LA'), w('ZBIE', 'RA'), w('PO', 'MI', 'DO', 'RY', '.')],
      [w('MAR', 'CHEW', 'KI'), w('SĄ'), w('DOJ', 'RZA', 'ŁE', '.')],
      [w('BAB', 'CIA'), w('MY', 'JE'), w('MAR', 'CHEW', 'KI', '.')],
      [w('PO', 'TEM'), w('JE', 'MY'), w('O', 'BIAD', '.')],
    ],
    scene: { bg: 'meadow', actors: [
      { emoji: '🥕', x: 30, y: 74, size: 68, anim: 'pulse' },
      { emoji: '🍅', x: 52, y: 70, size: 66, anim: 'wiggle', delay: 0.5 },
      { emoji: '👴', x: 14, y: 62, size: 100, anim: 'sway', delay: 0.9 },
      { emoji: '👧', x: 76, y: 64, size: 94, anim: 'bob', delay: 1.3 },
      { emoji: '🧺', x: 92, y: 78, size: 58, anim: 'pulse', delay: 1.7 },
    ] },
    comprehension: { question: 'Co zbiera Ola?', options: ['🥕', '🍅', '🍐'], answer: 1 },
  },
  {
    id: 'cz-95', group: 4, title: 'Deszcz i farby', emoji: '🖌️',
    sentences: [
      [w('ZA'), w('OK', 'NEM'), w('PA', 'DA'), w('DESZCZ', '.')],
      [w('SIA', 'DA', 'MY'), w('PRZY'), w('STO', 'LE', '.')],
      [w('MA', 'LU', 'JE', 'MY'), w('O', 'BRA', 'ZEK'), w('FAR', 'BA', 'MI', '.')],
      [w('MÓJ'), w('O', 'BRA', 'ZEK'), w('JEST'), w('ŻÓŁ', 'TY', '.')],
      [w('O', 'LA'), w('MA', 'LU', 'JE'), w('DU', 'ŻE'), w('DRZE', 'WO', '.')],
      [w('PO', 'TEM'), w('PI', 'JE', 'MY'), w('KA', 'KA', 'O', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🌧️', x: 22, y: 34, size: 74, anim: 'float' },
      { emoji: '🎨', x: 48, y: 70, size: 76, anim: 'pulse', delay: 0.5 },
      { emoji: '👧', x: 70, y: 62, size: 96, anim: 'bob', delay: 0.9 },
      { emoji: '🌳', x: 88, y: 72, size: 66, anim: 'sway', delay: 1.3 },
      { emoji: '🏠', x: 12, y: 74, size: 58, anim: 'wiggle', delay: 1.7 },
    ] },
    comprehension: { question: 'Co maluje Ola?', options: ['🏠', '🐱', '🌳'], answer: 2 },
  },
  {
    id: 'cz-96', group: 4, title: 'Urodziny babci', emoji: '🎂',
    sentences: [
      [w('DZI', 'SIAJ'), w('BAB', 'CIA'), w('MA'), w('U', 'RO', 'DZI', 'NY', '.')],
      [w('MA', 'MA'), w('PIE', 'CZE'), w('SER', 'NIK', '.')],
      [w('O', 'LA'), w('MA', 'LU', 'JE'), w('O', 'BRA', 'ZEK', '.')],
      [w('NA'), w('STO', 'LE'), w('STO', 'I'), w('TORT', '.')],
      [w('NA'), w('TOR', 'CIE'), w('PA', 'LĄ'), w('SIĘ'), w('ŚWIECZ', 'KI', '.')],
      [w('BAB', 'CIA'), w('ZDMU', 'CHU', 'JE'), w('ŚWIECZ', 'KI', '.')],
    ],
    scene: { bg: 'kitchen', actors: [
      { emoji: '👵', x: 30, y: 60, size: 106, anim: 'sway' },
      { emoji: '🎂', x: 58, y: 70, size: 84, anim: 'pulse', delay: 0.5 },
      { emoji: '🍰', x: 80, y: 74, size: 62, anim: 'wiggle', delay: 0.9 },
      { emoji: '👩', x: 12, y: 62, size: 94, anim: 'bob', delay: 1.3 },
      { emoji: '👧', x: 94, y: 64, size: 82, anim: 'bob', delay: 1.7 },
    ] },
    comprehension: { question: 'Co piecze mama?', options: ['🍰', '🎂', '🍪'], answer: 0 },
  },
  {
    id: 'cz-97', group: 4, title: 'Zima w przedszkolu', emoji: '⛄',
    sentences: [
      [w('ZI', 'MĄ'), w('I', 'DZIE', 'MY'), w('DO'), w('PRZED', 'SZKO', 'LA', '.')],
      [w('NA'), w('PO', 'DWÓR', 'KU'), w('JEST'), w('ŚNIEG', '.')],
      [w('DZIE', 'CI'), w('LE', 'PIĄ'), w('BAŁ', 'WA', 'NA', '.')],
      [w('PA', 'NI'), w('DA', 'JE'), w('NAM'), w('CIE', 'PŁĄ'), w('HER', 'BA', 'TĘ', '.')],
      [w('PO', 'TEM'), w('CZY', 'TA'), w('NAM'), w('BAJ', 'KĘ', '.')],
      [w('W'), w('DO', 'MU'), w('CZE', 'KA'), w('MA', 'MA', '.')],
    ],
    scene: { bg: 'snow', actors: [
      { emoji: '⛄', x: 36, y: 62, size: 112, anim: 'bob' },
      { emoji: '👦', x: 14, y: 66, size: 92, anim: 'sway', delay: 0.5 },
      { emoji: '👧', x: 62, y: 68, size: 90, anim: 'bob', delay: 0.9 },
      { emoji: '🐶', x: 86, y: 74, size: 70, anim: 'wiggle', delay: 1.3 },
    ] },
    comprehension: { question: 'Co lepią dzieci?', options: ['🐶', '⛄', '🏰'], answer: 1 },
  },
  {
    id: 'cz-98', group: 4, title: 'Ptaki zimą', emoji: '🐦',
    sentences: [
      [w('ZI', 'MĄ'), w('JEST'), w('CHŁOD', 'NO', '.')],
      [w('PTA', 'KI'), w('SIA', 'DA', 'JĄ'), w('NA'), w('GA', 'ŁĘ', 'ZIACH', '.')],
      [w('DZIE', 'CI'), w('SY', 'PIĄ'), w('IM'), w('ZIAR', 'NO', '.')],
      [w('PTAK'), w('GŁO', 'ŚNO'), w('ŚPIE', 'WA', '.')],
      [w('PO', 'TEM'), w('LE', 'CĄ'), w('NAD'), w('LA', 'SEM', '.')],
      [w('WIO', 'SNĄ'), w('ZNÓW'), w('WRÓ', 'CĄ', '.')],
    ],
    scene: { bg: 'snow', actors: [
      { emoji: '🐦', x: 40, y: 44, size: 72, anim: 'float' },
      { emoji: '🌳', x: 66, y: 60, size: 112, anim: 'sway', delay: 0.5 },
      { emoji: '🌾', x: 24, y: 78, size: 58, anim: 'pulse', delay: 0.9 },
      { emoji: '🍞', x: 88, y: 78, size: 54, anim: 'wiggle', delay: 1.3 },
    ] },
    comprehension: { question: 'Co dzieci sypią ptakom?', options: ['🍞', '🥕', '🌾'], answer: 2 },
  },
  {
    id: 'cz-99', group: 4, title: 'Auto taty', emoji: '🚗',
    sentences: [
      [w('TA', 'TA'), w('MY', 'JE'), w('AU', 'TO', '.')],
      [w('AU', 'TO'), w('STO', 'I'), w('NA'), w('PO', 'DWÓR', 'KU', '.')],
      [w('O', 'LA'), w('MY', 'JE'), w('OK', 'NO', '.')],
      [w('BU', 'REK'), w('PA', 'TRZY'), w('PRZEZ'), w('OK', 'NO', '.')],
      [w('PO', 'TEM'), w('JE', 'DZIE', 'MY'), w('DO'), w('BAB', 'CI', '.')],
    ],
    scene: { bg: 'room', actors: [
      { emoji: '🚗', x: 42, y: 68, size: 112, anim: 'bob' },
      { emoji: '🧔', x: 16, y: 62, size: 100, anim: 'sway', delay: 0.4 },
      { emoji: '👧', x: 70, y: 64, size: 90, anim: 'bob', delay: 0.9 },
      { emoji: '🐶', x: 90, y: 74, size: 70, anim: 'wiggle', delay: 1.3 },
    ] },
    comprehension: { question: 'Kto myje auto?', options: ['🧔', '👧', '🐶'], answer: 0 },
  },
  {
    id: 'cz-100', group: 4, title: 'Dobranoc', emoji: '🌙',
    sentences: [
      [w('ZA'), w('OK', 'NEM'), w('JEST'), w('CIEM', 'NO', '.')],
      [w('O', 'LA'), w('ZA', 'KŁA', 'DA'), w('PI', 'ŻA', 'MĘ', '.')],
      [w('MA', 'MA'), w('CZY', 'TA'), w('NAM'), w('BAJ', 'KĘ', '.')],
      [w('KO', 'TEK'), w('ŚPI'), w('NA'), w('ŁÓŻ', 'KU', '.')],
      [w('NA'), w('NIE', 'BIE'), w('MRU', 'GA', 'JĄ'), w('GWIAZ', 'DY', '.')],
      [w('O', 'LA'), w('I', 'DZIE'), w('SPAĆ', '.')],
    ],
    scene: { bg: 'night', actors: [
      { emoji: '🌙', x: 74, y: 26, size: 80, anim: 'float' },
      { emoji: '⭐', x: 90, y: 40, size: 52, anim: 'pulse', delay: 0.5 },
      { emoji: '👧', x: 36, y: 64, size: 100, anim: 'bob', delay: 0.9 },
      { emoji: '🐱', x: 60, y: 74, size: 70, anim: 'wiggle', delay: 1.3 },
      { emoji: '🧸', x: 14, y: 76, size: 60, anim: 'pulse', delay: 1.7 },
    ] },
    comprehension: { question: 'Kto śpi na łóżku?', options: ['🧸', '🐱', '🐶'], answer: 1 },
  },

]

export function getCzytankaById(id: string): Czytanka | undefined {
  return CZYTANKI.find((c) => c.id === id)
}

export function getCzytankiByGroup(group: CzytankaGroup): Czytanka[] {
  return CZYTANKI.filter((c) => c.group === group)
}
