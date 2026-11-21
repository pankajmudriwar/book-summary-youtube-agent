"""
Shared utilities for all worker scripts.
Handles Supabase client, logging, status updates, and file management.
"""

import os
import sys
import json
import argparse
import traceback
import requests
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--book-id", required=True, help="UUID of the book to process")
    return parser.parse_args()


def supabase_get(table: str, params: dict | None = None) -> list[dict]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.get(url, headers=HEADERS, params=params or {})
    resp.raise_for_status()
    return resp.json()


def supabase_patch(table: str, match: dict, data: dict) -> list[dict]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {f"{k}": f"eq.{v}" for k, v in match.items()}
    resp = requests.patch(url, headers=HEADERS, params=params, json=data)
    resp.raise_for_status()
    return resp.json()


def supabase_insert(table: str, data: dict) -> dict:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.post(url, headers=HEADERS, json=data)
    resp.raise_for_status()
    return resp.json()


def get_book(book_id: str) -> dict:
    rows = supabase_get("books_queue", {"id": f"eq.{book_id}", "select": "*"})
    if not rows:
        raise ValueError(f"Book {book_id} not found")
    return rows[0]


def get_settings() -> dict:
    rows = supabase_get("agent_settings", {"id": "eq.1", "select": "*"})
    if not rows:
        raise ValueError("Agent settings not found")
    return rows[0]


def update_book(book_id: str, data: dict):
    supabase_patch("books_queue", {"id": book_id}, data)


def log_pipeline(book_id: str, stage: str, message: str,
                 level: str = "info", metadata: dict | None = None):
    entry = {
        "book_id": book_id,
        "stage": stage,
        "level": level,
        "message": message,
    }
    if metadata:
        entry["metadata"] = json.dumps(metadata)
    try:
        supabase_insert("pipeline_logs", entry)
    except Exception as e:
        print(f"[LOG-ERROR] Failed to write pipeline log: {e}", file=sys.stderr)
    tag = f"[{stage.upper()}]"
    if level == "error":
        print(f"❌ {tag} {message}", file=sys.stderr)
    else:
        print(f"✓ {tag} {message}")


def upload_to_storage(bucket: str, path: str, file_path: str,
                      content_type: str = "application/octet-stream") -> str:
    """Upload a file to Supabase Storage and return its public URL."""
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    upload_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    with open(file_path, "rb") as f:
        resp = requests.post(url, headers=upload_headers, data=f)
    if resp.status_code in (200, 201):
        return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"
    # Try PUT for update
    with open(file_path, "rb") as f:
        resp = requests.put(url, headers=upload_headers, data=f)
    resp.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"


def download_file(url: str, dest: str):
    """Download a file from a URL to a local path."""
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    with open(dest, "wb") as f:
        f.write(resp.content)
    return dest


def fail_book(book_id: str, stage: str, error: str):
    """Mark a book as failed with error details."""
    update_book(book_id, {
        "status": "failed",
        "error_message": error[:2000],
    })
    log_pipeline(book_id, stage, error, level="error",
                 metadata={"traceback": traceback.format_exc()})
