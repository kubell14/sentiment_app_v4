"""Sentiment and scoring utilities for the Avant competitor sentiment app.

Text sentiment is computed with VADER (vaderSentiment) when available in the
Databricks ML Runtime. If the library is missing, the module transparently
falls back to the legacy hand-rolled lexicon scorer so imports never break.
"""
from __future__ import annotations

import re
from typing import Dict

# POSITIVE_TERMS / NEGATIVE_TERMS / NEGATIONS / INTENSIFIERS are retained only
# for the legacy lexicon fallback and as reference vocab for the emotion
# detector below. They are no longer the primary text sentiment source.
POSITIVE_TERMS = {
    "excellent": 1.0,
    "great": 0.9,
    "good": 0.7,
    "helpful": 0.7,
    "fast": 0.6,
    "quick": 0.6,
    "smooth": 0.6,
    "easy": 0.6,
    "resolved": 0.8,
    "professional": 0.7,
    "friendly": 0.7,
    "love": 1.0,
    "satisfied": 0.8,
    "recommend": 0.9,
    "transparent": 0.7,
    "fair": 0.6,
}

NEGATIVE_TERMS = {
    "terrible": -1.0,
    "awful": -1.0,
    "bad": -0.7,
    "poor": -0.7,
    "rude": -0.9,
    "unhelpful": -0.8,
    "frustrating": -0.9,
    "frustrated": -0.9,
    "scam": -1.0,
    "hidden": -0.6,
    "harassment": -1.0,
    "declined": -0.5,
    "denied": -0.6,
    "late": -0.5,
    "broken": -0.8,
    "cancel": -0.6,
    "angry": -0.9,
    "confusing": -0.6,
    "overcharged": -0.9,
    "misleading": -0.8,
}

NEGATIONS = {"not", "never", "no", "without", "hardly", "barely", "isn't", "wasn't", "don't", "didn't", "can't"}
INTENSIFIERS = {"very": 1.25, "extremely": 1.4, "really": 1.2, "super": 1.3, "highly": 1.25, "too": 1.2}


def normalize_sentiment(raw_score: float) -> float:
    """Normalize model sentiment from [-1,1] to [0,100]."""
    clipped = max(-1.0, min(1.0, raw_score))
    return round((clipped + 1) * 50, 2)


try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

    _VADER_ANALYZER = SentimentIntensityAnalyzer()
    _HAS_VADER = True
except Exception:  # pragma: no cover - exercised only when vaderSentiment is absent
    _VADER_ANALYZER = None
    _HAS_VADER = False


def _lexicon_sentiment_raw(text: str | None) -> float:
    """Legacy lexicon heuristic on [-1, 1]. Fallback when VADER is unavailable."""
    if not text:
        return 0.0

    tokens = re.findall(r"[a-z']+", text.lower())
    if not tokens:
        return 0.0

    total = 0.0
    hit_count = 0
    for idx, token in enumerate(tokens):
        base = 0.0
        if token in POSITIVE_TERMS:
            base = POSITIVE_TERMS[token]
        elif token in NEGATIVE_TERMS:
            base = NEGATIVE_TERMS[token]

        if base == 0.0:
            continue

        lookback = tokens[max(0, idx - 2):idx]
        if any(word in NEGATIONS for word in lookback):
            base = -base
        for word in lookback:
            if word in INTENSIFIERS:
                base *= INTENSIFIERS[word]

        total += base
        hit_count += 1

    if hit_count == 0:
        return 0.0

    return max(-1.0, min(1.0, total / hit_count))


def text_sentiment_raw(text: str | None) -> float:
    """Estimate sentiment from review text on [-1, 1] using VADER.

    Returns VADER's `compound` score (already in [-1, 1]). Falls back to the
    legacy lexicon scorer if vaderSentiment is unavailable.
    """
    if not text:
        return 0.0
    if _HAS_VADER:
        return _VADER_ANALYZER.polarity_scores(text)["compound"]
    return _lexicon_sentiment_raw(text)


EMOTION_LEXICONS = {
    "Anger": [
        "angry", "furious", "outraged", "outrageous", "disgusting", "disgusted",
        "terrible", "horrible", "awful", "scam", "scammed", "fraud", "fraudulent",
        "ripoff", "rip off", "ripped off", "worst", "hate", "unacceptable",
        "appalling", "disgrace", "predatory", "thieves", "robbery",
    ],
    "Frustration": [
        "frustrated", "frustrating", "annoyed", "annoying", "hassle", "struggle",
        "struggling", "difficult", "ridiculous", "fed up", "disappointed",
        "disappointing", "useless", "waste of", "still waiting", "repeatedly",
        "runaround", "run around", "nightmare", "impossible", "no help",
        "won't help", "wont help",
    ],
    "Confusion": [
        "confused", "confusing", "unclear", "misleading", "complicated",
        "no explanation", "don't understand", "dont understand",
        "didn't understand", "not sure", "makes no sense", "no sense", "vague",
        "why was", "mixed up",
    ],
    "Trust": [
        "trust", "trustworthy", "reliable", "dependable", "honest", "transparent",
        "secure", "peace of mind", "consistent", "professional", "legitimate",
    ],
    "Satisfaction": [
        "happy", "great", "excellent", "love", "satisfied", "easy", "smooth",
        "helpful", "fast", "quick", "wonderful", "pleased", "recommend",
        "perfect", "amazing", "awesome", "fantastic", "friendly", "seamless",
        "painless",
    ],
}

# Tie-break priority order (highest priority first).
_EMOTION_PRIORITY = ["Anger", "Frustration", "Confusion", "Satisfaction", "Trust"]


def detect_emotion(text: str | None, sentiment_raw: float = 0.0) -> str:
    """Classify review text into one of 5 emotions.

    Emotions: "Anger", "Frustration", "Confusion", "Trust", "Satisfaction".
    Counts substring keyword hits per emotion and picks the highest count,
    breaking ties by priority order. With zero hits, falls back to
    sentiment_raw thresholds.
    """
    if text:
        lowered = text.lower()
        counts = {
            emotion: sum(lowered.count(kw) for kw in keywords)
            for emotion, keywords in EMOTION_LEXICONS.items()
        }
        best = max(counts.values())
        if best > 0:
            for emotion in _EMOTION_PRIORITY:
                if counts[emotion] == best:
                    return emotion

    if sentiment_raw >= 0.3:
        return "Satisfaction"
    if sentiment_raw <= -0.3:
        return "Frustration"
    return "Confusion"


def weighted_kpi(category_scores: Dict[str, float], weights: Dict[str, float]) -> float:
    total_weight = sum(weights.values())
    if total_weight == 0:
        return 0.0
    score = 0.0
    for category, weight in weights.items():
        score += category_scores.get(category, 50.0) * weight
    return round(score / total_weight, 2)


def net_sentiment_score(positive: int, negative: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round(((positive - negative) / total) * 100, 2)


def competitive_sentiment_index(company_score: float, peer_average: float) -> float:
    return round(company_score - peer_average, 2)
