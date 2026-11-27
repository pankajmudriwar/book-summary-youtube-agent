import type { AgentSettings } from "./types";

export interface ReadinessCheckResult {
  isReady: boolean;
  missing: string[];
  missingRequirements: string[];
  details: {
    gemini: boolean;
    github: boolean;
    voiceSample: boolean;
    voiceApi: boolean;
    youtube: boolean;
    cronEnabled: boolean;
  };
  checks: {
    geminiKey: boolean;
    githubConfig: boolean;
    voiceSample: boolean;
    youtubeConnected: boolean;
    externalVoiceApi: boolean;
    cronEnabled: boolean;
  };
}

export function checkSystemReadiness(settings: AgentSettings | null): ReadinessCheckResult {
  const missing: string[] = [];

  const gemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  if (!gemini) {
    missing.push("GEMINI_API_KEY environment variable is not configured");
  }

  const github = Boolean(
    (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) ||
    (process.env.GH_TOKEN && process.env.GH_TOKEN.trim())
  );
  if (!github) {
    missing.push("GITHUB_TOKEN environment variable is not configured");
  }

  const voiceSample = Boolean(settings?.voice_sample_url && settings.voice_sample_url.trim());
  if (!voiceSample) {
    missing.push("Voice sample audio has not been uploaded in Settings");
  }

  let voiceApi = true;
  if (settings?.voice_clone_mode === "external_api") {
    voiceApi = Boolean(settings.voice_clone_api_url && settings.voice_clone_api_url.trim());
    if (!voiceApi) {
      missing.push("External Voice Clone API URL is required when voice clone mode is set to 'external_api'");
    }
  }

  const youtube = Boolean(settings?.youtube_refresh_token && settings.youtube_refresh_token.trim());
  if (!youtube) {
    missing.push("YouTube channel is not connected in Settings");
  }

  const cronEnabled = Boolean(settings?.is_daily_automation_enabled);

  return {
    isReady: missing.length === 0,
    missing,
    missingRequirements: missing,
    details: {
      gemini,
      github,
      voiceSample,
      voiceApi,
      youtube,
      cronEnabled,
    },
    checks: {
      geminiKey: gemini,
      githubConfig: github,
      voiceSample,
      youtubeConnected: youtube,
      externalVoiceApi: voiceApi,
      cronEnabled,
    },
  };
}
