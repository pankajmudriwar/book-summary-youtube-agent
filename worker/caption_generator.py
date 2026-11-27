"""
Stage 5: Live Marathi Caption Synchronization
Generates precise phrase timestamps synchronized with narration audio,
then produces an ASS subtitle file for burned-in Marathi captions.
"""

import os
import re
import sys
import json
import tempfile
import subprocess
from pathlib import Path

from utils import (
    parse_args, get_book, get_settings, update_book,
    log_pipeline, upload_to_storage, download_file, fail_book,
)

WORDS_PER_PHRASE = 5  # Group 3-6 words per caption line


def get_audio_duration(audio_path: str) -> float:
    """Get audio duration in seconds using ffprobe."""
    result = subprocess.run([
        "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", audio_path
    ], capture_output=True, text=True, check=True)
    return float(result.stdout.strip())


def generate_timestamps_with_gemini(audio_path: str, script: str) -> list[dict]:
    """
    Use Gemini Audio Multimodal API to generate word-level timestamps.
    Falls back to proportional splitting if API unavailable.
    """
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        prompt = f"""You are given a Marathi narration audio and its exact script text.
Your task: produce precise timestamps for every 3-5 word phrase from the script,
synchronized with the audio.

Script text:
{script}

Output a JSON array where each element has:
- "text": the exact Devanagari phrase (3-5 words)
- "start": start time in seconds (float, 2 decimal places)
- "end": end time in seconds (float, 2 decimal places)

Rules:
- Use EXACTLY the Devanagari text from the script — no transliteration
- Cover the entire script from start to finish
- Phrases should be natural reading units (don't split mid-word)
- Timestamps must be monotonically increasing and cover the full audio duration

Output ONLY the JSON array, nothing else."""

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type="audio/wav"),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        result_text = response.text or ""
        # Clean up response
        result_text = result_text.strip()
        if result_text.startswith("```"):
            result_text = re.sub(r'^```\w*\n?', '', result_text)
            result_text = re.sub(r'\n?```$', '', result_text)

        phrases = json.loads(result_text)
        return phrases

    except Exception as e:
        print(f"⚠ Gemini timestamp generation failed: {e}", file=sys.stderr)
        print("  Falling back to proportional timestamp generation")
        return None


def generate_timestamps_proportional(script: str, duration: float) -> list[dict]:
    """
    Fallback: split script into phrases and assign proportional timestamps.
    """
    words = script.split()
    phrases = []
    for i in range(0, len(words), WORDS_PER_PHRASE):
        phrase_words = words[i:i + WORDS_PER_PHRASE]
        phrases.append(" ".join(phrase_words))

    time_per_phrase = duration / len(phrases) if phrases else 0
    result = []
    for i, phrase in enumerate(phrases):
        result.append({
            "text": phrase,
            "start": round(i * time_per_phrase, 2),
            "end": round((i + 1) * time_per_phrase, 2),
        })

    return result


def generate_timestamps_whisper(audio_path: str, script: str) -> list[dict] | None:
    """Use faster-whisper with forced alignment for precise timestamps."""
    try:
        from faster_whisper import WhisperModel

        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, info = model.transcribe(
            audio_path,
            language="mr",
            word_timestamps=True,
            initial_prompt=script[:500],
        )

        all_words = []
        for segment in segments:
            if segment.words:
                for word in segment.words:
                    all_words.append({
                        "text": word.word.strip(),
                        "start": round(word.start, 2),
                        "end": round(word.end, 2),
                    })

        if not all_words:
            return None

        # Group into phrases of 3-6 words
        phrases = []
        i = 0
        while i < len(all_words):
            group = all_words[i:i + WORDS_PER_PHRASE]
            phrases.append({
                "text": " ".join(w["text"] for w in group),
                "start": group[0]["start"],
                "end": group[-1]["end"],
            })
            i += WORDS_PER_PHRASE

        # Replace Whisper-generated text with original script phrases
        # to ensure 100% Devanagari spelling accuracy
        script_words = script.split()
        idx = 0
        for phrase in phrases:
            word_count = len(phrase["text"].split())
            original_words = script_words[idx:idx + word_count]
            if original_words:
                phrase["text"] = " ".join(original_words)
            idx += word_count

        return phrases

    except Exception as e:
        print(f"⚠ Whisper alignment failed: {e}", file=sys.stderr)
        return None


def format_ass_time(seconds: float) -> str:
    """Convert seconds to ASS timestamp format: H:MM:SS.CC"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int((seconds % 1) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def generate_ass_file(phrases: list[dict], output_path: str, video_format: str = "16:9"):
    """Generate ASS subtitle file with Noto Sans Devanagari styling."""
    if video_format == "16:9":
        play_res_x, play_res_y = 1920, 1080
        # Right panel: 45% to 95% of width = x:864 to x:1824
        margin_l = 880   # Left margin (pushes text to right panel)
        margin_r = 100   # Right margin
        margin_v = 200   # Vertical margin
        font_size = 52
    else:  # 9:16
        play_res_x, play_res_y = 1080, 1920
        margin_l = 60
        margin_r = 60
        margin_v = 100
        font_size = 46

    ass_content = f"""[Script Info]
Title: Marathi Book Summary Captions
ScriptType: v4.00+
PlayResX: {play_res_x}
PlayResY: {play_res_y}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Devanagari,{font_size},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,5,{margin_l},{margin_r},{margin_v},0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    for phrase in phrases:
        start = format_ass_time(phrase["start"])
        end = format_ass_time(phrase["end"])
        text = phrase["text"].replace("\n", "\\N")
        ass_content += f"Dialogue: 0,{start},{end},Caption,,0,0,0,,{text}\n"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(ass_content)


def main():
    args = parse_args()
    book_id = args.book_id

    try:
        book = get_book(book_id)
        settings = get_settings()

        log_pipeline(book_id, "captions", "Starting caption synchronization")

        script = book.get("script_marathi")
        audio_url = book.get("audio_url")
        if not script:
            raise ValueError("No Marathi script found")
        if not audio_url:
            raise ValueError("No audio URL found — run voice cloning first")

        video_format = settings.get("video_format", "16:9")

        # Download audio
        audio_path = "/tmp/narration.wav"
        download_file(audio_url, audio_path)
        duration = get_audio_duration(audio_path)
        log_pipeline(book_id, "captions", f"Audio duration: {duration:.1f}s")

        # Generate timestamps (try methods in order)
        phrases = generate_timestamps_with_gemini(audio_path, script)

        if not phrases:
            phrases = generate_timestamps_whisper(audio_path, script)

        if not phrases:
            log_pipeline(book_id, "captions",
                         "Using proportional timestamp fallback", level="warning")
            phrases = generate_timestamps_proportional(script, duration)

        log_pipeline(book_id, "captions", f"Generated {len(phrases)} caption phrases")

        # Generate ASS file
        ass_path = f"/tmp/{book_id}.ass"
        generate_ass_file(phrases, ass_path, video_format)
        log_pipeline(book_id, "captions", "ASS subtitle file generated")

        # Upload to Supabase
        subtitle_url = upload_to_storage(
            "agent-media", f"subtitles/{book_id}.ass",
            ass_path, "text/x-ssa"
        )
        update_book(book_id, {"subtitle_url": subtitle_url})
        log_pipeline(book_id, "captions", f"Captions complete: {subtitle_url}")

    except Exception as e:
        fail_book(book_id, "captions", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
