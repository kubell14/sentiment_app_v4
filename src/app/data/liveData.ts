import { useEffect, useMemo, useState } from "react";

type UnknownRecord = Record<string, unknown>;

type DashboardResponse = {
  kpi?: UnknownRecord[];
  reviews?: UnknownRecord[];
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
  weekOverWeekChange: number;
};

export type EmergingIssueRow = {
  issue: string;
  mentions: number;
  weekOverWeekChange: number;
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
  issuers: string[];
  sentimentCategories: string[];
  emotions: string[];
  overallSentiment: Record<string, number>;
  categorySentiment: Record<string, Record<string, number>>;
  timeSeriesData: Array<Record<string, string | number>>;
  topComplaints: ComplaintRow[];
  executiveTopComplaints: ComplaintRow[];
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
  severity: "Critical" | "High" | "Medium";
};

export type AiTrendInterpretation = {
  category: string;
  direction: "up" | "down" | "stable";
  whyEmerging: string;
  howDetected: string;
  evidence: string;
  criticalAlert: string;
  severity: "Critical" | "High" | "Medium";
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
  issuers: [],
  sentimentCategories: [],
  emotions: [],
  overallSentiment: {},
  categorySentiment: {},
  timeSeriesData: [],
  topComplaints: [],
  executiveTopComplaints: [],
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
  approval_experience: "Approval Experience",
  rewards_cashback: "Rewards & Cashback",
  customer_service: "Customer Service",
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
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function emotionFromSentiment(sentiment: number): string {
  if (sentiment <= -0.6) return "Anger";
  if (sentiment < -0.2) return "Frustration";
  if (sentiment < 0.2) return "Confusion";
  if (sentiment < 0.6) return "Trust";
  return "Satisfaction";
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

  const companyCategoryScores = new Map<string, number[]>();
  const reviewCompanyCategoryScores = new Map<string, number[]>();
  const companyScores = new Map<string, number[]>();
  const companies = new Set<string>();
  const categories = new Set<string>();

  for (const row of kpiRows) {
    const company = normalizeIssuer(row.company ?? row.issuer ?? row.competitor);
    const normalizedCategory = normalizeCategory(row.primary_category ?? row.category);
    const category = ["Other", "Uncategorized", "Misc", "General", "Unknown"].includes(normalizedCategory)
      ? "Customer Service"
      : normalizedCategory;
    const score = normalizeScore(row.avg_sentiment_score ?? row.sentiment_score ?? row.score_100);

    companies.add(company);
    categories.add(category);

    const key = `${company}__${category}`;
    const bucket = companyCategoryScores.get(key) || [];
    bucket.push(score);
    companyCategoryScores.set(key, bucket);

    const overall = companyScores.get(company) || [];
    overall.push(score);
    companyScores.set(company, overall);
  }

  for (const row of reviewRows) {
    const company = normalizeIssuer(row.company ?? row.issuer);
    const category = refineReviewCategory(row.primary_category ?? row.category, row.text ?? row.review_text ?? row.content);
    if (!category) continue;
    companies.add(company);
    categories.add(category);

    if (!companyScores.has(company)) {
      companyScores.set(company, []);
    }
    companyScores.get(company)?.push(normalizeScore(row.sentiment_score ?? row.sentiment));

    const reviewCategoryKey = `${company}__${category}`;
    const categoryBucket = reviewCompanyCategoryScores.get(reviewCategoryKey) || [];
    categoryBucket.push(normalizeScore(row.sentiment_score ?? row.sentiment));
    reviewCompanyCategoryScores.set(reviewCategoryKey, categoryBucket);
  }

  const issuers = Array.from(companies).sort((a, b) => (a === "Avant" ? -1 : b === "Avant" ? 1 : a.localeCompare(b)));
  const sentimentCategories = Array.from(categories).sort((a, b) => a.localeCompare(b));

  const overallSentiment: Record<string, number> = {};
  for (const issuer of issuers) {
    const scores = companyScores.get(issuer) || [];
    const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 50;
    overallSentiment[issuer] = Math.round(avg);
  }

  const categorySentiment: Record<string, Record<string, number>> = {};
  for (const issuer of issuers) {
    categorySentiment[issuer] = {};
    for (const category of sentimentCategories) {
      const bucket = companyCategoryScores.get(`${issuer}__${category}`) || [];
      const reviewBucket = reviewCompanyCategoryScores.get(`${issuer}__${category}`) || [];
      if (bucket.length) {
        categorySentiment[issuer][category] = Math.round(bucket.reduce((s, v) => s + v, 0) / bucket.length);
      } else if (reviewBucket.length) {
        categorySentiment[issuer][category] = Math.round(reviewBucket.reduce((s, v) => s + v, 0) / reviewBucket.length);
      } else {
        categorySentiment[issuer][category] = 0;
      }
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
      const row: Record<string, string | number> = { month: monthLabel(month) };
      for (const issuer of issuers) {
        const vals = byCompany.get(issuer) || [];
        row[issuer] = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
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
      const issuerCategoryWordKey = `${issuer}__${tokenCategory}`;
      issuerWordCloudCategoryCounts.set(
        issuerCategoryWordKey,
        (issuerWordCloudCategoryCounts.get(issuerCategoryWordKey) || 0) + 1
      );
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
        weekOverWeekChange: Math.round(pctChange),
      };
    })
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);

  const executiveIssuer = issuers.includes("Avant") ? "Avant" : issuers[0] || "Avant";
  const executiveTopComplaints: ComplaintRow[] = Array.from(issuerWordCloudCategoryCounts.entries())
    .filter(([key]) => key.startsWith(`${executiveIssuer}__`))
    .map(([key, mentionsFromWords]) => {
      const topic = key.split("__")[1];
      const stats = issuerCategoryMentions.get(`${executiveIssuer}__${topic}`);
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
        weekOverWeekChange: Math.round(pctChange),
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
      const weekOverWeekChange = Math.round(((stats.current - stats.previous) / denom) * 100);
      return {
        issue,
        mentions: stats.count,
        weekOverWeekChange,
        sentiment: -((100 - avg) / 100),
        firstDetected,
        peakDate,
      };
    })
    .filter((row) => row.weekOverWeekChange > 0)
    .sort((a, b) => b.weekOverWeekChange - a.weekOverWeekChange)
    .slice(0, 3);

  const reviews: ReviewRow[] = reviewRows.slice(0, 1000).map((row, index) => {
    const issuer = normalizeIssuer(row.company ?? row.issuer);
    const score100 = normalizeScore(row.sentiment_score ?? row.sentiment);
    const sentiment = clamp((score100 - 50) / 50, -1, 1);
    const rating = clamp(Math.round(score100 / 20), 1, 5);
    const date = asString(row.created_ts ?? row.date) || new Date().toISOString().slice(0, 10);
    const category = refineReviewCategory(row.primary_category ?? row.category, row.text ?? row.review_text ?? row.content);
    if (!category) return null;
    const text = asString(row.text ?? row.review_text ?? row.content) || "";
    const emotion = emotionFromSentiment(sentiment);

    return {
      id: index + 1,
      issuer,
      rating,
      date,
      text,
      sentiment,
      topics: [category],
      emotion,
    };
  }).filter((review): review is ReviewRow => review !== null);

  const emotions = Array.from(new Set(reviews.map((review) => review.emotion)));

  const avantIssuer = issuers.includes("Avant") ? "Avant" : issuers[0] || "Avant";
  const peerIssuer = issuers.find((issuer) => issuer !== avantIssuer) || avantIssuer;
  const avantScore = overallSentiment[avantIssuer] || 50;
  const peerScore = overallSentiment[peerIssuer] || 50;
  const strongCategories = sentimentCategories
    .map((category) => ({
      category,
      avant: categorySentiment[avantIssuer]?.[category] || 0,
      peer: categorySentiment[peerIssuer]?.[category] || 0,
    }))
    .sort((a, b) => b.avant - a.avant);
  const weakCategories = sentimentCategories
    .map((category) => ({
      category,
      avant: categorySentiment[avantIssuer]?.[category] || 0,
      peer: categorySentiment[peerIssuer]?.[category] || 0,
    }))
    .sort((a, b) => a.avant - b.avant);

  const inferredCriticalIssues = topComplaints.slice(0, 3).map((item) => ({
    issue: item.topic,
    whyCritical: `${item.topic} is critical because it combines ${item.mentions} mentions with ${rankingLabel(Math.round(Math.abs(item.sentiment) * 100)) === "leading" ? "high" : "material"} negative intensity and directly affects Avant's standing against competitors.`,
    howDetermined: `Ranked by review volume, negative sentiment, and recent week-over-week acceleration.`,
    evidence: `${item.topic} appears ${item.trend === "up" ? "to be rising" : "as a persistent issue"} with ${item.mentions} mentions.`,
    recommendation: `Address ${item.topic.toLowerCase()} first because it is one of Avant's most visible and actionable gaps.`,
    severity: item.trend === "up" ? "Critical" : item.mentions > 25 ? "High" : "Medium",
  }));

  const inferredTrendInterpretations = emergingIssues.slice(0, 3).map((item) => ({
    category: item.issue,
    direction: item.weekOverWeekChange > 0 ? "up" : item.weekOverWeekChange < 0 ? "down" : "stable",
    whyEmerging: `${item.issue} is emerging because it is gaining volume faster than surrounding topics and is pulling down the customer experience Avant wants to own.`,
    howDetected: `Detected from week-over-week mention growth and recent review sentiment.`,
    evidence: `${item.weekOverWeekChange > 0 ? "+" : ""}${item.weekOverWeekChange}% WoW change with ${item.mentions} mentions.`,
    criticalAlert: item.weekOverWeekChange > 20 ? `Escalate ${item.issue.toLowerCase()} immediately.` : `Monitor ${item.issue.toLowerCase()} closely.`,
    severity: item.weekOverWeekChange > 30 ? "Critical" : item.weekOverWeekChange > 10 ? "High" : "Medium",
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
    issuers,
    sentimentCategories,
    emotions,
    overallSentiment,
    categorySentiment,
    timeSeriesData,
    topComplaints,
    executiveTopComplaints,
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
