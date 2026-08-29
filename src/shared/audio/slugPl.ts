// Klucze audio muszą być lowercase ASCII — macOS APFS jest case-insensitive
// i maskuje 404, które wychodzą dopiero na GH Pages (Linux).
const PL_MAP: Record<string, string> = {
  ą: 'a_', ę: 'e_', ó: 'o_', ł: 'l_', ś: 's_', ć: 'c_', ń: 'n_', ź: 'z_', ż: 'z-',
}

export const AUDIO_KEY_RE = /^[a-z0-9_-]+$/

export function slugPl(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => PL_MAP[ch] ?? ch)
    .join('')
}
