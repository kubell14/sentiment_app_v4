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
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { Filter, Search } from "lucide-react";
import { Input } from "../components/ui/input";
import { useDashboardData } from "../data/liveData";

export function TopicAnalysis() {
  const { data, isLoading, error } = useDashboardData();
  const { issuers, sentimentCategories, categorySentiment, topicFrequency } = data;
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

  // Prepare bubble chart data (frequency vs negativity)
  const bubbleData = topicFrequency
    .filter((item) => selectedIssuer === "all" || item.issuer === selectedIssuer)
    .filter((item) => searchTerm === "" || item.topic.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((item) => {
      if (selectedSentiment === "positive") return item.negativity < 0.3;
      if (selectedSentiment === "neutral") return item.negativity >= 0.3 && item.negativity < 0.5;
      if (selectedSentiment === "negative") return item.negativity >= 0.5;
      return true;
    })
    .map(item => ({
      x: item.frequency,
      y: item.negativity * 100,
      z: Math.max(40, item.frequency * 25),
      topic: item.topic
    }));

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
      </div>

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
          Topic Frequency vs Negativity (Avant)
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Bubble size = mention volume. Position shows frequency (x-axis) and negative sentiment intensity (y-axis).
        </p>
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
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px"
              }}
              formatter={(value: any, name: string) => {
                if (name === "Frequency") return [value.toLocaleString(), "Mentions"];
                if (name === "Negativity %") return [`${value.toFixed(1)}%`, "Negativity"];
                return [value, name];
              }}
              labelFormatter={(label) => bubbleData.find(d => d.x === label)?.topic || ""}
            />
            <Scatter data={bubbleData} fill="#3b82f6">
              {bubbleData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.y > 60 ? "#ef4444" : entry.y > 40 ? "#eab308" : "#10b981"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
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
                    className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide p-3 border-b border-border align-bottom"
                    style={{ minWidth: "110px", height: "140px" }}
                  >
                    <div
                      className="mx-auto flex items-end justify-center whitespace-nowrap text-center"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: "120px" }}
                    >
                      {cat}
                    </div>
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
        <h3 className="text-base font-semibold text-foreground mb-4">All Topics (Avant)</h3>
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
