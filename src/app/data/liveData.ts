import { useEffect, useMemo, useState } from "react";

type UnknownRecord = Record<string, unknown>;

type DashboardResponse = {
  kpi?: UnknownRecord[];
  reviews?: UnknownRecord[];
  lastUpdated?: string;
  error?: string;
};

async function parseJsonResponse(response: Response): Promise<UnknownRecord> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Empty API response body (${response.status})`);
  }
  try {
    return JSON.parse(text) as UnknownRecord;
  } catch {
    throw new Error(`API returned invalid JSON (${response.status})`);
  }
}

export type ComplaintRow = {
  topic: string;
  mentions: number;
  sentiment: number;
  trend: "up" | "down" | "stable";
  monthOverMonthChange: number;
};

export type ComplaintMetric = {
  category: string;
  complaintCount: number;
  complaintPct: number;
  trend: "up" | "down" | "stable";
  monthOverMonthChange: number;
};

export type RiskLevel = "Low" | "Medium" | "Critical";

export type ComplaintRisk = {
  level: RiskLevel;
  score: number;
  reasons: string[];
};

export type ComplaintRiskThresholds = {
  wowP75: number;
  wowP90: number;
  mentionsP75: number;
  mentionsP90: number;
  sentimentP25: number;
};

export type EmergingIssueRow = {
  issue: string;
  mentions: number;
  monthOverMonthChange: number;
  sentiment: number;
  firstDetected: string;
  peakDate: string;
};

export type TopicFrequencyRow = {
  topic: string;
  frequency: number;
  negativity: number;
  issuer: string;
};

export type WordCloudTopic = {
  term: string;
  count: number;
  category: string;
  weight: number;
};

export type ReviewRow = {
  id: number;
  issuer: string;
  rating: number;
  date: string;
  text: string;
  sentiment: number;
  topics: string[];
  emotion: string;
};

export type DashboardData = {
  lastUpdated: string;
  issuers: string[];
  sentimentCategories: string[];
  emotions: string[];
  overallSentiment: Record<string, number>;
  categorySentiment: Record<string, Record<string, number | null>>;
  timeSeriesData: Array<Record<string, string | number | null>>;
  topComplaints: ComplaintRow[];
  executiveTopComplaints: ComplaintRow[];
  complaints: ComplaintMetric[];
  complaintsByCategory: Record<string, ComplaintMetric>;
  reviews: ReviewRow[];
  topicFrequency: TopicFrequencyRow[];
  topicWordCloud: WordCloudTopic[];
  emergingIssues: EmergingIssueRow[];
};

export type AiCompetitiveGap = {
  category: string;
  gap: number;
  leader: string;
  recommendation: string;
};

export type AiComparisonPoint = {
  area: string;
  why: string;
  evidence: string;
  recommendation: string;
};

export type AiCriticalIssue = {
  issue: string;
  whyCritical: string;
  howDetermined: string;
  evidence: string;
  recommendation: string;
  severity: "Critical" | "Medium" | "Low";
};

export type AiTrendInterpretation = {
  category: string;
  direction: "up" | "down" | "stable";
  whyEmerging: string;
  howDetected: string;
  evidence: string;
  criticalAlert: string;
  severity: "Critical" | "Medium" | "Low";
};

export type AiPairComparison = {
  companyA: string;
  companyB: string;
  summary: string;
  strengths: AiComparisonPoint[];
  weaknesses: AiComparisonPoint[];
};

export type AiOpportunity = {
  opportunity: string;
  evidence: string;
  impact: "High" | "Medium" | "Low";
  effort: "High" | "Medium" | "Low";
};

export type AiCustomerSegment = {
  segment: string;
  size: string;
  sentiment: number;
  characteristics: string;
  retention: "High" | "Medium" | "Critical";
};

export type AiStrategicRecommendation = {
  title: string;
  priority: "Critical" | "High" | "Medium" | "Strategic";
  timeframe: string;
  description: string;
  impact: string;
  color: "red" | "orange" | "blue" | "purple";
};

export type AiInsightsData = {
  source: "ai" | "heuristic";
  provider: string;
  model: string;
  updatedAt: string;
  summary: string;
  criticalIssues: AiCriticalIssue[];
  trendInterpretations: AiTrendInterpretation[];
  pairwiseComparison: AiPairComparison;
  competitiveGaps: AiCompetitiveGap[];
  opportunities: AiOpportunity[];
  segments: AiCustomerSegment[];
  strategicRecommendations: AiStrategicRecommendation[];
};

const EMPTY_DATA: DashboardData = {
  lastUpdated: "",
  issuers: [],
  sentimentCategories: [],
  emotions: [],
  overallSentiment: {},
  categorySentiment: {},
  timeSeriesData: [],
  topComplaints: [],
  executiveTopComplaints: [],
  complaints: [],
  complaintsByCategory: {},
  reviews: [],
  topicFrequency: [],
  topicWordCloud: [],
  emergingIssues: [],
};

const EMPTY_AI_DATA: AiInsightsData = {
  source: "heuristic",
  provider: "server",
  model: "heuristic-fallback",
  updatedAt: "",
  summary: "",
  criticalIssues: [],
  trendInterpretations: [],
  pairwiseComparison: {
    companyA: "Avant",
    companyB: "Competitor",
    summary: "",
    strengths: [],
    weaknesses: [],
  },
  competitiveGaps: [],
  opportunities: [],
  segments: [],
  strategicRecommendations: [],
};

const CATEGORY_LABELS: Record<string, string> = {
  apr_interest: "APR / Interest Rates",
  fees: "Fees",
  credit_lines: "Credit Lines",
  credit_line_increases: "Credit Lines",
  credit_line_increase: "Credit Lines",
  credit_limits: "Credit Lines",
  approval_experience: "Approval Experience",
  rewards_cashback: "Rewards & Cashback",
  rewards_value: "Rewards & Cashback",
  customer_service: "Customer Service",
  account_access: "Mobile App",
  mobile_app: "Mobile App",
  fraud_security: "Fraud & Security",
  transparency: "Trust & Transparency",
  collections_hardship: "Collections & Hardship",
  collections: "Collections & Hardship",
  payment_processing: "Payment Processing",
  other: "Other",
  misc: "Other",
  general: "Other",
  uncategorized: "Other",
  unknown: "Other",
};

const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  {
    category: "APR / Interest Rates",
    keywords: ["apr", "interest rate", "interest", "rate increase", "rate change", "finance charge", "financing charge"],
  },
  {
    category: "Fees",
    keywords: ["fee", "annual fee", "late fee", "cash advance fee", "foreign transaction fee", "hidden fee", "surprise charge"],
  },
  {
    category: "Credit Lines",
    keywords: ["credit limit", "limit increase", "limit decrease", "credit line", "line increase", "line decrease"],
  },
  {
    category: "Approval Experience",
    keywords: ["approval", "approved", "denied", "denial", "application", "prequal", "pre-qual", "underwriting", "application status"],
  },
  {
    category: "Rewards & Cashback",
    keywords: ["reward", "cashback", "cash back", "points", "bonus"],
  },
  {
    category: "Customer Service",
    keywords: ["customer service", "support", "representative", "agent", "call center", "chat", "phone", "service"],
  },
  {
    category: "Mobile App",
    keywords: ["mobile app", "app", "login", "sign in", "sign-in", "website", "portal"],
  },
  {
    category: "Fraud & Security",
    keywords: ["fraud", "security", "unauthorized", "blocked", "locked", "suspicious", "identity"],
  },
  {
    category: "Trust & Transparency",
    keywords: ["transparent", "transparency", "misleading", "upfront", "surprise", "hidden", "disclose", "disclosure", "trust"],
  },
  {
    category: "Collections & Hardship",
    keywords: ["collections", "hardship", "payment plan", "past due", "delinquent", "forbearance", "recovery"],
  },
  {
    category: "Payment Processing",
    keywords: ["payment", "autopay", "due date", "statement", "posting", "posted", "pending", "funding", "deposit", "transfer"],
  },
];

const LOAN_KEYWORDS = [
  "personal loan",
  "loan",
  "installment loan",
  "loan payment",
  "loan product",
  "loan account",
  "borrower",
  "borrow",
  "cash advance loan",
];

const CARD_KEYWORDS = [
  "credit card",
  "card",
  "issuer",
  "limit",
  "apr",
  "rewards",
  "cashback",
  "balance",
  "statement",
  "autopay",
];

const REVIEW_SCOPE_START = new Date("2025-01-01T00:00:00Z").getTime();
const TOPIC_STOP_WORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "have", "has", "had", "are", "was", "were", "you", "your",
  "they", "their", "them", "our", "ours", "but", "not", "too", "very", "just", "get", "got", "can", "could",
  "would", "should", "will", "been", "being", "into", "about", "after", "before", "when", "where", "what", "why",
  "how", "there", "here", "than", "then", "also", "really", "still", "only", "more", "most", "some", "any", "all",
  "ever", "never", "over", "under", "onto", "upon", "such", "much", "many", "few", "each", "both", "because",
  "while", "these", "those", "its", "it's", "im", "ive", "dont", "didnt", "cant", "wont", "wouldnt", "couldnt",
  "review", "reviews", "company", "avant", "mission", "lane", "capital", "one", "customer", "service",
]);

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function normalizeScore(value: unknown): number {
  const n = asNumber(value);
  if (n === null) return 50;
  if (n >= -1 && n <= 1) return clamp((n + 1) * 50, 0, 100);
  if (n >= 0 && n <= 100) return n;
  if (n >= -100 && n <= 100) return clamp((n + 100) / 2, 0, 100);
  return clamp(n, 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toTitleCase(input: string): string {
  return input
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeCategory(raw: unknown): string {
  const value = asString(raw) || "uncategorized";
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return CATEGORY_LABELS[slug] || toTitleCase(value.replace(/[_-]+/g, " "));
}

function normalizeText(raw: unknown): string {
  return (asString(raw) || "").toLowerCase();
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function isClearlyLoanOnlyReview(text: string, category: string): boolean {
  const loanSignals = hasAnyKeyword(text, LOAN_KEYWORDS) || /\bloan\b/i.test(category);
  const cardSignals = hasAnyKeyword(text, CARD_KEYWORDS) || /card|apr|rewards|cashback|limit|statement/i.test(category);
  return loanSignals && !cardSignals;
}

function inferCategoryFromText(text: string): string | null {
  for (const candidate of CATEGORY_KEYWORDS) {
    if (hasAnyKeyword(text, candidate.keywords)) {
      return candidate.category;
    }
  }
  return null;
}

function inferCategoryFromToken(token: string): string | null {
  for (const candidate of CATEGORY_KEYWORDS) {
    for (const keyword of candidate.keywords) {
      const parts = keyword.toLowerCase().split(/\s+/).filter(Boolean);
      if (keyword.toLowerCase() === token || parts.includes(token)) {
        return candidate.category;
      }
    }
  }
  return null;
}

function inReviewScope(rawDate: unknown): boolean {
  const dateString = asString(rawDate);
  if (!dateString) return false;
  const ts = new Date(dateString).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts >= REVIEW_SCOPE_START;
}

function tokenizeReviewText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !TOPIC_STOP_WORDS.has(token));
}

function refineReviewCategory(rawCategory: unknown, text: unknown): string | null {
  const normalizedCategory = normalizeCategory(rawCategory);
  const normalizedText = normalizeText(text);

  if (isClearlyLoanOnlyReview(normalizedText, normalizedCategory)) {
    return null;
  }

  const genericCategories = new Set(["Other", "Uncategorized", "Misc", "General", "Unknown"]);
  if (!genericCategories.has(normalizedCategory)) {
    return normalizedCategory;
  }

  return inferCategoryFromText(normalizedText) || "Customer Service";
}

function normalizeIssuer(raw: unknown): string {
  const value = asString(raw) || "Unknown";
  return toTitleCase(value.replace(/[_-]+/g, " "));
}

function monthKey(rawDate: unknown): string | null {
  const dateString = asString(rawDate);
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(`${year}-${month}-01T00:00:00Z`);
  return d.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

// Text-based emotion detection. Emotions are derived from emotion-bearing
// language in the review itself (keyword lexicons), not from the numeric
// sentiment score. Sentiment is used only as a last-resort tie-break when a
// review contains no recognizable emotion words. Keep these lexicons in sync
// with detect_emotion() in src/common/scoring.py.
const EMOTION_KEYWORDS: Array<{ emotion: string; keywords: string[] }> = [
  {
    emotion: "Anger",
    keywords: ["angry", "furious", "outraged", "outrageous", "disgusting", "disgusted", "terrible", "horrible", "awful", "scam", "scammed", "fraud", "fraudulent", "ripoff", "rip off", "ripped off", "worst", "hate", "unacceptable", "appalling", "disgrace", "predatory", "thieves", "robbery"],
  },
  {
    emotion: "Frustration",
    keywords: ["frustrated", "frustrating", "annoyed", "annoying", "hassle", "struggle", "struggling", "difficult", "ridiculous", "fed up", "disappointed", "disappointing", "useless", "waste of", "still waiting", "repeatedly", "runaround", "run around", "nightmare", "impossible", "no help", "won't help", "wont help"],
  },
  {
    emotion: "Confusion",
    keywords: ["confused", "confusing", "unclear", "misleading", "complicated", "no explanation", "don't understand", "dont understand", "didn't understand", "not sure", "makes no sense", "no sense", "vague", "why was", "mixed up"],
  },
  {
    emotion: "Trust",
    keywords: ["trust", "trustworthy", "reliable", "dependable", "honest", "transparent", "secure", "peace of mind", "consistent", "professional", "legitimate"],
  },
  {
    emotion: "Satisfaction",
    keywords: ["happy", "great", "excellent", "love", "satisfied", "easy", "smooth", "helpful", "fast", "quick", "wonderful", "pleased", "recommend", "perfect", "amazing", "awesome", "fantastic", "friendly", "seamless", "painless"],
  },
];

// Tie-break priority when two emotions have equal keyword hits.
const EMOTION_PRIORITY = ["Anger", "Frustration", "Confusion", "Satisfaction", "Trust"];

function detectEmotion(text: string, sentiment: number): string {
  const normalized = (text || "").toLowerCase();
  let best: string | null = null;
  let bestHits = 0;
  for (const { emotion, keywords } of EMOTION_KEYWORDS) {
    let hits = 0;
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) hits += 1;
    }
    if (hits > bestHits || (hits === bestHits && hits > 0 && best !== null &&
        EMOTION_PRIORITY.indexOf(emotion) < EMOTION_PRIORITY.indexOf(best))) {
      best = emotion;
      bestHits = hits;
    }
  }
  if (best && bestHits > 0) return best;
  // No emotion words present: fall back to sentiment polarity.
  if (sentiment >= 0.3) return "Satisfaction";
  if (sentiment <= -0.3) return "Frustration";
  return "Confusion";
}

export function classifyComplaintRisk(item: ComplaintRow, thresholds: ComplaintRiskThresholds): ComplaintRisk {
  const reasons: string[] = [];

  if (item.trend === "stable") {
    return { level: "Low", score: 0, reasons: ["stable trend; monitor, do not escalate"] };
  }

  const risingFast = item.monthOverMonthChange >= thresholds.wowP90;
  const elevatedMomentum = item.monthOverMonthChange >= thresholds.wowP75 && item.monthOverMonthChange < thresholds.wowP90;
  const falling = item.monthOverMonthChange < -thresholds.wowP75;
  const severeNegativity = item.sentiment <= -(thresholds.sentimentP25 * 1.4);
  const elevatedNegativity = item.sentiment <= -thresholds.sentimentP25;
  const highVolume = item.mentions >= thresholds.mentionsP90;
  const mediumVolume = item.mentions >= thresholds.mentionsP75;

  if (risingFast) reasons.push("fast mention growth (top 10% across categories)");
  else if (elevatedMomentum) reasons.push("elevated mention momentum (top 25% across categories)");
  else if (falling) reasons.push("mention decline");

  if (severeNegativity) reasons.push("severe negative sentiment");
  else if (elevatedNegativity) reasons.push("elevated negative sentiment");

  if (highVolume) reasons.push("high mention volume (top 10% across categories)");
  else if (mediumVolume) reasons.push("meaningful mention volume (top 25% across categories)");

  const score = (risingFast ? 2 : elevatedMomentum ? 1 : 0)
    + (severeNegativity ? 2 : elevatedNegativity ? 1 : 0)
    + (highVolume ? 2 : mediumVolume ? 1 : 0);

  if (risingFast && (severeNegativity || elevatedNegativity) && (mediumVolume || highVolume)) {
    return { level: "Critical", score, reasons };
  }

  if (score >= 3) {
    return { level: "Medium", score, reasons };
  }

  return { level: "Low", score, reasons };
}

function rankingLabel(score: number): string {
  if (score >= 80) return "leading";
  if (score >= 65) return "strong";
  if (score >= 50) return "mid-tier";
  return "at-risk";
}

function transform(response: DashboardResponse | null): DashboardData {
  if (!response) return EMPTY_DATA;

  const kpiRows = Array.isArray(response.kpi) ? response.kpi : [];
  const allReviewRows = Array.isArray(response.reviews) ? response.reviews : [];
  const reviewRows = allReviewRows.filter((row) => inReviewScope(row.created_ts ?? row.date));

  const nowDate = new Date();
  const sixMonthStartTs = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() - 5, 1);

  const reviewCategoryScores = new Map<string, number[]>(); // 6-month window, Silver only
  const companyScores = new Map<string, number[]>();
  const companies = new Set<string>();
  const categories = new Set<string>();

  // Gold (kpiRows) is used only to register the full company/category universe
  // so categories with no recent reviews still appear as columns. It does NOT
  // contribute to displayed sentiment scores — those come exclusively from
  // Silver reviews below, so pre-aggregated Gold averages are never blended
  // with per-review values (#2).
  for (const row of kpiRows) {
    const company = normalizeIssuer(row.company ?? row.issuer ?? row.competitor);
    const normalizedCategory = normalizeCategory(row.primary_category ?? row.category);
    const category = ["Other", "Uncategorized", "Misc", "General", "Unknown"].includes(normalizedCategory)
      ? "Customer Service"
      : normalizedCategory;
    companies.add(company);
    categories.add(category);
  }

  for (const row of reviewRows) {
    const company = normalizeIssuer(row.company ?? row.issuer);
    const category = refineReviewCategory(row.primary_category ?? row.category, row.text ?? row.review_text ?? row.content);
    if (!category) continue;
    companies.add(company);
    categories.add(category);

    const score100 = normalizeScore(row.sentiment_score ?? row.sentiment);
    if (!companyScores.has(company)) {
      companyScores.set(company, []);
    }
    companyScores.get(company)?.push(score100);

    // categorySentiment (heatmap) uses only the most recent 6 months so it
    // matches the windows used on the Dashboard and Comparison tabs (#16).
    const ts = new Date(asString(row.created_ts ?? row.date) || "").getTime();
    if (Number.isFinite(ts) && ts >= sixMonthStartTs) {
      const reviewCategoryKey = `${company}__${category}`;
      const categoryBucket = reviewCategoryScores.get(reviewCategoryKey) || [];
      categoryBucket.push(score100);
      reviewCategoryScores.set(reviewCategoryKey, categoryBucket);
    }
  }

  const issuers = Array.from(companies).sort((a, b) => (a === "Avant" ? -1 : b === "Avant" ? 1 : a.localeCompare(b)));
  const sentimentCategories = Array.from(categories).sort((a, b) => a.localeCompare(b));

  const overallSentiment: Record<string, number> = {};
  for (const issuer of issuers) {
    const scores = companyScores.get(issuer) || [];
    const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 50;
    overallSentiment[issuer] = Math.round(avg);
  }

  const categorySentiment: Record<string, Record<string, number | null>> = {};
  for (const issuer of issuers) {
    categorySentiment[issuer] = {};
    for (const category of sentimentCategories) {
      const reviewBucket = reviewCategoryScores.get(`${issuer}__${category}`) || [];
      categorySentiment[issuer][category] = reviewBucket.length
        ? Math.round(reviewBucket.reduce((s, v) => s + v, 0) / reviewBucket.length)
        : null;
    }
  }

  const monthCompanyScores = new Map<string, Map<string, number[]>>();
  for (const row of reviewRows) {
    const key = monthKey(row.created_ts ?? row.date);
    if (!key) continue;
    const company = normalizeIssuer(row.company ?? row.issuer);
    const category = refineReviewCategory(row.primary_category ?? row.category, row.text ?? row.review_text ?? row.content);
    if (!category) continue;
    const score = normalizeScore(row.sentiment_score ?? row.sentiment);
    if (!monthCompanyScores.has(key)) monthCompanyScores.set(key, new Map());
    const byCompany = monthCompanyScores.get(key)!;
    if (!byCompany.has(company)) byCompany.set(company, []);
    byCompany.get(company)!.push(score);
  }

  const timeSeriesData = Array.from(monthCompanyScores.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, byCompany]) => {
      const row: Record<string, string | number | null> = { month: monthLabel(month) };
      for (const issuer of issuers) {
        const vals = byCompany.get(issuer) || [];
        row[issuer] = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
      }
      return row;
    });

  const categoryMentions = new Map<string, { count: number; scores: number[]; current: number; previous: number; dates: string[] }>();
  const issuerCategoryMentions = new Map<string, { count: number; scores: number[]; current: number; previous: number; dates: string[] }>();
  const issuerWordCloudCategoryCounts = new Map<string, number>();
  const topicTerms = new Map<string, { count: number; category: string }>();
  const now = Date.now();
  const windowMs = 30 * 24 * 60 * 60 * 1000;

  for (const row of reviewRows) {
    const issuer = normalizeIssuer(row.company ?? row.issuer);
    const category = refineReviewCategory(row.primary_category ?? row.category, row.text ?? row.review_text ?? row.content);
    if (!category) continue;
    const score = normalizeScore(row.sentiment_score ?? row.sentiment);
    const created = asString(row.created_ts ?? row.date);
    const bucket = categoryMentions.get(category) || { count: 0, scores: [], current: 0, previous: 0, dates: [] };

    bucket.count += 1;
    bucket.scores.push(score);
    if (created) {
      bucket.dates.push(created);
      const ts = new Date(created).getTime();
      if (!Number.isNaN(ts)) {
        if (now - ts <= windowMs) bucket.current += 1;
        else if (now - ts <= windowMs * 2) bucket.previous += 1;
      }
    }

    categoryMentions.set(category, bucket);

    const issuerCategoryKey = `${issuer}__${category}`;
    const issuerBucket = issuerCategoryMentions.get(issuerCategoryKey) || {
      count: 0,
      scores: [],
      current: 0,
      previous: 0,
      dates: [],
    };
  issuerBucket.count += 1;
  issuerBucket.scores.push(score);
    if (created) {
      issuerBucket.dates.push(created);
      const ts = new Date(created).getTime();
      if (!Number.isNaN(ts)) {
        if (now - ts <= windowMs) issuerBucket.current += 1;
        else if (now - ts <= windowMs * 2) issuerBucket.previous += 1;
      }
    }
  issuerCategoryMentions.set(issuerCategoryKey, issuerBucket);

    const text = asString(row.text ?? row.review_text ?? row.content) || "";
    for (const token of tokenizeReviewText(text)) {
      const tokenCategory = inferCategoryFromToken(token);
      if (!tokenCategory) continue;
      const current = topicTerms.get(token) || { count: 0, category: tokenCategory };
      current.count += 1;
      topicTerms.set(token, current);
      if (issuer === "Avant") {
        const key = tokenCategory;
        issuerWordCloudCategoryCounts.set(key, (issuerWordCloudCategoryCounts.get(key) || 0) + 1);
      }
    }
  }

  const topicWordCloud: WordCloudTopic[] = Array.from(topicTerms.entries())
    .map(([term, data]) => ({ term, count: data.count, category: data.category, weight: 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 80);

  const maxTermCount = topicWordCloud[0]?.count || 1;
  for (const item of topicWordCloud) {
    item.weight = Math.round((item.count / maxTermCount) * 100);
  }

  const topComplaints: ComplaintRow[] = Array.from(categoryMentions.entries())
    .map(([topic, stats]) => {
      const avg = stats && stats.scores.length ? stats.scores.reduce((s, v) => s + v, 0) / stats.scores.length : 50;
      const previous = stats?.previous || 0;
      const current = stats?.current || 0;
      const denom = Math.max(previous, 1);
      const pctChange = ((current - previous) / denom) * 100;
      const trend: "up" | "down" | "stable" = pctChange > 20 ? "up" : pctChange < -20 ? "down" : "stable";
      return {
        topic,
        mentions: stats.count,
        sentiment: -((100 - avg) / 100),
        trend,
        monthOverMonthChange: Math.round(pctChange),
      };
    })
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);

  const executiveTopComplaints: ComplaintRow[] = Array.from(issuerWordCloudCategoryCounts.entries())
    .map(([topic, mentionsFromWords]) => {
      const stats = issuerCategoryMentions.get(`Avant__${topic}`);
      const avg = stats && stats.scores.length ? stats.scores.reduce((s, v) => s + v, 0) / stats.scores.length : 50;
      const previous = stats?.previous || 0;
      const current = stats?.current || 0;
      const denom = Math.max(previous, 1);
      const pctChange = ((current - previous) / denom) * 100;
      const trend: "up" | "down" | "stable" = pctChange > 20 ? "up" : pctChange < -20 ? "down" : "stable";
      return {
        topic,
        mentions: mentionsFromWords,
        sentiment: -((100 - avg) / 100),
        trend,
        monthOverMonthChange: Math.round(pctChange),
      };
    })
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);

  const topicFrequency: TopicFrequencyRow[] = Array.from(issuerCategoryMentions.entries())
    .map(([key, stats]) => {
      const [issuer, topic] = key.split("__");
      const avg = stats.scores.length ? stats.scores.reduce((s, v) => s + v, 0) / stats.scores.length : 50;
      return {
        topic,
        frequency: stats.count,
        negativity: Math.max(0, Math.min(1, (100 - avg) / 100)),
        issuer,
      };
    })
    .sort((a, b) => b.frequency - a.frequency);

  const emergingIssues: EmergingIssueRow[] = Array.from(categoryMentions.entries())
    .map(([issue, stats]) => {
      const avg = stats.scores.length ? stats.scores.reduce((s, v) => s + v, 0) / stats.scores.length : 50;
      const firstDetected = stats.dates.length ? stats.dates.sort()[0].slice(0, 10) : new Date().toISOString().slice(0, 10);
      const peakDate = stats.dates.length ? stats.dates.sort()[stats.dates.length - 1].slice(0, 10) : new Date().toISOString().slice(0, 10);
      const denom = Math.max(stats.previous, 1);
      const monthOverMonthChange = Math.round(((stats.current - stats.previous) / denom) * 100);
      return {
        issue,
        mentions: stats.count,
        monthOverMonthChange,
        sentiment: -((100 - avg) / 100),
        firstDetected,
        peakDate,
      };
    })
    .filter((row) => row.monthOverMonthChange > 0)
    .sort((a, b) => b.monthOverMonthChange - a.monthOverMonthChange)
    .slice(0, 3);

  const parsedReviews = reviewRows
    .map((row) => {
      const issuer = normalizeIssuer(row.company ?? row.issuer);
      const score100 = normalizeScore(row.sentiment_score ?? row.sentiment);
      const sentiment = clamp((score100 - 50) / 50, -1, 1);
      const rating = clamp(Math.round(score100 / 20), 1, 5);
      const date = asString(row.created_ts ?? row.date) || new Date().toISOString().slice(0, 10);
      const category = refineReviewCategory(row.primary_category ?? row.category, row.text ?? row.review_text ?? row.content);
      if (!category) return null;
      const text = asString(row.text ?? row.review_text ?? row.content) || "";
      // Prefer the pipeline-computed emotion column when present; otherwise
      // derive it from the review text (see detectEmotion).
      const emotion = asString(row.emotion) || detectEmotion(text, sentiment);

      return {
        issuer,
        rating,
        date,
        text,
        sentiment,
        topics: [category],
        emotion,
      };
    })
    .filter((review): review is Omit<ReviewRow, "id"> => review !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const reviews: ReviewRow[] = parsedReviews.map((review, index) => ({
    id: index + 1,
    ...review,
  }));

  const emotions = Array.from(new Set(reviews.map((review) => review.emotion)));

  const avantIssuer = issuers.includes("Avant") ? "Avant" : issuers[0] || "Avant";
  const peerIssuer = issuers.find((issuer) => issuer !== avantIssuer) || avantIssuer;
  const avantScore = overallSentiment[avantIssuer] || 50;
  const peerScore = overallSentiment[peerIssuer] || 50;
  const strongCategories = sentimentCategories
    .map((category) => ({
      category,
      avant: categorySentiment[avantIssuer]?.[category] ?? null,
      peer: categorySentiment[peerIssuer]?.[category] ?? null,
    }))
    .filter((item): item is { category: string; avant: number; peer: number } => item.avant !== null && item.peer !== null)
    .sort((a, b) => b.avant - a.avant);
  const weakCategories = sentimentCategories
    .map((category) => ({
      category,
      avant: categorySentiment[avantIssuer]?.[category] ?? null,
      peer: categorySentiment[peerIssuer]?.[category] ?? null,
    }))
    .filter((item): item is { category: string; avant: number; peer: number } => item.avant !== null && item.peer !== null)
    .sort((a, b) => a.avant - b.avant);

  // Compute complaints metric: count reviews with sentiment_score <= 50 (negative threshold)
  // Grouped by category with trend analysis
  const complaintStats = new Map<string, { count: number; current: number; previous: number }>();
  const totalReviewsByWindow = { current: 0, previous: 0 };
  for (const row of reviewRows) {
    const score = normalizeScore(row.sentiment_score ?? row.sentiment);
    if (score > 50) continue; // Only count negative reviews (sentiment <= 50)
    
    const category = refineReviewCategory(row.primary_category ?? row.category, row.text ?? row.review_text ?? row.content);
    if (!category) continue;
    
    const created = asString(row.created_ts ?? row.date);
    const bucket = complaintStats.get(category) || { count: 0, current: 0, previous: 0 };
    bucket.count += 1;
    
    if (created) {
      const ts = new Date(created).getTime();
      if (!Number.isNaN(ts)) {
        if (now - ts <= windowMs) {
          bucket.current += 1;
          totalReviewsByWindow.current += 1;
        } else if (now - ts <= windowMs * 2) {
          bucket.previous += 1;
          totalReviewsByWindow.previous += 1;
        }
      }
    }
    complaintStats.set(category, bucket);
  }
  
  const complaintsByCategory: Record<string, ComplaintMetric> = {};
  const complaintsArray: ComplaintMetric[] = Array.from(complaintStats.entries())
    .map(([category, stats]) => {
      const denom = Math.max(totalReviewsByWindow.previous, 1);
      const pctChange = ((stats.current - stats.previous) / denom) * 100;
      const trend: "up" | "down" | "stable" = pctChange > 20 ? "up" : pctChange < -20 ? "down" : "stable";
      const totalReviews = reviewRows.filter((r) => {
        const cat = refineReviewCategory(r.primary_category ?? r.category, r.text ?? r.review_text ?? r.content);
        return cat === category;
      }).length;
      const complaintMetric: ComplaintMetric = {
        category,
        complaintCount: stats.count,
        complaintPct: totalReviews > 0 ? Math.round((stats.count / totalReviews) * 100) : 0,
        trend,
        monthOverMonthChange: Math.round(pctChange),
      };
      complaintsByCategory[category] = complaintMetric;
      return complaintMetric;
    })
    .sort((a, b) => b.complaintCount - a.complaintCount);

  const sortedComplaintWow = [...topComplaints.map((c) => c.monthOverMonthChange)].sort((a, b) => a - b);
  const sortedComplaintMentions = [...topComplaints.map((c) => c.mentions)].sort((a, b) => a - b);
  const sortedComplaintSentiment = [...topComplaints.map((c) => Math.abs(c.sentiment))].sort((a, b) => a - b);
  const complaintRiskThresholds: ComplaintRiskThresholds = {
    wowP75: percentile(sortedComplaintWow, 75),
    wowP90: percentile(sortedComplaintWow, 90),
    mentionsP75: percentile(sortedComplaintMentions, 75),
    mentionsP90: percentile(sortedComplaintMentions, 90),
    sentimentP25: percentile(sortedComplaintSentiment, 25),
  };

  const inferredCriticalIssues = topComplaints.slice(0, 3).map((item) => ({
    risk: classifyComplaintRisk(item, complaintRiskThresholds),
    issue: item.topic,
    whyCritical: `${item.topic} is critical because it combines ${item.mentions} mentions with ${rankingLabel(Math.round(Math.abs(item.sentiment) * 100)) === "leading" ? "high" : "material"} negative intensity and directly affects Avant's standing against competitors.`,
    howDetermined: `Ranked by review volume, negative sentiment, and recent month-over-month acceleration.`,
    evidence: `${item.topic} appears ${item.trend === "up" ? "to be rising" : "as a persistent issue"} with ${item.mentions} mentions.`,
    recommendation: `Address ${item.topic.toLowerCase()} first because it is one of Avant's most visible and actionable gaps.`,
    severity: classifyComplaintRisk(item, complaintRiskThresholds).level,
  }));

  const inferredTrendInterpretations = emergingIssues.slice(0, 3).map((item) => ({
    category: item.issue,
    direction: item.monthOverMonthChange > 0 ? "up" : item.monthOverMonthChange < 0 ? "down" : "stable",
    whyEmerging: `${item.issue} is emerging because it is gaining volume faster than surrounding topics and is pulling down the customer experience Avant wants to own.`,
    howDetected: `Detected from month-over-month mention growth and recent review sentiment.`,
    evidence: `${item.monthOverMonthChange > 0 ? "+" : ""}${item.monthOverMonthChange}% MoM change with ${item.mentions} mentions.`,
    criticalAlert: item.monthOverMonthChange > 20 ? `Escalate ${item.issue.toLowerCase()} immediately.` : `Monitor ${item.issue.toLowerCase()} closely.`,
    severity: item.monthOverMonthChange > 30 ? "Critical" : item.monthOverMonthChange > 10 ? "Medium" : "Low",
  }));

  const pairwiseComparison: AiPairComparison = {
    companyA: avantIssuer,
    companyB: peerIssuer,
    summary: `${avantIssuer} sits ${avantScore - peerScore >= 0 ? "above" : "below"} ${peerIssuer} by ${Math.abs(avantScore - peerScore)} points overall.`,
    strengths: strongCategories.slice(0, 3).map((item) => ({
      area: item.category,
      why: `${avantIssuer} is stronger in ${item.category} than ${peerIssuer}.`,
      evidence: `${avantIssuer}: ${item.avant}, ${peerIssuer}: ${item.peer}.`,
      recommendation: `Use ${item.category} as a benchmark for the rest of Avant's experience.`,
    })),
    weaknesses: weakCategories.slice(0, 3).map((item) => ({
      area: item.category,
      why: `${avantIssuer} trails ${peerIssuer} in ${item.category}.`,
      evidence: `${avantIssuer}: ${item.avant}, ${peerIssuer}: ${item.peer}.`,
      recommendation: `Close the gap in ${item.category.toLowerCase()} with targeted product and service changes.`,
    })),
  };

  return {
    lastUpdated: asString(response.lastUpdated) || "",
    issuers,
    sentimentCategories,
    emotions,
    overallSentiment,
    categorySentiment,
    timeSeriesData,
    topComplaints,
    executiveTopComplaints,
    complaints: complaintsArray,
    complaintsByCategory,
    reviews,
    topicFrequency,
    topicWordCloud,
    emergingIssues,
    inferredCriticalIssues,
    inferredTrendInterpretations,
    pairwiseComparison,
  };
}

export function useDashboardData() {
  const [raw, setRaw] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = import.meta.env.VITE_DASHBOARD_API_URL || "/api/dashboard";

    async function load() {
      try {
        setIsLoading(true);
        const response = await fetch(endpoint, { signal: controller.signal });
        const payload = (await parseJsonResponse(response)) as DashboardResponse;

        if (!response.ok) {
          throw new Error(payload.error || `Request failed with ${response.status}`);
        }

        setRaw(payload);
        setError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Unable to load dashboard data");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const data = useMemo(() => transform(raw), [raw]);
  return { data, isLoading, error };
}

type AiResponse = Partial<AiInsightsData> & {
  error?: string;
};

export function useAiInsightsData(options?: { companyA?: string; companyB?: string; focus?: string }) {
  const [raw, setRaw] = useState<AiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (options?.companyA) params.set("companyA", options.companyA);
    if (options?.companyB) params.set("companyB", options.companyB);
    if (options?.focus) params.set("focus", options.focus);
    const endpoint = params.toString() ? `/api/ai/insights?${params.toString()}` : "/api/ai/insights";

    async function load() {
      try {
        setIsLoading(true);
        const response = await fetch(endpoint, { signal: controller.signal });
        const payload = (await parseJsonResponse(response)) as AiResponse;

        if (!response.ok) {
          throw new Error(payload.error || `Request failed with ${response.status}`);
        }

        setRaw(payload);
        setError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Unable to load AI insights");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const data = useMemo(
    () => ({
      ...EMPTY_AI_DATA,
      ...raw,
      criticalIssues: Array.isArray(raw?.criticalIssues) ? raw!.criticalIssues : EMPTY_AI_DATA.criticalIssues,
      trendInterpretations: Array.isArray(raw?.trendInterpretations) ? raw!.trendInterpretations : EMPTY_AI_DATA.trendInterpretations,
      pairwiseComparison: raw?.pairwiseComparison || EMPTY_AI_DATA.pairwiseComparison,
      competitiveGaps: Array.isArray(raw?.competitiveGaps) ? raw!.competitiveGaps : EMPTY_AI_DATA.competitiveGaps,
      opportunities: Array.isArray(raw?.opportunities) ? raw!.opportunities : EMPTY_AI_DATA.opportunities,
      segments: Array.isArray(raw?.segments) ? raw!.segments : EMPTY_AI_DATA.segments,
      strategicRecommendations: Array.isArray(raw?.strategicRecommendations)
        ? raw!.strategicRecommendations
        : EMPTY_AI_DATA.strategicRecommendations,
    }),
    [raw]
  );

  return { data, isLoading, error };
}
