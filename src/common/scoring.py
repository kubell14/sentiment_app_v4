from __future__ import annotations

from typing import Dict


def normalize_sentiment(raw_score: float) -> float:
    """Normalize model sentiment from [-1,1] to [0,100]."""
    clipped = max(-1.0, min(1.0, raw_score))
    return round((clipped + 1) * 50, 2)


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
