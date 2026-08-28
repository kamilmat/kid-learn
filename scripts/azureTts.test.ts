import { describe, expect, it } from 'vitest'

import { buildPlainSsml, buildSsml, parseEnvFile } from './azureTts'

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

describe('buildPlainSsml', () => {
  it('wstawia głos i tekst bez phoneme/prosody', () => {
    const ssml = buildPlainSsml({ voice: 'pl-PL-AgnieszkaNeural', text: 'ada' })
    expect(ssml).toBe(
      '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="pl-PL">' +
        '<voice name="pl-PL-AgnieszkaNeural"><lang xml:lang="pl-PL">ada</lang></voice></speak>',
    )
    expect(ssml).not.toContain('<phoneme')
    expect(ssml).not.toContain('<prosody')
  })

  it('escapuje & i < w tekście', () => {
    const ssml = buildPlainSsml({ voice: 'v', text: '<a & b>' })
    expect(ssml).toContain('&lt;a &amp; b&gt;')
    expect(ssml).not.toContain('<a & b>')
  })

  it('dodaje prosody tylko gdy podano rate', () => {
    const ssml = buildPlainSsml({ voice: 'v', text: 'ada', rate: '-10%' })
    expect(ssml).toContain('<prosody rate="-10%">ada</prosody>')
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
