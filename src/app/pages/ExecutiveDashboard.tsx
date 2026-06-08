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
import { useDashboardData } from "../data/liveData";

function getMonthStartFromDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export function ExecutiveDashboard() {
  const { data, isLoading, error } = useDashboardData();
  const { overallSentiment, topComplaints, executiveTopComplaints, issuers, reviews } = data;

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
  const avantScore = overallSentiment[preferredIssuer];
  const avgCompetitorScore = Object.entries(overallSentiment)
    .filter(([name]) => name !== preferredIssuer)
    .reduce((sum, [, score]) => sum + score, 0) / Math.max(issuers.length - 1, 1);
  const scoreDiff = avantScore - avgCompetitorScore;

  const rankedIssuers = issuers
    .map(name => ({ name, score: overallSentiment[name] }))
    .sort((a, b) => b.score - a.score);
  const leadingIssuer = rankedIssuers[0];
  const dashboardComplaints = executiveTopComplaints.length ? executiveTopComplaints : topComplaints;
  const topComplaint = dashboardComplaints[0];
  const flaggedIssues = dashboardComplaints.slice(0, 3);
  const issuerRank = rankedIssuers.findIndex(i => i.name === preferredIssuer) + 1;
  const trendSeries = rankedIssuers.slice(0, 4);
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#ef4444"];

  const parsedReviews = reviews
    .map((review) => ({
      ...review,
      date: new Date(review.date),
      score100: Math.round((review.sentiment + 1) * 50),
    }))
    .filter((review) => !Number.isNaN(review.date.getTime()));

  const latestReviewDate = parsedReviews.length
    ? new Date(Math.max(...parsedReviews.map((review) => review.date.getTime())))
    : new Date();
  const latestMonthStart = getMonthStartFromDate(latestReviewDate);

  const trendMonths = Array.from({ length: 6 }, (_, idx) => addMonths(latestMonthStart, idx - 5));

  const monthlyTrendData = trendMonths.map((monthDate) => {
    const key = monthKey(monthDate);
    const monthReviews = parsedReviews.filter((review) => monthKey(getMonthStartFromDate(review.date)) === key);
    const row: Record<string, string | number | null> = { month: monthLabel(monthDate) };

    for (const issuer of issuers) {
      const issuerReviews = monthReviews.filter((review) => review.issuer === issuer);
      row[issuer] = issuerReviews.length
        ? Math.round(issuerReviews.reduce((sum, review) => sum + review.score100, 0) / issuerReviews.length)
        : null;
    }

    const competitorReviews = monthReviews.filter((review) => review.issuer !== preferredIssuer);
    row.competitorAvg = competitorReviews.length
      ? Math.round(competitorReviews.reduce((sum, review) => sum + review.score100, 0) / competitorReviews.length)
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
              {preferredIssuer} currently sits {scoreDiff >= 0 ? `${scoreDiff.toFixed(1)} points above` : `${Math.abs(scoreDiff).toFixed(1)} points below`} the competitive average. {topComplaint ? `Most frequent complaint driver since 2025 is ${topComplaint.topic.toLowerCase()} with ${topComplaint.mentions.toLocaleString()} complaint-review mentions in ${preferredIssuer} reviews.` : "Complaint concentration is currently low and spread across categories."}
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
              <span>+2 vs last month</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">vs Competitor Avg</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-green-500">+{scoreDiff.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">points</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-500">
              <ArrowUpRight className="w-3 h-3" />
              <span>Leading category average</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Category Rank</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-semibold text-foreground">
                #{issuerRank}
              </div>
              <div className="text-sm text-muted-foreground">of {issuers.length}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              {leadingIssuer?.name} leads at {leadingIssuer?.score}
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
              <div className="text-3xl font-semibold text-orange-500">{flaggedIssues.length}</div>
              <div className="text-sm text-muted-foreground">Data-flagged</div>
            </div>
            <div className="space-y-1">
              {flaggedIssues.map((item, idx) => (
                <div key={idx} className="text-xs text-orange-500/90 leading-snug">
                  <span className="font-semibold">{item.topic}</span>: High relevant term volume and negative sentiment pressure in this category.
                </div>
              ))}
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
          Mentions = relevant term occurrences in {preferredIssuer} review text. The % bar is negative sentiment intensity for that topic (higher means more negative). Arrows show 30-day topic trend vs the prior 30-day window.
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
                <div className="text-muted-foreground">{complaint.mentions.toLocaleString()} mentions</div>
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
    </div>
  );
}
