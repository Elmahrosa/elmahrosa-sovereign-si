import http from "node:http";
import { readFile } from "node:fs/promises";
import { chat } from "./services/sovereignKernel.js";

// ---------- Config ----------
const HOST = "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT || "3100", 10);
const OLLAMA_URL = "http://127.0.0.1:11434";
const VIDEO_ENGINE_RAW = process.env.VIDEO_ENGINE_URL || "http://127.0.0.1:8000";
const VIDEO_PATH_RAW = process.env.VIDEO_ENGINE_PATH || "/api/generate";
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 600000);
const MAX_BODY = 100_000; // bytes
const MAX_PROMPT = 4000;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const ALLOWED_ORIGINS = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);

// ---------- Sovereign policy: loopback only ----------
function blocked(msg) {
  console.error(`BLOCKED: ${msg}`);
  process.exit(1);
}

const isLoopbackHttp = (u) =>
  u.protocol === "http:" && LOOPBACK_HOSTS.has(u.hostname) && !u.username && !u.password;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) blocked(`invalid PORT "${process.env.PORT}"`);

let ENGINE_ORIGIN;
try {
  const u = new URL(VIDEO_ENGINE_RAW);
  if (!isLoopbackHttp(u)) blocked(`VIDEO_ENGINE_URL "${u.host}" is not local - remote engine forbidden by sovereign policy`);
  ENGINE_ORIGIN = u.origin;
} catch {
  blocked("VIDEO_ENGINE_URL is not a valid URL");
}

// The path is validated AFTER resolving, so tricks like "@evil.com" or "/\evil.com" cannot change the host.
let VIDEO_URL;
try {
  if (!VIDEO_PATH_RAW.startsWith("/") || VIDEO_PATH_RAW.startsWith("//") || VIDEO_PATH_RAW.includes("\\")) {
    blocked("VIDEO_ENGINE_PATH must start with a single '/' and contain no backslash");
  }
  const u = new URL(VIDEO_PATH_RAW, ENGINE_ORIGIN);
  if (!isLoopbackHttp(u) || u.origin !== ENGINE_ORIGIN) blocked("VIDEO_ENGINE_PATH resolves outside the local engine");
  VIDEO_URL = u.href;
} catch {
  blocked("VIDEO_ENGINE_PATH is invalid");
}

// ---------- Helpers ----------
class HttpError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY"
};
// Blocks the page from sending data anywhere except this server (stops ?api=http://evil exfiltration).
const HTML_CSP = "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'";

const send = (res, code, body, type = "application/json; charset=utf-8") => {
  const headers = { ...BASE_HEADERS, "Content-Type": type };
  if (type.startsWith("text/html")) headers["Content-Security-Policy"] = HTML_CSP;
  res.writeHead(code, headers);
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

// Anti DNS-rebinding / CSRF: only our own origin may call this server.
function guardRequest(req) {
  if (!ALLOWED_HOSTS.has(req.headers.host)) throw new HttpError(403, "BAD_HOST", "host not allowed");
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) throw new HttpError(403, "BAD_ORIGIN", "origin not allowed");
  if (req.method === "POST") {
    const site = req.headers["sec-fetch-site"];
    if (site && !["same-origin", "none"].includes(site)) throw new HttpError(403, "CROSS_SITE", "cross-site request blocked");
    const ct = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (ct !== "application/json") throw new HttpError(415, "JSON_REQUIRED", "Content-Type must be application/json");
  }
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw new HttpError(413, "TOO_LARGE", "request body too large");
    chunks.push(c);
  }
  let parsed;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw new HttpError(400, "BAD_JSON", "invalid JSON body"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "BAD_JSON", "JSON body must be an object");
  }
  return parsed;
}

function readPrompt(b) {
  const raw = b.prompt ?? b.message;
  const prompt = typeof raw === "string" ? raw.trim() : "";
  if (!prompt) throw new HttpError(400, "NO_PROMPT", "prompt required");
  if (prompt.length > MAX_PROMPT) throw new HttpError(400, "PROMPT_TOO_LONG", `prompt max ${MAX_PROMPT} chars`);
  return prompt;
}

// Accept only video URLs that point to the local engine.
function localVideoUrl(rel) {
  try {
    const u = new URL(rel, ENGINE_ORIGIN);
    return isLoopbackHttp(u) ? u.href : null;
  } catch { return null; }
}

// ---------- Routes ----------
async function renderVideo(req, res) {
  const b = await readJson(req);
  const prompt = readPrompt(b);
  const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : undefined);
  const payload = {
    topic: prompt,
    voice: typeof b.voice === "string" ? b.voice.slice(0, 64) : undefined,
    width: int(b.width, 64, 3840),
    height: int(b.height, 64, 3840),
    fps: int(b.fps, 1, 60)
  };

  let r;
  try {
    r = await fetch(VIDEO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "error", // a local engine must not bounce us elsewhere
      signal: AbortSignal.timeout(RENDER_TIMEOUT_MS)
    });
  } catch (e) {
    throw new HttpError(503, "VIDEO_ENGINE_DOWN", `cannot reach ${VIDEO_URL}: ${e.message}`);
  }

  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  if (!r.ok || !data || typeof data !== "object") {
    throw new HttpError(502, "VIDEO_ENGINE_ERROR", `engine ${r.status}: ${text.slice(0, 300)}`);
  }

  const rel = data.video_url ?? data.videoUrl;
  if (typeof rel === "string") {
    const safe = localVideoUrl(rel);
    if (!safe) throw new HttpError(502, "VIDEO_URL_BLOCKED", "engine returned a non-local video URL");
    data.videoUrl = safe;
    if ("video_url" in data) data.video_url = safe;
  }
  return send(res, 200, data);
}

const PAGES = new Map([
  ["/", "./public/cinema.html"],
  ["/cinema.html", "./public/cinema.html"],
  ["/chat.html", "./public/chat.html"]
]);

const server = http.createServer(async (req, res) => {
  try {
    guardRequest(req);
    const path = String(req.url || "/").split("?")[0].split("#")[0];

    if (req.method === "GET" && PAGES.has(path)) {
      const html = await readFile(new URL(PAGES.get(path), import.meta.url), "utf8");
      return send(res, 200, html, "text/html; charset=utf-8");
    }

    if (req.method === "POST" && path === "/api/sovereign-chat") {
      const b = await readJson(req);
      const out = await chat({ prompt: readPrompt(b), url: OLLAMA_URL });
      return send(res, 200, out);
    }

    if (req.method === "POST" && path === "/api/cinema-render") {
      return await renderVideo(req, res);
    }

    send(res, 404, { error: "not found" });
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    const isPolicyBlocked = e?.code === "POLICY_BLOCKED" || String(e?.message || "").includes("POLICY_BLOCKED");
    const status = e instanceof HttpError ? e.status : (isPolicyBlocked ? 403 : e?.code === "BAD_REQUEST" ? 400 : (e?.code === "MODEL_ERROR" || e?.code === "MODEL_BAD_RESPONSE") ? 502 : 503);
    const code = isPolicyBlocked ? "POLICY_BLOCKED" : (e?.code || "ERROR");
    send(res, status, { error: code, message: String(e?.message || e) });
  }
});

server.listen(PORT, HOST, () =>
  console.log(`Cinema Studio: http://localhost:${PORT}/cinema.html + /chat.html (video engine: ${VIDEO_URL})`)
);
