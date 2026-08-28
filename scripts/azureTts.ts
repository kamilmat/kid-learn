/**
 * Backend TTS: Azure Speech (REST) z SSML <phoneme alphabet="ipa">.
 *
 * WHY: ten sam głos co Edge TTS (pl-PL-ZofiaNeural), ale SSML pozwala podać
 * wymowę wprost w IPA — izolowane sylaby przestają być zgadywane przez G2P
 * silnika. Darmowy tier F0 wystarcza na cały korpus czytanek.
 *
 * Klucze czytane z `.env.local` (gitignore) — AZURE_SPEECH_KEY, AZURE_SPEECH_REGION.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const AZURE_OUTPUT_FORMAT = 'audio-24khz-96kbitrate-mono-mp3'
const RETRY_DELAY_MS = 2_000

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

export async function synthesizeAzure({
  ssml,
  key,
  region,
  outPath,
}: SynthesizeParams): Promise<void> {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`
  const request = (): Promise<Response> =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': AZURE_OUTPUT_FORMAT,
        'User-Agent': 'iskierki-audio',
      },
      body: ssml,
    })

  let response = await request()
  if (!response.ok && isRetryable(response.status)) {
    await sleep(RETRY_DELAY_MS)
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
