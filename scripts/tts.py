"""Minimal Edge TTS wrapper supporting SSML (phoneme tags).

Usage:
    python3 scripts/tts.py <voice> <output.mp3> <text-or-ssml>

If text starts with '<speak' it's treated as SSML.
"""

import asyncio
import sys

import edge_tts


async def main() -> int:
    if len(sys.argv) < 4:
        print("usage: tts.py <voice> <out.mp3> <text>", file=sys.stderr)
        return 2
    voice = sys.argv[1]
    out = sys.argv[2]
    text = sys.argv[3]
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(out)
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
