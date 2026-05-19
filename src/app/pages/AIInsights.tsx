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

export function AIInsights() {
  const competitiveGaps = [
    {
      category: "Fees Transparency",
      gap: -10,
      leader: "Merrick Bank",
      recommendation: "Implement upfront fee calculator on application page. Merrick shows all fees before approval - customers cite this as key trust driver."
    },
    {
      category: "Credit Limit Increases",
      gap: -7,
      leader: "Mission Lane",
      recommendation: "Introduce proactive credit limit increase notifications. Mission Lane auto-reviews every 6 months; Avant customers request but get denied."
    },
    {
      category: "Rewards Communication",
      gap: -12,
      leader: "Merrick Bank",
      recommendation: "Add in-app rewards tracker with push notifications. Current rewards program exists but customers don't know about it or how to access it."
    }
  ];

  const emergingOpportunities = [
    {
      opportunity: "Financial Hardship Program",
      evidence: "Collections complaints up 45% but competitors have similar issues. First-mover advantage available.",
      impact: "High",
      effort: "Medium"
    },
    {
      opportunity: "Mobile App Redesign",
      evidence: "App satisfaction 7pts above category avg, but login issues emerging. Maintain lead before competitors catch up.",
      impact: "Medium",
      effort: "High"
    },
    {
      opportunity: "Fee Bundling Option",
      evidence: "32% of 'hidden fees' complaints mention surprise at multiple small charges. Bundle into transparent monthly fee.",
      impact: "High",
      effort: "Low"
    }
  ];

  const customerSegments = [
    {
      segment: "Credit Rebuilders (High Satisfaction)",
      size: "43%",
      sentiment: 82,
      characteristics: "Value approval experience and credit line growth. Low price sensitivity. Highest NPS segment.",
      retention: "High"
    },
    {
      segment: "Rate Shoppers (Moderate Satisfaction)",
      size: "31%",
      sentiment: 58,
      characteristics: "Focused on APR and fees. Compare across issuers. Most likely to churn for better rate.",
      retention: "Medium"
    },
    {
      segment: "Digital-First Users (High Satisfaction)",
      size: "18%",
      sentiment: 76,
      characteristics: "Heavy app users. Value mobile experience and instant notifications. Younger demographic.",
      retention: "High"
    },
    {
      segment: "At-Risk (Low Satisfaction)",
      size: "8%",
      sentiment: 34,
      characteristics: "Recent credit limit decrease or collections contact. High negative sentiment and churn risk.",
      retention: "Critical"
    }
  ];

  const strategicRecommendations = [
    {
      title: "Immediate: Fee Transparency Overhaul",
      priority: "Critical",
      timeframe: "30 days",
      description: "Address #1 complaint driver. Create fee comparison page showing Avant vs competitors. Add fee calculator to pre-approval flow.",
      impact: "Could reduce fee-related complaints by 40% based on Merrick Bank case study.",
      icon: DollarSign,
      color: "red"
    },
    {
      title: "Short-term: Credit Limit Communication",
      priority: "High",
      timeframe: "60 days",
      description: "Proactive notification system for credit decisions. Explain WHY limits decrease (regulatory, credit score) not just THAT they decreased.",
      impact: "Emerging issue with 127 mentions and -82% sentiment. Early intervention critical.",
      icon: AlertTriangle,
      color: "orange"
    },
    {
      title: "Medium-term: Rewards Visibility",
      priority: "Medium",
      timeframe: "90 days",
      description: "In-app rewards dashboard with real-time tracking. Push notifications when rewards post. Educational content on maximizing rewards.",
      impact: "Differentiation opportunity - competitors also struggle here but none have solved it well.",
      icon: Target,
      color: "blue"
    },
    {
      title: "Long-term: Hardship Program",
      priority: "Strategic",
      timeframe: "120+ days",
      description: "Dedicated financial hardship support program with payment plans, fee waivers, and credit counseling partnerships.",
      impact: "First-mover advantage. Collections sentiment -62% across category. Opportunity to lead with empathy.",
      icon: Shield,
      color: "purple"
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      red: "bg-red-500/10 border-red-500/20 text-red-500",
      orange: "bg-orange-500/10 border-orange-500/20 text-orange-500",
      blue: "bg-blue-500/10 border-blue-500/20 text-blue-500",
      purple: "bg-purple-500/10 border-purple-500/20 text-purple-500"
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">AI Insights & Recommendations</h1>
        <p className="text-muted-foreground">Strategic recommendations powered by competitive sentiment analysis</p>
      </div>

      {/* Executive Summary */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-blue-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground mb-2">Strategic Summary</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Avant maintains competitive strength in <strong>approval experience</strong> and <strong>mobile app</strong>,
              but faces critical vulnerabilities in <strong>fee transparency</strong> and <strong>credit communication</strong>.
              Three high-priority opportunities identified: fee calculator implementation (30-day timeline),
              proactive credit limit communication (addresses emerging crisis), and rewards visibility enhancement.
              Customer segmentation reveals 43% "Credit Rebuilders" driving positive sentiment - double down on this segment
              while addressing at-risk 8% before churn accelerates.
            </p>
          </div>
        </div>
      </Card>

      {/* Strategic Recommendations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Strategic Recommendations</h2>
        {strategicRecommendations.map((rec, idx) => (
          <Card key={idx} className={`p-6 border ${getColorClasses(rec.color)}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg ${getColorClasses(rec.color)} flex items-center justify-center flex-shrink-0`}>
                <rec.icon className="w-6 h-6" />
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
          {competitiveGaps.map((gap, idx) => (
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
          {emergingOpportunities.map((opp, idx) => (
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
          {customerSegments.map((segment, idx) => (
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
