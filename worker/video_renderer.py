"""
Stage 6: Minimalist Video Rendering
Renders a 1080p MP4 using FFmpeg with book cover on left,
live synchronized Marathi captions on right, and progress bar.
"""

import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path

from utils import (
    parse_args, get_book, get_settings, update_book,
    log_pipeline, upload_to_storage, download_file, fail_book,
)


def get_media_duration(file_path: str) -> float:
    """Get duration of audio/video file."""
    result = subprocess.run([
        "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", file_path
    ], capture_output=True, text=True, check=True)
    return float(result.stdout.strip())


def render_16_9(cover_path: str, audio_path: str, ass_path: str,
                output_path: str, book_title: str, author: str):
    """
    Render 1920x1080 (16:9) video:
    - Dark gradient background
    - Left panel: book cover with shadow + title/author
    - Thin vertical divider
    - Right panel: live ASS captions
    - Bottom progress bar
    """
    duration = get_media_duration(audio_path)

    # Escape special characters for FFmpeg drawtext
    title_escaped = book_title.replace("'", "'\\''").replace(":", "\\:")
    author_escaped = (author or "").replace("'", "'\\''").replace(":", "\\:")

    # Build the complex FFmpeg filter graph
    filter_complex = (
        # 1. Dark gradient background
        f"color=c=#0B0F19:s=1920x1080:d={duration}:r=30[bg_dark];"
        f"color=c=#151C2C:s=1920x1080:d={duration}:r=30[bg_light];"
        "[bg_dark][bg_light]blend=all_mode=normal:all_opacity=0.5[bg];"

        # 2. Scale book cover to fit 600x820 bounding box
        "[1:v]scale=600:820:force_original_aspect_ratio=decrease,"
        "pad=600:820:(ow-iw)/2:(oh-ih)/2:color=#00000000,"
        "format=rgba[cover_raw];"

        # 3. Add drop shadow to cover (dark copy offset behind)
        "[cover_raw]split[cov1][cov2];"
        "[cov2]colorchannelmixer=aa=0.4[shadow];"
        f"color=c=#00000000:s=620x840:d={duration}[shadow_canvas];"
        "[shadow_canvas][shadow]overlay=10:10[shadow_layer];"
        f"[shadow_layer]scale=620:840[shadow_scaled];"

        # 4. Place shadow + cover on background
        f"[bg][shadow_scaled]overlay=95:95[bg_shadow];"
        f"[bg_shadow][cov1]overlay=90:90[bg_cover];"

        # 5. Vertical divider line (thin accent)
        f"color=c=#2A3550:s=2x700:d={duration}:r=30[divider];"
        "[bg_cover][divider]overlay=820:190[bg_div];"

        # 6. Book title and author text below cover
        f"[bg_div]drawtext="
        f"text='{title_escaped}':"
        f"fontfile=/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf:"
        f"fontsize=28:fontcolor=white:x=90:y=940:"
        f"borderw=1:bordercolor=#0B0F19[bg_title];"

        f"[bg_title]drawtext="
        f"text='{author_escaped}':"
        f"fontfile=/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf:"
        f"fontsize=22:fontcolor=#8899AA:x=90:y=975:"
        f"borderw=1:bordercolor=#0B0F19[bg_author];"

        # 7. Progress bar (thin horizontal bar at bottom)
        f"color=c=#3B82F6:s=2x4:d={duration}:r=30[bar_color];"
        f"[bar_color]scale='min(1920\\,1920*t/{duration})':4[bar];"
        f"color=c=#1E293B:s=1920x4:d={duration}:r=30[bar_bg];"
        "[bg_author][bar_bg]overlay=0:1074[bg_barbg];"
        "[bg_barbg][bar]overlay=0:1074[bg_bar];"

        # 8. Burn in ASS subtitles (right panel captions)
        f"[bg_bar]ass='{ass_path}'[final]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", audio_path,       # Input 0: audio
        "-i", cover_path,       # Input 1: cover image
        "-filter_complex", filter_complex,
        "-map", "[final]",
        "-map", "0:a",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-r", "30",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-t", str(duration),
        output_path
    ]

    print(f"Running FFmpeg render ({duration:.1f}s video)...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed:\n{result.stderr[-2000:]}")


def render_9_16(cover_path: str, audio_path: str, ass_path: str,
                output_path: str, book_title: str, author: str):
    """
    Render 1080x1920 (9:16) vertical video for Shorts:
    - Book cover centered in top 45%
    - Live captions in bottom 50%
    """
    duration = get_media_duration(audio_path)
    title_escaped = book_title.replace("'", "'\\''").replace(":", "\\:")

    filter_complex = (
        f"color=c=#0B0F19:s=1080x1920:d={duration}:r=30[bg];"

        "[1:v]scale=800:600:force_original_aspect_ratio=decrease,"
        "pad=800:600:(ow-iw)/2:(oh-ih)/2:color=#00000000[cover];"

        "[bg][cover]overlay=(W-w)/2:120[bg_cover];"

        f"[bg_cover]drawtext="
        f"text='{title_escaped}':"
        f"fontfile=/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf:"
        f"fontsize=36:fontcolor=white:x=(w-tw)/2:y=760:"
        f"borderw=2:bordercolor=#0B0F19[bg_title];"

        f"color=c=#2A3550:s=800x2:d={duration}:r=30[divider];"
        "[bg_title][divider]overlay=140:830[bg_div];"

        f"color=c=#3B82F6:s=2x4:d={duration}:r=30[bar];"
        f"[bar]scale='min(1080\\,1080*t/{duration})':4[bar_s];"
        "[bg_div][bar_s]overlay=0:1914[bg_bar];"

        f"[bg_bar]ass='{ass_path}'[final]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", audio_path,
        "-i", cover_path,
        "-filter_complex", filter_complex,
        "-map", "[final]",
        "-map", "0:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k",
        "-r", "30", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-t", str(duration),
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed:\n{result.stderr[-2000:]}")


def main():
    args = parse_args()
    book_id = args.book_id

    try:
        book = get_book(book_id)
        settings = get_settings()

        update_book(book_id, {"status": "rendering"})
        log_pipeline(book_id, "render", "Starting video rendering")

        audio_url = book.get("audio_url")
        subtitle_url = book.get("subtitle_url")
        cover_url = book.get("cover_image_url")

        if not audio_url:
            raise ValueError("No audio URL — run voice cloning first")
        if not subtitle_url:
            raise ValueError("No subtitle URL — run caption generation first")
        if not cover_url:
            raise ValueError("No cover image URL")

        video_format = settings.get("video_format", "16:9")

        # Download assets
        audio_path = "/tmp/narration.wav"
        ass_path = f"/tmp/{book_id}.ass"
        cover_path = "/tmp/cover.jpg"
        output_path = f"/tmp/{book_id}.mp4"

        download_file(audio_url, audio_path)
        download_file(subtitle_url, ass_path)
        download_file(cover_url, cover_path)
        log_pipeline(book_id, "render", "All assets downloaded")

        book_title = book.get("book_title", "")
        author = book.get("author", "")

        if video_format == "9:16":
            render_9_16(cover_path, audio_path, ass_path, output_path,
                        book_title, author)
        else:
            render_16_9(cover_path, audio_path, ass_path, output_path,
                        book_title, author)

        # Verify output
        file_size = os.path.getsize(output_path)
        log_pipeline(book_id, "render",
                     f"Video rendered: {file_size / (1024*1024):.1f} MB")

        # Upload to Supabase
        video_url = upload_to_storage(
            "agent-media", f"videos/{book_id}.mp4",
            output_path, "video/mp4"
        )
        update_book(book_id, {"video_url": video_url})
        log_pipeline(book_id, "render", f"Video render complete: {video_url}")

    except Exception as e:
        fail_book(book_id, "render", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
