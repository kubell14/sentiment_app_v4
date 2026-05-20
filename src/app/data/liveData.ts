import { useEffect, useMemo, useState } from "react";

type UnknownRecord = Record<string, unknown>;

type DashboardResponse = {
  kpi?: UnknownRecord[];
  reviews?: UnknownRecord[];
  error?: string;
};

export type ComplaintRow = {
  topic: string;
  mentions: number;
  sentiment: number;
  trend: "up" | "down" | "stable";
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
  reviews: ReviewRow[];
  topicFrequency: TopicFrequencyRow[];
  emergingIssues: EmergingIssueRow[];
};

export type AiCompetitiveGap = {
  category: string;
  gap: number;
  leader: string;
  recommendation: string;
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
  reviews: [],
  topicFrequency: [],
  emergingIssues: [],
};

const EMPTY_AI_DATA: AiInsightsData = {
  source: "heuristic",
  provider: "server",
  model: "heuristic-fallback",
  updatedAt: "",
  summary: "",
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
};

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

function transform(response: DashboardResponse | null): DashboardData {
  if (!response) return EMPTY_DATA;

  const kpiRows = Array.isArray(response.kpi) ? response.kpi : [];
  const reviewRows = Array.isArray(response.reviews) ? response.reviews : [];

  const companyCategoryScores = new Map<string, number[]>();
  const companyScores = new Map<string, number[]>();
  const companies = new Set<string>();
  const categories = new Set<string>();

  for (const row of kpiRows) {
    const company = normalizeIssuer(row.company ?? row.issuer ?? row.competitor);
    const category = normalizeCategory(row.primary_category ?? row.category);
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
    const category = normalizeCategory(row.primary_category ?? row.category);
    companies.add(company);
    categories.add(category);

    if (!companyScores.has(company)) {
      companyScores.set(company, []);
    }
    companyScores.get(company)?.push(normalizeScore(row.sentiment_score ?? row.sentiment));
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
      if (bucket.length) {
        categorySentiment[issuer][category] = Math.round(bucket.reduce((s, v) => s + v, 0) / bucket.length);
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
  const now = Date.now();
  const windowMs = 30 * 24 * 60 * 60 * 1000;

  for (const row of reviewRows) {
    const category = normalizeCategory(row.primary_category ?? row.category);
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
  }

  const topComplaints: ComplaintRow[] = Array.from(categoryMentions.entries())
    .map(([topic, stats]) => {
      const avg = stats.scores.length ? stats.scores.reduce((s, v) => s + v, 0) / stats.scores.length : 50;
      const denom = Math.max(stats.previous, 1);
      const pctChange = ((stats.current - stats.previous) / denom) * 100;
      const trend: "up" | "down" | "stable" = pctChange > 20 ? "up" : pctChange < -20 ? "down" : "stable";
      return {
        topic,
        mentions: stats.count,
        sentiment: -((100 - avg) / 100),
        trend,
      };
    })
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);

  const topicFrequency: TopicFrequencyRow[] = topComplaints.map((item) => ({
    topic: item.topic,
    frequency: item.mentions,
    negativity: Math.abs(item.sentiment),
    issuer: "Avant",
  }));

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
    const category = normalizeCategory(row.primary_category ?? row.category);
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
  });

  const emotions = Array.from(new Set(reviews.map((review) => review.emotion)));

  return {
    issuers,
    sentimentCategories,
    emotions,
    overallSentiment,
    categorySentiment,
    timeSeriesData,
    topComplaints,
    reviews,
    topicFrequency,
    emergingIssues,
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
        const payload = (await response.json()) as DashboardResponse;

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

export function useAiInsightsData() {
  const [raw, setRaw] = useState<AiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = "/api/ai/insights";

    async function load() {
      try {
        setIsLoading(true);
        const response = await fetch(endpoint, { signal: controller.signal });
        const payload = (await response.json()) as AiResponse;

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
