/**
 * Konwersja WebM → MP3 dla nagrań z tools/recorder/.
 *
 * Iteruje po `audio-source/manual-overrides/*.webm`, dla każdego pliku:
 *   - jeśli odpowiadający `.mp3` nie istnieje LUB jest starszy niż webm → wywołaj ffmpeg
 *   - inaczej skip
 *
 * Wymóg: `ffmpeg` w PATH (`brew install ffmpeg`).
 *
 * Run: pnpm exec tsx scripts/convert-overrides.ts
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const OVERRIDES_DIR = join(ROOT, 'audio-source', 'manual-overrides')

export type ConvertDecision =
  | { convert: true; reason: 'no-mp3' | 'webm-newer' }
  | { convert: false; reason: 'up-to-date' | 'no-webm' }

export function decideConvert(params: {
  webmExists: boolean
  webmMtime: number
  mp3Exists: boolean
  mp3Mtime: number
}): ConvertDecision {
  if (!params.webmExists) return { convert: false, reason: 'no-webm' }
  if (!params.mp3Exists) return { convert: true, reason: 'no-mp3' }
  if (params.webmMtime > params.mp3Mtime) return { convert: true, reason: 'webm-newer' }
  return { convert: false, reason: 'up-to-date' }
}

function ensureFfmpeg(): void {
  const which = spawnSync('which', ['ffmpeg'], { encoding: 'utf8' })
  if (which.status !== 0 || !which.stdout.trim()) {
    console.error('ffmpeg nie znaleziony w PATH.')
    console.error('Zainstaluj: brew install ffmpeg')
    process.exit(1)
  }
}

function runFfmpeg(input: string, output: string): void {
  const result = spawnSync(
    'ffmpeg',
    [
      '-y', // overwrite
      '-i', input,
      '-codec:a', 'libmp3lame',
      '-qscale:a', '2', // VBR ~190kbps
      '-ar', '44100',
      '-ac', '1', // mono
      '-loglevel', 'error',
      output,
    ],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim()
    throw new Error(`ffmpeg failed: ${err}`)
  }
}

function main(): void {
  if (!existsSync(OVERRIDES_DIR)) {
    console.log(`Brak folderu ${OVERRIDES_DIR} — nic do konwersji.`)
    return
  }
  ensureFfmpeg()

  const files = readdirSync(OVERRIDES_DIR).filter((f) => f.endsWith('.webm'))
  if (files.length === 0) {
    console.log('Brak plików .webm do konwersji.')
    return
  }

  let converted = 0
  let skipped = 0
  let failed = 0

  for (const webmName of files) {
    const webmPath = join(OVERRIDES_DIR, webmName)
    const mp3Name = webmName.replace(/\.webm$/, '.mp3')
    const mp3Path = join(OVERRIDES_DIR, mp3Name)

    const webmStat = statSync(webmPath)
    const mp3Stat = existsSync(mp3Path) ? statSync(mp3Path) : null

    const decision = decideConvert({
      webmExists: true,
      webmMtime: webmStat.mtimeMs,
      mp3Exists: !!mp3Stat,
      mp3Mtime: mp3Stat?.mtimeMs ?? 0,
    })

    if (!decision.convert) {
      skipped += 1
      continue
    }

    try {
      console.log(`→ ${webmName} → ${mp3Name} (${decision.reason})`)
      runFfmpeg(webmPath, mp3Path)
      converted += 1
    } catch (err) {
      failed += 1
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`❌ ${webmName}: ${msg}`)
    }
  }

  console.log('')
  console.log(`Done. converted=${converted} skipped=${skipped} failed=${failed} total=${files.length}`)
  if (failed > 0) process.exit(1)
}

const isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(__filename)
if (isEntry) main()
