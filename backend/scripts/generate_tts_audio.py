"""Generate speech audio from text using the Deepgram Text-to-Speech REST API.

Reads DEEPGRAM_API_KEY from the environment (or a .env file at the repo root
via python-dotenv) and writes the synthesized audio to disk.

Usage:
    python -m scripts.generate_tts_audio "Hello, world!" -o out.mp3
    python -m scripts.generate_tts_audio --file input.txt -o out.wav --model aura-2-thalia-en
    echo "Hello there" | python -m scripts.generate_tts_audio -o out.mp3

Docs: https://developers.deepgram.com/reference/text-to-speech-api
"""

from __future__ import annotations

import argparse
import mimetypes
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak"
DEFAULT_MODEL = "aura-2-thalia-en"

# Maps requested output extensions to the encoding/container params Deepgram expects.
_ENCODING_BY_EXT = {
    ".mp3": {"encoding": "mp3"},
    ".wav": {"encoding": "linear16", "container": "wav", "sample_rate": "24000"},
    ".flac": {"encoding": "flac"},
    ".ogg": {"encoding": "opus", "container": "ogg"},
    ".aac": {"encoding": "aac"},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    text_group = parser.add_mutually_exclusive_group(required=False)
    text_group.add_argument("text", nargs="?", help="Text to synthesize.")
    text_group.add_argument("--file", "-f", type=Path, help="Path to a text file to synthesize.")
    parser.add_argument(
        "--output", "-o", type=Path, default=Path("output.mp3"), help="Output audio file path (default: output.mp3)."
    )
    parser.add_argument(
        "--model", "-m", default=DEFAULT_MODEL, help=f"Deepgram TTS model/voice (default: {DEFAULT_MODEL})."
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="Deepgram API key. Defaults to the DEEPGRAM_API_KEY environment variable / .env entry.",
    )
    return parser.parse_args()


def resolve_text(args: argparse.Namespace) -> str:
    if args.file:
        return args.file.read_text(encoding="utf-8").strip()
    if args.text:
        return args.text.strip()
    if not sys.stdin.isatty():
        return sys.stdin.read().strip()
    raise SystemExit("No text provided. Pass text as an argument, --file, or via stdin.")


def resolve_api_key(args: argparse.Namespace) -> str:
    if args.api_key:
        return args.api_key
    # Load .env from cwd/nearest parent first, then fall back to the repo root
    # .env explicitly (python-dotenv stops at the first .env it finds walking
    # up, which may be backend/.env rather than the repo-root one).
    load_dotenv()
    repo_root_env = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(dotenv_path=repo_root_env, override=False)
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    if not api_key:
        raise SystemExit(
            "Missing Deepgram API key. Set DEEPGRAM_API_KEY in your environment/.env, or pass --api-key."
        )
    return api_key


def synthesize(text: str, api_key: str, model: str, output_path: Path) -> None:
    ext = output_path.suffix.lower()
    params = {"model": model, **_ENCODING_BY_EXT.get(ext, {"encoding": "mp3"})}
    if ext not in _ENCODING_BY_EXT:
        print(f"Warning: unrecognized extension '{ext}', defaulting to mp3 encoding.", file=sys.stderr)

    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        DEEPGRAM_TTS_URL,
        params=params,
        headers=headers,
        json={"text": text},
        timeout=60,
    )

    if not response.ok:
        raise SystemExit(f"Deepgram TTS request failed ({response.status_code}): {response.text}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(response.content)
    print(f"Saved {len(response.content)} bytes to {output_path} ({mimetypes.guess_type(str(output_path))[0]})")


def main() -> None:
    args = parse_args()
    text = resolve_text(args)
    api_key = resolve_api_key(args)
    synthesize(text, api_key, args.model, args.output)


if __name__ == "__main__":
    main()
