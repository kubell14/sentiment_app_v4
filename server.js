import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { DBSQLClient } from "@databricks/sql";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

function readRuntimeConfig() {
  const p = path.join(__dirname, "config", "runtime_config.json");
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

const runtime = readRuntimeConfig();
const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || runtime.DATABRICKS_SERVER_HOSTNAME;
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || runtime.DATABRICKS_HTTP_PATH;
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN || runtime.DATABRICKS_TOKEN;
const GOLD_TABLE = process.env.DASHBOARD_GOLD_TABLE || runtime.DASHBOARD_GOLD_TABLE || "avant_users.kaley_ubellacker.trustpilot_sentiment_gold";
const SILVER_TABLE = process.env.DASHBOARD_SILVER_TABLE || runtime.DASHBOARD_SILVER_TABLE || "avant_users.kaley_ubellacker.trustpilot_reviews_silver";
const AI_API_URL = process.env.AI_API_URL || runtime.AI_API_URL || process.env.DATABRICKS_AI_ENDPOINT_URL || runtime.DATABRICKS_AI_ENDPOINT_URL;
const AI_API_KEY = process.env.AI_API_KEY || runtime.AI_API_KEY || DATABRICKS_TOKEN;
const AI_MODEL = process.env.AI_MODEL || runtime.AI_MODEL || "gpt-4o-mini";

function validateEnv() {
  const missing = [];
  if (!DATABRICKS_HOST) missing.push("DATABRICKS_SERVER_HOSTNAME");
  if (!DATABRICKS_PATH) missing.push("DATABRICKS_HTTP_PATH");
  if (!DATABRICKS_TOKEN) missing.push("DATABRICKS_TOKEN");
  return missing;
}

async function query(sqlText) {
  const client = new DBSQLClient();
  await client.connect({
    host: DATABRICKS_HOST,
    path: DATABRICKS_PATH,
    token: DATABRICKS_TOKEN,
  });

  const session = await client.openSession();
  const operation = await session.executeStatement(sqlText, { runAsync: true });
  await operation.waitUntilReady();
  const rows = await operation.fetchAll();

  await operation.close();
  await session.close();
  await client.close();

  return Array.isArray(rows) ? rows : [];
}

function asString(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeScore(value) {
  const n = asNumber(value);
  if (n === null) return 50;
  if (n >= -1 && n <= 1) return Math.max(0, Math.min(100, (n + 1) * 50));
  if (n >= 0 && n <= 100) return n;
  if (n >= -100 && n <= 100) return Math.max(0, Math.min(100, (n + 100) / 2));
  return Math.max(0, Math.min(100, n));
}

function toTitleCase(input) {
  return input
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeIssuer(raw) {
  const value = asString(raw) || "Unknown";
  return toTitleCase(value.replace(/[_-]+/g, " "));
}

function normalizeCategory(raw) {
  const value = asString(raw) || "uncategorized";
  const pretty = value.replace(/[_-]+/g, " ");
  return toTitleCase(pretty);
}

const CATEGORY_KEYWORDS = [
  { category: "APR / Interest Rates", keywords: ["apr", "interest rate", "interest", "rate increase", "finance charge"] },
  { category: "Fees", keywords: ["fee", "annual fee", "late fee", "cash advance fee", "foreign transaction fee", "hidden fee", "surprise charge"] },
  { category: "Credit Lines", keywords: ["credit limit", "limit increase", "limit decrease", "credit line", "line increase", "line decrease"] },
  { category: "Approval Experience", keywords: ["approval", "approved", "denied", "denial", "application", "prequal", "pre-qual", "underwriting", "application status"] },
  { category: "Rewards & Cashback", keywords: ["reward", "cashback", "cash back", "points", "bonus"] },
  { category: "Customer Service", keywords: ["customer service", "support", "representative", "agent", "call center", "chat", "phone", "service"] },
  { category: "Mobile App", keywords: ["mobile app", "app", "login", "sign in", "sign-in", "website", "portal"] },
  { category: "Fraud & Security", keywords: ["fraud", "security", "unauthorized", "blocked", "locked", "suspicious", "identity"] },
  { category: "Trust & Transparency", keywords: ["transparent", "transparency", "misleading", "upfront", "surprise", "hidden", "disclose", "disclosure", "trust"] },
  { category: "Collections & Hardship", keywords: ["collections", "hardship", "payment plan", "past due", "delinquent", "forbearance", "recovery"] },
  { category: "Payment Processing", keywords: ["payment", "autopay", "due date", "statement", "posting", "posted", "pending", "funding", "deposit", "transfer"] },
];

const LOAN_KEYWORDS = ["personal loan", "loan", "installment loan", "loan payment", "loan product", "loan account", "borrower", "borrow", "cash advance loan"];
const CARD_KEYWORDS = ["credit card", "card", "issuer", "limit", "apr", "rewards", "cashback", "balance", "statement", "autopay"];

function hasAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isClearlyLoanOnlyReview(text, category) {
  const loanSignals = hasAnyKeyword(text, LOAN_KEYWORDS) || /\bloan\b/i.test(category);
  const cardSignals = hasAnyKeyword(text, CARD_KEYWORDS) || /card|apr|rewards|cashback|limit|statement/i.test(category);
  return loanSignals && !cardSignals;
}

function inferCategoryFromText(text) {
  for (const candidate of CATEGORY_KEYWORDS) {
    if (hasAnyKeyword(text, candidate.keywords)) return candidate.category;
  }
  return null;
}

function refineReviewCategory(rawCategory, text) {
  const normalizedCategory = normalizeCategory(rawCategory);
  const normalizedText = (asString(text) || "").toLowerCase();
  if (isClearlyLoanOnlyReview(normalizedText, normalizedCategory)) return null;
  const genericCategories = new Set(["Other", "Uncategorized", "Misc", "General", "Unknown"]);
  if (!genericCategories.has(normalizedCategory)) return normalizedCategory;
  return inferCategoryFromText(normalizedText) || "Customer Service";
}

function summarizeRows(kpiRows, reviewRows, focusCompany = "Avant", peerCompany = null) {
  const companyScores = new Map();
  const categoryScores = new Map();
  const companyCategoryScores = new Map();
  const latestReviews = [];

  for (const row of kpiRows) {
    const company = normalizeIssuer(row.company ?? row.issuer ?? row.competitor);
    const score = normalizeScore(row.avg_sentiment_score ?? row.sentiment_score ?? row.score_100 ?? row.score);
    if (!companyScores.has(company)) companyScores.set(company, []);
    companyScores.get(company).push(score);
  }

  for (const row of reviewRows) {
    const company = normalizeIssuer(row.company ?? row.issuer);
    const category = refineReviewCategory(row.primary_category ?? row.category, row.text ?? row.review_text ?? row.content);
    if (!category) continue;
    const score = normalizeScore(row.sentiment_score ?? row.sentiment);

    if (!companyScores.has(company)) companyScores.set(company, []);
    companyScores.get(company).push(score);

    if (!categoryScores.has(category)) categoryScores.set(category, []);
    categoryScores.get(category).push(score);

    const key = `${company}__${category}`;
    if (!companyCategoryScores.has(key)) companyCategoryScores.set(key, []);
    companyCategoryScores.get(key).push(score);

    latestReviews.push({
      company,
      category,
      score: Math.round(score),
      date: asString(row.created_ts ?? row.date) || "",
      text: (asString(row.text ?? row.review_text ?? row.content) || "").slice(0, 240),
    });
  }

  const companies = Array.from(companyScores.entries())
    .map(([company, scores]) => ({
      company,
      score: Math.round(scores.reduce((sum, value) => sum + value, 0) / Math.max(scores.length, 1)),
      reviewCount: scores.length,
    }))
    .sort((a, b) => b.score - a.score);

  const categories = Array.from(categoryScores.entries())
    .map(([category, scores]) => ({
      category,
      score: Math.round(scores.reduce((sum, value) => sum + value, 0) / Math.max(scores.length, 1)),
      mentions: scores.length,
    }))
    .sort((a, b) => a.score - b.score);

  const sentimentCategories = categories.map((item) => item.category);

  const overallSentiment = {};
  for (const [company, scores] of companyScores.entries()) {
    const avg = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 50;
    overallSentiment[company] = Math.round(avg);
  }

  const companyNames = companies.map((item) => item.company);
  const normalizedFocus = normalizeIssuer(focusCompany);
  const focusIssuer = companyNames.find((name) => name === normalizedFocus) || companyNames.find((name) => name === "Avant") || companyNames[0] || "Avant";
  const normalizedPeer = peerCompany ? normalizeIssuer(peerCompany) : null;
  const peerIssuer = normalizedPeer
    ? companyNames.find((name) => name === normalizedPeer) || companyNames.find((name) => name !== focusIssuer) || focusIssuer
    : (companies.find((item) => item.company !== focusIssuer)?.company || focusIssuer);

  const categorySentiment = {};
  for (const company of companyNames) {
    categorySentiment[company] = {};
    for (const category of sentimentCategories) {
      const rows = companyCategoryScores.get(`${company}__${category}`) || [];
      const avg = rows.length ? rows.reduce((sum, value) => sum + value, 0) / rows.length : 0;
      categorySentiment[company][category] = Math.round(avg);
    }
  }

  const focusScore = overallSentiment[focusIssuer] || 50;
  const peerScore = overallSentiment[peerIssuer] || 50;

  const comparisonCategories = sentimentCategories
    .map((category) => ({
      category,
      focus: categorySentiment[focusIssuer]?.[category] || 0,
      peer: categorySentiment[peerIssuer]?.[category] || 0,
    }))
    .filter((item) => item.focus > 0 || item.peer > 0);

  const strengths = comparisonCategories
    .filter((item) => item.focus - item.peer >= 5)
    .sort((a, b) => (b.focus - b.peer) - (a.focus - a.peer))
    .slice(0, 3)
    .map((item) => ({
      area: item.category,
      why: `${focusIssuer} is outperforming ${peerIssuer} in ${item.category}.`,
      evidence: `${focusIssuer}: ${item.focus}, ${peerIssuer}: ${item.peer}.`,
      recommendation: `Use ${item.category.toLowerCase()} as a blueprint for the rest of the customer experience.`,
    }));

  const weaknesses = comparisonCategories
    .filter((item) => item.peer - item.focus >= 5)
    .sort((a, b) => (b.peer - b.focus) - (a.peer - a.focus))
    .slice(0, 3)
    .map((item) => ({
      area: item.category,
      why: `${focusIssuer} is trailing ${peerIssuer} in ${item.category}.`,
      evidence: `${focusIssuer}: ${item.focus}, ${peerIssuer}: ${item.peer}.`,
      recommendation: `Close the gap in ${item.category.toLowerCase()} with targeted product and service changes.`,
    }));

  const criticalIssues = categories
    .map((item) => {
      const relatedMentions = latestReviews.filter((review) => review.category === item.category).length || item.mentions;
      const focusCategoryScore = categorySentiment[focusIssuer]?.[item.category] || item.score;
      const peerCategoryScore = categorySentiment[peerIssuer]?.[item.category] || item.score;
      const competitiveGap = peerCategoryScore - focusCategoryScore;
      const severityScore = (100 - focusCategoryScore) + Math.min(relatedMentions, 30) + (competitiveGap > 0 ? Math.min(competitiveGap, 20) : 0);
      return {
        issue: item.category,
        severityScore,
        mentions: item.mentions,
        score: focusCategoryScore,
        peerScore: peerCategoryScore,
        competitiveGap,
      };
    })
    .sort((a, b) => b.severityScore - a.severityScore)
    .slice(0, 3)
    .map((item) => ({
      issue: item.issue,
      whyCritical: `${item.issue} is critical because ${focusIssuer} scores ${item.score}/100 versus ${peerIssuer} at ${item.peerScore}/100, with ${item.mentions} related mentions driving visible customer friction.`,
      howDetermined: `Determined from weighted severity using category sentiment, competitor gap, and mention volume in recent reviews.`,
      evidence: `${focusIssuer} vs ${peerIssuer}: ${item.score} vs ${item.peerScore}; mentions: ${item.mentions}; gap: ${item.competitiveGap > 0 ? `-${item.competitiveGap}` : `+${Math.abs(item.competitiveGap)}`}.`,
      recommendation: `Prioritize ${item.issue.toLowerCase()} by tightening policy clarity, removing operational blockers, and tracking week-over-week movement against ${peerIssuer}.`,
      severity: item.severityScore >= 70 ? "Critical" : item.severityScore >= 50 ? "Medium" : "Low",
    }));

  const now = Date.now();
  const windowMs = 30 * 24 * 60 * 60 * 1000;
  const trendInterpretations = categories
    .map((item) => {
      const reviewsForCategory = latestReviews.filter((review) => review.category === item.category);
      const recentCount = reviewsForCategory.filter((review) => {
        const ts = new Date(review.date).getTime();
        return Number.isFinite(ts) && now - ts <= windowMs;
      }).length;
      const previousCount = Math.max(1, reviewsForCategory.length - recentCount);
      const wow = Math.round(((recentCount - previousCount) / previousCount) * 100);
      const focusCategoryScore = categorySentiment[focusIssuer]?.[item.category] || item.score;
      const peerCategoryScore = categorySentiment[peerIssuer]?.[item.category] || item.score;
      const gap = peerCategoryScore - focusCategoryScore;
      const direction = wow > 10 ? "up" : wow < -10 ? "down" : "stable";
      return {
        category: item.category,
        direction,
        whyEmerging: `${item.category} is ${direction === "up" ? "accelerating" : direction === "down" ? "cooling" : "stable"} for ${focusIssuer} with ${recentCount} recent mentions and a ${gap > 0 ? `${gap}-point lag` : `${Math.abs(gap)}-point lead`} versus ${peerIssuer}.`,
        howDetected: `Detected from 30-day versus prior-window mention velocity combined with category sentiment deltas.`,
        evidence: `Recent mentions: ${recentCount}, prior window: ${previousCount}, WoW: ${wow > 0 ? "+" : ""}${wow}%, scores ${focusIssuer}/${peerIssuer}: ${focusCategoryScore}/${peerCategoryScore}.`,
        criticalAlert: wow > 20 || (gap > 8 && focusCategoryScore < 65)
          ? `Escalate ${item.category.toLowerCase()} this week with a remediation owner and daily KPI tracking.`
          : `Monitor ${item.category.toLowerCase()} with weekly checkpoints and competitor benchmarking.`,
        severity: wow > 20 || (gap > 8 && focusCategoryScore < 65) ? "Critical" : wow > 5 || gap > 4 ? "Medium" : "Low",
      };
    })
    .sort((a, b) => (b.severity === "Critical" ? 3 : b.severity === "Medium" ? 2 : 1) - (a.severity === "Critical" ? 3 : a.severity === "Medium" ? 2 : 1))
    .slice(0, 3);

  const pairwiseComparison = {
    companyA: focusIssuer,
    companyB: peerIssuer,
    summary: `${focusIssuer} sits ${focusScore >= peerScore ? "above" : "below"} ${peerIssuer} by ${Math.abs(focusScore - peerScore)} points overall; the strongest lift opportunities are concentrated in the weakest two categories where the competitor gap is largest.`,
    strengths,
    weaknesses,
  };

  return {
    companies: companies.slice(0, 6),
    weakCategories: categories.slice(0, 6),
    latestReviews: latestReviews.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8),
    focusIssuer,
    peerIssuer,
    focusScore,
    peerScore,
    pairwiseComparison,
    criticalIssues,
    trendInterpretations,
  };
}

function buildHeuristicAiResponse(snapshot) {
  const leadingCompany = snapshot.companies[0];
  const weakestCategory = snapshot.weakCategories[0];
  const secondWeakestCategory = snapshot.weakCategories[1];
  const topReview = snapshot.latestReviews[0];
  const focusIssuer = snapshot.focusIssuer || "Avant";
  const peerIssuer = snapshot.peerIssuer || (leadingCompany?.company || "Competitor");
  const focusScore = snapshot.focusScore || 50;
  const peerScore = snapshot.peerScore || 50;

  return {
    source: "heuristic",
    provider: "server",
    model: "heuristic-fallback",
    updatedAt: new Date().toISOString(),
    summary: leadingCompany && weakestCategory
      ? `${focusIssuer} sits ${focusScore >= peerScore ? "ahead of" : "behind"} ${peerIssuer} overall, but the live data shows clear gaps in ${weakestCategory.category.toLowerCase()} and adjacent customer journeys that create friction. ${topReview ? `Recent reviews point to ${topReview.category.toLowerCase()} and operational follow-through as the fastest opportunities to improve ${focusIssuer}'s standing.` : ""}`
      : "Live data is available, but the current snapshot is too sparse to generate an Avant-focused summary.",
    competitiveGaps: snapshot.weakCategories.slice(0, 3).map((category, index) => ({
      category: category.category,
      gap: -(Math.max(5, 15 - index * 3)),
      leader: leadingCompany ? leadingCompany.company : "Category leader",
      recommendation: `Improve Avant's ${category.category.toLowerCase()} experience to close the gap with the current leader and reduce friction in the customer journey.`,
    })),
    opportunities: [
      {
        opportunity: "Close Avant's weakest customer journey",
        evidence: weakestCategory ? `${weakestCategory.category} is underperforming at ${weakestCategory.score}/100 and needs to move closer to the competitive leaders.` : "A weak customer journey is holding Avant back versus competitors.",
        impact: "High",
        effort: "Medium",
      },
      {
        opportunity: "Improve proactive customer communication",
        evidence: secondWeakestCategory ? `${secondWeakestCategory.category} is also lagging, so Avant should reduce confusion earlier in the journey.` : "Several categories need more proactive communication to strengthen Avant's position.",
        impact: "High",
        effort: "Low",
      },
      {
        opportunity: "Scale the strongest Avant behaviors",
        evidence: leadingCompany ? `The best-performing issuer in the live data shows the experience patterns Avant should emulate or surpass.` : "A clear winning benchmark is visible in the data.",
        impact: "Medium",
        effort: "Medium",
      },
    ],
    segments: [
      {
        segment: "Avant strength area",
        size: `${Math.max(25, Math.min(55, leadingCompany?.score || 50))}%`,
        sentiment: leadingCompany?.score || 70,
        characteristics: "Customers respond best where Avant matches or exceeds competitor expectations on service and clarity.",
        retention: "High",
      },
      {
        segment: "Avant risk area",
        size: "30%",
        sentiment: weakestCategory?.score || 45,
        characteristics: "Customers are reacting to friction, unclear pricing, or weak follow-through in the lowest-scoring journey.",
        retention: "Medium",
      },
      {
        segment: "At-risk competitive gap",
        size: "15%",
        sentiment: Math.max(20, (weakestCategory?.score || 40) - 15),
        characteristics: "Customers with repeated negative signals who are most likely to choose competitors if Avant does not improve quickly.",
        retention: "Critical",
      },
      {
        segment: "Advocacy opportunity",
        size: "20%",
        sentiment: Math.min(90, (leadingCompany?.score || 65) + 5),
        characteristics: "Customers who will amplify Avant if the app, service, and communication experience becomes easier than competitor alternatives.",
        retention: "High",
      },
    ],
    strategicRecommendations: [
      {
        title: "Immediate: Fix Avant's weakest category",
        priority: "Critical",
        timeframe: "30 days",
        description: weakestCategory
          ? `Address ${weakestCategory.category.toLowerCase()} first because it is the lowest-scoring theme and is dragging Avant behind competitors.`
          : "Address the lowest-scoring issue in the live data first to improve Avant's standing.",
        impact: "Should reduce the highest-friction complaints fastest and narrow the competitive gap.",
        color: "red",
      },
      {
        title: "Short-term: Improve proactive communication",
        priority: "High",
        timeframe: "60 days",
        description: "Add clearer in-app and email guidance around decisions, fees, and next steps so Avant feels more transparent than competitors.",
        impact: "Will reduce confusion-driven negative sentiment and improve trust.",
        color: "orange",
      },
      {
        title: "Medium-term: Scale the winning Avant pattern",
        priority: "Medium",
        timeframe: "90 days",
        description: leadingCompany
          ? `Use ${leadingCompany.company} as the benchmark for what works best and replicate those patterns across Avant's weaker journeys.`
          : "Use the strongest customer journey as the benchmark across weaker Avant experiences.",
        impact: "Supports retention, reduces churn, and closes the competitive gap.",
        color: "blue",
      },
      {
        title: "Long-term: Build a durable loyalty loop",
        priority: "Strategic",
        timeframe: "120+ days",
        description: "Connect service improvements, transparency, and digital experience into a single Avant retention strategy that outperforms competitors.",
        impact: "Creates a more defensible customer experience over time.",
        color: "purple",
      },
    ],
    criticalIssues: snapshot.criticalIssues || [],
    trendInterpretations: snapshot.trendInterpretations || [],
    pairwiseComparison: snapshot.pairwiseComparison || {
      companyA: focusIssuer,
      companyB: peerIssuer,
      summary: `${focusIssuer} sits ${focusScore >= peerScore ? "above" : "below"} ${peerIssuer} overall.`,
      strengths: [],
      weaknesses: [],
    },
  };
}

function extractJsonObject(content) {
  const text = String(content || "").trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  const jsonText = first >= 0 && last > first ? candidate.slice(first, last + 1) : candidate;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function extractAiText(payload) {
  const messageContent = payload?.choices?.[0]?.message?.content;
  if (typeof messageContent === "string") {
    return messageContent;
  }

  if (Array.isArray(messageContent)) {
    const textParts = messageContent
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.content === "string") return part.content;
        return "";
      })
      .filter(Boolean);
    if (textParts.length) {
      return textParts.join("\n");
    }
  }

  if (typeof payload?.output_text === "string") return payload.output_text;
  if (typeof payload?.text === "string") return payload.text;
  if (typeof payload?.response === "string") return payload.response;

  const prediction = payload?.predictions?.[0];
  if (typeof prediction === "string") return prediction;
  if (typeof prediction?.text === "string") return prediction.text;
  if (typeof prediction?.content === "string") return prediction.content;

  return "";
}

function extractSummaryFromJsonLikeText(content) {
  const text = String(content || "").trim();
  if (!text) return null;
  const match = text.match(/"summary"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  if (!match) return null;

  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1].replace(/\\n/g, " ").replace(/\\"/g, '"');
  }
}

async function generateAiInsights(snapshot) {
  if (!AI_API_URL) {
    return buildHeuristicAiResponse(snapshot);
  }

  const isDatabricksServingEndpoint = /\/serving-endpoints\/[^/]+\/invocations$/i.test(AI_API_URL);

  const prompt = [
    `Use the following live dashboard snapshot to generate concise executive AI insights for ${snapshot.focusIssuer || "Avant"}.`,
    `Compare ${snapshot.focusIssuer || "Avant"} against ${snapshot.peerIssuer || "its closest competitor"}.`,
    "Focus only on the focus company versus competitors and recommend changes that would improve the focus company's position.",
    "Return compact JSON only with this exact schema:",
    "{ summary: string, criticalIssues: [{ issue: string, whyCritical: string, howDetermined: string, evidence: string, recommendation: string, severity: 'Critical'|'Medium'|'Low' }], trendInterpretations: [{ category: string, direction: 'up'|'down'|'stable', whyEmerging: string, howDetected: string, evidence: string, criticalAlert: string, severity: 'Critical'|'Medium'|'Low' }], pairwiseComparison: { companyA: string, companyB: string, summary: string, strengths: [{ area: string, why: string, evidence: string, recommendation: string }], weaknesses: [{ area: string, why: string, evidence: string, recommendation: string }] }, competitiveGaps: [{ category: string, gap: number, leader: string, recommendation: string }], opportunities: [{ opportunity: string, evidence: string, impact: 'High'|'Medium'|'Low', effort: 'High'|'Medium'|'Low' }], segments: [{ segment: string, size: string, sentiment: number, characteristics: string, retention: 'High'|'Medium'|'Critical' }], strategicRecommendations: [{ title: string, priority: 'Critical'|'High'|'Medium'|'Strategic', timeframe: string, description: string, impact: string, color: 'red'|'orange'|'blue'|'purple' }] }",
    "Rules:",
    "summary must be 2 sentences max.",
    "Return exactly 3 competitiveGaps.",
    "Return exactly 3 opportunities.",
    "Return exactly 3 segments.",
    "Return exactly 4 strategicRecommendations.",
    "Return exactly 3 criticalIssues.",
    "Return exactly 3 trendInterpretations.",
    "Return exactly 3 strengths and 3 weaknesses in pairwiseComparison.",
    "Keep each description concise. No markdown. No code fences. No prose before or after the JSON.",
    "Keep the output grounded in the data.",
    "Do not mention other brands unless they are used as direct competitors for comparison.",
    "Do not mention that the response was generated by a model.",
    "Snapshot:",
    JSON.stringify(snapshot, null, 2),
  ].join("\n\n");

  const response = await fetch(AI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify(
      isDatabricksServingEndpoint
        ? {
            messages: [
              {
                role: "system",
                content: "You are a senior product and sentiment analyst. Produce JSON only.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.2,
            max_tokens: 900,
          }
        : {
            model: AI_MODEL,
            messages: [
              {
                role: "system",
                content: "You are a senior product and sentiment analyst. Produce JSON only.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.2,
            max_tokens: 900,
          }
    ),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI request failed with ${response.status} ${response.statusText}: ${errorText.slice(0, 500)}`);
  }

  const payload = await response.json();
  const content = extractAiText(payload);

  const parsed = extractJsonObject(content);
  const fallback = buildHeuristicAiResponse(snapshot);
  if (!parsed || typeof parsed !== "object") {
    const extractedSummary = extractSummaryFromJsonLikeText(content);
    return {
      ...fallback,
      source: "ai",
      provider: AI_API_URL.includes("databricks") ? "databricks" : "openai-compatible",
      model: payload?.model || AI_MODEL,
      updatedAt: new Date().toISOString(),
      summary: extractedSummary || content.trim() || fallback.summary,
    };
  }

  return {
    source: "ai",
    provider: AI_API_URL.includes("databricks") ? "databricks" : "openai-compatible",
    model: payload?.model || AI_MODEL,
    updatedAt: new Date().toISOString(),
    summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
    criticalIssues: Array.isArray(parsed.criticalIssues) ? parsed.criticalIssues : fallback.criticalIssues,
    trendInterpretations: Array.isArray(parsed.trendInterpretations) ? parsed.trendInterpretations : fallback.trendInterpretations,
    pairwiseComparison:
      parsed.pairwiseComparison && typeof parsed.pairwiseComparison === "object"
        ? parsed.pairwiseComparison
        : fallback.pairwiseComparison,
    competitiveGaps: Array.isArray(parsed.competitiveGaps) ? parsed.competitiveGaps : fallback.competitiveGaps,
    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : fallback.opportunities,
    segments: Array.isArray(parsed.segments) ? parsed.segments : fallback.segments,
    strategicRecommendations: Array.isArray(parsed.strategicRecommendations) ? parsed.strategicRecommendations : fallback.strategicRecommendations,
  };
}

app.get("/api/health", (_req, res) => {
  const missing = validateEnv();
  if (missing.length) {
    return res.status(500).json({
      ok: false,
      error: `Missing config values: ${missing.join(", ")}. Set env vars or config/runtime_config.json.`,
    });
  }
  return res.json({ ok: true });
});

app.get("/api/dashboard", async (_req, res) => {
  try {
    const missing = validateEnv();
    if (missing.length) {
      return res.status(500).json({
        error: `Missing config values: ${missing.join(", ")}. Set env vars or config/runtime_config.json.`,
      });
    }

    const kpi = await query(`SELECT * FROM ${GOLD_TABLE}`);
    const reviews = await query(
      `SELECT company, primary_category, sentiment_score, text, created_ts FROM ${SILVER_TABLE}`
    );

    // Debug: log what companies are in the data
    const kpiCompanies = new Set(kpi.map((row) => row.company).filter(Boolean));
    const reviewCompanies = new Set(reviews.map((row) => row.company).filter(Boolean));
    console.log(`[Dashboard] KPI companies: [${Array.from(kpiCompanies).join(", ")}]`);
    console.log(`[Dashboard] Review companies: [${Array.from(reviewCompanies).join(", ")}]`);
    console.log(`[Dashboard] Total KPI rows: ${kpi.length}, Total review rows: ${reviews.length}`);

    return res.json({ kpi, reviews });
  } catch (e) {
    return res.status(500).json({ error: `Dashboard query failed: ${String(e)}` });
  }
});

app.get("/api/ai/insights", async (_req, res) => {
  try {
    const missing = validateEnv();
    if (missing.length) {
      return res.status(500).json({
        error: `Missing config values: ${missing.join(", ")}. Set env vars or config/runtime_config.json.`,
      });
    }

    const [kpi, reviews] = await Promise.all([
      query(`SELECT * FROM ${GOLD_TABLE}`),
      query(
        `SELECT company, primary_category, sentiment_score, text, created_ts FROM ${SILVER_TABLE}`
      ),
    ]);

    const focusCompany = asString(_req.query.focus) || asString(_req.query.companyA) || "Avant";
    const peerCompany = asString(_req.query.companyB) || null;
    const snapshot = summarizeRows(kpi, reviews, focusCompany, peerCompany);
    const insights = await generateAiInsights(snapshot);
    return res.json(insights);
  } catch (e) {
    return res.status(500).json({ error: `AI insights request failed: ${String(e)}` });
  }
});

app.listen(8001, () => {
  console.log("Databricks API listening on 8001");
});
