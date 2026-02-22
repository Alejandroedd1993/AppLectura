"use strict";

const nodeFetch = (() => {
  try {
    const mod = require("node-fetch");
    return mod.default || mod;
  } catch {
    return null;
  }
})();

const fetchFn = global.fetch || nodeFetch;

if (!fetchFn) {
  console.error("ERR: fetch no disponible. Instala node-fetch o usa Node 18+.");
  process.exit(1);
}

const args = process.argv.slice(2);
const getArg = (name, fallback = "") => {
  const pref = `--${name}=`;
  const found = args.find((a) => a.startsWith(pref));
  if (!found) return fallback;
  return found.slice(pref.length).trim();
};

const baseUrlRaw =
  getArg("url") ||
  process.env.BASE_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:3001";
const baseUrl = baseUrlRaw.replace(/\/+$/, "");
const bearerToken = getArg("token") || process.env.WEB_SEARCH_BEARER || process.env.FIREBASE_ID_TOKEN || "";
const query = getArg("query") || process.env.WEB_SEARCH_QUERY || "pobreza ecuador estadisticas 2024";
const type = getArg("type") || process.env.WEB_SEARCH_TYPE || "estadisticas_locales";

const timeoutMs = 12000;

function maskToken(token) {
  if (!token) return "NONE";
  if (token.length <= 12) return `SET(len=${token.length})`;
  return `SET(len=${token.length}, suffix=${token.slice(-6)})`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options, timeout = timeoutMs) {
  return Promise.race([
    fetchFn(url, options),
    (async () => {
      await sleep(timeout);
      throw new Error(`timeout after ${timeout}ms`);
    })(),
  ]);
}

async function requestJson({ method, path, auth = false, body }) {
  const url = `${baseUrl}${path}`;
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (auth && bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

  const res = await fetchWithTimeout(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  return {
    url,
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    data,
    raw,
  };
}

function printHeader(title) {
  console.log(`\n=== ${title} ===`);
}

function printObject(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function summarizeConfig(testData) {
  const cfg = testData?.configuracion || {};
  const providerAvailable = Boolean(cfg.tavily_disponible || cfg.serper_disponible || cfg.bing_disponible);
  const enabled = Boolean(cfg.enable_web_search);
  const realSearchActive = enabled && providerAvailable;
  return {
    enabled,
    providerAvailable,
    realSearchActive,
    mode: cfg.modo_funcionamiento || "unknown",
    raw: cfg,
  };
}

(async () => {
  console.log("Web Search Diagnostic");
  console.log(`baseUrl=${baseUrl}`);
  console.log(`token=${maskToken(bearerToken)}`);
  console.log(`query="${query}" type="${type}"`);

  let hardFailure = false;
  let realSearchWorking = false;

  try {
    printHeader("GET /api/health");
    const health = await requestJson({ method: "GET", path: "/api/health", auth: false });
    printObject({
      url: health.url,
      ok: health.ok,
      status: health.status,
      apis: health.data?.apis || null,
      service: health.data?.status || null,
    });
    if (!health.ok) hardFailure = true;
  } catch (err) {
    printObject({ error: `health check failed: ${err.message}` });
    hardFailure = true;
  }

  let testSummary = null;
  try {
    printHeader("GET /api/web-search/test");
    const test = await requestJson({ method: "GET", path: "/api/web-search/test", auth: true });
    if (test.status === 401 || test.status === 403) {
      printObject({
        ok: false,
        status: test.status,
        message: "endpoint requiere auth en produccion; pasa --token o WEB_SEARCH_BEARER",
        body: test.data || test.raw,
      });
    } else {
      printObject({
        url: test.url,
        ok: test.ok,
        status: test.status,
        configuracion: test.data?.configuracion || null,
      });
      if (test.ok) {
        testSummary = summarizeConfig(test.data);
        printObject({ inferred: testSummary });
      }
    }
  } catch (err) {
    printObject({ error: `test endpoint failed: ${err.message}` });
  }

  try {
    printHeader("POST /api/web-search");
    const payload = {
      query,
      type,
      maxResults: 3,
    };
    const search = await requestJson({
      method: "POST",
      path: "/api/web-search",
      auth: true,
      body: payload,
    });

    if (search.status === 401 || search.status === 403) {
      printObject({
        ok: false,
        status: search.status,
        message: "falta token Firebase valido para probar POST /api/web-search",
        body: search.data || search.raw,
      });
      hardFailure = true;
    } else {
      const apiUsed = search.data?.api_utilizada || "unknown";
      const enabled = Boolean(search.data?.web_search_enabled);
      const resultCount = Array.isArray(search.data?.resultados) ? search.data.resultados.length : 0;
      const simulated = /simulada/i.test(String(apiUsed));

      printObject({
        url: search.url,
        ok: search.ok,
        status: search.status,
        api_utilizada: apiUsed,
        web_search_enabled: enabled,
        resultados: resultCount,
        first_result: search.data?.resultados?.[0] || null,
      });

      realSearchWorking = search.ok && enabled && !simulated && resultCount > 0;
    }
  } catch (err) {
    printObject({ error: `search endpoint failed: ${err.message}` });
    hardFailure = true;
  }

  printHeader("FINAL VERDICT");
  if (hardFailure) {
    console.log("FAIL: No se pudo validar el flujo completo (backend/auth/conectividad).");
    process.exitCode = 2;
    return;
  }

  if (realSearchWorking) {
    console.log("OK: Web search real activo (no simulado).");
    process.exitCode = 0;
    return;
  }

  if (testSummary && !testSummary.realSearchActive) {
    console.log("WARN: Backend operativo pero en modo simulado o deshabilitado.");
    console.log("Revisa ENABLE_WEB_SEARCH=true y API keys (TAVILY/SERPER/BING) en Render.");
    process.exitCode = 1;
    return;
  }

  console.log("WARN: Diagnostico inconcluso; revisa los bloques anteriores.");
  process.exitCode = 1;
})();
