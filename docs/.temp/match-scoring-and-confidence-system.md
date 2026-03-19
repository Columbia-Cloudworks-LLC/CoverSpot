# CoverSpot: Match Scoring & Confidence System Design

## Overview

CoverSpot's core challenge — retrieving variant versions (covers, acoustic, live) from YouTube and filtering noise — is a well-studied problem in Music Information Retrieval (MIR). The most effective approaches combine **multi-signal scoring** (title similarity, artist similarity, duration proximity, keyword classification) with a **confidence threshold gate** that powers transparent UI behavior. This document defines the architectural approach, signal design, and UX pattern for implementing this in CoverSpot.

***

## Why Raw Search Results Are Noisy

YouTube search returns results ranked by its own engagement-optimized algorithm (watch time, CTR, relevance to the platform's model), not by musical or compositional similarity. For a query like `"Hurt" Nine Inch Nails cover`, results can include reaction videos, tutorials, karaoke tracks, 10-hour extended loops, and completely unrelated videos that happen to contain those words. Simply taking the top N results produces high recall but catastrophically low precision.[1][2]

The `spotDL` project, which solves nearly the same problem (matching Spotify tracks to YouTube), explicitly abandoned "take the first result" in favor of a multi-signal scoring approach after finding it returned incorrect songs for a large fraction of queries. Their fix — `_find_best_match()` using fuzzy string comparison of title and artist — improved confidence discrimination to scores like 170.0 (correct match) vs 29.8 (incorrect) on test cases. That signal separation is the core insight to build on.[3]

Research from Hachmeier & Jäschke confirms that even well-constructed queries return sets where only a minority of videos are true version matches, and that the overlap between base and expanded queries makes deduplication and ranking essential.[4][5]

***

## The Multi-Signal Scoring Model

A robust match score for each YouTube result should be a **weighted composite** of independent signals. Each signal contributes a sub-score in `[0, 1]`, and the composite is the weighted average.

### Signal 1: Title Fuzzy Match

Compare the Spotify track title against the YouTube video title using `rapidfuzz`'s `token_ratio` function — the maximum of normalized Indel similarity and token set ratio. Academic evaluation of this method against a large cover song dataset achieved MAP of 0.75–0.90, making it the single most informative text signal.[6]

**Normalization steps before comparison:**
- Lowercase both strings
- Strip parenthetical suffixes that denote version type: `(Official Video)`, `(Lyric Video)`, `(Audio)`, `(HD)`, `(HQ)`
- Strip feat./ft. clauses from the candidate title
- Strip leading channel prefix patterns like `ArtistName - ` or `ArtistName: `

After normalization, compute `token_ratio(spotify_title, yt_title_normalized)` → `title_score ∈ [0, 1]`.

### Signal 2: Artist Fuzzy Match

The artist string is a strong secondary discriminator — research confirms that `artist+title` queries retrieve results with higher relevance than title-only queries (base query precision 0.83 vs 0.64). For each result, check whether the Spotify artist name appears in:[4]
1. The video title (after normalization)
2. The channel name

Assign `artist_score`:
- Artist found in video title: 1.0
- Artist found in channel name only: 0.7
- Partial fuzzy match (`token_ratio > 0.8`) in title: 0.5
- Not found: 0.0

### Signal 3: Duration Proximity

Duration is a powerful noise filter. Legitimate covers and live versions of a 3:30 track are generally within ±30–40%, while 10-hour loops, full albums, and compilations fall entirely outside this range. spotDL's issue tracker documents this as the primary source of junk downloads.[7]

```
duration_error = abs(yt_duration_sec - spotify_duration_sec) / spotify_duration_sec

if duration_error <= 0.15:   duration_score = 1.0
elif duration_error <= 0.35: duration_score = 1.0 - (duration_error - 0.15) / 0.20
elif duration_error <= 0.60: duration_score = 0.2
else:                        duration_score = 0.0  # hard reject
```

Live versions with extended outros/intros can run 20–40% longer, so a 60% ceiling before hard-reject accommodates most legitimate variants.

### Signal 4: Version Keyword Classification

Classify the version *type* from the YouTube title using a keyword taxonomy. This serves two purposes: (a) it boosts relevance score for results that explicitly signal they are versions, and (b) it enables the UI to label and categorize results.

**Keyword taxonomy (ordered by musical closeness):**

| Category | Keywords | Score Boost |
|----------|----------|-------------|
| `cover` | cover, covered by, rendition | +0.10 |
| `acoustic` | acoustic, unplugged | +0.10 |
| `live` | live, concert, live at, live from, tour | +0.08 |
| `instrumental` | instrumental, karaoke, backing track | +0.06 |
| `remix` | remix, remixed by, bootleg | +0.05 |
| `piano` / `guitar` | piano version, guitar cover | +0.05 |
| `noise` | reaction, tutorial, lesson, theory, 10 hour, 1 hour, full album | −0.20 |

The noise-class penalty acts as a soft filter without hard-rejection, so it can be overridden by strong title/artist scores.

Research on query expansion confirms that `cover`, `live`, `acoustic`, `instrumental`, and `piano` are among the highest-performing universal expansion terms for finding musically relevant version results on YouTube.[4]

### Signal 5: Upload Source Heuristic

Official channels (verified artist channels, VEVO, major label sub-channels) are more likely to be high-quality matches. Check if the channel name matches or closely fuzzy-matches the Spotify artist name → small bonus. User-uploaded channels get neutral treatment.

### Composite Score Formula

\[ \text{score} = w_1 \cdot \text{title} + w_2 \cdot \text{artist} + w_3 \cdot \text{duration} + w_4 \cdot \text{keyword\_boost} \]

**Recommended default weights:**

| Signal | Weight |
|--------|--------|
| Title match | 0.40 |
| Artist match | 0.25 |
| Duration proximity | 0.25 |
| Keyword boost | 0.10 |

These can be user-tunable in settings. The keyword boost is additive post-weighting (capped at 1.0 and floored at 0.0).

***

## Confidence Thresholds and UI Behavior

The score produces a continuous confidence value, but the UX needs discrete behavior. Research and production systems like the YouTube-to-Spotify Chrome extension use explicit confidence score display and manual selection fallback as the standard pattern.[8]

### Three-Tier Confidence Model

| Tier | Score Range | Behavior |
|------|------------|----------|
| **High Confidence** | ≥ 0.72 | Display results normally; sort by score descending |
| **Low Confidence** | 0.45 – 0.71 | Show results with a warning banner: *"Results may not match — review before using"*; include a "Show anyway" toggle already in the open state |
| **No Confidence** | < 0.45 | Show "No strong matches found" message; collapse results behind a "Show low-confidence results" disclosure button |

The threshold boundaries are starting points. Calibrate them empirically against a labeled test set of known good/bad results — `rapidfuzz` fuzzy matching on a large cover song dataset shows F1 peaks at particular distance thresholds that are dataset-dependent.[9][6]

### "Show Anyway" Pattern

The user should always be able to access raw results regardless of confidence. The pattern:
1. Display the confidence tier message
2. Provide a clearly labeled toggle/button: **"Show all results (low confidence)"**
3. When expanded, show all results with their individual scores displayed as a percentage badge (e.g. "62% match")
4. Allow the user to manually select/confirm a result, which can feed back into your system as a training signal

This pattern is implemented in the YouTube-to-Spotify extension as "Manual selection option when multiple matches are found".[8]

***

## Reducing Noise at the Query Level

Before results even arrive, the search query formulation affects what gets returned. Research on music version retrieval from YouTube demonstrates that **`artist + title` queries significantly outperform title-only queries** in retrieval precision.[5][4]

### Recommended Query Strategy

For each variant type the user requests, issue multiple targeted queries and merge/deduplicate results:

```
Base:     "{artist} {title}"
Cover:    "{artist} {title} cover"
Acoustic: "{artist} {title} acoustic"
Live:     "{artist} {title} live"
```

Research confirms that individual/specific expansions outperform generic universal ones, and base queries should be run first. Deduplication by `videoId` is necessary before scoring because a single video can appear in multiple result sets.[4]

Do **not** include expansion terms like `"official video"`, `"reaction"`, `"tutorial"`, or `"lyrics"` — these retrieve non-version content and reduce signal quality.[4]

### Duration Pre-Filter

Before fuzzy-scoring, apply a hard duration pre-filter: discard any result with duration > `spotify_duration * 3.0` or < `spotify_duration * 0.4`. This eliminates 10-hour loops and 30-second clips before computation, reducing noise significantly.[1][7]

***

## Implementation Architecture

### Scoring Pipeline

```javascript
// Pseudocode — adapt to your stack
function scoreResult(spotifyTrack, ytResult) {
  const normalizedYtTitle = normalize(ytResult.title);
  const normalizedSpTitle = normalize(spotifyTrack.title);

  const titleScore = tokenRatio(normalizedSpTitle, normalizedYtTitle);
  const artistScore = computeArtistScore(spotifyTrack.artist, ytResult);
  const durationScore = computeDurationScore(spotifyTrack.duration, ytResult.duration);
  const { keywordBoost, versionType } = classifyVersion(ytResult.title);

  const composite = (
    0.40 * titleScore +
    0.25 * artistScore +
    0.25 * durationScore +
    0.10 * keywordBoost
  );

  return {
    score: Math.min(1.0, Math.max(0.0, composite)),
    versionType,      // "cover" | "acoustic" | "live" | "remix" | "unknown"
    signals: { titleScore, artistScore, durationScore, keywordBoost }
  };
}
```

### Confidence Gate Component

```javascript
function getConfidenceTier(score) {
  if (score >= 0.72) return 'high';
  if (score >= 0.45) return 'low';
  return 'none';
}

// In your results component:
const topScore = results[0]?.score ?? 0;
const tier = getConfidenceTier(topScore);

// Render:
// tier === 'high'  → show results normally
// tier === 'low'   → show with warning + "show anyway" (auto-expanded)
// tier === 'none'  → show "No strong matches" + collapsed disclosure
```

### rapidfuzz for JavaScript/Node

The `rapidfuzz` library (referenced in the academic ER research) has a JavaScript port `@napi-rs/fast-fuzzy` or you can use `fuse.js` with `threshold: 0.2` for approximate matching. For Python backends, `rapidfuzz`'s `token_ratio` is the recommended function.[9][6]

***

## Handling Known Hard Cases

| Scenario | Problem | Mitigation |
|----------|---------|------------|
| One-word song titles (e.g., "Hush", "Time") | Title appears in unrelated video titles | Artist match weight compensates; keyword noise penalty applies |
| Translated song titles | Fuzzy match fails on different words | Consider a translation pre-check via a title alias lookup |
| Artist name in video title as part of a tribute/medley | High false positive | Duration check + keyword scan for "medley", "tribute" → score cap |
| User-uploaded cover with no artist mention | Artist score = 0 | Title + duration can still achieve ~0.65 if both match well |
| Acoustic/piano versions (shorter or same duration) | Duration near-match, but very different character | Duration score handles this correctly; version type label informs user |

Academic research on "hard negatives" — cases where a one-word song title appears in a completely different video context (e.g., "Relaxing Hush Sounds") — shows that even S-BERT models achieve only MAP 0.53 on these cases, so the system should be explicit with users when confidence is low rather than attempting to silently resolve ambiguity.[6]

***

## Calibration and Feedback Loop

The confidence thresholds (0.72 / 0.45) and signal weights should be treated as **configurable hyperparameters**, not hardcoded constants. A small labeled dataset of 50–100 known good/bad matches for a variety of artists and song types lets you measure precision/recall at each threshold boundary and tune accordingly.[10][11]

The "manual selection" UI pattern also creates an opportunity for implicit feedback: when a user chooses a result ranked #3 over the top-ranked result, log that event. Over time this surfaces systematic failures in the weighting model for specific edge cases (e.g., classical piano covers being systematically under-ranked).
