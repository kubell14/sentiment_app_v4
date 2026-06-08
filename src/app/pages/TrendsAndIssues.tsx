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
  AreaChart,
  Area
} from "recharts";
import { TrendingUp, AlertTriangle, Clock, Activity } from "lucide-react";
import { useDashboardData } from "../data/liveData";

export function TrendsAndIssues() {
  const { data, isLoading, error } = useDashboardData();
  const { emergingIssues, topComplaints, reviews } = data;

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading trend data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Failed to load trend data: {error}</div>;
  }

  if (!topComplaints.length) {
    return <div className="p-8 text-muted-foreground">No trend data available.</div>;
  }

  const complaintRiskRows = topComplaints.map((item) => {
    const rising = item.weekOverWeekChange > 0;
    const severeSentiment = Math.abs(item.sentiment) >= 0.7;
    const highVolume = item.mentions >= 40;
    const riskScore =
      (rising ? 1 : 0) +
      (severeSentiment ? 1 : 0) +
      (highVolume ? 1 : 0);

    let severity: "Critical" | "High" | "Medium" = "Medium";
    if (riskScore >= 3) severity = "Critical";
    else if (riskScore === 2) severity = "High";

    return {
      ...item,
      severity,
      riskScore,
      urgent: severity === "Critical" || severity === "High",
    };
  });

  const toWeekStart = (dateInput: string) => {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return null;
    const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = utc.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    utc.setUTCDate(utc.getUTCDate() + diffToMonday);
    return utc;
  };

  const weekLabel = (start: Date) => {
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  };

  const reviewWithWeek = reviews
    .map((review) => {
      const weekStart = toWeekStart(review.date);
      if (!weekStart) return null;
      return {
        ...review,
        weekKey: weekStart.toISOString().slice(0, 10),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const maxReviewDate = reviewWithWeek.length
    ? new Date(Math.max(...reviewWithWeek.map((row) => new Date(row.date).getTime())))
    : new Date();
  const latestWeekStart = toWeekStart(maxReviewDate.toISOString()) || new Date();

  const weekKeys: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const week = new Date(latestWeekStart);
    week.setUTCDate(latestWeekStart.getUTCDate() - i * 7);
    weekKeys.push(week.toISOString().slice(0, 10));
  }

  const reviewWeeks = new Set(weekKeys);
  const complaintReviews = reviewWithWeek.filter((row) => reviewWeeks.has(row.weekKey));

  const complaintCountsByTopic = new Map<string, number>();
  for (const row of complaintReviews) {
    for (const topic of row.topics) {
      complaintCountsByTopic.set(topic, (complaintCountsByTopic.get(topic) || 0) + 1);
    }
  }

  const headlineIssue = Array.from(complaintCountsByTopic.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || (emergingIssues.length ? emergingIssues[0]?.issue : topComplaints[0]?.topic) || "Complaint concentration";
  const urgentTopics = new Set(
    complaintRiskRows
      .filter((item) => item.urgent)
      .map((item) => item.topic)
  );
  if (headlineIssue) {
    urgentTopics.add(headlineIssue);
  }

  const issueTimeSeries = weekKeys.map((weekKey) => {
    const mentions = complaintReviews.filter((row) => row.weekKey === weekKey && row.topics.includes(headlineIssue)).length;
    return {
      date: weekLabel(new Date(`${weekKey}T00:00:00Z`)),
      mentions,
    };
  });

  const volumeTrends = weekKeys.map((weekKey) => {
    const rows = complaintReviews.filter((row) => row.weekKey === weekKey);
    const urgent = rows.filter((row) => row.topics.some((topic) => urgentTopics.has(topic))).length;
    return {
      week: weekLabel(new Date(`${weekKey}T00:00:00Z`)),
      total: rows.length,
      urgent,
    };
  });

  const derivedIssues = (emergingIssues.length ? emergingIssues : topComplaints.slice(0, 3).map((item) => ({
    issue: item.topic,
    mentions: item.mentions,
    weekOverWeekChange: item.weekOverWeekChange,
    sentiment: item.sentiment,
    firstDetected: "2025-01-01",
    peakDate: new Date().toISOString().slice(0, 10),
  })));

  const hasHistoricalComplaints = volumeTrends.some((row) => row.total > 0);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Trends & Emerging Issues</h1>
        <p className="text-muted-foreground">Real-time detection of complaint spikes and anomalies</p>
        <div className="mt-3">
          <Badge variant="outline">Scope: market-wide trend detection from 2025+ reviews only</Badge>
        </div>
      </div>

      {/* Alert Banner */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-foreground">Critical Alert: Emerging Complaint Spike</h3>
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">Data-driven</Badge>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed mb-3">
              <strong>{headlineIssue}</strong> is the current high-priority concern because it is among the highest-volume complaint categories and has recent momentum in 2025+ review data.
            </p>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              Requires Immediate Attention
            </Badge>
          </div>
        </div>
      </Card>

      {/* Trend Interpretation */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-foreground">Trend Interpretation</h3>
        </div>
        <div className="space-y-3">
          {derivedIssues.slice(0, 3).map((item, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-orange-500/20 bg-orange-500/5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.issue}</div>
                  <div className="text-xs text-muted-foreground">Detected from recent mention growth and sentiment pressure</div>
                </div>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  {item.weekOverWeekChange > 20 ? "Critical" : item.weekOverWeekChange > 5 ? "High" : "Medium"}
                </Badge>
              </div>
              <div className="text-sm text-foreground/80 mb-2">
                {item.issue} is {item.weekOverWeekChange > 0 ? "increasing" : "stable"} and contributing to dissatisfaction in the latest review window.
              </div>
              <div className="text-xs text-muted-foreground">
                Evidence: {item.weekOverWeekChange > 0 ? "+" : ""}{item.weekOverWeekChange}% WoW mention change, {item.mentions} mentions.
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Emerging Issues */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-foreground">Emerging Issues</h3>
        </div>
        <div className="space-y-4">
          {derivedIssues.slice(0, 3).map((issue, idx) => (
            <div key={idx} className="p-5 rounded-lg border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-1">{issue.issue}</h4>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Detected from 2025+ mention movement
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {issue.weekOverWeekChange > 20 ? "Escalate this issue this week" : "Monitor weekly"}
                    </div>
                  </div>
                </div>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-semibold">
                  {issue.weekOverWeekChange > 20 ? "Critical" : issue.weekOverWeekChange > 5 ? "High" : "Medium"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-orange-500/20">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Direction</div>
                  <div className="text-lg font-semibold text-foreground capitalize">{issue.weekOverWeekChange > 0 ? "up" : issue.weekOverWeekChange < 0 ? "down" : "stable"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Evidence</div>
                  <div className="text-lg font-semibold text-red-500">{issue.weekOverWeekChange > 0 ? "+" : ""}{issue.weekOverWeekChange}% WoW</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Interpretation</div>
                  <div className="flex items-center gap-1 text-orange-500">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-semibold">{issue.issue} is a top complaint pressure point in current-period reviews.</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Issue Timeline */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Issue Timeline: {headlineIssue}
        </h3>
        {hasHistoricalComplaints ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={issueTimeSeries}>
              <defs>
                <linearGradient id="colorMentions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" style={{ fontSize: 12 }} />
              <YAxis stroke="#888" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px"
                }}
              />
              <Area
                type="monotone"
                dataKey="mentions"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#colorMentions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
            No dated complaint records were found for this period.
          </div>
        )}
      </Card>

      {/* Overall Complaint Volume Trends */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Overall Complaint Volume (6 Weeks)</h3>
        {hasHistoricalComplaints ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={volumeTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="week" stroke="#888" style={{ fontSize: 12 }} />
              <YAxis stroke="#888" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px"
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="total" name="Total Complaints" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="urgent" name="Urgent/Critical" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
            No dated complaint records were found for this period.
          </div>
        )}
      </Card>

      {/* Top Trending Complaints */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">All Complaint Topics by Trend</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Right-side red % = negative sentiment intensity for that complaint topic (derived from normalized sentiment score where 100% is most negative).
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
                <div className="w-20 text-right">
                  <Badge
                    className={
                      complaint.severity === "Critical"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : complaint.severity === "High"
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        : "bg-slate-500/20 text-slate-300 border-slate-500/30"
                    }
                  >
                    {complaint.severity}
                  </Badge>
                </div>
                <div className="w-16 text-right text-sm font-semibold text-red-500">
                  {Math.round(Math.abs(complaint.sentiment) * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 border-dashed bg-muted/20">
        <h4 className="text-xs font-semibold text-foreground mb-2">Methodology Footnote</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Scope: this tab uses all issuers from 2025+ review records, not only Avant.</p>
          <p>Complaint categories are assigned by normalized category labels and keyword inference from review text.</p>
          <p>Sentiment scoring is normalized to a 0-100 scale, then converted to a topic negativity intensity shown as a percentage.</p>
          <p>Week-over-week percentages represent mention-volume change between consecutive windows, not sentiment delta.</p>
          <p>Urgent/Critical flags are assigned from a composite of momentum (WoW), negativity intensity, and topic volume.</p>
          <p>Timeline and volume charts are built from real dated weekly review counts in the selected 6-week window.</p>
        </div>
      </Card>
    </div>
  );
}
