"""
Voice Cloning Server Template — FastAPI wrapper for any GitHub voice-cloning repo.

This is a ready-to-run template server that wraps a voice-cloning model
(Coqui XTTS-v2, F5-TTS, Indic-F5, etc.) behind a simple REST API.

API Contract:
  POST /synthesize
  Body: {
    "text": "मराठी text to synthesize",
    "language": "mr",
    "speaker_wav_url": "https://...reference.wav",
    "chunk_index": 0
  }
  Headers: Authorization: Bearer <optional-api-key>
  Response: audio/wav binary

  GET /health
  Response: { "status": "ok", "model": "xtts-v2" }

Setup:
  1. pip install -r requirements.txt
  2. Download your model weights (e.g., Coqui XTTS-v2)
  3. Set MODEL_PATH env var or place weights in ./models/
  4. uvicorn server:app --host 0.0.0.0 --port 8000
"""

import io
import os
import tempfile
import requests
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pydub import AudioSegment

app = FastAPI(title="Voice Cloning Server", version="1.0.0")

# ─── Configuration ─────────────────────────────────────────────
API_KEY = os.getenv("VOICE_API_KEY", "")  # Set to require auth
MODEL_PATH = os.getenv("MODEL_PATH", "./models")

# ─── Model Loading (customize for your model) ─────────────────
# Replace this section with your actual model initialization.
# Example for Coqui XTTS-v2:
#   from TTS.api import TTS
#   tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=True)

tts_model = None

def load_model():
    """Load the voice cloning model. Customize for your chosen model."""
    global tts_model
    try:
        from TTS.api import TTS
        tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        print("✓ XTTS-v2 model loaded successfully")
    except Exception as e:
        print(f"⚠ Model loading failed: {e}")
        print("  Running in demo mode — will return silence")
        tts_model = None

# ─── Request Schema ───────────────────────────────────────────
class SynthesizeRequest(BaseModel):
    text: str
    language: str = "mr"
    speaker_wav_url: str
    chunk_index: int = 0

# ─── Auth Middleware ──────────────────────────────────────────
def verify_auth(authorization: str | None):
    if API_KEY and (not authorization or authorization != f"Bearer {API_KEY}"):
        raise HTTPException(status_code=401, detail="Invalid API key")

# ─── Endpoints ────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    load_model()

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "xtts-v2" if tts_model else "none (demo mode)",
        "ready": tts_model is not None
    }

@app.post("/synthesize")
async def synthesize(
    req: SynthesizeRequest,
    authorization: str | None = Header(default=None)
):
    verify_auth(authorization)

    # Download reference speaker audio
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as ref_file:
        try:
            resp = requests.get(req.speaker_wav_url, timeout=30)
            resp.raise_for_status()
            ref_file.write(resp.content)
            ref_path = ref_file.name
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to download speaker WAV: {e}")

    try:
        if tts_model is not None:
            # ─── Real synthesis ───────────────────────────
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_file:
                tts_model.tts_to_file(
                    text=req.text,
                    language=req.language,
                    speaker_wav=ref_path,
                    file_path=out_file.name
                )
                audio = AudioSegment.from_wav(out_file.name)
        else:
            # ─── Demo mode: return 2s silence ────────────
            audio = AudioSegment.silent(duration=2000)

        # Export to WAV bytes
        buffer = io.BytesIO()
        audio.export(buffer, format="wav")
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"attachment; filename=chunk_{req.chunk_index}.wav",
                "X-Chunk-Index": str(req.chunk_index)
            }
        )
    finally:
        os.unlink(ref_path)
