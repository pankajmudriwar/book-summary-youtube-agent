// ─── Status & Stage Unions ───────────────────────────────────────────────────

export type BookStatus =
  | 'pending'
  | 'researching'
  | 'scripted'
  | 'voicing'
  | 'rendering'
  | 'uploading'
  | 'published'
  | 'failed';

export type PipelineStage =
  | 'cron'
  | 'research'
  | 'script'
  | 'voice'
  | 'captions'
  | 'render'
  | 'upload';

// ─── Database Table Interfaces ───────────────────────────────────────────────

export interface Book {
  id: string;
  book_title: string;
  author: string | null;
  language: string;
  cover_image_url: string | null;
  source_text: string | null;
  youtube_title: string | null;
  youtube_description: string | null;
  youtube_tags: string[] | null;
  script_marathi: string | null;
  audio_url: string | null;
  subtitle_url: string | null;
  video_url: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
  status: BookStatus;
  error_message: string | null;
  retry_count: number;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface AgentSettings {
  id: number;
  is_daily_automation_enabled: boolean;
  voice_sample_url: string | null;
  voice_clone_mode: 'external_api' | 'github_action_local';
  voice_clone_api_url: string | null;
  voice_clone_api_key: string | null;
  video_format: '16:9' | '9:16';
  youtube_privacy_status: 'public' | 'unlisted' | 'private';
  youtube_channel_name: string | null;
  youtube_refresh_token: string | null;
  updated_at: string;
}

export interface PipelineLog {
  id: string;
  book_id: string;
  stage: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalPublished: number;
  pendingCount: number;
  lastRunStatus: BookStatus | null;
  lastRunBookTitle: string | null;
  nextScheduledRun: string | null;
}

// ─── Script Generator Output ─────────────────────────────────────────────────

export interface GeneratedScript {
  youtube_title: string;
  youtube_description: string;
  youtube_tags: string[];
  script_marathi: string;
}
