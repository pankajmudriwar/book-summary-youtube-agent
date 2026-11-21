"""
Stage 7: Automated YouTube Upload
Authenticates with YouTube Data API v3 using OAuth2 refresh token,
performs a resumable video upload, and saves the YouTube URL to Supabase.
"""

import os
import sys
import json
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

from utils import (
    parse_args, get_book, get_settings, update_book,
    log_pipeline, download_file, fail_book,
)


def get_youtube_service(settings: dict):
    """Build YouTube Data API v3 service using OAuth2 refresh token."""
    client_id = os.environ["YOUTUBE_CLIENT_ID"]
    client_secret = os.environ["YOUTUBE_CLIENT_SECRET"]
    refresh_token = settings.get("youtube_refresh_token")

    if not refresh_token:
        raise ValueError(
            "YouTube not connected — use the Admin Dashboard Settings "
            "page to connect your YouTube channel"
        )

    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri="https://oauth2.googleapis.com/token",
    )

    return build("youtube", "v3", credentials=credentials)


def upload_video(youtube, video_path: str, title: str, description: str,
                 tags: list[str], privacy: str = "private") -> dict:
    """Perform resumable upload to YouTube."""
    body = {
        "snippet": {
            "title": title[:100],  # YouTube title limit
            "description": description[:5000],
            "tags": tags[:30] if tags else [],
            "categoryId": "27",  # Education
            "defaultAudioLanguage": "mr",
            "defaultLanguage": "mr",
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(
        video_path,
        mimetype="video/mp4",
        resumable=True,
        chunksize=10 * 1024 * 1024,  # 10MB chunks
    )

    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media,
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  Upload progress: {int(status.progress() * 100)}%")

    return response


def main():
    args = parse_args()
    book_id = args.book_id

    try:
        book = get_book(book_id)
        settings = get_settings()

        update_book(book_id, {"status": "uploading"})
        log_pipeline(book_id, "upload", "Starting YouTube upload")

        video_url = book.get("video_url")
        if not video_url:
            raise ValueError("No video URL — run video rendering first")

        # Download video locally
        video_path = f"/tmp/{book_id}.mp4"
        if not os.path.exists(video_path):
            download_file(video_url, video_path)

        # Build YouTube service
        youtube = get_youtube_service(settings)
        log_pipeline(book_id, "upload", "YouTube API authenticated")

        # Get metadata
        title = book.get("youtube_title", book.get("book_title", "Book Summary"))
        description = book.get("youtube_description", "")
        tags = book.get("youtube_tags", [])
        privacy = settings.get("youtube_privacy_status", "private")

        # Upload
        log_pipeline(book_id, "upload",
                     f"Uploading video ({os.path.getsize(video_path)/(1024*1024):.1f} MB)")

        response = upload_video(youtube, video_path, title, description, tags, privacy)

        video_id = response["id"]
        youtube_url = f"https://youtu.be/{video_id}"

        # Update Supabase
        update_book(book_id, {
            "youtube_video_id": video_id,
            "youtube_url": youtube_url,
            "status": "published",
            "published_at": "now()",
        })

        log_pipeline(book_id, "upload",
                     f"✅ Published to YouTube: {youtube_url}",
                     metadata={"video_id": video_id, "privacy": privacy})

        print(f"\n🎉 Video published: {youtube_url}")

    except HttpError as e:
        error_detail = json.loads(e.content.decode()) if e.content else str(e)
        fail_book(book_id, "upload", f"YouTube API error: {error_detail}")
        sys.exit(1)
    except Exception as e:
        fail_book(book_id, "upload", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
