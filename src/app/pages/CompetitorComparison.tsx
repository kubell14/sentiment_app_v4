import { useState } from "react";
import { Card } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Sparkles, TrendingUp } from "lucide-react";
import { useDashboardData } from "../data/liveData";

export function CompetitorComparison() {
  const { data, isLoading, error } = useDashboardData();
  const { issuers, categorySentiment, overallSentiment, sentimentCategories, timeSeriesData } = data;
  const [companyA, setCompanyA] = useState("Avant");
  const [companyB, setCompanyB] = useState("Mission Lane");

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading comparison data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Failed to load comparison data: {error}</div>;
  }

  if (issuers.length < 2) {
    return <div className="p-8 text-muted-foreground">Not enough company data to compare.</div>;
  }

  const selectedCompanyA = issuers.includes(companyA) ? companyA : issuers[0];
  const selectedCompanyB = issuers.includes(companyB) && companyB !== selectedCompanyA ? companyB : issuers[1] || issuers[0];

  // Prepare radar chart data
  const radarData = sentimentCategories.map(category => ({
    category: category.replace(" / ", "/").replace(" & ", "&"),
    [selectedCompanyA]: categorySentiment[selectedCompanyA]?.[category] || 0,
    [selectedCompanyB]: categorySentiment[selectedCompanyB]?.[category] || 0
  }));

  // Calculate differences
  const scoreDiff = overallSentiment[selectedCompanyA] - overallSentiment[selectedCompanyB];
  const categoryComparisons = sentimentCategories.map(cat => ({
    category: cat,
    diff: (categorySentiment[selectedCompanyA]?.[cat] || 0) - (categorySentiment[selectedCompanyB]?.[cat] || 0)
  }));

  const strengths = categoryComparisons.filter(c => c.diff > 5).sort((a, b) => b.diff - a.diff);
  const weaknesses = categoryComparisons.filter(c => c.diff < -5).sort((a, b) => a.diff - b.diff);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Competitor Comparison</h1>
        <p className="text-muted-foreground">Side-by-side competitive intelligence analysis</p>
      </div>

      {/* Company Selectors */}
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-2">Company A</label>
          <Select value={selectedCompanyA} onValueChange={setCompanyA}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {issuers.map(issuer => (
                <SelectItem key={issuer} value={issuer} disabled={issuer === selectedCompanyB}>
                  {issuer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-2">Company B</label>
          <Select value={selectedCompanyB} onValueChange={setCompanyB}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {issuers.map(issuer => (
                <SelectItem key={issuer} value={issuer} disabled={issuer === selectedCompanyA}>
                  {issuer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Comparison Summary */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-blue-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground mb-2">AI Competitive Analysis</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              <strong>{selectedCompanyA}</strong> {scoreDiff > 0 ? "outperforms" : "underperforms"} <strong>{selectedCompanyB}</strong> by{" "}
              <strong>{Math.abs(scoreDiff).toFixed(1)} points</strong> overall.
              {strengths.length > 0 && (
                <>
                  {" "}Key advantages: {strengths.slice(0, 2).map(s => s.category).join(", ")}.
                </>
              )}
              {weaknesses.length > 0 && (
                <>
                  {" "}Areas for improvement: {weaknesses.slice(0, 2).map(w => w.category).join(", ")}.
                </>
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* Split KPI Cards */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6 border-blue-500/30 bg-blue-500/5">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">{selectedCompanyA}</div>
            <div className="text-5xl font-semibold text-foreground mb-1">{overallSentiment[selectedCompanyA]}</div>
            <div className="text-xs text-muted-foreground">Overall Sentiment Score</div>
          </div>
        </Card>

        <Card className="p-6 border-purple-500/30 bg-purple-500/5">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">{selectedCompanyB}</div>
            <div className="text-5xl font-semibold text-foreground mb-1">{overallSentiment[selectedCompanyB]}</div>
            <div className="text-xs text-muted-foreground">Overall Sentiment Score</div>
          </div>
        </Card>
      </div>

      {/* Radar Chart Comparison */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Category-Level Comparison</h3>
        <ResponsiveContainer width="100%" height={500}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#333" />
            <PolarAngleAxis dataKey="category" stroke="#888" style={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#888" style={{ fontSize: 10 }} />
            <Radar name={selectedCompanyA} dataKey={selectedCompanyA} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
            <Radar name={selectedCompanyB} dataKey={selectedCompanyB} stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
            <Legend />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px"
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* Strengths vs Weaknesses */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpRight className="w-5 h-5 text-green-500" />
            <h3 className="text-base font-semibold text-foreground">
              {selectedCompanyA} Strengths vs {selectedCompanyB}
            </h3>
          </div>
          <div className="space-y-2">
            {strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No significant advantages</p>
            ) : (
              strengths.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-sm text-foreground">{item.category}</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    +{item.diff.toFixed(0)} pts
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownRight className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-foreground">
              {selectedCompanyA} Weaknesses vs {selectedCompanyB}
            </h3>
          </div>
          <div className="space-y-2">
            {weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No significant disadvantages</p>
            ) : (
              weaknesses.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <span className="text-sm text-foreground">{item.category}</span>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    {item.diff.toFixed(0)} pts
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Trend Comparison */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Sentiment Trend Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeriesData}>
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
            <Legend />
            <Line type="monotone" dataKey={selectedCompanyA} stroke="#3b82f6" strokeWidth={2.5} />
            <Line type="monotone" dataKey={selectedCompanyB} stroke="#8b5cf6" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
