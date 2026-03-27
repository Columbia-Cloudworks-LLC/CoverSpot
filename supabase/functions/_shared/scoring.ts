import type { ScoringWeights, ScoringThresholds } from "./config.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoringInput {
  spotifyTitle: string;
  spotifyArtist: string;
  spotifyDurationMs: number;
  candidateTitle: string;
  candidateChannel: string;
  candidateDurationMs: number | null;
}

export interface ScoringResult {
  score: number;
  confidenceTier: "high" | "low" | "none";
  signals: {
    title: number;
    artist: number;
    duration: number;
    keyword: number;
  };
  versionType: string | null;
  hardRejected: boolean;
  hardRejectReason: string | null;
}

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

const STRIP_PATTERNS = [
  /\(official\s*(music\s*)?video\)/i,
  /\(lyric\s*video\)/i,
  /\(audio\)/i,
  /\(visuali[sz]er\)/i,
  /\(hd\)/i,
  /\(hq\)/i,
  /\[official\s*(music\s*)?video\]/i,
  /\[lyric\s*video\]/i,
  /\[audio\]/i,
  /\[hd\]/i,
  /\[hq\]/i,
  /\bfeat\.?\s+[^()[\]]+/i,
  /\bft\.?\s+[^()[\]]+/i,
];

/** Patterns + whitespace only — no dash split (used for Spotify side and dedup keys). */
function normalizeTitleBase(raw: string): string {
  let t = raw.toLowerCase().trim();
  for (const pat of STRIP_PATTERNS) {
    t = t.replace(pat, "");
  }
  return t.replace(/\s+/g, " ").trim();
}

/** True when the substring before "-" / ":" in a YouTube-style title is the song title, not a channel name. */
function leftSegmentAlignsWithSpotifyTitle(
  leftNorm: string,
  spotifyTitleNorm: string
): boolean {
  const spotifyTokens = new Set(tokenize(spotifyTitleNorm));
  const leftTokens = tokenize(leftNorm);
  if (leftTokens.length === 0) return false;

  let shared = 0;
  for (const tok of leftTokens) {
    if (spotifyTokens.has(tok)) shared++;
  }
  const overlapRatio = shared / leftTokens.length;

  return (
    overlapRatio >= 0.5 ||
    leftNorm === spotifyTitleNorm ||
    spotifyTitleNorm.includes(leftNorm) ||
    leftNorm.includes(spotifyTitleNorm)
  );
}

/**
 * If candidate looks like "Channel - Song" (left segment does not match the reference track title),
 * keep only the right segment. If left matches the track (e.g. "Hurt - Cover" vs Spotify "Hurt"),
 * keep the full string — title score also uses {@link leftSegmentAlignsWithSpotifyTitle} for an anchor match.
 */
function stripLeadingChannelPrefixIfDifferentFromTrack(
  candidateNorm: string,
  spotifyTitleNorm: string
): string {
  const m = candidateNorm.match(/^([^-:]+)\s*[-:]\s+(.+)$/);
  if (!m) return candidateNorm;
  const left = m[1].trim();
  const right = m[2].trim();
  if (!left || !right) return candidateNorm;

  if (leftSegmentAlignsWithSpotifyTitle(left, spotifyTitleNorm)) {
    return candidateNorm;
  }
  return right;
}

// ---------------------------------------------------------------------------
// Token-ratio using sorted-word intersection (no external dependency)
// ---------------------------------------------------------------------------

function tokenize(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array<number>(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - levenshtein(a, b) / maxLen;
}

/**
 * Token-ratio: max of (simple ratio of sorted-token-joined strings,
 * intersection-based partial match).
 */
function tokenRatio(a: string, b: string): number {
  const tokA = tokenize(a).sort();
  const tokB = tokenize(b).sort();

  const sortedA = tokA.join(" ");
  const sortedB = tokB.join(" ");
  const sortedSim = stringSimilarity(sortedA, sortedB);

  // Intersection-based: shared tokens / max token count
  const setA = new Set(tokA);
  const setB = new Set(tokB);
  let shared = 0;
  for (const t of setA) {
    if (setB.has(t)) shared++;
  }
  const intersectionSim = shared / Math.max(setA.size, setB.size, 1);

  return Math.max(sortedSim, intersectionSim);
}

// ---------------------------------------------------------------------------
// Signal 1: Title fuzzy match
// ---------------------------------------------------------------------------

export function computeTitleScore(spotifyTitle: string, candidateTitle: string): number {
  const a = normalizeTitleBase(spotifyTitle);
  const candidateBase = normalizeTitleBase(candidateTitle);
  const b = stripLeadingChannelPrefixIfDifferentFromTrack(candidateBase, a);

  let anchorScore = 0;
  const split = candidateBase.match(/^([^-:]+)\s*[-:]\s+(.+)$/);
  if (split) {
    const left = split[1].trim();
    if (left && leftSegmentAlignsWithSpotifyTitle(left, a)) {
      anchorScore = tokenRatio(a, left);
    }
  }

  return Math.max(tokenRatio(a, b), anchorScore);
}

// ---------------------------------------------------------------------------
// Signal 2: Artist fuzzy match
// ---------------------------------------------------------------------------

export function computeArtistScore(
  spotifyArtist: string,
  candidateTitle: string,
  channelName: string
): number {
  const artist = spotifyArtist.toLowerCase().trim();
  const title = candidateTitle.toLowerCase();
  const channel = channelName.toLowerCase().trim();

  if (title.includes(artist)) return 1.0;
  if (channel.includes(artist) || artist.includes(channel)) return 0.7;

  const titleSim = tokenRatio(artist, title);
  if (titleSim > 0.8) return 0.5;

  const channelSim = tokenRatio(artist, channel);
  if (channelSim > 0.8) return 0.4;

  return 0.0;
}

// ---------------------------------------------------------------------------
// Signal 3: Duration proximity
// ---------------------------------------------------------------------------

export function computeDurationScore(
  spotifyDurationMs: number,
  candidateDurationMs: number | null,
  maxRatio: number,
  minRatio: number
): { score: number; hardRejected: boolean } {
  if (!candidateDurationMs || candidateDurationMs <= 0 || spotifyDurationMs <= 0) {
    return { score: 0.5, hardRejected: false };
  }

  const ratio = candidateDurationMs / spotifyDurationMs;
  if (ratio > maxRatio || ratio < minRatio) {
    return { score: 0.0, hardRejected: true };
  }

  const error = Math.abs(candidateDurationMs - spotifyDurationMs) / spotifyDurationMs;
  if (error <= 0.15) return { score: 1.0, hardRejected: false };
  // Linear decay from 1.0 at 15% error down to 0.2 at 35%, then flat 0.2 until 60% (monotonic)
  if (error <= 0.35) {
    return {
      score: 1.0 - ((error - 0.15) / 0.2) * 0.8,
      hardRejected: false,
    };
  }
  if (error <= 0.60) return { score: 0.2, hardRejected: false };
  return { score: 0.0, hardRejected: false };
}

// ---------------------------------------------------------------------------
// Signal 4: Version keyword classification
// ---------------------------------------------------------------------------

const KEYWORD_RULES: Array<{ keywords: string[]; type: string; boost: number }> = [
  { keywords: ["cover", "covered by", "rendition"], type: "cover", boost: 0.10 },
  { keywords: ["acoustic", "unplugged"], type: "acoustic", boost: 0.10 },
  { keywords: ["live", "concert", "live at", "live from", "tour"], type: "live", boost: 0.08 },
  { keywords: ["instrumental", "karaoke", "backing track"], type: "instrumental", boost: 0.06 },
  { keywords: ["remix", "remixed by", "bootleg"], type: "remix", boost: 0.05 },
  { keywords: ["piano version", "piano cover", "guitar cover"], type: "arrangement", boost: 0.05 },
];

const NOISE_KEYWORDS = [
  "reaction", "tutorial", "lesson", "theory",
  "10 hour", "1 hour", "full album", "compilation",
];

export function classifyVersionKeywords(title: string): { boost: number; versionType: string | null } {
  const lower = title.toLowerCase();

  for (const noise of NOISE_KEYWORDS) {
    if (lower.includes(noise)) {
      return { boost: -0.20, versionType: null };
    }
  }

  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        return { boost: rule.boost, versionType: rule.type };
      }
    }
  }

  return { boost: 0.0, versionType: null };
}

// ---------------------------------------------------------------------------
// Composite scoring
// ---------------------------------------------------------------------------

export function scoreVariant(
  input: ScoringInput,
  weights: ScoringWeights,
  maxRatio: number,
  minRatio: number,
  thresholds: ScoringThresholds
): ScoringResult {
  const titleScore = computeTitleScore(input.spotifyTitle, input.candidateTitle);
  const artistScore = computeArtistScore(
    input.spotifyArtist,
    input.candidateTitle,
    input.candidateChannel
  );
  const { score: durationScore, hardRejected: durationHardReject } = computeDurationScore(
    input.spotifyDurationMs,
    input.candidateDurationMs,
    maxRatio,
    minRatio
  );
  const { boost: keywordBoost, versionType } = classifyVersionKeywords(input.candidateTitle);

  let composite =
    weights.title * titleScore +
    weights.artist * artistScore +
    weights.duration * durationScore +
    weights.keyword * Math.max(0, keywordBoost);

  // Apply noise penalty additively (unclamped by weight)
  if (keywordBoost < 0) {
    composite += keywordBoost;
  }

  const score = Math.min(1.0, Math.max(0.0, composite));
  const hardRejected = durationHardReject;
  const hardRejectReason = durationHardReject ? "Duration far outside expected range" : null;

  return {
    score,
    confidenceTier: getConfidenceTier(score, thresholds),
    signals: {
      title: titleScore,
      artist: artistScore,
      duration: durationScore,
      keyword: keywordBoost,
    },
    versionType,
    hardRejected,
    hardRejectReason,
  };
}

// ---------------------------------------------------------------------------
// Confidence tier
// ---------------------------------------------------------------------------

export function getConfidenceTier(
  score: number,
  thresholds: ScoringThresholds
): "high" | "low" | "none" {
  if (score >= thresholds.high) return "high";
  if (score >= thresholds.low) return "low";
  return "none";
}

// ---------------------------------------------------------------------------
// Freshness decay for cached results
// ---------------------------------------------------------------------------

export function applyFreshnessDecay(
  relevanceScore: number,
  discoveredAt: string,
  ttlHours: number
): number {
  const ageMs = Date.now() - new Date(discoveredAt).getTime();
  const ageHours = ageMs / 3_600_000;
  const decay = Math.max(0.8, 1.0 - ageHours / (ttlHours * 2));
  return relevanceScore * decay;
}

// ---------------------------------------------------------------------------
// Cross-platform deduplication key
// ---------------------------------------------------------------------------

export function deduplicationKey(title: string, artist: string): string {
  return `${normalizeTitleBase(title)}::${artist.toLowerCase().trim()}`;
}
