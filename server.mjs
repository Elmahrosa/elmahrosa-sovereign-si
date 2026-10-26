import http from "node:http";
import { readFile } from "node:fs/promises";
import { chat } from "./services/sovereignKernel.js";

const PORT = process.env.PORT || 3100;
const VIDEO_ENGINE = (process.env.VIDEO_ENGINE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const VIDEO_PATH = process.env.VIDEO_ENGINE_PATH || "/api/generate";
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 600000);
const MAX_BODY = 100_000;

// Sovereign policy: video engine must be local unless explicitly allowed
const engineHost = new URL(VIDEO_ENGINE).hostname;
if (!["127.0.0.1", "localhost"].includes(engineHost) && process.env.ALLOW_REMOTE_ENGINE !== "1") {
  console.error(`BLOCKED: VIDEO_ENGINE_URL host "${engineHost}" is not local (set ALLOW_REMOTE_ENGINE=1 to override)`);
  process.exit(1);
}

class HttpError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

const send = (res, code, body, type = "application/json; charset=utf-8") => {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

async function readJson(req) {
  let raw = "";
  for await (const c of req) {
    raw += c;
    if (raw.length > MAX_BODY) throw new HttpError(413, "TOO_LARGE", "request body too large");
  }
  try { return JSON.parse(raw || "{}"); }
  catch { throw new HttpError(400, "BAD_JSON", "invalid JSON body"); }
}

async function renderVideo(req, res) {
  const b = await readJson(req);
  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
  if (!prompt) throw new HttpError(400, "NO_PROMPT", "prompt required");
  if (prompt.length > 4000) throw new HttpError(400, "PROMPT_TOO_LONG", "prompt max 4000 chars");

  const payload = { topic: prompt, voice: typeof b.voice === "string" ? b.voice : undefined };

  let r;
  try {
    r = await fetch(VIDEO_ENGINE + VIDEO_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(RENDER_TIMEOUT_MS)
    });
  } catch (e) {
    throw new HttpError(503, "VIDEO_ENGINE_DOWN", `cannot reach ${VIDEO_ENGINE}${VIDEO_PATH}: ${e.message}`);
  }

  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  if (!r.ok || !data) throw new HttpError(502, "VIDEO_ENGINE_ERROR", `engine ${r.status}: ${text.slice(0, 300)}`);

  const rel = data.video_url ?? data.videoUrl;
  if (typeof rel === "string") data.videoUrl = rel.startsWith("/") ? VIDEO_ENGINE + rel : rel;
  return send(res, 200, data);
}

http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/cinema.html" || req.url === "/chat.html")) {
      const fileMap = {
        "/": "./public/cinema.html",
        "/cinema.html": "./public/cinema.html",
        "/chat.html": "./public/chat.html"
      };
      const filePath = fileMap[req.url];
      return send(res, 200, await readFile(new URL(filePath, import.meta.url), "utf8"), "text/html; charset=utf-8");
    }

    if (req.method === "POST" && req.url === "/api/sovereign-chat") {
      const b = await readJson(req);
      const prompt = (b.prompt ?? b.message ?? "").toString().trim();
      if (!prompt) throw new HttpError(400, "NO_PROMPT", "prompt required");
      const out = await chat({ prompt, url: "http://127.0.0.1:11434" });
      return send(res, 200, out);
    }

    if (req.method === "POST" && req.url === "/api/cinema-render") {
      return await renderVideo(req, res);
    }

    send(res, 404, { error: "not found" });
  } catch (e) {
    const isPolicyBlocked = e.code === "POLICY_BLOCKED" || String(e.message || "").includes("POLICY_BLOCKED");
    const status = e instanceof HttpError ? e.status : (isPolicyBlocked ? 403 : e.code === "BAD_REQUEST" ? 400 : 503);
    const code = isPolicyBlocked ? "POLICY_BLOCKED" : (e.code || "ERROR");
    send(res, status, { error: code, message: String(e.message || e) });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Cinema Studio: http://localhost:${PORT}/cinema.html + /chat.html (video engine: ${VIDEO_ENGINE}${VIDEO_PATH})`));