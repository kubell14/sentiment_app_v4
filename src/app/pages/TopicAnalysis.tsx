import { useState } from "react";
import { Card } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell
} from "recharts";
import { Filter, Search } from "lucide-react";
import { Input } from "../components/ui/input";
import { useDashboardData } from "../data/liveData";

export function TopicAnalysis() {
  const { data, isLoading, error } = useDashboardData();
  const { issuers, sentimentCategories, categorySentiment, topicFrequency, topicWordCloud } = data;
  const [selectedIssuer, setSelectedIssuer] = useState<string>("all");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading topic analysis...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Failed to load topic analysis: {error}</div>;
  }

  if (!issuers.length) {
    return <div className="p-8 text-muted-foreground">No topic data available.</div>;
  }

  // Prepare heatmap data
  const heatmapData = issuers.map(issuer => {
    const row: any = { issuer };
    sentimentCategories.forEach(cat => {
      row[cat] = categorySentiment[issuer]?.[cat] || 0;
    });
    return row;
  });

  // Filter heatmap by issuer
  const filteredHeatmap = selectedIssuer === "all"
    ? heatmapData
    : heatmapData.filter(d => d.issuer === selectedIssuer);

  const colorFromTopic = (topic: string) => {
    let hash = 0;
    for (let i = 0; i < topic.length; i += 1) {
      hash = (hash * 31 + topic.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    return `hsl(${hue} 65% 52%)`;
  };

  // Prepare bubble chart data (frequency vs negativity)
  const filteredTopics = topicFrequency
    .filter((item) => selectedIssuer === "all" || item.issuer === selectedIssuer)
    .filter((item) => searchTerm === "" || item.topic.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((item) => {
      if (selectedSentiment === "positive") return item.negativity < 0.3;
      if (selectedSentiment === "neutral") return item.negativity >= 0.3 && item.negativity < 0.5;
      if (selectedSentiment === "negative") return item.negativity >= 0.5;
      return true;
    });

  const frequencies = filteredTopics.map((item) => item.frequency);
  const minFrequency = frequencies.length ? Math.min(...frequencies) : 0;
  const maxFrequency = frequencies.length ? Math.max(...frequencies) : 1;
  const frequencyRange = Math.max(1, maxFrequency - minFrequency);

  const bubbleData = filteredTopics
    .map(item => ({
      x: item.frequency,
      y: item.negativity * 100,
      z: 160 + ((item.frequency - minFrequency) / frequencyRange) * 940,
      topic: item.topic,
      shortTopic: item.topic.length > 20 ? `${item.topic.slice(0, 17)}...` : item.topic,
      issuer: item.issuer,
      color: colorFromTopic(item.topic),
    }));

  const hasBubbleData = bubbleData.length > 0;

  const getColorForScore = (score: number) => {
    if (score >= 70) return "#10b981"; // green
    if (score >= 50) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Topic Analysis</h1>
        <p className="text-muted-foreground">Deep dive into sentiment drivers across topics and issuers</p>
        <div className="mt-3">
          <Badge variant="outline">Scope: market-wide topic view (2025+ reviews, filterable by issuer)</Badge>
        </div>
      </div>

      {/* Topic Word Cloud */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Topic Word Cloud (Relevant Terms)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Frequent and category-relevant terms extracted from 2025+ reviews. Larger words indicate higher frequency.
        </p>
        <div className="flex flex-wrap gap-3">
          {topicWordCloud.slice(0, 50).map((item, idx) => (
            <span
              key={`${item.term}-${idx}`}
              className="inline-flex items-center rounded-full border border-border/70 bg-muted/25 px-3 py-1"
              style={{
                fontSize: `${12 + Math.round((item.weight / 100) * 18)}px`,
                fontWeight: 500 + Math.round((item.weight / 100) * 300),
              }}
              title={`${item.term} • ${item.count} mentions • ${item.category}`}
            >
              {item.term}
            </span>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Issuer</label>
            <Select value={selectedIssuer} onValueChange={setSelectedIssuer}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Issuers</SelectItem>
                {issuers.map(issuer => (
                  <SelectItem key={issuer} value={issuer}>{issuer}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Sentiment</label>
            <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiment</SelectItem>
                <SelectItem value="positive">Positive (&gt;70)</SelectItem>
                <SelectItem value="neutral">Neutral (50-70)</SelectItem>
                <SelectItem value="negative">Negative (&lt;50)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Topic Frequency vs Negativity Bubble Chart */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Topic Frequency vs Negativity ({selectedIssuer === "all" ? "All Issuers" : selectedIssuer})
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Bubble size = mention volume. Position shows frequency (x-axis) and negative sentiment intensity (y-axis).
        </p>
        {hasBubbleData ? (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <ZAxis dataKey="z" range={[80, 700]} />
              <XAxis
                type="number"
                dataKey="x"
                name="Frequency"
                stroke="#888"
                style={{ fontSize: 12 }}
                label={{ value: "Mention Frequency", position: "bottom", fill: "#888", offset: 40 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Negativity %"
                stroke="#888"
                style={{ fontSize: 12 }}
                label={{ value: "Negativity %", angle: -90, position: "insideLeft", fill: "#888" }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px"
                }}
                itemStyle={{ color: "#111827" }}
                labelStyle={{ color: "#111827", fontWeight: 600 }}
                formatter={(value: any, name: string) => {
                  if (name === "Frequency") return [value.toLocaleString(), "Mentions"];
                  if (name === "Negativity %") return [`${value.toFixed(1)}%`, "Negativity"];
                  return [value, name];
                }}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload;
                  if (!row) return "";
                  return `${row.topic} (${row.issuer})`;
                }}
              />
              <Scatter
                data={bubbleData}
                shape={(props: any) => {
                  const { cx, cy, size, payload } = props;
                  const radius = Math.max(9, Math.min(48, Math.sqrt((size ?? payload?.z ?? 160) / Math.PI)));
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={radius} fill={payload.color} fillOpacity={0.75} stroke="#111827" strokeOpacity={0.25} />
                      {radius >= 16 && (
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={10}
                          fill="#0f172a"
                          fontWeight={600}
                        >
                          {payload.shortTopic}
                        </text>
                      )}
                    </g>
                  );
                }}
              >
                {bubbleData.map((entry, idx) => (
                  <Cell key={`${entry.topic}-${entry.issuer}-${idx}`} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
            No topics match the current filters.
          </div>
        )}
        {hasBubbleData && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {bubbleData.map((item, idx) => (
              <div key={`${item.topic}-${item.issuer}-${idx}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-foreground/90">{item.topic}</span>
                <span>({item.x.toLocaleString()})</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Category Heatmap */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Category Sentiment Heatmap</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide p-3 border-b border-border">
                  Issuer
                </th>
                {sentimentCategories.map(cat => (
                  <th
                    key={cat}
                    className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide p-3 border-b border-border align-middle"
                    style={{ minWidth: "140px" }}
                  >
                    <div className="mx-auto text-center whitespace-normal leading-tight">{cat}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredHeatmap.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3 font-medium text-sm text-foreground">{row.issuer}</td>
                  {sentimentCategories.map((cat, colIdx) => {
                    const score = row[cat];
                    const color = getColorForScore(score);
                    return (
                      <td key={colIdx} className="p-3 text-center">
                        <div
                          className="mx-auto w-14 h-8 rounded flex items-center justify-center text-xs font-semibold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {score}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-xs text-muted-foreground">70-100 (Positive)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-xs text-muted-foreground">50-69 (Neutral)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-xs text-muted-foreground">0-49 (Negative)</span>
          </div>
        </div>
      </Card>

      {/* Top Topics List */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">
          All Topics ({selectedIssuer === "all" ? "All Issuers" : selectedIssuer})
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {bubbleData.map((topic, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground mb-1">{topic.topic}</div>
                <div className="text-xs text-muted-foreground">{topic.x.toLocaleString()} mentions</div>
              </div>
              <div className="text-right">
                <Badge className={(topic.y / 100) > 0.6 ? "bg-red-500/20 text-red-400" : (topic.y / 100) > 0.4 ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}>
                  {topic.y.toFixed(0)}% neg
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
