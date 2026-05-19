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

app.listen(8001, () => {
  console.log("Databricks API listening on 8001");
});
