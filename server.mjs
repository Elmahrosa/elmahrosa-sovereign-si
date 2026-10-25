import http from "node:http";
import { readFile } from "node:fs/promises";
import { chat } from "./services/sovereignKernel.js";

const PORT = process.env.PORT || 3100;

const send = (res, code, body, type = "application/json; charset=utf-8") => {
  res.writeHead(code, { "Content-Type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/cinema.html" || req.url === "/")) {
      return send(res, 200, await readFile(new URL("./public/cinema.html", import.meta.url), "utf8"), "text/html; charset=utf-8");
    }
    if (req.method === "POST" && req.url === "/api/sovereign-chat") {
      let raw = "";
      for await (const c of req) { raw += c; if (raw.length > 100_000) return send(res, 413, { error: "too large" }); }
      const b = JSON.parse(raw || "{}");
      const out = await chat({ prompt: b.prompt ?? b.message, url: "http://127.0.0.1:11434" });
      return send(res, 200, out);
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, e.code === "BAD_REQUEST" ? 400 : 503, { error: e.code || "ERROR", message: String(e.message || e) });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Cinema Studio: http://localhost:${PORT}/cinema.html`));
