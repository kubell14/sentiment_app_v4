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

function summarizeRows(kpiRows, reviewRows) {
  const companyScores = new Map();
  const categoryScores = new Map();
  const latestReviews = [];

  for (const row of kpiRows) {
    const company = normalizeIssuer(row.company ?? row.issuer ?? row.competitor);
    const score = normalizeScore(row.avg_sentiment_score ?? row.sentiment_score ?? row.score_100 ?? row.score);
    if (!companyScores.has(company)) companyScores.set(company, []);
    companyScores.get(company).push(score);
  }

  for (const row of reviewRows) {
    const company = normalizeIssuer(row.company ?? row.issuer);
    const category = normalizeCategory(row.primary_category ?? row.category);
    const score = normalizeScore(row.sentiment_score ?? row.sentiment);
    if (!companyScores.has(company)) companyScores.set(company, []);
    companyScores.get(company).push(score);

    if (!categoryScores.has(category)) categoryScores.set(category, []);
    categoryScores.get(category).push(score);

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

  return {
    companies: companies.slice(0, 6),
    weakCategories: categories.slice(0, 6),
    latestReviews: latestReviews
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 8),
  };
}

function buildHeuristicAiResponse(snapshot) {
  const leadingCompany = snapshot.companies[0];
  const weakestCategory = snapshot.weakCategories[0];
  const secondWeakestCategory = snapshot.weakCategories[1];
  const topReview = snapshot.latestReviews[0];

  return {
    source: "heuristic",
    provider: "server",
    model: "heuristic-fallback",
    updatedAt: new Date().toISOString(),
    summary: leadingCompany && weakestCategory
      ? `Live data shows ${leadingCompany.company} leading at ${leadingCompany.score}/100 while ${weakestCategory.category} is the weakest theme at ${weakestCategory.score}/100. ${topReview ? `Recent feedback is centered on ${topReview.category.toLowerCase()} and ${topReview.company}.` : ""}`
      : "Live data is available, but the current snapshot is too sparse to generate a detailed AI summary.",
    competitiveGaps: snapshot.weakCategories.slice(0, 3).map((category, index) => ({
      category: category.category,
      gap: -(Math.max(5, 15 - index * 3)),
      leader: leadingCompany ? leadingCompany.company : "Category leader",
      recommendation: `Improve ${category.category.toLowerCase()} communication and remove friction in the customer journey.`,
    })),
    opportunities: [
      {
        opportunity: "Fee Transparency Overhaul",
        evidence: weakestCategory ? `${weakestCategory.category} is underperforming at ${weakestCategory.score}/100.` : "Fee-related friction is present in the live data.",
        impact: "High",
        effort: "Medium",
      },
      {
        opportunity: "Proactive Customer Communication",
        evidence: secondWeakestCategory ? `${secondWeakestCategory.category} is also lagging and needs clearer messaging.` : "Several categories need more proactive communication.",
        impact: "High",
        effort: "Low",
      },
      {
        opportunity: "Winning Segment Expansion",
        evidence: leadingCompany ? `${leadingCompany.company} is the current strength to scale.` : "A clear winning segment is visible in the data.",
        impact: "Medium",
        effort: "Medium",
      },
    ],
    segments: [
      {
        segment: "High-Satisfaction Customers",
        size: `${Math.max(25, Math.min(55, leadingCompany?.score || 50))}%`,
        sentiment: leadingCompany?.score || 70,
        characteristics: "Engaged users who respond well to strong service and clear product messaging.",
        retention: "High",
      },
      {
        segment: "Fee-Sensitive Users",
        size: "30%",
        sentiment: weakestCategory?.score || 45,
        characteristics: "Users reacting to transparency, pricing, and unexpected charges.",
        retention: "Medium",
      },
      {
        segment: "At-Risk Users",
        size: "15%",
        sentiment: Math.max(20, (weakestCategory?.score || 40) - 15),
        characteristics: "Customers with repeated negative signals who need immediate intervention.",
        retention: "Critical",
      },
      {
        segment: "Digital-First Users",
        size: "20%",
        sentiment: Math.min(90, (leadingCompany?.score || 65) + 5),
        characteristics: "Customers who reward a smooth app and responsive digital experience.",
        retention: "High",
      },
    ],
    strategicRecommendations: [
      {
        title: "Immediate: Fix the weakest category",
        priority: "Critical",
        timeframe: "30 days",
        description: weakestCategory
          ? `Address ${weakestCategory.category.toLowerCase()} first because it is the lowest-scoring theme in the live data.`
          : "Address the lowest-scoring issue in the live data first.",
        impact: "Should reduce the highest-friction complaints fastest.",
        color: "red",
      },
      {
        title: "Short-term: Improve proactive communication",
        priority: "High",
        timeframe: "60 days",
        description: "Add clearer in-app and email guidance around customer decisions, fees, and next steps.",
        impact: "Will reduce confusion-driven negative sentiment.",
        color: "orange",
      },
      {
        title: "Medium-term: Scale the winning experience",
        priority: "Medium",
        timeframe: "90 days",
        description: leadingCompany
          ? `Use ${leadingCompany.company} as the benchmark for what is working well and replicate it across weaker journeys.`
          : "Use the strongest customer journey as the benchmark across weaker experiences.",
        impact: "Supports retention and cross-sell opportunities.",
        color: "blue",
      },
      {
        title: "Long-term: Build a durable loyalty loop",
        priority: "Strategic",
        timeframe: "120+ days",
        description: "Connect service improvements, transparency, and digital experience into a single retention strategy.",
        impact: "Creates a more defensible customer experience over time.",
        color: "purple",
      },
    ],
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

async function generateAiInsights(snapshot) {
  if (!AI_API_URL) {
    return buildHeuristicAiResponse(snapshot);
  }

  const isDatabricksServingEndpoint = /\/serving-endpoints\/[^/]+\/invocations$/i.test(AI_API_URL);

  const prompt = [
    "Use the following live dashboard snapshot to generate concise executive AI insights for a credit-card sentiment app.",
    "Return JSON only with this exact schema:",
    "{ summary: string, competitiveGaps: [{ category: string, gap: number, leader: string, recommendation: string }], opportunities: [{ opportunity: string, evidence: string, impact: 'High'|'Medium'|'Low', effort: 'High'|'Medium'|'Low' }], segments: [{ segment: string, size: string, sentiment: number, characteristics: string, retention: 'High'|'Medium'|'Critical' }], strategicRecommendations: [{ title: string, priority: 'Critical'|'High'|'Medium'|'Strategic', timeframe: string, description: string, impact: string, color: 'red'|'orange'|'blue'|'purple' }] }",
    "Keep the output grounded in the data. Do not mention that the response was generated by a model.",
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
            max_tokens: 1200,
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
    return {
      ...fallback,
      source: "ai",
      provider: AI_API_URL.includes("databricks") ? "databricks" : "openai-compatible",
      model: payload?.model || AI_MODEL,
      updatedAt: new Date().toISOString(),
      summary: content.trim() || fallback.summary,
    };
  }

  return {
    source: "ai",
    provider: AI_API_URL.includes("databricks") ? "databricks" : "openai-compatible",
    model: payload?.model || AI_MODEL,
    updatedAt: new Date().toISOString(),
    summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
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
      `SELECT company, primary_category, sentiment_score, text, created_ts FROM ${SILVER_TABLE} ORDER BY created_ts DESC LIMIT 5000`
    );

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
        `SELECT company, primary_category, sentiment_score, text, created_ts FROM ${SILVER_TABLE} ORDER BY created_ts DESC LIMIT 1000`
      ),
    ]);

    const snapshot = summarizeRows(kpi, reviews);
    const insights = await generateAiInsights(snapshot);
    return res.json(insights);
  } catch (e) {
    return res.status(500).json({ error: `AI insights request failed: ${String(e)}` });
  }
});

app.listen(8001, () => {
  console.log("Databricks API listening on 8001");
});
