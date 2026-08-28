import { describe, expect, it } from 'vitest'

import { buildSsml, parseEnvFile } from './azureTts'

describe('buildSsml', () => {
  it('wstawia głos, prozodię i fonem IPA', () => {
    const ssml = buildSsml({ voice: 'pl-PL-ZofiaNeural', ipa: 'kˈa', text: 'ka' })
    expect(ssml).toContain('xml:lang="pl-PL"')
    expect(ssml).toContain('<voice name="pl-PL-ZofiaNeural">')
    expect(ssml).toContain('<prosody rate="-15%">')
    expect(ssml).toContain('<phoneme alphabet="ipa" ph="kˈa">ka</phoneme>')
    expect(ssml.startsWith('<speak version="1.0"')).toBe(true)
    expect(ssml.endsWith('</speak>')).toBe(true)
  })

  it('escapuje XML w tekście i w ph', () => {
    const ssml = buildSsml({ voice: 'v', ipa: 'a"b', text: '<a & b>' })
    expect(ssml).toContain('ph="a&quot;b"')
    expect(ssml).toContain('&lt;a &amp; b&gt;')
  })
})

describe('parseEnvFile', () => {
  it('czyta pary KEY=VALUE, pomija komentarze i puste linie', () => {
    const parsed = parseEnvFile('# komentarz\n\nAZURE_SPEECH_KEY=abc123\nAZURE_SPEECH_REGION="westeurope"\n')
    expect(parsed).toEqual({ AZURE_SPEECH_KEY: 'abc123', AZURE_SPEECH_REGION: 'westeurope' })
  })

  it('nie gubi znaku = w wartości', () => {
    expect(parseEnvFile('K=a=b')).toEqual({ K: 'a=b' })
  })
})
