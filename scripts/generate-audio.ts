/**
 * Audio pipeline for Iskierki.
 *
 * Reads keyed string maps from `audio-source/*.json`, then for each key:
 *   1. If a manual override `audio-source/manual-overrides/<key>.mp3` exists,
 *      copy it to `public/audio/<key>.mp3` and mark `source: 'override'` in the manifest.
 *   2. Otherwise compute SHA-256 of the source text and compare to the cached hash
 *      in `public/audio/.manifest.json`. If hash matches and the file exists, skip.
 *      If not, invoke `edge-tts` with `pl-PL-ZofiaNeural` to (re)generate the mp3
 *      and update the manifest.
 *
 * Modes:
 *   build  — generate everything missing or changed
 *   check  — only verify all keys have an mp3 (exits 1 if any missing); generates nothing
 *
 * Run:
 *   pnpm exec tsx scripts/generate-audio.ts build
 *   pnpm exec tsx scripts/generate-audio.ts check
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------- types ----------

export type ManifestEntry = {
  hash: string
  updatedAt: number
  source: 'tts' | 'override'
}

export type Manifest = Record<string, ManifestEntry>

export type SourceMap = Record<string, string>

type Mode = 'build' | 'check'

// ---------- paths ----------

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const AUDIO_SOURCE_DIR = join(ROOT, 'audio-source')
const MANUAL_OVERRIDES_DIR = join(AUDIO_SOURCE_DIR, 'manual-overrides')
const PUBLIC_AUDIO_DIR = join(ROOT, 'public', 'audio')
const MANIFEST_PATH = join(PUBLIC_AUDIO_DIR, '.manifest.json')

const SOURCE_FILES = ['letters.json', 'words.json', 'ui-strings.json'] as const

const VOICE = 'pl-PL-ZofiaNeural'

// ---------- pure helpers (testable) ----------

/**
 * Loads & merges all source JSON maps into one keyed map.
 * Throws on duplicate keys across files (developer error).
 */
export function loadSources(filePaths: readonly string[]): SourceMap {
  const merged: SourceMap = {}
  for (const filePath of filePaths) {
    const raw = readFileSync(filePath, 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${filePath}: expected JSON object map, got ${typeof parsed}`)
    }
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') {
        throw new Error(`${filePath}: value for "${key}" is not a string`)
      }
      if (key in merged) {
        throw new Error(`Duplicate audio key "${key}" (also defined elsewhere)`)
      }
      merged[key] = value
    }
  }
  return merged
}

/** Stable SHA-256 of the source text. Used as cache key in the manifest. */
export function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function readManifest(path: string): Manifest {
  if (!existsSync(path)) return {}
  const raw = readFileSync(path, 'utf8').trim()
  if (raw === '') return {}
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {}
  }
  return parsed as Manifest
}

export function writeManifest(path: string, manifest: Manifest): void {
  mkdirSync(dirname(path), { recursive: true })
  // Sort keys for stable diffs.
  const sorted: Manifest = {}
  for (const key of Object.keys(manifest).sort()) {
    sorted[key] = manifest[key]!
  }
  writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n', 'utf8')
}

/**
 * Decides what to do with one key during a build run.
 * Pure: takes the inputs and returns the action — does no IO.
 */
export type BuildAction =
  | { kind: 'override' }
  | { kind: 'cache-hit' }
  | { kind: 'generate'; reason: 'missing-file' | 'hash-mismatch' | 'no-manifest-entry' }

export function decideAction(params: {
  hasOverride: boolean
  hasOutputFile: boolean
  text: string
  manifestEntry: ManifestEntry | undefined
}): BuildAction {
  if (params.hasOverride) return { kind: 'override' }
  if (!params.hasOutputFile) return { kind: 'generate', reason: 'missing-file' }
  if (!params.manifestEntry) return { kind: 'generate', reason: 'no-manifest-entry' }
  if (params.manifestEntry.hash !== hashText(params.text)) {
    return { kind: 'generate', reason: 'hash-mismatch' }
  }
  return { kind: 'cache-hit' }
}

// ---------- IO helpers ----------

// Cached path to edge-tts binary (resolved once per run).
let edgeTtsPath: string | null = null

function findEdgeTts(): string | null {
  // 1) Already in PATH?
  const which = spawnSync('which', ['edge-tts'], { encoding: 'utf8' })
  if (which.status === 0 && which.stdout.trim()) {
    return which.stdout.trim()
  }
  // 2) Common pip install --user locations on macOS / Linux
  const home = process.env['HOME'] ?? ''
  const candidates = [
    `${home}/Library/Python/3.13/bin/edge-tts`,
    `${home}/Library/Python/3.12/bin/edge-tts`,
    `${home}/Library/Python/3.11/bin/edge-tts`,
    `${home}/Library/Python/3.10/bin/edge-tts`,
    `${home}/Library/Python/3.9/bin/edge-tts`,
    `${home}/.local/bin/edge-tts`,
    '/opt/homebrew/bin/edge-tts',
    '/usr/local/bin/edge-tts',
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

function ensureEdgeTtsAvailable(): void {
  edgeTtsPath = findEdgeTts()
  if (!edgeTtsPath) {
    console.error('edge-tts CLI not found.')
    console.error('Zainstaluj: pip3 install --user edge-tts')
    process.exit(1)
  }
}

function runEdgeTts(text: string, outPath: string): void {
  if (!edgeTtsPath) edgeTtsPath = findEdgeTts()
  if (!edgeTtsPath) {
    throw new Error('edge-tts binary not found')
  }
  const result = spawnSync(
    edgeTtsPath,
    ['--voice', VOICE, '--text', text, '--write-media', outPath],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim()
    throw new Error(`edge-tts failed (exit ${result.status}): ${err}`)
  }
}

function overridePath(key: string): string {
  return join(MANUAL_OVERRIDES_DIR, `${key}.mp3`)
}

function outputPath(key: string): string {
  return join(PUBLIC_AUDIO_DIR, `${key}.mp3`)
}

// ---------- main flows ----------

function runBuild(sources: SourceMap): void {
  ensureEdgeTtsAvailable()
  mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true })

  const manifest = readManifest(MANIFEST_PATH)
  let generated = 0
  let copied = 0
  let cached = 0
  let failed = 0

  for (const [key, text] of Object.entries(sources)) {
    const out = outputPath(key)
    const ovr = overridePath(key)
    const action = decideAction({
      hasOverride: existsSync(ovr),
      hasOutputFile: existsSync(out),
      text,
      manifestEntry: manifest[key],
    })

    try {
      if (action.kind === 'override') {
        copyFileSync(ovr, out)
        manifest[key] = {
          hash: hashText(text),
          updatedAt: Date.now(),
          source: 'override',
        }
        copied += 1
        console.log(`→ ${key} (override copied)`)
      } else if (action.kind === 'cache-hit') {
        cached += 1
        console.log(`✓ ${key} (cache hit)`)
      } else {
        console.log(`→ ${key} (generuję, ${action.reason})`)
        runEdgeTts(text, out)
        manifest[key] = {
          hash: hashText(text),
          updatedAt: Date.now(),
          source: 'tts',
        }
        generated += 1
      }
    } catch (err) {
      failed += 1
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`❌ ${key}: ${msg}`)
    }
  }

  writeManifest(MANIFEST_PATH, manifest)

  console.log('')
  console.log(
    `Done. generated=${generated} copied=${copied} cached=${cached} failed=${failed} total=${Object.keys(sources).length}`,
  )
  if (failed > 0) process.exit(1)
}

function runCheck(sources: SourceMap): void {
  const missing: string[] = []
  for (const key of Object.keys(sources)) {
    if (!existsSync(outputPath(key))) missing.push(key)
  }
  const total = Object.keys(sources).length
  if (missing.length === 0) {
    console.log(`✓ Wszystkie ${total} pliki audio na miejscu.`)
    return
  }
  console.error(`❌ Brakuje ${missing.length}/${total} plików audio:`)
  for (const key of missing) console.error(`  - ${key}.mp3`)
  console.error('')
  console.error('Uruchom: pnpm audio:build')
  process.exit(1)
}

function parseMode(argv: readonly string[]): Mode {
  const arg = argv[2]
  if (arg === 'build' || arg === 'check') return arg
  console.error('Usage: tsx scripts/generate-audio.ts <build|check>')
  process.exit(1)
}

function main(): void {
  const mode = parseMode(process.argv)
  const sourceFilePaths = SOURCE_FILES.map((f) => join(AUDIO_SOURCE_DIR, f))
  const sources = loadSources(sourceFilePaths)

  if (mode === 'build') runBuild(sources)
  else runCheck(sources)
}

// Run only when executed as a script (not when imported by tests).
const isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(__filename)
if (isEntry) main()
