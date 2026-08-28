/**
 * Backend TTS: Azure Speech (REST). Dwa tryby SSML:
 *   - `buildSsml`      — z `<phoneme alphabet="ipa">`, dla silnika `azure-ipa`
 *                        (izolowane sylaby, wymowa liczona z ortografii).
 *   - `buildPlainSsml` — zwykły tekst, dla silnika `azure` (lektor Agnieszka
 *                        i inne wpisy, które Azure czyta poprawnie bez IPA).
 *
 * Darmowy tier F0 pozwala na ~20 req/min — `synthesizeAzure` throttluje
 * requesty i robi backoff z retry na 429/5xx (patrz BACKOFF_DELAYS_MS).
 *
 * Klucze czytane z `.env.local` (gitignore) — AZURE_SPEECH_KEY, AZURE_SPEECH_REGION.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const AZURE_OUTPUT_FORMAT = 'audio-24khz-96kbitrate-mono-mp3'

/**
 * Backoff dla 429/5xx — tier F0 pozwala na ~20 req/min, więc build 1000+
 * plików musi tolerować throttling zamiast wywalać się na pierwszym 429.
 */
const BACKOFF_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 32_000, 60_000]
/** Minimalny odstęp między requestami do Azure (≈19/min, margines pod 20/min). */
const MIN_REQUEST_SPACING_MS = 3_100

let lastRequestAt = 0

export type SsmlParams = {
  voice: string
  ipa: string
  text: string
  /** Prozodia; wolniej = czytelniej dla dziecka. Domyślnie -15%. */
  rate?: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildSsml({ voice, ipa, text, rate = '-15%' }: SsmlParams): string {
  return (
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ' +
    'xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="pl-PL">' +
    `<voice name="${escapeXml(voice)}">` +
    `<prosody rate="${escapeXml(rate)}">` +
    `<phoneme alphabet="ipa" ph="${escapeXml(ipa)}">${escapeXml(text)}</phoneme>` +
    '</prosody></voice></speak>'
  )
}

export type PlainSsmlParams = {
  voice: string
  text: string
  /** Prozodia; brak = tempo domyślne głosu. */
  rate?: string
}

/**
 * SSML dla silnika `azure` — zwykły tekst, bez `<phoneme>`. Używane dla
 * lektora (Agnieszka) i innych wpisów, które Azure wymawia poprawnie
 * z samej ortografii — phoneme/IPA jest zarezerwowane dla izolowanych sylab.
 */
export function buildPlainSsml({ voice, text, rate }: PlainSsmlParams): string {
  const escapedText = escapeXml(text)
  const content = rate
    ? `<prosody rate="${escapeXml(rate)}">${escapedText}</prosody>`
    : escapedText
  return (
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="pl-PL">' +
    `<voice name="${escapeXml(voice)}">` +
    `<lang xml:lang="pl-PL">${content}</lang>` +
    '</voice></speak>'
  )
}

// ---------- .env ----------

/** Minimalny parser .env — bez zależności, obsługuje KEY=VALUE, # komentarze, cudzysłowy. */
export function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

/**
 * Wczytuje `.env.local` (priorytet) i `.env` z katalogu repo do process.env.
 * Zmienne już obecne w środowisku wygrywają — CI może je nadpisać.
 */
export function loadEnvLocal(root: string): Record<string, string> {
  const merged: Record<string, string> = {}
  for (const name of ['.env', '.env.local']) {
    const path = join(root, name)
    if (!existsSync(path)) continue
    Object.assign(merged, parseEnvFile(readFileSync(path, 'utf8')))
  }
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
  return merged
}

export type AzureCredentials = { key: string; region: string }

export function readAzureCredentials(): AzureCredentials | null {
  const key = process.env['AZURE_SPEECH_KEY']
  const region = process.env['AZURE_SPEECH_REGION']
  if (!key || !region) return null
  return { key, region }
}

export const MISSING_CREDENTIALS_MESSAGE = [
  'Brak danych Azure Speech dla wpisów `_engine: "azure-ipa"`.',
  'Utwórz plik `.env.local` w katalogu repo (jest w .gitignore):',
  '  AZURE_SPEECH_KEY=<klucz z portalu Azure, zasób Speech, tier F0>',
  '  AZURE_SPEECH_REGION=westeurope',
  'Wzór: `.env.example`. Podgląd bez klucza: `pnpm audio:dry`.',
].join('\n')

// ---------- REST ----------

export type SynthesizeParams = {
  ssml: string
  key: string
  region: string
  outPath: string
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Czeka, jeśli trzeba, tak by kolejny request nie nastąpił szybciej niż MIN_REQUEST_SPACING_MS po poprzednim. */
async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_SPACING_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
}

/** Odczytuje `Retry-After` (sekundy albo data HTTP) jeśli serwer go podał. */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after')
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const dateMs = Date.parse(header)
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now())
  return null
}

export async function synthesizeAzure({
  ssml,
  key,
  region,
  outPath,
}: SynthesizeParams): Promise<void> {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
  const request = async (): Promise<Response> => {
    await throttle()
    return fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': AZURE_OUTPUT_FORMAT,
        'User-Agent': 'iskierki-audio',
      },
      body: ssml,
    })
  }

  let response = await request()
  let attempt = 0
  while (!response.ok && isRetryable(response.status) && attempt < BACKOFF_DELAYS_MS.length) {
    const delay = retryAfterMs(response) ?? BACKOFF_DELAYS_MS[attempt]!
    console.log(
      `⏳ Azure TTS ${response.status} — backoff ${Math.round(delay / 1000)}s ` +
        `(retry ${attempt + 1}/${BACKOFF_DELAYS_MS.length})`,
    )
    await sleep(delay)
    attempt += 1
    response = await request()
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Azure TTS ${response.status} ${response.statusText}: ${body.trim()}`)
  }

  const audio = Buffer.from(await response.arrayBuffer())
  if (audio.length === 0) throw new Error('Azure TTS zwróciło pusty plik audio')
  writeFileSync(outPath, audio)
}

// ---------- silence trim ----------

/**
 * Szuka binarki ffmpeg — `which ffmpeg` najpierw, potem typowe lokalizacje
 * Homebrew (macOS Apple Silicon / Intel).
 */
export function findFfmpeg(): string | null {
  const which = spawnSync('which', ['ffmpeg'], { encoding: 'utf8' })
  if (which.status === 0 && which.stdout.trim()) {
    return which.stdout.trim()
  }
  const candidates = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

/**
 * Przycina ciszę na początku/końcu pliku Azure TTS (~0.3s lead, ~0.8s tail
 * z Azure Speech), zostawiając ~80ms na starcie i ~120ms na końcu żeby
 * nie obcinać ataku/wybrzmienia głoski. Odwrócenie (`areverse`) między
 * dwoma przebiegami `silenceremove` pozwala przyciąć koniec tym samym
 * filtrem co start (silenceremove działa tylko od początku strumienia).
 */
export function trimSilence(inPath: string, outPath: string): void {
  const ffmpeg = findFfmpeg()
  if (!ffmpeg) {
    throw new Error('ffmpeg nie znaleziony (sprawdzono PATH, /opt/homebrew/bin, /usr/local/bin)')
  }
  const filter =
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,' +
    'areverse,' +
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,' +
    'areverse'
  const result = spawnSync(
    ffmpeg,
    ['-y', '-loglevel', 'error', '-i', inPath, '-af', filter, '-codec:a', 'libmp3lame', '-b:a', '96k', outPath],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim()
    throw new Error(`ffmpeg trimSilence failed (exit ${result.status}): ${err}`)
  }
}
