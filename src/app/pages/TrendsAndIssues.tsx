import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { classifyComplaintRisk, type ComplaintRow, useDashboardData } from "../data/liveData";

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

const RISK_BADGE_CLASS: Record<"Critical" | "Medium" | "Low", string> = {
  Critical: "bg-red-500/20 text-red-400 border-red-500/30",
  Medium: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const RISK_DEFINITION: Record<"Critical" | "Medium" | "Low", string> = {
  Critical: "Critical: fast growth + severe negativity + high mention volume.",
  Medium: "Medium: at least two risk signals are elevated, but escalation threshold is not met.",
  Low: "Low: early or isolated signal; monitor, do not escalate yet.",
};

export function TrendsAndIssues() {
  const { data, isLoading, error } = useDashboardData();
  const { topComplaints, reviews, issuers, categorySentiment, topicWordCloud } = data;

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading trend data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Failed to load trend data: {error}</div>;
  }

  if (!topComplaints.length || !reviews.length) {
    return <div className="p-8 text-muted-foreground">No trend data available.</div>;
  }

  const avantIssuer = issuers.includes("Avant") ? "Avant" : issuers[0] || "Avant";

  const parsedReviews = reviews
    .map((review) => ({
      ...review,
      parsedDate: new Date(review.date),
      score100: Math.round((review.sentiment + 1) * 50),
    }))
    .filter((review) => !Number.isNaN(review.parsedDate.getTime()));

  const now = Date.now();
  const windowMs = 30 * 24 * 60 * 60 * 1000;

  const categoryWordMentions = new Map<string, number>();
  for (const item of topicWordCloud) {
    categoryWordMentions.set(item.category, (categoryWordMentions.get(item.category) || 0) + item.count);
  }

  const rankedCategories = Array.from(categoryWordMentions.entries())
    .map(([category, mentions]) => ({ category, mentions }))
    .sort((a, b) => b.mentions - a.mentions);

  const topCategories = rankedCategories.slice(0, 3);

  const categoryMentionVelocity = new Map<string, { current: number; previous: number }>();
  for (const review of parsedReviews) {
    const reviewTs = review.parsedDate.getTime();
    for (const topic of review.topics) {
      const bucket = categoryMentionVelocity.get(topic) || { current: 0, previous: 0 };
      if (now - reviewTs <= windowMs) bucket.current += 1;
      else if (now - reviewTs <= windowMs * 2) bucket.previous += 1;
      categoryMentionVelocity.set(topic, bucket);
    }
  }

  const categorySignals = rankedCategories.map((row) => {
    const velocity = categoryMentionVelocity.get(row.category) || { current: 0, previous: 0 };
    const wow = Math.round(((velocity.current - velocity.previous) / Math.max(velocity.previous, 1)) * 100);
    const avantCategoryScore = categorySentiment[avantIssuer]?.[row.category] ?? null;
    const peerScores = Object.entries(categorySentiment)
      .filter(([issuer]) => issuer !== avantIssuer)
      .map(([, categories]) => categories[row.category])
      .filter((score): score is number => score !== null && score !== undefined);
    const peerCategoryAvg = peerScores.length
      ? Math.round(peerScores.reduce((sum, score) => sum + score, 0) / peerScores.length)
      : null;

    const sentimentBase = avantCategoryScore ?? peerCategoryAvg ?? 50;
    const riskInput: ComplaintRow = {
      topic: row.category,
      mentions: row.mentions,
      sentiment: -((100 - sentimentBase) / 100),
      trend: wow > 20 ? "up" : wow < -20 ? "down" : "stable",
      weekOverWeekChange: wow,
    };

    return {
      ...row,
      wow,
      avantCategoryScore,
      peerCategoryAvg,
      risk: classifyComplaintRisk(riskInput),
    };
  });

  const criticalSignals = categorySignals
    .filter((row) => row.risk.level === "Critical")
    .sort((a, b) => b.mentions - a.mentions);

  const fallbackComplaint: ComplaintRow = topComplaints[0] || {
    topic: "Uncategorized",
    mentions: 0,
    sentiment: 0,
    trend: "stable",
    weekOverWeekChange: 0,
  };
  const topSignal = criticalSignals[0] || categorySignals[0] || {
    category: fallbackComplaint.topic,
    mentions: fallbackComplaint.mentions,
    wow: fallbackComplaint.weekOverWeekChange,
    avantCategoryScore: null,
    peerCategoryAvg: null,
    risk: classifyComplaintRisk(fallbackComplaint),
  };

  const currentMonthStart = getMonthStartFromDate(new Date());
  const trendMonths = Array.from({ length: 6 }, (_, idx) => addMonths(currentMonthStart, idx - 5));

  const categoryTrendSeries = topCategories.map((categoryRow) => {
    const points = trendMonths.map((monthDate) => {
      const key = monthKey(monthDate);
      const monthRows = parsedReviews.filter((review) => monthKey(getMonthStartFromDate(review.parsedDate)) === key);
      const avantRows = monthRows.filter((review) => review.issuer === avantIssuer && review.topics.includes(categoryRow.category));
      const peerRows = monthRows.filter((review) => review.issuer !== avantIssuer && review.topics.includes(categoryRow.category));

      return {
        month: monthLabel(monthDate),
        avant: avantRows.length
          ? Math.round(avantRows.reduce((sum, row) => sum + row.score100, 0) / avantRows.length)
          : null,
        peerAvg: peerRows.length
          ? Math.round(peerRows.reduce((sum, row) => sum + row.score100, 0) / peerRows.length)
          : null,
      };
    });

    return {
      category: categoryRow.category,
      mentions: categoryRow.mentions,
      points,
    };
  });

  const focusCategory = topCategories[0]?.category || topSignal?.category || topComplaints[0]?.topic;
  const focusAvantScore = topSignal?.avantCategoryScore ?? null;
  const focusPeerScore = topSignal?.peerCategoryAvg ?? null;
  const focusGap = focusAvantScore !== null && focusPeerScore !== null ? focusAvantScore - focusPeerScore : null;

  const focusNarrative =
    focusGap === null
      ? `${avantIssuer} does not yet have enough category-level sentiment records for ${focusCategory} to compare against peers.`
      : focusGap < 0
      ? `${avantIssuer} is currently below peers in ${focusCategory} by ${Math.abs(focusGap)} points.`
      : focusGap > 0
      ? `${avantIssuer} is currently above peers in ${focusCategory} by ${focusGap} points.`
      : `${avantIssuer} is currently at parity with peers in ${focusCategory}.`;

  const complaintRiskRows = topComplaints
    .map((item) => ({
      ...item,
      risk: classifyComplaintRisk(item),
    }))
    .sort((a, b) => {
      const order = { Critical: 3, Medium: 2, Low: 1 };
      if (a.risk.level !== b.risk.level) return order[b.risk.level] - order[a.risk.level];
      return b.mentions - a.mentions;
    });

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Trends & Emerging Issues</h1>
        <p className="text-muted-foreground">Top mention categories, category-level peer benchmarking, and escalation signals</p>
        <div className="mt-3">
          <Badge variant="outline">Scope: 6-month trend window ending this month, based on 2025+ review data</Badge>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-foreground">
                {criticalSignals.length ? "Critical Signal" : "Priority Watchlist"}
              </h3>
              <Badge className={RISK_BADGE_CLASS[topSignal.risk.level]}>{topSignal.risk.level}</Badge>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed mb-3">
              <strong>{topSignal.category}</strong> is the strongest current signal based on word-cloud mention volume, recent mention momentum, and sentiment pressure.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className={RISK_BADGE_CLASS.Critical}>{RISK_DEFINITION.Critical}</Badge>
              <Badge className={RISK_BADGE_CLASS.Medium}>{RISK_DEFINITION.Medium}</Badge>
              <Badge className={RISK_BADGE_CLASS.Low}>{RISK_DEFINITION.Low}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-foreground">Top 3 Categories by Word-Cloud Mentions</h3>
          </div>
          <div className="space-y-3">
            {topCategories.map((row, idx) => (
              <div key={row.category} className="p-3 rounded-lg bg-muted/30 border border-border/60">
                <div className="text-sm font-semibold text-foreground">#{idx + 1} {row.category}</div>
                <div className="text-xs text-muted-foreground mt-1">{row.mentions.toLocaleString()} word-cloud mentions</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-foreground">Avant vs Peers Insight</h3>
          </div>
          <div className="space-y-2">
            <div className="text-lg font-semibold text-foreground">{focusCategory}</div>
            <div className="text-sm text-muted-foreground">{focusNarrative}</div>
            <div className="text-sm text-muted-foreground">
              {avantIssuer} score ({focusCategory}): {focusAvantScore === null ? "N/A" : `${focusAvantScore}/100`}
            </div>
            <div className="text-sm text-muted-foreground">
              Peer average ({focusCategory}): {focusPeerScore === null ? "N/A" : `${focusPeerScore}/100`}
            </div>
            <div className="text-xs text-muted-foreground pt-1">
              Peer average values on this tab are category-specific and are not equivalent to overall peer sentiment on the Executive Dashboard.
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {categoryTrendSeries.map((series) => (
          <Card key={series.category} className="p-6">
            <h3 className="text-base font-semibold text-foreground mb-1">{series.category}: {avantIssuer} vs Peer Average (6 Months)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Based on review rows tagged to this category. Missing months are shown as blanks, not zeros.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={series.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#888" style={{ fontSize: 12 }} />
                <YAxis stroke="#888" style={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="avant" name={avantIssuer} stroke="#3b82f6" strokeWidth={2.5} connectNulls={false} />
                <Line type="monotone" dataKey="peerAvg" name="Peer Avg" stroke="#9ca3af" strokeWidth={2} strokeDasharray="6 4" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Category Risk Signals (All Word-Cloud Categories)</h3>
        <div className="space-y-3">
          {categorySignals.slice(0, 10).map((row) => (
            <div key={row.category} className="p-4 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-foreground">{row.category}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {row.mentions.toLocaleString()} mentions, {row.wow > 0 ? "+" : ""}{row.wow}% recent momentum
                  </div>
                </div>
                <Badge className={RISK_BADGE_CLASS[row.risk.level]}>{row.risk.level}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">All Complaint Topics by Trend</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Right-side % is negative sentiment intensity for the topic. Risk badge uses the same app-wide signal definition.
        </p>
        <div className="space-y-2">
          {complaintRiskRows.map((complaint, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-6 text-center">
                <span className="text-sm font-semibold text-muted-foreground">#{idx + 1}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{complaint.topic}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{complaint.mentions.toLocaleString()} mentions</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 text-right">
                  <Badge
                    className={
                      complaint.trend === "up"
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        : complaint.trend === "down"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    }
                  >
                    {complaint.trend === "up" && "↑ Rising"}
                    {complaint.trend === "down" && "↓ Falling"}
                    {complaint.trend === "stable" && "→ Stable"}
                  </Badge>
                </div>
                <div className="w-24 text-right">
                  <Badge className={RISK_BADGE_CLASS[complaint.risk.level]}>{complaint.risk.level}</Badge>
                </div>
                <div className="w-16 text-right text-sm font-semibold text-red-500">
                  {Math.round(Math.abs(complaint.sentiment) * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
