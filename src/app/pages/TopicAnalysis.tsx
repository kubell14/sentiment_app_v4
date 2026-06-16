import { useState } from "react";
import { Card } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Filter, Search } from "lucide-react";
import { Input } from "../components/ui/input";
import { InfoTooltip } from "../components/InfoTooltip";
import { useDashboardData } from "../data/liveData";

const BUBBLE_PALETTE = [
  "#2563eb", "#ea580c", "#16a34a", "#dc2626", "#0891b2", "#7c3aed", "#ca8a04", "#be123c",
  "#0f766e", "#4f46e5", "#059669", "#b45309", "#9333ea", "#0284c7", "#65a30d", "#c026d3",
  "#1d4ed8", "#f97316", "#22c55e", "#ef4444",
];

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
    const row: Record<string, string | number | null> = { issuer };
    sentimentCategories.forEach(cat => {
      row[cat] = categorySentiment[issuer]?.[cat] ?? null;
    });
    return row;
  });

  // Filter heatmap by issuer
  const filteredHeatmap = selectedIssuer === "all"
    ? heatmapData
    : heatmapData.filter(d => d.issuer === selectedIssuer);

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

  const groupedTopics = selectedIssuer === "all"
    ? Array.from(
        filteredTopics.reduce((acc, item) => {
          const current = acc.get(item.topic) || {
            topic: item.topic,
            frequency: 0,
            weightedNegativity: 0,
            issuerCount: 0,
          };
          current.frequency += item.frequency;
          current.weightedNegativity += item.negativity * item.frequency;
          current.issuerCount += 1;
          acc.set(item.topic, current);
          return acc;
        }, new Map<string, { topic: string; frequency: number; weightedNegativity: number; issuerCount: number }>()).values()
      ).map((item) => ({
        topic: item.topic,
        frequency: item.frequency,
        negativity: item.frequency > 0 ? item.weightedNegativity / item.frequency : 0,
        issuer: `${item.issuerCount} issuers`,
      }))
    : filteredTopics;

  const frequencies = groupedTopics.map((item) => item.frequency);
  const minFrequency = frequencies.length ? Math.min(...frequencies) : 0;
  const maxFrequency = frequencies.length ? Math.max(...frequencies) : 1;
  const frequencyRange = Math.max(1, maxFrequency - minFrequency);

  const sortedTopics = Array.from(new Set(groupedTopics.map((item) => item.topic))).sort((a, b) => a.localeCompare(b));
  const topicColorMap = new Map<string, string>();
  sortedTopics.forEach((topic, idx) => {
    const fallbackHue = (idx * 137.508) % 360;
    const color = BUBBLE_PALETTE[idx] || `hsl(${fallbackHue} 68% 48%)`;
    topicColorMap.set(topic, color);
  });

  const bubbleData = groupedTopics
    .map(item => ({
      x: item.frequency,
      y: item.negativity * 100,
      z: 160 + ((item.frequency - minFrequency) / frequencyRange) * 940,
      topic: item.topic,
      shortTopic: item.topic.length > 20 ? `${item.topic.slice(0, 17)}...` : item.topic,
      issuer: item.issuer,
      color: topicColorMap.get(item.topic) || "#2563eb",
    }));

  const hasBubbleData = bubbleData.length > 0;

  // Priority matrix thresholds: median frequency splits "frequent" vs "infrequent";
  // 50% negativity splits "negative" vs "positive". Top-right = Act Now.
  const NEG_THRESHOLD = 50;
  const sortedFreq = bubbleData.map((d) => d.x).sort((a, b) => a - b);
  const freqThreshold = sortedFreq.length ? sortedFreq[Math.floor((sortedFreq.length - 1) / 2)] : 0;
  const maxX = Math.max(1, ...bubbleData.map((d) => d.x));
  const quadrantColor = (x: number, y: number) =>
    x >= freqThreshold && y >= NEG_THRESHOLD ? "#ef4444"
    : x < freqThreshold && y >= NEG_THRESHOLD ? "#f59e0b"
    : x >= freqThreshold && y < NEG_THRESHOLD ? "#10b981"
    : "#6b7280";
  const quadrantLabel = (x: number, y: number) =>
    x >= freqThreshold && y >= NEG_THRESHOLD ? "Act Now"
    : x < freqThreshold && y >= NEG_THRESHOLD ? "Monitor"
    : x >= freqThreshold && y < NEG_THRESHOLD ? "Strength"
    : "Low priority";

  const wordCloudSlice = topicWordCloud.slice(0, 50);
  const maxWordCount = wordCloudSlice.length ? Math.max(...wordCloudSlice.map((item) => item.count)) : 1;
  const minWordCount = wordCloudSlice.length ? Math.min(...wordCloudSlice.map((item) => item.count)) : 0;
  const wordRange = Math.max(1, maxWordCount - minWordCount);

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
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-base font-semibold text-foreground">Topic Word Cloud</h3>
          <InfoTooltip text="Frequent, category-relevant terms extracted from review text (Jan 2025 onward). Larger words appear more often. Hover a term for its mention count and category." />
        </div>
        <div className="flex flex-wrap gap-3">
          {wordCloudSlice.map((item, idx) => {
            const scaled = (item.count - minWordCount) / wordRange;
            const emphasis = Math.pow(scaled, 1.35);
            return (
            <span
              key={`${item.term}-${idx}`}
              className="inline-flex items-center rounded-full border border-border/70 bg-muted/25 px-3 py-1"
              style={{
                fontSize: `${10 + Math.round(emphasis * 34)}px`,
                fontWeight: 500 + Math.round(emphasis * 400),
              }}
              title={`${item.term} • ${item.count} mentions • ${item.category}`}
            >
              {item.term}
            </span>
            );
          })}
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

      {/* Priority Matrix: Frequency vs Negativity */}
      <Card className="p-6">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-base font-semibold text-foreground">
            Priority Matrix ({selectedIssuer === "all" ? "All Issuers" : selectedIssuer})
          </h3>
          <InfoTooltip text="Each category is plotted by how often it is mentioned (x-axis) and how negative those mentions are (y-axis). The top-right “Act Now” quadrant — frequently mentioned and highly negative — is where to focus first. Dashed lines mark the split points (median mention frequency and 50% negativity)." />
        </div>
        {hasBubbleData ? (
          <>
            <ResponsiveContainer width="100%" height={420}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Frequency"
                  stroke="#888"
                  style={{ fontSize: 12 }}
                  domain={[0, maxX]}
                  label={{ value: "Mention Frequency →", position: "bottom", fill: "#888", offset: 30 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Negativity %"
                  stroke="#888"
                  style={{ fontSize: 12 }}
                  domain={[0, 100]}
                  label={{ value: "Negativity % →", angle: -90, position: "insideLeft", fill: "#888" }}
                />
                <ReferenceArea x1={freqThreshold} x2={maxX} y1={NEG_THRESHOLD} y2={100} fill="#ef4444" fillOpacity={0.06} />
                <ReferenceLine x={freqThreshold} stroke="#555" strokeDasharray="4 4" />
                <ReferenceLine y={NEG_THRESHOLD} stroke="#555" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    const row = payload?.[0]?.payload;
                    if (!row) return null;
                    return (
                      <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground shadow-md">
                        <div className="font-semibold mb-1">{row.topic}</div>
                        <div className="text-muted-foreground">Coverage: {row.issuer}</div>
                        <div className="text-muted-foreground">Mentions: {row.x.toLocaleString()}</div>
                        <div className="text-muted-foreground">Negativity: {row.y.toFixed(0)}%</div>
                        <div className="mt-1 font-medium" style={{ color: quadrantColor(row.x, row.y) }}>
                          {quadrantLabel(row.x, row.y)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={bubbleData}
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={7} fill={quadrantColor(payload.x, payload.y)} fillOpacity={0.85} stroke="#111827" strokeOpacity={0.25} />
                        <text x={cx} y={cy - 11} textAnchor="middle" fontSize={10} fill="#cbd5e1">
                          {payload.shortTopic}
                        </text>
                      </g>
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ef4444" }} /><span className="text-muted-foreground">Act Now (frequent + negative)</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} /><span className="text-muted-foreground">Monitor (negative, less frequent)</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#10b981" }} /><span className="text-muted-foreground">Strength (frequent + positive)</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6b7280" }} /><span className="text-muted-foreground">Low priority</span></div>
            </div>
          </>
        ) : (
          <div className="h-[420px] rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
            No topics match the current filters.
          </div>
        )}
      </Card>

      {/* Category Heatmap */}
      <Card className="p-6">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-base font-semibold text-foreground">Category Sentiment Heatmap</h3>
          <InfoTooltip text="Average sentiment score (0–100) per issuer per category over the most recent 6 months. Green = positive (70+), yellow = neutral (50–69), red = negative (under 50). N/A means no reviews in that category during the window." />
        </div>
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
                    const score = row[cat] as number | null;
                    const color = score === null ? "#374151" : getColorForScore(score);
                    return (
                      <td key={colIdx} className="p-3 text-center">
                        <div
                          className="mx-auto w-14 h-8 rounded flex items-center justify-center text-xs font-semibold"
                          style={{ backgroundColor: color, color: "#ffffff" }}
                        >
                          {score === null ? "N/A" : score}
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
