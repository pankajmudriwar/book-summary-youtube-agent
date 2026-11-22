-- ============================================================
-- Marathi Book-Summary YouTube Agent — Initial Schema
-- ============================================================

-- Table 1: books_queue
CREATE TABLE IF NOT EXISTS books_queue (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_title          text        NOT NULL,
  author              text,
  language            text        NOT NULL DEFAULT 'Marathi',
  cover_image_url     text,
  source_text         text,
  youtube_title       text,
  youtube_description text,
  youtube_tags        text[],
  script_marathi      text,
  audio_url           text,
  subtitle_url        text,
  video_url           text,
  youtube_video_id    text,
  youtube_url         text,
  status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending','researching','scripted','voicing',
                          'rendering','uploading','published','failed'
                        )),
  error_message       text,
  retry_count         integer     NOT NULL DEFAULT 0,
  scheduled_for       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  published_at        timestamptz
);

-- Table 2: agent_settings (single-row config, id = 1)
CREATE TABLE IF NOT EXISTS agent_settings (
  id                          integer     PRIMARY KEY DEFAULT 1,
  is_daily_automation_enabled boolean     NOT NULL DEFAULT true,
  voice_sample_url            text,
  voice_clone_mode            text        NOT NULL DEFAULT 'external_api'
                                CHECK (voice_clone_mode IN ('external_api','github_action_local')),
  voice_clone_api_url         text,
  voice_clone_api_key         text,
  video_format                text        NOT NULL DEFAULT '16:9'
                                CHECK (video_format IN ('16:9','9:16')),
  youtube_privacy_status      text        NOT NULL DEFAULT 'private'
                                CHECK (youtube_privacy_status IN ('public','unlisted','private')),
  youtube_channel_name        text,
  youtube_refresh_token       text,
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Seed the single settings row
INSERT INTO agent_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Table 3: pipeline_logs
CREATE TABLE IF NOT EXISTS pipeline_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     uuid        REFERENCES books_queue(id) ON DELETE CASCADE,
  stage       text        NOT NULL
                CHECK (stage IN ('cron','research','script','voice','captions','render','upload')),
  level       text        NOT NULL DEFAULT 'info'
                CHECK (level IN ('info','warning','error')),
  status      text,
  message     text        NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for queue polling (oldest pending first)
CREATE INDEX IF NOT EXISTS idx_books_queue_status_created
  ON books_queue (status, created_at ASC);

-- Index for pipeline logs lookup
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_book_id
  ON pipeline_logs (book_id, created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_books_queue_updated_at
  BEFORE UPDATE ON books_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agent_settings_updated_at
  BEFORE UPDATE ON agent_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Storage bucket: agent-media
-- Run via Supabase Dashboard > Storage or supabase CLI:
--   supabase storage create agent-media --public
-- ============================================================
