import { useMemo } from "react";
import { Card } from "./ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DashboardData } from "../data/liveData";

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function getMonthStartFromDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
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

type MomentumData = {
  month: string;
  [category: string]: string | number;
};

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#8b5cf6", // Purple
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6", // Teal
];

export interface MomentumChartProps {
  data: DashboardData;
}

export function MomentumChart({ data }: MomentumChartProps) {
  const { reviews, sentimentCategories } = data;

  const momentumData = useMemo(() => {
    const currentMonthStart = getMonthStartFromDate(new Date());
    const trendMonths = Array.from({ length: 6 }, (_, idx) =>
      addMonths(currentMonthStart, idx - 5)
    );

    const monthlyMentionCounts = new Map<string, Map<string, number>>();

    // Initialize map
    for (const monthDate of trendMonths) {
      const key = monthKey(monthDate);
      monthlyMentionCounts.set(key, new Map());
      for (const category of sentimentCategories) {
        monthlyMentionCounts.get(key)!.set(category, 0);
      }
    }

    // Count mentions per category per month
    for (const review of reviews) {
      const reviewDate = new Date(review.date);
      const key = monthKey(reviewDate);

      if (!monthlyMentionCounts.has(key)) continue;

      for (const topic of review.topics) {
        const canonicalTopic = canonicalCategory(topic);
        const categoryMap = monthlyMentionCounts.get(key);
        
        // Find matching category (exact match first, then fuzzy match)
        let foundCategory: string | null = null;
        
        // Try exact match
        if (categoryMap!.has(canonicalTopic)) {
          foundCategory = canonicalTopic;
        } else {
          // Try fuzzy match using slug comparison
          const topicSlug = toSlug(canonicalTopic);
          for (const category of sentimentCategories) {
            if (toSlug(category) === topicSlug) {
              foundCategory = category;
              break;
            }
          }
        }
        
        if (foundCategory) {
          const current = categoryMap!.get(foundCategory) || 0;
          categoryMap!.set(foundCategory, current + 1);
        }
      }
    }

    // Convert to percentage-based data
    const result: MomentumData[] = trendMonths.map((monthDate) => {
      const label = monthLabel(monthDate);
      const key = monthKey(monthDate);
      const categoryMap = monthlyMentionCounts.get(key) || new Map();

      const totalMentions = Array.from(categoryMap.values()).reduce(
        (sum, count) => sum + count,
        0
      );

      const row: MomentumData = { month: label };

      for (const category of sentimentCategories) {
        const count = categoryMap.get(category) || 0;
        const percentage =
          totalMentions > 0
            ? Math.round((count / totalMentions) * 100 * 10) / 10
            : 0;
        row[category] = percentage;
      }

      return row;
    });

    return result;
  }, [reviews, sentimentCategories]);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-2">
            Customer Focus Momentum
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Shows how customer mention focus shifts across categories month-to-month (as a % of total mentions).
            This helps identify emerging customer priorities and declining concerns.
          </p>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={momentumData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" stroke="#888" style={{ fontSize: 12 }} />
            <YAxis stroke="#888" style={{ fontSize: 12 }} label={{ value: "% of Total Mentions", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
              }}
              formatter={(value) => {
                if (typeof value === "number") {
                  return `${value}%`;
                }
                return value;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {sentimentCategories.map((category, idx) => (
              <Area
                key={category}
                type="monotone"
                dataKey={category}
                name={category}
                stackId="1"
                stroke={COLORS[idx % COLORS.length]}
                fill={COLORS[idx % COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Interpretation Guide
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Expanding area:</strong> Category mentions are growing as a share of total voice
            </li>
            <li>
              <strong>Contracting area:</strong> Category mentions are shrinking as a share of total voice (either absolute decrease or other categories growing faster)
            </li>
            <li>
              <strong>Highest areas:</strong> Categories where customers are most focused this month
            </li>
            <li>
              <strong>Trending up:</strong> Potential emerging issue that is gaining customer attention month-over-month
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
