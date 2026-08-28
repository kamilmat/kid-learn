/**
 * Audio pipeline for Iskierki.
 *
 * Reads keyed string maps from `audio-source/*.json`, then for each key:
 *   1. If a manual override `audio-source/manual-overrides/<key>.mp3` exists,
 *      copy it to `public/audio/<key>.mp3` and mark `source: 'override'` in the manifest.
 *   2. Otherwise compute SHA-256 of the source text + voice and compare to the cached hash
 *      in `public/audio/.manifest.json`. If hash matches and the file exists, skip.
 *      If not, invoke `edge-tts` with the appropriate voice to (re)generate the mp3
 *      and update the manifest.
 *
 * Each JSON file may have a `_voice` field (default: 'zofia') and an `_engine`
 * field (default: 'edge'). Keys starting with `_` are treated as metadata and
 * skipped during audio generation.
 *
 * Voice map:
 *   zofia      → pl-PL-ZofiaNeural      (Edge; legacy lektor)
 *   agnieszka  → pl-PL-AgnieszkaNeural  (Azure-only; obecny lektor)
 *   marek      → pl-PL-MarekNeural      (Edge; Iskra mascot)
 *
 * Engines:
 *   edge       — edge-tts CLI, darmowy, bez SSML (domyślny)
 *   azure      — Azure Speech REST + zwykłe SSML (bez phoneme). Dla głosów
 *                Azure-only (np. agnieszka) i tekstów, które Azure czyta
 *                poprawnie z samej ortografii.
 *   azure-ipa  — Azure Speech REST + SSML <phoneme alphabet="ipa">; IPA liczone
 *                z ortografii przez scripts/polishG2p.ts. WHY: Edge/Azure zgadują
 *                wymowę izolowanych sylab i mylą się ("lo" → "elo").
 *                `azure` i `azure-ipa` wymagają AZURE_SPEECH_KEY / AZURE_SPEECH_REGION
 *                w `.env.local`.
 *
 * Modes:
 *   build  — generate everything missing or changed (`--dry-run`: tylko wypisz plan)
 *   check  — only verify all keys have an mp3 (exits 1 if any missing); generates nothing
 *
 * Run:
 *   pnpm exec tsx scripts/generate-audio.ts build
 *   pnpm exec tsx scripts/generate-audio.ts build --dry-run
 *   pnpm exec tsx scripts/generate-audio.ts check
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildPlainSsml,
  buildSsml,
  loadEnvLocal,
  MISSING_CREDENTIALS_MESSAGE,
  readAzureCredentials,
  synthesizeAzure,
} from './azureTts'
import { toIpa } from './polishG2p'

// ---------- types ----------

export type Engine = 'edge' | 'azure' | 'azure-ipa'

export type ManifestEntry = {
  hash: string
  updatedAt: number
  source: 'tts' | 'override'
  engine?: Engine
}

export type Manifest = Record<string, ManifestEntry>

export type SourceEntry = {
  text: string
  voice: string
  engine: Engine
  /** Wypełnione tylko dla engine 'azure-ipa' — wymowa podawana wprost do SSML. */
  ipa?: string
}

export type SourceMap = Record<string, SourceEntry>

/**
 * Ręczny wyjątek wymowy wybrany przez odsłuch, z pierwszeństwem przed G2P/tekstem.
 * `ipa` wymusza syntezę przez `<phoneme>` (nawet dla wpisów `azure` bez IPA);
 * `text` wymusza zwykłe SSML z podanym tekstem (nawet dla wpisów `azure-ipa`).
 */
export type PronunciationOverride = { ipa: string } | { text: string }

export type PronunciationOverrides = Record<string, PronunciationOverride>

type Mode = 'build' | 'check'

const ENGINES: readonly Engine[] = ['edge', 'azure', 'azure-ipa']
const DEFAULT_ENGINE: Engine = 'edge'

// ---------- voice map ----------

const VOICE_MAP: Record<string, string> = {
  zofia: 'pl-PL-ZofiaNeural',
  marek: 'pl-PL-MarekNeural',
  agnieszka: 'pl-PL-AgnieszkaNeural',
}

const DEFAULT_VOICE = 'zofia'

/** Głosy dostępne tylko przez Azure (brak w edge-tts / niesprawdzone tam). */
const AZURE_ONLY_VOICES: readonly string[] = ['agnieszka']

function resolveVoice(voiceKey: string): string {
  const mapped = VOICE_MAP[voiceKey]
  if (!mapped) {
    throw new Error(
      `Unknown voice "${voiceKey}". Valid voices: ${Object.keys(VOICE_MAP).join(', ')}`,
    )
  }
  return mapped
}

// ---------- paths ----------

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')
const AUDIO_SOURCE_DIR = join(ROOT, 'audio-source')
const MANUAL_OVERRIDES_DIR = join(AUDIO_SOURCE_DIR, 'manual-overrides')
const PRONUNCIATION_OVERRIDES_PATH = join(AUDIO_SOURCE_DIR, 'pronunciation-overrides.json')
const PUBLIC_AUDIO_DIR = join(ROOT, 'public', 'audio')
const MANIFEST_PATH = join(PUBLIC_AUDIO_DIR, '.manifest.json')

// ---------- pure helpers (testable) ----------

/**
 * Discovers all *.json files in the audio-source directory (non-recursive).
 * Returns absolute paths, sorted for stable ordering.
 */
export function discoverSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => join(dir, e.name))
    .sort()
}

/**
 * Loads & merges all source JSON maps into one keyed map.
 * - Reads `_voice` metadata field from each file (default: 'zofia').
 * - Skips all keys starting with `_` (metadata).
 * - Throws on duplicate keys across files (developer error).
 */
export function loadSources(filePaths: readonly string[]): SourceMap {
  const merged: SourceMap = {}
  for (const filePath of filePaths) {
    const raw = readFileSync(filePath, 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${filePath}: expected JSON object map, got ${typeof parsed}`)
    }
    const obj = parsed as Record<string, unknown>

    // Read optional _voice metadata field (default: 'zofia').
    const voiceKey =
      typeof obj['_voice'] === 'string' ? (obj['_voice'] as string) : DEFAULT_VOICE
    // Validate the voice is known before processing the whole file.
    const resolvedVoice = resolveVoice(voiceKey)

    const engineKey =
      typeof obj['_engine'] === 'string' ? (obj['_engine'] as string) : DEFAULT_ENGINE
    if (!ENGINES.includes(engineKey as Engine)) {
      throw new Error(
        `${filePath}: unknown _engine "${engineKey}". Valid engines: ${ENGINES.join(', ')}`,
      )
    }
    const engine = engineKey as Engine

    if (engine === 'edge' && AZURE_ONLY_VOICES.includes(voiceKey)) {
      throw new Error(`${filePath}: voice ${voiceKey} is Azure-only`)
    }

    for (const [key, value] of Object.entries(obj)) {
      // Skip metadata keys.
      if (key.startsWith('_')) continue

      if (typeof value !== 'string') {
        throw new Error(`${filePath}: value for "${key}" is not a string`)
      }
      if (key in merged) {
        throw new Error(`Duplicate audio key "${key}" (also defined elsewhere)`)
      }
      merged[key] =
        engine === 'azure-ipa'
          ? { text: value, voice: resolvedVoice, engine, ipa: toIpa(value) }
          : { text: value, voice: resolvedVoice, engine }
    }
  }
  return merged
}

/**
 * Loads `pronunciation-overrides.json` (jeśli istnieje). Klucze zaczynające się
 * od `_` to komentarze i są pomijane. Każdy wpis musi mieć dokładnie jedno pole:
 * `ipa` albo `text`.
 */
export function loadPronunciationOverrides(path: string): PronunciationOverrides {
  if (!existsSync(path)) return {}
  const raw = readFileSync(path, 'utf8').trim()
  if (raw === '') return {}
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${path}: expected JSON object map, got ${typeof parsed}`)
  }
  const obj = parsed as Record<string, unknown>
  const out: PronunciationOverrides = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_')) continue
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`${path}: override for "${key}" must be an object`)
    }
    const entry = value as Record<string, unknown>
    const hasIpa = typeof entry['ipa'] === 'string'
    const hasText = typeof entry['text'] === 'string'
    if (hasIpa === hasText) {
      throw new Error(`${path}: override for "${key}" must have exactly one of "ipa" or "text"`)
    }
    out[key] = hasIpa ? { ipa: entry['ipa'] as string } : { text: entry['text'] as string }
  }
  return out
}

/**
 * Nakłada ręczny wyjątek wymowy na wpis źródłowy. Działa tylko dla silników
 * `azure-ipa`/`azure` (`edge` nie obsługuje SSML/phoneme). `ipa` przełącza
 * wpis na `azure-ipa` z podanym IPA; `text` przełącza na zwykłe `azure` SSML
 * z podanym tekstem — niezależnie od oryginalnego silnika wpisu.
 */
export function applyPronunciationOverride(
  entry: SourceEntry,
  override: PronunciationOverride | undefined,
): SourceEntry {
  if (!override) return entry
  if (entry.engine !== 'azure-ipa' && entry.engine !== 'azure') return entry
  if ('ipa' in override) {
    return { text: entry.text, voice: entry.voice, engine: 'azure-ipa', ipa: override.ipa }
  }
  return { text: override.text, voice: entry.voice, engine: 'azure' }
}

/**
 * Stable SHA-256 of the source text + voice. Including voice means that changing
 * the voice for a key (e.g. zofia→marek) will trigger regeneration.
 */
export function hashEntry(text: string, voice: string): string {
  return createHash('sha256').update(`${voice}\n${text}`, 'utf8').digest('hex')
}

/**
 * Hash dla wpisów azure-ipa. Zawiera silnik i IPA, więc zmiana reguł w
 * polishG2p.ts (albo przejście edge → azure) wymusza regenerację pliku.
 */
export function hashEntryAzure(text: string, voice: string, ipa: string): string {
  return createHash('sha256')
    .update(`azure-ipa\n${voice}\n${ipa}\n${text}`, 'utf8')
    .digest('hex')
}

/**
 * Hash dla wpisów `azure` (plain SSML, bez IPA). Osobny prefiks od `hashEntry`
 * (edge), więc przełączenie edge→azure dla tego samego tekstu/głosu wymusza
 * regenerację zamiast trafienia w cache.
 */
export function hashEntryAzurePlain(text: string, voice: string): string {
  return createHash('sha256').update(`azure\n${voice}\n${text}`, 'utf8').digest('hex')
}

/** @deprecated Use hashEntry instead. Kept for backward compatibility in tests. */
export function hashText(text: string): string {
  return hashEntry(text, VOICE_MAP[DEFAULT_VOICE]!)
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
  voice: string
  manifestEntry: ManifestEntry | undefined
  engine?: Engine
  ipa?: string
}): BuildAction {
  if (params.hasOverride) return { kind: 'override' }
  if (!params.hasOutputFile) return { kind: 'generate', reason: 'missing-file' }
  if (!params.manifestEntry) return { kind: 'generate', reason: 'no-manifest-entry' }
  if (params.manifestEntry.hash !== expectedHash(params)) {
    return { kind: 'generate', reason: 'hash-mismatch' }
  }
  return { kind: 'cache-hit' }
}

function expectedHash(entry: {
  text: string
  voice: string
  engine?: Engine
  ipa?: string
}): string {
  if (entry.engine === 'azure-ipa') return hashEntryAzure(entry.text, entry.voice, entry.ipa ?? '')
  if (entry.engine === 'azure') return hashEntryAzurePlain(entry.text, entry.voice)
  return hashEntry(entry.text, entry.voice)
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

function runEdgeTts(text: string, voice: string, outPath: string): void {
  if (!edgeTtsPath) edgeTtsPath = findEdgeTts()
  if (!edgeTtsPath) {
    throw new Error('edge-tts binary not found')
  }
  const result = spawnSync(
    edgeTtsPath,
    ['--voice', voice, '--text', text, '--write-media', outPath],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim()
    throw new Error(`edge-tts failed (exit ${result.status}): ${err}`)
  }
}

/** Zwraca dane Azure albo null, gdy żaden wpis ich nie potrzebuje. */
function ensureAzureAvailable(sources: SourceMap): { key: string; region: string } | null {
  const needsAzure = Object.values(sources).some(
    (e) => e.engine === 'azure-ipa' || e.engine === 'azure',
  )
  if (!needsAzure) return null
  loadEnvLocal(ROOT)
  const credentials = readAzureCredentials()
  if (!credentials) {
    console.error(MISSING_CREDENTIALS_MESSAGE)
    process.exit(1)
  }
  return credentials
}

function overridePath(key: string): string {
  return join(MANUAL_OVERRIDES_DIR, `${key}.mp3`)
}

function outputPath(key: string): string {
  return join(PUBLIC_AUDIO_DIR, `${key}.mp3`)
}

// ---------- main flows ----------

/** Plan buildu bez dotykania TTS — działa bez klucza Azure i bez edge-tts. */
function runDryRun(sources: SourceMap, overrides: PronunciationOverrides): void {
  const manifest = readManifest(MANIFEST_PATH)
  const counts: Record<string, number> = {}

  for (const [key, entry] of Object.entries(sources)) {
    const action = decideAction({
      hasOverride: existsSync(overridePath(key)),
      hasOutputFile: existsSync(outputPath(key)),
      text: entry.text,
      voice: entry.voice,
      manifestEntry: manifest[key],
      engine: entry.engine,
      ipa: entry.ipa,
    })
    const label = action.kind === 'generate' ? `generate (${action.reason})` : action.kind
    const ipa = entry.ipa ? ` ipa="${entry.ipa}"` : ''
    const pronunciationOverride = overrides[key]
    const overrideLabel = pronunciationOverride
      ? ` override=${
          'ipa' in pronunciationOverride
            ? `ipa:"${pronunciationOverride.ipa}"`
            : `text:"${pronunciationOverride.text}"`
        }`
      : ''
    console.log(
      `${key}\tengine=${entry.engine}\ttext="${entry.text}"${ipa}${overrideLabel}\t${label}`,
    )
    const bucket = `${entry.engine}/${action.kind}`
    counts[bucket] = (counts[bucket] ?? 0) + 1
  }

  console.log('')
  console.log('DRY RUN — nic nie wygenerowano.')
  for (const bucket of Object.keys(counts).sort()) {
    console.log(`  ${bucket}: ${counts[bucket]}`)
  }
  console.log(`  total: ${Object.keys(sources).length}`)
}

async function runBuild(sources: SourceMap): Promise<void> {
  ensureEdgeTtsAvailable()
  const azure = ensureAzureAvailable(sources)
  mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true })

  const manifest = readManifest(MANIFEST_PATH)
  let generated = 0
  let copied = 0
  let cached = 0
  let failed = 0

  for (const [key, entry] of Object.entries(sources)) {
    const { text, voice, engine, ipa } = entry
    const out = outputPath(key)
    const ovr = overridePath(key)
    const action = decideAction({
      hasOverride: existsSync(ovr),
      hasOutputFile: existsSync(out),
      text,
      voice,
      manifestEntry: manifest[key],
      engine,
      ipa,
    })

    try {
      if (action.kind === 'override') {
        copyFileSync(ovr, out)
        manifest[key] = {
          hash: expectedHash(entry),
          updatedAt: Date.now(),
          source: 'override',
          engine,
        }
        copied += 1
        console.log(`→ ${key} (override copied)`)
      } else if (action.kind === 'cache-hit') {
        cached += 1
        console.log(`✓ ${key} (cache hit)`)
      } else {
        console.log(
          `→ ${key} (generuję, ${action.reason}, engine=${engine}, voice=${voice}` +
            `${ipa ? `, ipa=${ipa}` : ''})`,
        )
        if (engine === 'azure-ipa') {
          if (!azure) throw new Error('brak danych logowania Azure')
          await synthesizeAzure({
            ssml: buildSsml({ voice, ipa: ipa ?? '', text }),
            key: azure.key,
            region: azure.region,
            outPath: out,
          })
        } else if (engine === 'azure') {
          if (!azure) throw new Error('brak danych logowania Azure')
          await synthesizeAzure({
            ssml: buildPlainSsml({ voice, text }),
            key: azure.key,
            region: azure.region,
            outPath: out,
          })
        } else {
          runEdgeTts(text, voice, out)
        }
        manifest[key] = {
          hash: expectedHash(entry),
          updatedAt: Date.now(),
          source: 'tts',
          engine,
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

export function parseCli(argv: readonly string[]): { mode: Mode; dryRun: boolean } {
  const args = argv.slice(2)
  const mode = args.find((a) => !a.startsWith('-'))
  const dryRun = args.includes('--dry-run')
  if (mode === 'build' || mode === 'check') return { mode, dryRun }
  console.error('Usage: tsx scripts/generate-audio.ts <build|check> [--dry-run]')
  process.exit(1)
}

async function main(): Promise<void> {
  const { mode, dryRun } = parseCli(process.argv)
  // pronunciation-overrides.json nie jest źródłem tekstu (wartości to obiekty,
  // nie stringi) — wczytywane osobno, wykluczone z loadSources.
  const sourceFilePaths = discoverSourceFiles(AUDIO_SOURCE_DIR).filter(
    (p) => p !== PRONUNCIATION_OVERRIDES_PATH,
  )
  console.log(`Discovered source files: ${sourceFilePaths.map((p) => p.split('/').pop()).join(', ')}`)
  const rawSources = loadSources(sourceFilePaths)
  const overrides = loadPronunciationOverrides(PRONUNCIATION_OVERRIDES_PATH)
  const sources: SourceMap = {}
  for (const [key, entry] of Object.entries(rawSources)) {
    sources[key] = applyPronunciationOverride(entry, overrides[key])
  }

  if (mode === 'check') runCheck(sources)
  else if (dryRun) runDryRun(sources, overrides)
  else await runBuild(sources)
}

// Run only when executed as a script (not when imported by tests).
const isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(__filename)
if (isEntry) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
