from __future__ import annotations

import re
from typing import Dict


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


def text_sentiment_raw(text: str | None) -> float:
    """Estimate sentiment from review text on [-1, 1] using a lexicon heuristic."""
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
