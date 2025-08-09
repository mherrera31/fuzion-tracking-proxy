
/* eslint-disable no-console */
const express = require("express");
const cors = require("cors");

// Asegurar que exista fetch (Node 18+)
if (typeof fetch !== "function") {
  throw new Error("Este servidor requiere Node 18+ con fetch nativo.");
}

const app = express();
const PORT = process.env.PORT || 3000;

// =================== CONFIG ===================
const PROVIDER_BASE =
  process.env.PROVIDER_BASE || "https://app.fuzioncargo.com/index.php/v3/package/";
// Timeout en ms para llamadas al proveedor
const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS || 8000);
// TTL de cache en ms (respuestas positivas)
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 2 * 60 * 1000); // 2 minutos
// Máximo de candidatos en fuzzy
const FUZZY_MAX_CANDIDATES = Number(process.env.FUZZY_MAX_CANDIDATES || 60);
// User-Agent
const UA = process.env.USER_AGENT || "Mozilla/5.0 (TrackingProxy; +https://render.com)";

// =================== MIDDLEWARE ===================
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());

// =================== CACHE SIMPLE ===================
/**
 * Cache en memoria con TTL.
 * Estructura: key -> { data, exp }
 */
const cache = new Map();
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}
function cacheSet(key, data, ttlMs = CACHE_TTL_MS) {
  cache.set(key, { data, exp: Date.now() + ttlMs });
}

// =================== UTILS ===================
async function fetchWithTimeout(url, opts = {}, timeoutMs = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
        ...(opts.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Llama al proveedor Fuzion y normaliza el resultado:
 * - Devuelve { error: true } si no hay datos útiles
 * - Usa cache para respuestas positivas
 */
async function fetchFromProvider(tracking) {
  const key = `pkg:${tracking}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const url = `${PROVIDER_BASE}${encodeURIComponent(tracking)}`;
  try {
    const response = await fetchWithTimeout(url, { method: "GET" });
    if (!response.ok) {
      return { error: true, status: response.status, message: `HTTP ${response.status}` };
    }
    const data = await response.json();
    // Consideramos válido si no trae "error"
    if (data && !data.error) {
      cacheSet(key, data);
      return data;
    }
    return { error: true };
  } catch (err) {
    return { error: true, message: err?.message || "provider_error" };
  }
}

// Genera candidatos para fuzzy: quitar 1 carácter, swaps visuales, normalizaciones, heurística UPS
function buildCandidates(input) {
  const out = new Set();
  const s = String(input || "").trim();

  // Normalizaciones básicas
  out.add(s.replace(/\s+/g, ""));              // sin espacios
  out.add(s.replace(/[^A-Za-z0-9]/g, ""));     // solo alfanumérico

  if (s.length >= 10) {
    // a) quitar 1 carácter (simula falta/sobra)
    for (let i = 0; i < s.length; i++) {
      out.add(s.slice(0, i) + s.slice(i + 1));
    }

    // b) swaps visuales
    const swaps = { O: "0", "0": "O", I: "1", "1": "I", S: "5", "5": "S", B: "8", "8": "B" };
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const up = ch.toUpperCase();
      if (swaps[ch]) out.add(s.slice(0, i) + swaps[ch] + s.slice(i + 1));
      if (swaps[up] && up !== ch) out.add(s.slice(0, i) + swaps[up] + s.slice(i + 1));
    }

    // c) heurística courier (ej. posible UPS si faltó "1Z")
    if (!/^1Z/i.test(s) && /[A-Za-z]/.test(s)) out.add("1Z" + s);
  }

  // evitar reintentar el original exacto y limitar cantidad
  out.delete(s);
  return Array.from(out).slice(0, FUZZY_MAX_CANDIDATES);
}

// =================== ENDPOINTS ===================

// Salud
app.get("/health", (_req, res) => res.json({ ok: true }));

// Lookup directo (tu endpoint actual)
app.get("/v3/package/:tracking", async (req, res) => {
  const tracking = req.params.tracking;
  if (!tracking) return res.status(400).json({ error: "Tracking requerido." });

  const data = await fetchFromProvider(tracking);
  if (data?.error) {
    const code = data.status || 404;
    return res.status(code).json({ error: true, message: data.message || "not_found" });
  }
  res.json(data);
});

// Lookup fuzzy
// GET /v3/package/fuzzy?q=TRACKING
app.get("/v3/package/fuzzy", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: true, message: "missing_query" });

  // 1) intento directo primero
  let data = await fetchFromProvider(q);
  if (data && !data.error) return res.json({ match: q, data });

  // 2) candidatos
  const candidates = buildCandidates(q);

  // 3) probar candidatos en orden
  for (const cand of candidates) {
    if (!cand) continue;
    data = await fetchFromProvider(cand);
    if (data && !data.error) {
      return res.json({ match: cand, original: q, data });
    }
  }

  // 4) nada
  return res.status(404).json({ error: true, message: "no_match", original: q });
});

// =================== START ===================
app.listen(PORT, () => {
  console.log(`Fuzion proxy escuchando en :${PORT}`);
  console.log(`Base proveedor: ${PROVIDER_BASE}`);
});
