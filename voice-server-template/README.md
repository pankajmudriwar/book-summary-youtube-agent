# Voice Cloning Server Template

A ready-to-run FastAPI server that wraps any GitHub voice-cloning model behind a simple REST API, compatible with the Marathi Book-Summary YouTube Agent.

## Supported Models
- **Coqui XTTS-v2** (default) — multilingual, good Marathi support
- **F5-TTS** — high quality, requires separate setup
- **Indic-F5** — optimized for Indian languages
- Any custom model that can synthesize from text + reference audio

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) Set API key for authentication
export VOICE_API_KEY="your-secret-key"

# 4. Start the server
uvicorn server:app --host 0.0.0.0 --port 8000
```

## API Contract

### `POST /synthesize`
Synthesizes speech from text using a reference voice sample.

**Request Body:**
```json
{
  "text": "मराठी text to synthesize",
  "language": "mr",
  "speaker_wav_url": "https://your-supabase.co/storage/v1/object/public/agent-media/voice-samples/reference.wav",
  "chunk_index": 0
}
```

**Headers:**
- `Authorization: Bearer <api-key>` (if `VOICE_API_KEY` is set)

**Response:** `audio/wav` binary stream

### `GET /health`
Returns server and model status.

## Customizing for Your Model

Edit the `load_model()` function in `server.py` to initialize your chosen voice-cloning model. The key requirement is a function that takes `(text, language, speaker_wav_path)` and produces a WAV audio file.

## Deployment Options
1. **GPU VM** (recommended): Deploy on a cloud GPU instance for real-time synthesis
2. **RunPod / Vast.ai**: Serverless GPU deployment
3. **Colab + ngrok**: Free tier testing (not recommended for production)
