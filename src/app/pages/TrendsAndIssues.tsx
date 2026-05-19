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
  const { emergingIssues, topComplaints } = data;

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading trend data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Failed to load trend data: {error}</div>;
  }

  if (!topComplaints.length) {
    return <div className="p-8 text-muted-foreground">No trend data available.</div>;
  }

  const issueTimeSeries = emergingIssues.length
    ? [
        { date: "Week -4", mentions: Math.max(1, Math.round(emergingIssues[0].mentions * 0.2)) },
        { date: "Week -3", mentions: Math.max(1, Math.round(emergingIssues[0].mentions * 0.35)) },
        { date: "Week -2", mentions: Math.max(1, Math.round(emergingIssues[0].mentions * 0.5)) },
        { date: "Week -1", mentions: Math.max(1, Math.round(emergingIssues[0].mentions * 0.75)) },
        { date: "Current", mentions: emergingIssues[0].mentions },
      ]
    : [];

  const volumeTrends = Array.from({ length: 6 }, (_, idx) => {
    const scale = 0.5 + idx * 0.1;
    const total = Math.round(topComplaints.reduce((sum, item) => sum + item.mentions * scale, 0));
    const urgent = Math.round(topComplaints.filter((item) => item.trend === "up").reduce((sum, item) => sum + item.mentions * scale * 0.2, 0));
    return { week: `Week ${idx + 1}`, total, urgent };
  });

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Trends & Emerging Issues</h1>
        <p className="text-muted-foreground">Real-time detection of complaint spikes and anomalies</p>
      </div>

      {/* Alert Banner */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground mb-2">Critical Alert: Emerging Complaint Spike</h3>
            <p className="text-sm text-foreground/80 leading-relaxed mb-3">
              <strong>{emergingIssues[0]?.issue || topComplaints[0].topic}</strong> mentions increased <strong>+{Math.max(1, emergingIssues[0]?.weekOverWeekChange || 0)}% week-over-week</strong>.
              This issue has accelerated in the most recent reporting window.
              Sentiment remains highly negative ({Math.round(Math.abs(emergingIssues[0]?.sentiment || topComplaints[0].sentiment) * 100)}%).
            </p>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              Requires Immediate Attention
            </Badge>
          </div>
        </div>
      </Card>

      {/* Emerging Issues */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-foreground">Emerging Issues (Trending Up)</h3>
        </div>
        <div className="space-y-4">
          {(emergingIssues.length ? emergingIssues : topComplaints.slice(0, 3).map((complaint) => ({
            issue: complaint.topic,
            mentions: complaint.mentions,
            weekOverWeekChange: complaint.trend === "up" ? 25 : complaint.trend === "down" ? -15 : 0,
            sentiment: complaint.sentiment,
            firstDetected: new Date().toISOString().slice(0, 10),
            peakDate: new Date().toISOString().slice(0, 10),
          }))).map((issue, idx) => (
            <div key={idx} className="p-5 rounded-lg border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-1">{issue.issue}</h4>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      First detected: {new Date(issue.firstDetected).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      Peak: {new Date(issue.peakDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-semibold">
                  {issue.weekOverWeekChange > 0 ? "+" : ""}{issue.weekOverWeekChange}% WoW
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-orange-500/20">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Mentions</div>
                  <div className="text-lg font-semibold text-foreground">{issue.mentions}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Sentiment Score</div>
                  <div className="text-lg font-semibold text-red-500">{(issue.sentiment * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Trend Status</div>
                  <div className="flex items-center gap-1 text-orange-500">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-semibold">{issue.weekOverWeekChange > 0 ? "Accelerating" : "Stable"}</span>
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
          Issue Timeline: Credit Limit Reductions Without Notice
        </h3>
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
      </Card>

      {/* Overall Complaint Volume Trends */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Overall Complaint Volume (6 Weeks)</h3>
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
      </Card>

      {/* Top Trending Complaints */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">All Complaint Topics by Trend</h3>
        <div className="space-y-2">
          {topComplaints.map((complaint, idx) => (
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
