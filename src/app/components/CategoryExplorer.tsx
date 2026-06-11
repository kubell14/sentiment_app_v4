import { useState, useMemo } from "react";
import { Card } from "./ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { DashboardData } from "../data/liveData";

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
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

type CategoryTrendData = {
  month: string;
  avant: number | null;
  peer: number | null;
  mentions: number;
};

export interface CategoryExplorerProps {
  data: DashboardData;
}

export function CategoryExplorer({ data }: CategoryExplorerProps) {
  const { reviews, issuers, categorySentiment, sentimentCategories } = data;
  const [selectedCategory, setSelectedCategory] = useState(
    sentimentCategories.length > 0 ? sentimentCategories[0] : "Credit Lines"
  );

  const avantIssuer = issuers.includes("Avant") ? "Avant" : issuers[0] || "Avant";
  const peerIssuers = issuers.filter((issuer) => issuer !== avantIssuer);

  const categoryTrendData = useMemo(() => {
    // Get ALL available months from the review data
    const monthsInData = new Set<string>();
    for (const review of reviews) {
      const reviewDate = new Date(review.date);
      const key = monthKey(reviewDate);
      monthsInData.add(key);
    }

    // Sort months chronologically
    const sortedMonths = Array.from(monthsInData).sort();
    
    // If no data, return empty array
    if (sortedMonths.length === 0) {
      return [];
    }

    // Get all months in the range (fill gaps) from first to last
    const trendMonths: Date[] = [];
    if (sortedMonths.length > 0) {
      const [firstYearStr, firstMonthStr] = sortedMonths[0]!.split("-");
      const firstDate = new Date(Date.UTC(parseInt(firstYearStr), parseInt(firstMonthStr) - 1, 1));
      const [lastYearStr, lastMonthStr] = sortedMonths[sortedMonths.length - 1]!.split("-");
      const lastDate = new Date(Date.UTC(parseInt(lastYearStr), parseInt(lastMonthStr) - 1, 1));

      // Create array of all months from first to last
      let currentDate = firstDate;
      while (currentDate <= lastDate) {
        trendMonths.push(new Date(currentDate));
        currentDate = addMonths(currentDate, 1);
      }
    }

    const canonicalSelectedCategory = canonicalCategory(selectedCategory);
    const trendData: CategoryTrendData[] = trendMonths.map((monthDate) => {
      const label = monthLabel(monthDate);

      // Filter reviews for this category and month using canonical matching
      const monthReviews = reviews.filter((review) => {
        const reviewDate = new Date(review.date);
        return (
          reviewDate.getUTCFullYear() === monthDate.getUTCFullYear() &&
          reviewDate.getUTCMonth() === monthDate.getUTCMonth() &&
          review.topics.some((t) => canonicalCategory(t) === canonicalSelectedCategory)
        );
      });

      // Calculate Avant sentiment
      const avantReviews = monthReviews.filter(
        (review) => review.issuer === avantIssuer
      );
      const avantSentiment =
        avantReviews.length > 0
          ? Math.round(
              (avantReviews.reduce(
                (sum, review) =>
                  sum + ((review.sentiment + 1) / 2) * 100,
                0
              ) /
                avantReviews.length) as number
            )
          : null;

      // Calculate peer average sentiment
      const peerReviews = monthReviews.filter((review) =>
        peerIssuers.includes(review.issuer)
      );
      const peerSentiment =
        peerReviews.length > 0
          ? Math.round(
              (peerReviews.reduce(
                (sum, review) =>
                  sum + ((review.sentiment + 1) / 2) * 100,
                0
              ) /
                peerReviews.length) as number
            )
          : null;

      const totalMentions = monthReviews.length;

      return {
        month: label,
        avant: avantSentiment,
        peer: peerSentiment,
        mentions: totalMentions,
      };
    });

    return trendData;
  }, [selectedCategory, reviews, avantIssuer, peerIssuers]);

  const categoryStats = useMemo(() => {
    const canonicalSelectedCategory = canonicalCategory(selectedCategory);
    
    const totalReviewsInCategory = reviews.filter((review) =>
      review.topics.some((t) => canonicalCategory(t) === canonicalSelectedCategory)
    ).length;

    const negativeReviewsInCategory = reviews.filter((review) => {
      const isInCategory = review.topics.some(
        (t) => canonicalCategory(t) === canonicalSelectedCategory
      );
      const sentiment = ((review.sentiment + 1) / 2) * 100;
      return isInCategory && sentiment <= 50;
    }).length;

    const complaintPct =
      totalReviewsInCategory > 0
        ? Math.round(
            (negativeReviewsInCategory / totalReviewsInCategory) * 100
          )
        : 0;

    return {
      total: totalReviewsInCategory,
      negative: negativeReviewsInCategory,
      complaintPct,
    };
  }, [selectedCategory, reviews]);

  const gap =
    categoryTrendData[categoryTrendData.length - 1]?.avant &&
    categoryTrendData[categoryTrendData.length - 1]?.peer
      ? categoryTrendData[categoryTrendData.length - 1].avant! -
        categoryTrendData[categoryTrendData.length - 1].peer!
      : null;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4">
            Category Deep Dive Explorer
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Select a category to view Avant vs peer sentiment trends across all available months,
            along with mention counts and complaint percentage for each month.
          </p>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Select Category
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a category..." />
              </SelectTrigger>
              <SelectContent>
                {sentimentCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">
                Total Reviews
              </div>
              <div className="text-lg font-semibold text-foreground">
                {categoryStats.total.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">
                Negative Reviews
              </div>
              <div className="text-lg font-semibold text-orange-500">
                {categoryStats.negative.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">
                % Negative
              </div>
              <div className="text-lg font-semibold text-foreground">
                {categoryStats.complaintPct}%
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="mb-3">
            <div className="text-xs text-muted-foreground">
              Latest month sentiment gap:{" "}
              <span
                className={`font-semibold ${
                  gap !== null && gap > 0
                    ? "text-green-500"
                    : gap !== null && gap < 0
                      ? "text-red-500"
                      : "text-muted-foreground"
                }`}
              >
                {gap !== null ? `${gap > 0 ? "+" : ""}${gap} points` : "N/A"}
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={categoryTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#888" style={{ fontSize: 12 }} />
              <YAxis stroke="#888" style={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                }}
                formatter={(value, name) => {
                  if (name === "mentions") {
                    return [value, "Reviews in Month"];
                  }
                  return [value ? `${value}/100` : "No data", name === "avant" ? "Avant Sentiment" : "Peer Avg Sentiment"];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="avant"
                name="Avant"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="peer"
                name="Peer Avg"
                stroke="#6b7280"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Monthly Mention Counts
          </h4>
          <div className="space-y-2">
            {categoryTrendData.map((dataPoint, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-muted/20"
              >
                <span className="text-sm text-foreground">{dataPoint.month}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {dataPoint.mentions} reviews
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
