import { createAdminClient } from "./supabase-admin.ts";

export interface ScoringWeights {
  title: number;
  artist: number;
  duration: number;
  keyword: number;
}

export interface ScoringThresholds {
  high: number;
  low: number;
}

export interface AppConfig {
  scoringWeights: ScoringWeights;
  scoringThresholds: ScoringThresholds;
  durationMaxRatio: number;
  durationMinRatio: number;
  flagThreshold: number;
  rateLimitPerHour: number;
  variantTtlHours: number;
}

const DEFAULT_CONFIG: AppConfig = {
  scoringWeights: { title: 0.40, artist: 0.25, duration: 0.25, keyword: 0.10 },
  scoringThresholds: { high: 0.72, low: 0.45 },
  durationMaxRatio: 3.0,
  durationMinRatio: 0.4,
  flagThreshold: 3,
  rateLimitPerHour: 10,
  variantTtlHours: 168,
};

let cachedConfig: AppConfig | null = null;

export async function loadConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_config")
      .select("key, value");

    if (error || !data || data.length === 0) {
      cachedConfig = DEFAULT_CONFIG;
      return cachedConfig;
    }

    const map = new Map<string, unknown>();
    for (const row of data) {
      map.set(row.key, row.value);
    }

    cachedConfig = {
      scoringWeights: (map.get("scoring.weights") as ScoringWeights) ?? DEFAULT_CONFIG.scoringWeights,
      scoringThresholds: (map.get("scoring.thresholds") as ScoringThresholds) ?? DEFAULT_CONFIG.scoringThresholds,
      durationMaxRatio: Number(map.get("scoring.duration_max_ratio") ?? DEFAULT_CONFIG.durationMaxRatio),
      durationMinRatio: Number(map.get("scoring.duration_min_ratio") ?? DEFAULT_CONFIG.durationMinRatio),
      flagThreshold: Number(map.get("moderation.flag_threshold") ?? DEFAULT_CONFIG.flagThreshold),
      rateLimitPerHour: Number(map.get("moderation.rate_limit_per_hour") ?? DEFAULT_CONFIG.rateLimitPerHour),
      variantTtlHours: Number(map.get("cache.variant_ttl_hours") ?? DEFAULT_CONFIG.variantTtlHours),
    };
  } catch {
    cachedConfig = DEFAULT_CONFIG;
  }

  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}
