"""
Failure Reporter — called when any stage fails in GitHub Actions.
Ensures the book is marked as failed with error details in Supabase.
"""

import sys
from utils import parse_args, get_book, update_book, log_pipeline


def main():
    args = parse_args()
    book_id = args.book_id

    try:
        book = get_book(book_id)
        current_status = book.get("status", "unknown")

        if current_status not in ("failed", "published"):
            update_book(book_id, {
                "status": "failed",
                "error_message": f"GitHub Actions workflow failed during stage: {current_status}",
            })
            log_pipeline(
                book_id, current_status if current_status in (
                    "voicing", "rendering", "uploading"
                ) else "render",
                f"Pipeline failed — status was '{current_status}' at failure time",
                level="error",
            )
            print(f"❌ Book {book_id} marked as failed (was in stage: {current_status})")
    except Exception as e:
        print(f"❌ Could not report failure for {book_id}: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
