"""
Stage 4: Voice Cloning Engine
Downloads reference voice, splits script into chunks, synthesizes each chunk,
concatenates with natural pauses, normalizes loudness, and uploads to Supabase.
"""

import os
import io
import sys
import json
import tempfile
import subprocess
import requests
from pathlib import Path
from pydub import AudioSegment

from utils import (
    parse_args, get_book, get_settings, update_book,
    log_pipeline, upload_to_storage, download_file, fail_book,
)

PAUSE_MS = 300  # Natural pause between chunks
TARGET_LUFS = -14  # YouTube loudness standard
MAX_CHUNK_CHARS = 200


def split_script_to_chunks(script: str) -> list[str]:
    """Split Marathi script into sentence chunks, max ~200 chars each."""
    # Split on Devanagari purna viram (।), period, or double newline
    import re
    sentences = re.split(r'[।\.!\?]\s*|\n\n+', script)
    sentences = [s.strip() for s in sentences if s.strip()]

    chunks = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 > MAX_CHUNK_CHARS and current:
            chunks.append(current.strip())
            current = sentence
        else:
            current = f"{current} {sentence}".strip() if current else sentence

    if current:
        chunks.append(current.strip())

    return chunks


def synthesize_external_api(text: str, language: str, speaker_wav_url: str,
                            chunk_index: int, api_url: str, api_key: str | None) -> bytes:
    """Call external voice cloning API."""
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "text": text,
        "language": language,
        "speaker_wav_url": speaker_wav_url,
        "chunk_index": chunk_index,
    }

    resp = requests.post(api_url, json=payload, headers=headers, timeout=120)
    resp.raise_for_status()
    return resp.content


def synthesize_local(text: str, language: str, ref_audio_path: str,
                     chunk_index: int) -> bytes:
    """Run local Coqui XTTS-v2 synthesis (fallback to espeak for demo)."""
    try:
        from TTS.api import TTS
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out:
            tts.tts_to_file(
                text=text,
                language=language,
                speaker_wav=ref_audio_path,
                file_path=out.name,
            )
            with open(out.name, "rb") as f:
                return f.read()
    except ImportError:
        print("⚠ TTS library not available, using espeak fallback")
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out:
            subprocess.run([
                "espeak-ng", "-v", "mr", "-w", out.name, text
            ], check=True, capture_output=True)
            with open(out.name, "rb") as f:
                return f.read()


def normalize_loudness(input_path: str, output_path: str, target_lufs: float = -14):
    """Normalize audio loudness using FFmpeg loudnorm filter (two-pass)."""
    # First pass: measure
    result = subprocess.run([
        "ffmpeg", "-i", input_path, "-af",
        f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
        "-f", "null", "-"
    ], capture_output=True, text=True)

    # Parse measured values from stderr
    stderr = result.stderr
    try:
        json_start = stderr.rfind('{')
        json_end = stderr.rfind('}') + 1
        measured = json.loads(stderr[json_start:json_end])
    except (json.JSONDecodeError, ValueError):
        # Fallback: single pass
        subprocess.run([
            "ffmpeg", "-y", "-i", input_path, "-af",
            f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11",
            output_path
        ], check=True, capture_output=True)
        return

    # Second pass: apply
    af = (
        f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:"
        f"measured_I={measured.get('input_i', -24)}:"
        f"measured_TP={measured.get('input_tp', -1)}:"
        f"measured_LRA={measured.get('input_lra', 7)}:"
        f"measured_thresh={measured.get('input_thresh', -34)}:"
        f"offset={measured.get('target_offset', 0)}:"
        f"linear=true:print_format=summary"
    )
    subprocess.run([
        "ffmpeg", "-y", "-i", input_path, "-af", af, output_path
    ], check=True, capture_output=True)


def main():
    args = parse_args()
    book_id = args.book_id

    try:
        book = get_book(book_id)
        settings = get_settings()

        update_book(book_id, {"status": "voicing"})
        log_pipeline(book_id, "voice", "Starting voice cloning stage")

        script = book.get("script_marathi")
        if not script:
            raise ValueError("No Marathi script found for this book")

        voice_sample_url = settings.get("voice_sample_url")
        if not voice_sample_url:
            raise ValueError("No voice sample configured in agent_settings")

        # Split script into chunks
        chunks = split_script_to_chunks(script)
        log_pipeline(book_id, "voice", f"Script split into {len(chunks)} chunks")

        # Download reference audio for local mode
        ref_audio_path = None
        if settings.get("voice_clone_mode") == "github_action_local":
            ref_audio_path = "/tmp/reference_voice.wav"
            download_file(voice_sample_url, ref_audio_path)
            log_pipeline(book_id, "voice", "Downloaded reference voice sample")

        # Synthesize each chunk
        audio_segments = []
        pause = AudioSegment.silent(duration=PAUSE_MS)

        for i, chunk in enumerate(chunks):
            log_pipeline(book_id, "voice", f"Synthesizing chunk {i+1}/{len(chunks)}: {chunk[:50]}...")

            if settings.get("voice_clone_mode") == "external_api":
                api_url = settings.get("voice_clone_api_url")
                api_key = settings.get("voice_clone_api_key")
                if not api_url:
                    raise ValueError("voice_clone_api_url not configured")
                wav_bytes = synthesize_external_api(
                    chunk, "mr", voice_sample_url, i, api_url, api_key
                )
            else:
                wav_bytes = synthesize_local(chunk, "mr", ref_audio_path, i)

            segment = AudioSegment.from_wav(io.BytesIO(wav_bytes))
            audio_segments.append(segment)
            if i < len(chunks) - 1:
                audio_segments.append(pause)

        # Concatenate all segments
        combined = audio_segments[0]
        for seg in audio_segments[1:]:
            combined += seg

        # Export raw combined audio
        raw_path = "/tmp/narration_raw.wav"
        combined.export(raw_path, format="wav")
        log_pipeline(book_id, "voice",
                     f"Combined audio: {len(combined)/1000:.1f}s duration")

        # Normalize loudness
        normalized_path = "/tmp/narration.wav"
        normalize_loudness(raw_path, normalized_path, TARGET_LUFS)
        log_pipeline(book_id, "voice", f"Audio normalized to {TARGET_LUFS} LUFS")

        # Upload to Supabase Storage
        audio_url = upload_to_storage(
            "agent-media", f"audio/{book_id}.wav",
            normalized_path, "audio/wav"
        )
        update_book(book_id, {"audio_url": audio_url})
        log_pipeline(book_id, "voice", f"Voice cloning complete: {audio_url}")

    except Exception as e:
        fail_book(book_id, "voice", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
