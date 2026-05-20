import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  Target,
  AlertTriangle,
  Lightbulb,
  Users,
  Shield,
  DollarSign
} from "lucide-react";
import { useAiInsightsData } from "../data/liveData";

export function AIInsights() {
  const { data, isLoading, error } = useAiInsightsData({ focus: "Avant" });

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      red: "bg-red-500/10 border-red-500/20 text-red-500",
      orange: "bg-orange-500/10 border-orange-500/20 text-orange-500",
      blue: "bg-blue-500/10 border-blue-500/20 text-blue-500",
      purple: "bg-purple-500/10 border-purple-500/20 text-purple-500"
    };
    return colors[color] || colors.blue;
  };

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Generating AI insights...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Failed to load AI insights: {error}</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Avant AI Insights & Recommendations</h1>
        <p className="text-muted-foreground">Avant-focused recommendations powered by live competitive sentiment analysis</p>
        <div className="mt-3">
          <Badge variant="outline">Scope: Avant-focused insights benchmarked against market peers</Badge>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-blue-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold text-foreground">Avant Strategic Summary</h3>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                {data.source === "ai" ? `Live AI · ${data.model}` : "Heuristic fallback"}
              </Badge>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {data.summary}
            </p>
          </div>
        </div>
      </Card>

      {/* Critical Issues */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-foreground">Critical Issues for Avant</h3>
        </div>
        <div className="space-y-3">
          {data.criticalIssues.slice(0, 3).map((issue, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-orange-500/20 bg-orange-500/5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{issue.issue}</div>
                  <div className="text-xs text-muted-foreground">{issue.howDetermined}</div>
                </div>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">{issue.severity}</Badge>
              </div>
              <div className="text-sm text-foreground/80 mb-2">{issue.whyCritical}</div>
              <div className="text-xs text-muted-foreground">{issue.recommendation}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Trend Interpretations */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h3 className="text-base font-semibold text-foreground">AI Trend Interpretations</h3>
        </div>
        <div className="space-y-3">
          {data.trendInterpretations.slice(0, 3).map((trend, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-border bg-muted/20">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{trend.category}</div>
                  <div className="text-xs text-muted-foreground">{trend.howDetected}</div>
                </div>
                <Badge variant="outline" className="text-xs">{trend.direction}</Badge>
              </div>
              <div className="text-sm text-foreground/80 mb-2">{trend.whyEmerging}</div>
              <div className="text-xs text-muted-foreground">{trend.criticalAlert}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Strategic Recommendations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Recommendations for Avant</h2>
        {data.strategicRecommendations.map((rec, idx) => (
          <Card key={idx} className={`p-6 border ${getColorClasses(rec.color)}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg ${getColorClasses(rec.color)} flex items-center justify-center flex-shrink-0`}>
                {idx === 0 ? <DollarSign className="w-6 h-6" /> : idx === 1 ? <AlertTriangle className="w-6 h-6" /> : idx === 2 ? <Target className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-semibold text-foreground">{rec.title}</h3>
                  <Badge className={getColorClasses(rec.color)}>{rec.priority}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3">Timeline: {rec.timeframe}</div>
                <p className="text-sm text-foreground/80 mb-3">{rec.description}</p>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Expected Impact</div>
                  <div className="text-sm text-foreground/90">{rec.impact}</div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Competitive Gaps */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-semibold text-foreground">Competitive Gap Analysis</h3>
        </div>
        <div className="space-y-4">
          {data.competitiveGaps.map((gap, idx) => (
            <div key={idx} className="p-5 rounded-lg border border-border bg-muted/20">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">{gap.category}</h4>
                  <div className="text-xs text-muted-foreground">Leader: {gap.leader}</div>
                </div>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-semibold">
                  {gap.gap} pts behind
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/80">{gap.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Emerging Opportunities */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h3 className="text-base font-semibold text-foreground">Emerging Product Opportunities</h3>
        </div>
        <div className="space-y-3">
          {data.opportunities.map((opp, idx) => (
            <div key={idx} className="p-5 rounded-lg border border-border bg-muted/20">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground">{opp.opportunity}</h4>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">Impact: {opp.impact}</Badge>
                  <Badge variant="outline" className="text-xs">Effort: {opp.effort}</Badge>
                </div>
              </div>
              <p className="text-sm text-foreground/70">{opp.evidence}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Customer Segments */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-500" />
          <h3 className="text-base font-semibold text-foreground">Customer Segment Analysis</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {data.segments.map((segment, idx) => (
            <div key={idx} className="p-5 rounded-lg border border-border bg-muted/20">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">{segment.segment}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{segment.size} of base</Badge>
                    <Badge
                      className={
                        segment.sentiment >= 70
                          ? "bg-green-500/20 text-green-400 text-xs"
                          : segment.sentiment >= 50
                          ? "bg-yellow-500/20 text-yellow-400 text-xs"
                          : "bg-red-500/20 text-red-400 text-xs"
                      }
                    >
                      {segment.sentiment} sentiment
                    </Badge>
                  </div>
                </div>
                <Badge
                  className={
                    segment.retention === "High"
                      ? "bg-green-500/20 text-green-400"
                      : segment.retention === "Medium"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                  }
                >
                  {segment.retention}
                </Badge>
              </div>
              <p className="text-sm text-foreground/70">{segment.characteristics}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
