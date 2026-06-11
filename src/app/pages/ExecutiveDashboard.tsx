import { Card } from "../components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { classifyComplaintRisk, useDashboardData } from "../data/liveData";

function toSlug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const CATEGORY_ALIASES: Record<string, string> = {
  apr_interest: "APR / Interest Rates",
  apr_interest_rates: "APR / Interest Rates",
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
  trust_transparency: "Trust & Transparency",
  collections_hardship: "Collections & Hardship",
  collections: "Collections & Hardship",
  payment_processing: "Payment Processing",
};

function canonicalCategory(raw: string): string {
  const slug = toSlug(raw);
  return CATEGORY_ALIASES[slug] || raw;
}

function getMonthStartFromDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export function ExecutiveDashboard() {
  const { data, isLoading, error } = useDashboardData();
  const { overallSentiment, complaints, issuers, timeSeriesData, reviews } = data;

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Failed to load dashboard data: {error}</div>;
  }

  if (!issuers.length) {
    return <div className="p-8 text-muted-foreground">No dashboard data available.</div>;
  }

  const preferredIssuer = issuers.includes("Avant") ? "Avant" : issuers[0];

  // Use last 6 months from pre-computed timeSeriesData (built from all reviews)
  const currentMonthStart = getMonthStartFromDate(new Date());
  const trendMonths = Array.from({ length: 6 }, (_, idx) => addMonths(currentMonthStart, idx - 5));
  const windowStart = trendMonths[0];

  const recentReviews = reviews.filter((review) => {
    const d = new Date(review.date);
    if (Number.isNaN(d.getTime())) return false;
    return d >= windowStart;
  });

  const recentIssuerScore = new Map<string, { sum: number; count: number }>();
  for (const review of recentReviews) {
    const score100 = Math.round((review.sentiment + 1) * 50);
    const existing = recentIssuerScore.get(review.issuer) || { sum: 0, count: 0 };
    existing.sum += score100;
    existing.count += 1;
    recentIssuerScore.set(review.issuer, existing);
  }

  const latestMonthLabel = monthLabel(trendMonths[trendMonths.length - 1]);
  const latestMonthData = timeSeriesData.find((row) => row.month === latestMonthLabel);

  const avantCurrentMonthScore = latestMonthData && typeof latestMonthData[preferredIssuer] === "number"
    ? (latestMonthData[preferredIssuer] as number)
    : null;
  const peerCurrentMonthScores = issuers
    .filter((name) => name !== preferredIssuer)
    .map((name) => latestMonthData?.[name])
    .filter((v): v is number => typeof v === "number");
  const peerCurrentMonthAvg = peerCurrentMonthScores.length
    ? Math.round(peerCurrentMonthScores.reduce((sum, v) => sum + v, 0) / peerCurrentMonthScores.length)
    : null;

  const currentMonthScoreDiff = avantCurrentMonthScore !== null && peerCurrentMonthAvg !== null
    ? avantCurrentMonthScore - peerCurrentMonthAvg
    : null;

  const avantScore = recentIssuerScore.get(preferredIssuer)
    ? Math.round(recentIssuerScore.get(preferredIssuer)!.sum / recentIssuerScore.get(preferredIssuer)!.count)
    : overallSentiment[preferredIssuer];

  // Get latest month data for rankings (to match sentiment trend chart)
  const rankedIssuers = issuers
    .map(name => {
      const issuerRecent = recentIssuerScore.get(name);
      const score = issuerRecent
        ? Math.round(issuerRecent.sum / issuerRecent.count)
        : overallSentiment[name];
      return { name, score };
    })
    .sort((a, b) => b.score - a.score);
  const leadingIssuer = rankedIssuers[0];

  const recentAvantReviews = recentReviews.filter((review) => review.issuer === preferredIssuer);
  const avantNegativeReviews = recentAvantReviews.filter((review) => Math.round((review.sentiment + 1) * 50) <= 50);

  const categoryNegativeCount = new Map<string, number>();
  const categoryTotalCount = new Map<string, number>();
  const categoryCurrentWindow = new Map<string, number>();
  const categoryPreviousWindow = new Map<string, number>();
  const nowTs = Date.now();
  const windowMs = 30 * 24 * 60 * 60 * 1000;

  for (const review of recentAvantReviews) {
    const topics = Array.from(new Set((review.topics || []).map((t) => canonicalCategory(t))));
    const score100 = Math.round((review.sentiment + 1) * 50);
    const ts = new Date(review.date).getTime();
    for (const topic of topics) {
      categoryTotalCount.set(topic, (categoryTotalCount.get(topic) || 0) + 1);
      if (score100 <= 50) {
        categoryNegativeCount.set(topic, (categoryNegativeCount.get(topic) || 0) + 1);
        if (!Number.isNaN(ts)) {
          if (nowTs - ts <= windowMs) categoryCurrentWindow.set(topic, (categoryCurrentWindow.get(topic) || 0) + 1);
          else if (nowTs - ts <= windowMs * 2) categoryPreviousWindow.set(topic, (categoryPreviousWindow.get(topic) || 0) + 1);
        }
      }
    }
  }

  // Top complaint drivers for Avant only, recent 6 months, ranked by prevalence of negative reviews.
  const dashboardComplaints = Array.from(categoryNegativeCount.entries())
    .map(([topic, negativeCount]) => {
      const total = categoryTotalCount.get(topic) || 0;
      const current = categoryCurrentWindow.get(topic) || 0;
      const previous = categoryPreviousWindow.get(topic) || 0;
      const wow = Math.round(((current - previous) / Math.max(previous, 1)) * 100);
      return {
        topic,
        mentions: negativeCount,
        sentiment: -(total > 0 ? negativeCount / total : 0),
        trend: wow > 20 ? "up" as const : wow < -20 ? "down" as const : "stable" as const,
        weekOverWeekChange: wow,
      };
    })
    .sort((a, b) => b.mentions - a.mentions);
  
  const topComplaint = dashboardComplaints[0];
  const riskRankedComplaints = dashboardComplaints
    .map((item) => ({ item, risk: classifyComplaintRisk(item) }))
    .sort((a, b) => {
      if (a.risk.level !== b.risk.level) {
        const order = { Critical: 3, Medium: 2, Low: 1 };
        return order[b.risk.level] - order[a.risk.level];
      }
      return b.item.mentions - a.item.mentions;
    });
  const criticalIssues = riskRankedComplaints.filter((row) => row.risk.level === "Critical").slice(0, 3);
  const watchIssues = riskRankedComplaints.filter((row) => row.risk.level === "Medium").slice(0, 2);
  const issuerRank = rankedIssuers.findIndex(i => i.name === preferredIssuer) + 1;
  const trendSeries = rankedIssuers;
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b", "#06b6d4", "#84cc16", "#ec4899"];

  const monthlyTrendData = trendMonths.map((monthDate) => {
    const label = monthLabel(monthDate);
    const existing = timeSeriesData.find((row) => row.month === label);
    const row: Record<string, string | number | null> = { month: label };
    for (const issuer of issuers) {
      row[issuer] = existing ? (existing[issuer] ?? null) : null;
    }
    // Competitor avg = mean of all non-Avant issuers for that month
    const peerScores = issuers
      .filter((name) => name !== preferredIssuer)
      .map((name) => row[name])
      .filter((v): v is number => typeof v === "number");
    row.competitorAvg = peerScores.length
      ? Math.round(peerScores.reduce((s, v) => s + v, 0) / peerScores.length)
      : null;
    return row;
  });

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Executive Dashboard</h1>
        <p className="text-muted-foreground">Competitive sentiment analysis across credit card issuers</p>
        <div className="mt-3">
          <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            Scope: market-wide executive view with Avant callouts
          </span>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-blue-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-foreground">Executive Summary</h3>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {preferredIssuer} currently sits {currentMonthScoreDiff !== null ? (currentMonthScoreDiff >= 0 ? `${currentMonthScoreDiff.toFixed(1)} points above` : `${Math.abs(currentMonthScoreDiff).toFixed(1)} points below`) : "at parity with"} the current-month peer average. {topComplaint ? `Most frequent complaint category is ${topComplaint.topic.toLowerCase()} with ${topComplaint.mentions.toLocaleString()} negative reviews in the most recent 6 months.` : "Complaint concentration is currently low and spread across categories."}
            </p>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Overall Sentiment</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-foreground">{avantScore}</div>
              <div className="text-sm text-muted-foreground">/ 100</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-500">
              <TrendingUp className="w-3 h-3" />
              <span>Recent 6-month average</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Current vs Peer Avg</div>
            <div className="flex items-baseline gap-2">
              <div className={`text-3xl font-semibold ${currentMonthScoreDiff !== null && currentMonthScoreDiff >= 0 ? "text-green-500" : "text-orange-500"}`}>
                {currentMonthScoreDiff === null ? "N/A" : `${currentMonthScoreDiff > 0 ? "+" : ""}${currentMonthScoreDiff.toFixed(1)}`}
              </div>
              <div className="text-sm text-muted-foreground">points</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-500">
              <ArrowUpRight className="w-3 h-3" />
              <span>Current month overall score delta</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Current Rank</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-foreground">
                #{issuerRank}
              </div>
              <div className="text-sm text-muted-foreground">of {issuers.length}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              {leadingIssuer?.name} leads at {leadingIssuer?.score} (recent 6-month avg)
            </div>
          </div>
        </Card>

        <Card className="p-5 border-orange-500/20 bg-orange-500/5">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              Critical Issues
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-orange-500">{criticalIssues.length}</div>
              <div className="text-sm text-muted-foreground">Data-flagged</div>
            </div>
            <div className="space-y-1">
              {criticalIssues.length > 0 ? (
                criticalIssues.map(({ item, risk }, idx) => (
                  <div key={idx} className="text-xs text-orange-500/90 leading-snug">
                    <span className="font-semibold">{item.topic}</span>: {risk.reasons.join(", ")}.
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground leading-snug">
                  No category currently meets the critical threshold.
                </div>
              )}
              {watchIssues.length > 0 && (
                <div className="text-xs text-muted-foreground leading-snug pt-1">
                  Watchlist: {watchIssues.map((row) => row.item.topic).join(", ")}.
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sentiment Trend */}
        <Card className="p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Sentiment Trend (6 Months)</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Shows monthly review sentiment for each issuer plus the non-Avant competitor average for context. Months with no data are left blank rather than invented.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#888" style={{ fontSize: 12 }} />
              <YAxis stroke="#888" style={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px"
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {trendSeries.map((issuer, idx) => (
                <Line
                  key={issuer.name}
                  type="monotone"
                  dataKey={issuer.name}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={issuer.name === "Avant" ? 2.5 : 1.5}
                  connectNulls={false}
                />
              ))}
              <Line
                type="monotone"
                dataKey="competitorAvg"
                name="Competitor Avg"
                stroke="#9ca3af"
                strokeDasharray="6 4"
                strokeWidth={2}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Competitor Rankings */}
        <Card className="p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Competitive Rankings</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rankedIssuers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#888" style={{ fontSize: 12 }} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" stroke="#888" style={{ fontSize: 12 }} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px"
                }}
                itemStyle={{ color: "#f3f4f6" }}
                labelStyle={{ color: "#f9fafb", fontWeight: 600 }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {rankedIssuers.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.name === "Avant" ? "#3b82f6" : "#6b7280"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Complaint Drivers */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Top Complaint Drivers</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Avant-only, recent 6 months. Count = negative reviews (sentiment score ≤ 50) in this category. The % bar shows prevalence of negative reviews within that category. Arrows show latest 30-day movement vs prior 30-day window.
        </p>
        <div className="space-y-3">
          {dashboardComplaints.slice(0, 6).map((complaint, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-6 text-center">
                <span className="text-sm font-semibold text-muted-foreground">#{idx + 1}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{complaint.topic}</div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-muted-foreground">{complaint.mentions.toLocaleString()} negative reviews</div>
                <div className="flex items-center gap-1">
                  {complaint.trend === "up" && <TrendingUp className="w-4 h-4 text-orange-500" />}
                  {complaint.trend === "down" && <TrendingDown className="w-4 h-4 text-green-500" />}
                  {complaint.trend === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="w-24">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${Math.abs(complaint.sentiment) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {Math.round(Math.abs(complaint.sentiment) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Sentiment Score Calculation Footnote */}
      <div className="border-t border-border pt-4 mt-8">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Sentiment Score Methodology:</strong> Each review score blends text and rating signals using sentiment_raw = 0.8 × text_sentiment_raw + 0.2 × rating_sentiment_raw. Rating sentiment uses rating_sentiment_raw = (rating − 3) / 2. The blended raw score is normalized to a 0–100 scale as sentiment_score = normalize(sentiment_raw), where higher means more positive. Dashboard scores are simple averages of review-level sentiment_score values over the selected window. Reviews with sentiment score ≤ 50 are classified as negative for complaint prevalence, and peer average is the mean of non-Avant issuers.
        </p>
      </div>
    </div>
  );
}
