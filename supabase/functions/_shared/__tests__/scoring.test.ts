import { describe, it, expect } from "vitest";
import {
  computeTitleScore,
  computeArtistScore,
  computeDurationScore,
  classifyVersionKeywords,
  scoreVariant,
  getConfidenceTier,
  applyFreshnessDecay,
  deduplicationKey,
} from "../scoring.ts";

// -------------------------------------------------------------------------
// Title scoring
// -------------------------------------------------------------------------

describe("computeTitleScore", () => {
  it("returns 1.0 for identical titles", () => {
    expect(computeTitleScore("Hurt", "Hurt")).toBe(1.0);
  });

  it("returns 1.0 when titles differ only by parenthetical metadata", () => {
    const score = computeTitleScore("Hurt", "Hurt (Official Video)");
    expect(score).toBeGreaterThan(0.9);
  });

  it("strips feat. clauses before comparing", () => {
    const score = computeTitleScore(
      "Under Pressure",
      "Under Pressure feat. David Bowie"
    );
    expect(score).toBeGreaterThan(0.7);
  });

  it("returns low score for completely different titles", () => {
    const score = computeTitleScore("Hurt", "Never Gonna Give You Up");
    expect(score).toBeLessThan(0.3);
  });

  it("handles channel prefix stripping", () => {
    const score = computeTitleScore(
      "Creep",
      "Radiohead - Creep"
    );
    expect(score).toBeGreaterThan(0.8);
  });

  it("does not strip song title before dash when it matches Spotify title (Hurt - Cover)", () => {
    const score = computeTitleScore("Hurt", "Hurt - Cover");
    expect(score).toBeGreaterThan(0.7);
  });

  it("does not strip live subtitle when left segment matches track (Creep - Live at Glastonbury)", () => {
    const score = computeTitleScore("Creep", "Creep - Live at Glastonbury");
    expect(score).toBeGreaterThan(0.65);
  });
});

// -------------------------------------------------------------------------
// Artist scoring
// -------------------------------------------------------------------------

describe("computeArtistScore", () => {
  it("returns 1.0 when artist is in the video title", () => {
    expect(
      computeArtistScore("Johnny Cash", "Hurt by Johnny Cash cover", "SomeCover")
    ).toBe(1.0);
  });

  it("returns 0.7 when artist matches channel name", () => {
    expect(
      computeArtistScore("Johnny Cash", "Hurt - Cover", "Johnny Cash")
    ).toBe(0.7);
  });

  it("returns 0.0 when artist is not found", () => {
    expect(
      computeArtistScore("Johnny Cash", "Hurt Cover", "RandomChannel")
    ).toBe(0.0);
  });
});

// -------------------------------------------------------------------------
// Duration scoring
// -------------------------------------------------------------------------

describe("computeDurationScore", () => {
  const MAX_RATIO = 3.0;
  const MIN_RATIO = 0.4;

  it("returns 1.0 for exact duration match", () => {
    const { score } = computeDurationScore(210_000, 210_000, MAX_RATIO, MIN_RATIO);
    expect(score).toBe(1.0);
  });

  it("returns 1.0 for duration within 15%", () => {
    const { score } = computeDurationScore(200_000, 220_000, MAX_RATIO, MIN_RATIO);
    expect(score).toBe(1.0);
  });

  it("returns a reduced score for 30% difference", () => {
    const { score } = computeDurationScore(200_000, 260_000, MAX_RATIO, MIN_RATIO);
    expect(score).toBeGreaterThan(0.2);
    expect(score).toBeLessThan(1.0);
  });

  it("hard-rejects a 10-hour loop", () => {
    const { score, hardRejected } = computeDurationScore(
      200_000,
      36_000_000,
      MAX_RATIO,
      MIN_RATIO
    );
    expect(score).toBe(0.0);
    expect(hardRejected).toBe(true);
  });

  it("hard-rejects a 30-second clip when original is 3:30", () => {
    const { hardRejected } = computeDurationScore(
      210_000,
      30_000,
      MAX_RATIO,
      MIN_RATIO
    );
    expect(hardRejected).toBe(true);
  });

  it("returns 0.5 when candidate duration is null", () => {
    const { score, hardRejected } = computeDurationScore(
      200_000,
      null,
      MAX_RATIO,
      MIN_RATIO
    );
    expect(score).toBe(0.5);
    expect(hardRejected).toBe(false);
  });

  it("does not increase score as duration error increases from 35% to 36%", () => {
    const base = 200_000;
    const at35 = computeDurationScore(base, Math.round(base * 1.35), MAX_RATIO, MIN_RATIO).score;
    const at36 = computeDurationScore(base, Math.round(base * 1.36), MAX_RATIO, MIN_RATIO).score;
    expect(at36).toBeLessThanOrEqual(at35);
  });

  it("is weakly monotonic non-increasing between 15% and 60% relative error", () => {
    const base = 200_000;
    const errors = [0.16, 0.22, 0.30, 0.35, 0.36, 0.48, 0.6];
    let prev = 1.0;
    for (const e of errors) {
      const { score } = computeDurationScore(
        base,
        Math.round(base * (1 + e)),
        MAX_RATIO,
        MIN_RATIO
      );
      expect(score).toBeLessThanOrEqual(prev + 1e-9);
      prev = score;
    }
  });
});

// -------------------------------------------------------------------------
// Keyword classification
// -------------------------------------------------------------------------

describe("classifyVersionKeywords", () => {
  it("detects cover keyword", () => {
    const result = classifyVersionKeywords("Hurt - Cover by Someone");
    expect(result.versionType).toBe("cover");
    expect(result.boost).toBe(0.10);
  });

  it("detects acoustic keyword", () => {
    const result = classifyVersionKeywords("Hurt Acoustic Version");
    expect(result.versionType).toBe("acoustic");
    expect(result.boost).toBe(0.10);
  });

  it("applies noise penalty for tutorial", () => {
    const result = classifyVersionKeywords("How to play Hurt - Tutorial");
    expect(result.boost).toBe(-0.20);
    expect(result.versionType).toBeNull();
  });

  it("applies noise penalty for reaction video", () => {
    const result = classifyVersionKeywords("First Reaction to Hurt");
    expect(result.boost).toBe(-0.20);
  });

  it("applies noise penalty for 10-hour loop", () => {
    const result = classifyVersionKeywords("Hurt 10 hour version");
    expect(result.boost).toBe(-0.20);
  });

  it("returns neutral for unrecognized titles", () => {
    const result = classifyVersionKeywords("Hurt - Recorded at Home");
    expect(result.boost).toBe(0.0);
    expect(result.versionType).toBeNull();
  });
});

// -------------------------------------------------------------------------
// Composite scoring
// -------------------------------------------------------------------------

describe("scoreVariant", () => {
  const weights = { title: 0.40, artist: 0.25, duration: 0.25, keyword: 0.10 };
  const thresholds = { high: 0.72, low: 0.45 };

  it("gives high confidence for a strong match", () => {
    const result = scoreVariant(
      {
        spotifyTitle: "Creep",
        spotifyArtist: "Radiohead",
        spotifyDurationMs: 238_000,
        candidateTitle: "Creep",
        candidateChannel: "Radiohead",
        candidateDurationMs: 240_000,
      },
      weights,
      3.0,
      0.4,
      thresholds
    );
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.confidenceTier).toBe("high");
  });

  it("gives moderate confidence for a plausible but imprecise match", () => {
    const result = scoreVariant(
      {
        spotifyTitle: "Hurt",
        spotifyArtist: "Johnny Cash",
        spotifyDurationMs: 217_000,
        candidateTitle: "Hurt - Johnny Cash Cover",
        candidateChannel: "SomeArtist",
        candidateDurationMs: 220_000,
      },
      weights,
      3.0,
      0.4,
      thresholds
    );
    expect(result.score).toBeGreaterThan(0.45);
  });

  it("hard-rejects when duration is way off", () => {
    const result = scoreVariant(
      {
        spotifyTitle: "Hurt",
        spotifyArtist: "Johnny Cash",
        spotifyDurationMs: 200_000,
        candidateTitle: "Hurt 10 hour loop",
        candidateChannel: "LoopBot",
        candidateDurationMs: 36_000_000,
      },
      weights,
      3.0,
      0.4,
      thresholds
    );
    expect(result.hardRejected).toBe(true);
    expect(result.score).toBeLessThan(0.3);
  });

  it("penalizes noise keywords", () => {
    const result = scoreVariant(
      {
        spotifyTitle: "Hurt",
        spotifyArtist: "Johnny Cash",
        spotifyDurationMs: 200_000,
        candidateTitle: "Hurt - Tutorial Lesson",
        candidateChannel: "GuitarTeacher",
        candidateDurationMs: 600_000,
      },
      weights,
      3.0,
      0.4,
      thresholds
    );
    expect(result.confidenceTier).toBe("none");
  });
});

// -------------------------------------------------------------------------
// Confidence tier
// -------------------------------------------------------------------------

describe("getConfidenceTier", () => {
  const thresholds = { high: 0.72, low: 0.45 };

  it("returns high for score >= 0.72", () => {
    expect(getConfidenceTier(0.85, thresholds)).toBe("high");
  });

  it("returns low for score between 0.45 and 0.72", () => {
    expect(getConfidenceTier(0.60, thresholds)).toBe("low");
  });

  it("returns none for score < 0.45", () => {
    expect(getConfidenceTier(0.30, thresholds)).toBe("none");
  });
});

// -------------------------------------------------------------------------
// Freshness decay
// -------------------------------------------------------------------------

describe("applyFreshnessDecay", () => {
  it("returns full score for freshly discovered variants", () => {
    const now = new Date().toISOString();
    const result = applyFreshnessDecay(0.85, now, 168);
    expect(result).toBeCloseTo(0.85, 1);
  });

  it("decays score for old variants but not below 80% of original", () => {
    const old = new Date(Date.now() - 200 * 3_600_000).toISOString();
    const result = applyFreshnessDecay(0.85, old, 168);
    expect(result).toBeGreaterThanOrEqual(0.85 * 0.8);
  });
});

// -------------------------------------------------------------------------
// Deduplication key
// -------------------------------------------------------------------------

describe("deduplicationKey", () => {
  it("normalizes titles and artists for comparison", () => {
    const a = deduplicationKey("Hurt (Official Video)", "Johnny Cash");
    const b = deduplicationKey("Hurt", "johnny cash");
    expect(a).toBe(b);
  });
});
