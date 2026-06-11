import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { CategoryExplorer } from "../components/CategoryExplorer";
import { MomentumChart } from "../components/MomentumChart";
import { TrendingUp, AlertTriangle, Activity } from "lucide-react";
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
  return date.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

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

const RISK_BADGE_CLASS: Record<"Critical" | "Medium" | "Low", string> = {
  Critical: "bg-red-500/20 text-red-400 border-red-500/30",
  Medium: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const RISK_DEFINITION: Record<"Critical" | "Medium" | "Low", string> = {
  Critical: "Critical: negative sentiment + at least 25% Avant mention share + accelerating momentum.",
  Medium: "Medium: negative sentiment with either elevated share or positive momentum.",
  Low: "Low: does not meet escalation conditions.",
};

export function TrendsAndIssues() {
  const { data, isLoading, error } = useDashboardData();
  const { reviews, issuers, categorySentiment, topicWordCloud } = data;

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading trend data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Failed to load trend data: {error}</div>;
  }

  if (!reviews.length) {
    return <div className="p-8 text-muted-foreground">No trend data available.</div>;
  }

  const avantIssuer = issuers.includes("Avant") ? "Avant" : issuers[0] || "Avant";
  const scopeStart = new Date("2025-01-01T00:00:00Z");

  const parsedReviews = reviews
    .map((review) => ({
      ...review,
      parsedDate: new Date(review.date),
      score100: Math.round((review.sentiment + 1) * 50),
      canonicalTopics: Array.from(new Set((review.topics || []).map((topic) => canonicalCategory(topic)))),
    }))
    .filter((review) => !Number.isNaN(review.parsedDate.getTime()) && review.parsedDate >= scopeStart);

  const currentMonthStart = getMonthStartFromDate(new Date());
  const trendMonths = Array.from({ length: 6 }, (_, idx) => addMonths(currentMonthStart, idx - 5));
  const thisMonthKey = monthKey(trendMonths[trendMonths.length - 1]);
  const lastMonthKey = monthKey(trendMonths[trendMonths.length - 2]);
  const previousMonthKey = monthKey(trendMonths[trendMonths.length - 3]);
  const sixMonthStart = trendMonths[0];
  const recentSixMonthReviews = parsedReviews.filter((review) => review.parsedDate >= sixMonthStart);

  // Pre-index monthly/category/issuer sentiment to avoid repeated full-array scans.
  const monthlyCategoryIssuerScores = new Map<string, { sum: number; count: number }>();
  const recent6CategoryIssuerScores = new Map<string, { sum: number; count: number }>();
  const avantCategoryCountsRecent6 = new Map<string, number>();
  const avantCategoryMonthMentions = new Map<string, number>();
  const avantTotalMentionsByMonth = new Map<string, number>();
  for (const review of parsedReviews) {
    const keyMonth = monthKey(getMonthStartFromDate(review.parsedDate));
    for (const category of review.canonicalTopics) {
      const metricKey = `${keyMonth}|${review.issuer}|${category}`;
      const existing = monthlyCategoryIssuerScores.get(metricKey) || { sum: 0, count: 0 };
      existing.sum += review.score100;
      existing.count += 1;
      monthlyCategoryIssuerScores.set(metricKey, existing);

      if (review.parsedDate >= sixMonthStart) {
        const recentKey = `${review.issuer}|${category}`;
        const recentAgg = recent6CategoryIssuerScores.get(recentKey) || { sum: 0, count: 0 };
        recentAgg.sum += review.score100;
        recentAgg.count += 1;
        recent6CategoryIssuerScores.set(recentKey, recentAgg);
      }

      if (review.issuer === avantIssuer) {
        if (review.parsedDate >= sixMonthStart) {
          avantCategoryCountsRecent6.set(category, (avantCategoryCountsRecent6.get(category) || 0) + 1);
        }
        const monthCategoryKey = `${keyMonth}|${category}`;
        avantCategoryMonthMentions.set(monthCategoryKey, (avantCategoryMonthMentions.get(monthCategoryKey) || 0) + 1);
        avantTotalMentionsByMonth.set(keyMonth, (avantTotalMentionsByMonth.get(keyMonth) || 0) + 1);
      }
    }
  }

  const categoryWordMentions = new Map<string, number>();
  for (const item of topicWordCloud) {
    const category = canonicalCategory(item.category);
    categoryWordMentions.set(category, (categoryWordMentions.get(category) || 0) + item.count);
  }

  const allCategories = new Set<string>([
    ...Array.from(categoryWordMentions.keys()),
    ...Array.from(avantCategoryCountsRecent6.keys()),
  ]);

  const categorySignals = Array.from(allCategories)
    .map((category) => {
      const mentions = avantCategoryCountsRecent6.get(category) || 0;
      const thisMentions = avantCategoryMonthMentions.get(`${thisMonthKey}|${category}`) || 0;
      const lastMentions = avantCategoryMonthMentions.get(`${lastMonthKey}|${category}`) || 0;
      const prevMentions = avantCategoryMonthMentions.get(`${previousMonthKey}|${category}`) || 0;

      const thisTotalMentions = avantTotalMentionsByMonth.get(thisMonthKey) || 0;
      const lastTotalMentions = avantTotalMentionsByMonth.get(lastMonthKey) || 0;
      const prevTotalMentions = avantTotalMentionsByMonth.get(previousMonthKey) || 0;

      const thisShare = thisTotalMentions > 0 ? (thisMentions / thisTotalMentions) * 100 : 0;
      const lastShare = lastTotalMentions > 0 ? (lastMentions / lastTotalMentions) * 100 : 0;
      const prevShare = prevTotalMentions > 0 ? (prevMentions / prevTotalMentions) * 100 : 0;

      // Momentum definition requested: this month share - last month share.
      const wow = Number((thisShare - lastShare).toFixed(1));
      const previousMomentum = Number((lastShare - prevShare).toFixed(1));
      const gainingMomentum = wow > previousMomentum;

      const avantAgg = recent6CategoryIssuerScores.get(`${avantIssuer}|${category}`);
      const avantCategoryScore = avantAgg ? Math.round(avantAgg.sum / avantAgg.count) : null;
      const peerAggs = issuers
        .filter((issuer) => issuer !== avantIssuer)
        .map((issuer) => recent6CategoryIssuerScores.get(`${issuer}|${category}`))
        .filter((v): v is { sum: number; count: number } => !!v);
      const peerCategoryAvg = peerAggs.length
        ? Math.round(peerAggs.reduce((sum, agg) => sum + agg.sum, 0) / peerAggs.reduce((sum, agg) => sum + agg.count, 0))
        : null;

      const negativeSentiment = (avantCategoryScore ?? 50) < 50;
      const highVolume = thisShare >= 25;

      const riskLevel: "Critical" | "Medium" | "Low" =
        negativeSentiment && highVolume && gainingMomentum
          ? "Critical"
          : negativeSentiment && (highVolume || wow > 0)
          ? "Medium"
          : "Low";

      return {
        category,
        mentions,
        wow,
        thisShare,
        lastShare,
        previousMomentum,
        gainingMomentum,
        avantCategoryScore,
        peerCategoryAvg,
        gap: avantCategoryScore !== null && peerCategoryAvg !== null ? avantCategoryScore - peerCategoryAvg : null,
        risk: { level: riskLevel },
      };
    })
    .filter((row) => row.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions);

  const criticalSignals = categorySignals
    .filter((row) => row.risk.level === "Critical")
    .sort((a, b) => b.mentions - a.mentions);
  const topSignal = criticalSignals[0] || categorySignals[0] || null;
  const largestGap = categorySignals
    .filter((row) => row.mentions >= 10)
    .filter((row) => row.gap !== null)
    .sort((a, b) => Math.abs((b.gap as number)) - Math.abs((a.gap as number)))[0] || null;

  // Calculate recent sentiment declines (current month vs previous month)
  const recentDeclines = Array.from(allCategories)
    .map((category) => {
      const currentMetric = monthlyCategoryIssuerScores.get(`${thisMonthKey}|${avantIssuer}|${category}`);
      const previousMetric = monthlyCategoryIssuerScores.get(`${lastMonthKey}|${avantIssuer}|${category}`);

      const currentScore = currentMetric ? Math.round(currentMetric.sum / currentMetric.count) : null;
      const previousScore = previousMetric ? Math.round(previousMetric.sum / previousMetric.count) : null;
      
      if (currentScore === null || previousScore === null) {
        return null;
      }
      
      const decline = previousScore - currentScore;
      return { category, decline, currentScore, previousScore };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.decline >= 5)
    .sort((a, b) => b.decline - a.decline);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Trends & Emerging Issues</h1>
        <p className="text-muted-foreground">Executive signal view: unified mentions, momentum, and category-level peer gaps</p>
        <div className="mt-3">
          <Badge variant="outline">Scope: Jan 2025 onward, with 6-month windows where specified</Badge>
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
              {topSignal && <Badge className={RISK_BADGE_CLASS[topSignal.risk.level]}>{topSignal.risk.level}</Badge>}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed mb-3">
              {topSignal
                ? <><strong>{topSignal.category}</strong> is the strongest current Avant signal based on mentions, recent momentum, and sentiment pressure.</>
                : <>No high-confidence Avant-specific category signal is available yet for this period.</>}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className={RISK_BADGE_CLASS.Critical}>{RISK_DEFINITION.Critical}</Badge>
              <Badge className={RISK_BADGE_CLASS.Medium}>{RISK_DEFINITION.Medium}</Badge>
              <Badge className={RISK_BADGE_CLASS.Low}>{RISK_DEFINITION.Low}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-foreground">Top Category by Mentions</h3>
          </div>
          <div className="space-y-2">
            <div className="text-lg font-semibold text-foreground">{categorySignals[0]?.category || "N/A"}</div>
            <div className="text-sm text-muted-foreground">
              {categorySignals[0] ? `${categorySignals[0].mentions.toLocaleString()} mentions` : "No data"}
            </div>
            <div className="text-sm text-muted-foreground">
              {categorySignals[0] ? `${categorySignals[0].wow > 0 ? "+" : ""}${categorySignals[0].wow} pts momentum` : "No data"}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-foreground">Recent Sentiment Declines</h3>
          </div>
          <div className="space-y-2">
            {recentDeclines.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">Categories where Avant's sentiment dropped ≥5 points this month:</p>
                {recentDeclines.slice(0, 3).map((decline) => (
                  <div key={decline.category} className="text-sm">
                    <div className="font-medium text-foreground">{decline.category}</div>
                    <div className="text-xs text-red-400">
                      {decline.previousScore} → {decline.currentScore} ({decline.decline > 0 ? "-" : ""}{decline.decline} pts)
                    </div>
                  </div>
                ))}
                {recentDeclines.length > 3 && (
                  <div className="text-xs text-muted-foreground pt-1">
                    +{recentDeclines.length - 3} more declining
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No significant declines this month</div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-foreground">Largest Category Gap</h3>
          </div>
          <div className="space-y-2">
            <div className="text-lg font-semibold text-foreground">{largestGap?.category || "N/A"}</div>
            <div className="text-sm text-muted-foreground">
              {largestGap?.gap === null || largestGap?.gap === undefined
                ? "No comparable score"
                : largestGap.gap < 0
                ? `${avantIssuer} is ${Math.abs(largestGap.gap)} points below peers`
                : `${avantIssuer} is ${largestGap.gap} points above peers`}
            </div>
            <div className="text-sm text-muted-foreground">
              {largestGap ? `${largestGap.mentions.toLocaleString()} Avant mentions (recent 6 months)` : "No qualifying category (minimum 10 Avant mentions)"}
            </div>
          </div>
        </Card>
      </div>

      <CategoryExplorer data={data} />

      <MomentumChart data={data} />

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-2">Category Signals</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Mentions = Avant mentions over the most recent 6 months. Momentum = this month category share minus last month category share (percentage points). Risk uses Avant-only escalation rules. Gap = Avant sentiment score minus peer average over the most recent 6 months.
            </p>
          </div>
          <div className="grid grid-cols-[1fr_120px_100px_100px] gap-3 px-4 text-[11px] uppercase tracking-wide text-muted-foreground">
            <div>Category</div>
            <div className="text-right">Momentum</div>
            <div className="text-right">Risk</div>
            <div className="text-right">Gap</div>
          </div>
          <div className="space-y-2">
            {categorySignals.slice(0, 12).map((row, idx) => (
              <div key={row.category} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 w-6 text-center">
                  <span className="text-sm font-semibold text-muted-foreground">#{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{row.category}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{row.mentions.toLocaleString()} mentions</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28 text-right">
                    <Badge
                      className={
                        row.wow > 0
                          ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                          : row.wow < 0
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }
                    >
                      {row.wow > 0 && "↑ Rising"}
                      {row.wow < 0 && "↓ Falling"}
                      {row.wow === 0 && "→ Flat"}
                    </Badge>
                  </div>
                  <div className="w-24 text-right">
                    <Badge className={RISK_BADGE_CLASS[row.risk.level]}>{row.risk.level}</Badge>
                  </div>
                  <div
                    className={`w-24 text-right text-sm font-semibold ${
                      row.gap === null
                        ? "text-muted-foreground"
                        : row.gap > 0
                        ? "text-green-500"
                        : row.gap < 0
                        ? "text-red-500"
                        : "text-yellow-500"
                    }`}
                    title="Avant vs Peer Gap"
                  >
                    {row.gap === null ? "N/A" : `${row.gap > 0 ? "+" : ""}${row.gap}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
