  import crypto from "crypto";
import { append as auditAppend, readAll as auditReadAll, getLastHash as auditLastHash, getCount as auditCount } from "./auditLog.js";

export const ALLOWED_MODES = ["EGYPT_ONLY", "LOCAL"];
export function validateMode(m){
  const upper = String(m).toUpperCase();
  if(!ALLOWED_MODES.includes(upper)){
    const err = new Error(`MODE_INVALID: ${m} - allowed: ${ALLOWED_MODES.join(", ")}`);
    err.code = "MODE_INVALID";
    err.sovereign = { code: "MODE_INVALID", decision: "BLOCKED", msg: err.message };
    throw err;
  }
  return upper;
}
export const MODE = validateMode((process.env.TEOS_SOVEREIGN_MODE || "EGYPT_ONLY").toUpperCase());
export const REGISTRY_DETAIL = "qwen2.5:1.5b INSTALLED / 2 PENDING - LOCAL_ONLY";
export const MODEL = "qwen2.5:1.5b";

let memoryChain = [];
let initialized = false;

function initFromDisk(){
  if(initialized) return;
  const disk = auditReadAll();
  memoryChain = disk;
  initialized = true;
}

function sha256(s){
  return crypto.createHash("sha256").update(s).digest("hex");
}

function isExternalUrl(url){
  if(!url) return false;
  try{
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if(h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0") return false;
    if(h.endsWith(".local") || h === "::1") return false;
    return true;
  }catch{
    return false;
  }
}

function throwSovereign(code, decision, msg){
  const err = new Error(msg);
  err.sovereign = { code, decision, msg };
  err.code = code;
  throw err;
}

export function doctor(){
  initFromDisk();
  const prev = auditLastHash();
  const count = auditCount();
  return {
    model: MODEL,
    status: `EGYPT_ONLY - LOCAL_ONLY - 1 installed / 3 total - OK - ${count} audit entries`,
    prevHash: prev,
    failClosed: true,
    mode: MODE,
    registry: "LOCAL_ONLY",
    registryDetail: REGISTRY_DETAIL,
    auditCount: count,
    auditLog: "data/sovereign-audit.jsonl"
  };
}

export function verify(){
  initFromDisk();
  const all = auditReadAll();
  if(all.length === 0){
    return { ok: true, status: "GENESIS - no entries yet", count: 0, storage: "JSONL on disk" };
  }
  let prev = "GENESIS";
  for(let i = 0; i < all.length; i++){
    const e = all[i];
    if(e.prevHash !== prev) return { ok: false, status: `CHAIN_BROKEN at ${i} - prevHash mismatch`, count: all.length };
    const recomputed = sha256(`${e.prevHash}:${e.prompt}:${e.response}:${e.ts}`);
    if(recomputed !== e.hash) return { ok: false, status: `CHAIN_BROKEN at ${i} - entry content tampered`, count: all.length };
    prev = e.hash;
  }
  return { ok: true, status: `CHAIN_OK - ${all.length} entries - RECOMPUTED - JSONL PERSISTED`, count: all.length, lastHash: prev, storage: "JSONL on disk - survives restart - hash recomputable" };
}

export function redactPII(text){
  if(!text) return text;
  let out = text.replace(/\b\d{14}\b/g, "[NID_REDACTED]");
  out = out.replace(/\b01\d{9}\b/g, "[PHONE_REDACTED]");
  out = out.replace(/\b\d{11,}\b/g, "[REDACTED]");
  return out;
}

export async function ocr(image){
  throwSovereign("MODEL_UNAVAILABLE", "BLOCKED", "ocr: local model not running - EGYPT_ONLY");
}

export async function asr(audio){
  throwSovereign("MODEL_UNAVAILABLE", "BLOCKED", "asr: local model not running - EGYPT_ONLY");
}

export async function chat({ prompt, url }){
  initFromDisk();
  if(isExternalUrl(url)){
    throwSovereign("POLICY_BLOCKED", "BLOCKED", `external endpoint blocked: ${url} - EGYPT_ONLY`);
  }
  if(!prompt || typeof prompt !== "string") throwSovereign("BAD_REQUEST", "BLOCKED", "prompt required");
  const prevHash = auditLastHash();
  let fullResponse;
  try{
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, stream: false })
    });
    if(!res.ok) throw new Error(`ollama http ${res.status}`);
    const data = await res.json();
    fullResponse = String(data?.response || "OK");
  }catch(e){
    throwSovereign("MODEL_UNAVAILABLE", "BLOCKED", `local model ${MODEL} not running: ${e.message}`);
  }
  const fullPrompt = String(prompt || "");
  // LOG-ONLY REDACTION (Phase 5 doctrine): caller keeps full text, the audit log never stores raw PII
  const storedPrompt = redactPII(fullPrompt).slice(0, 500);
  const storedResponse = redactPII(fullResponse).slice(0, 2000);
  const ts = Date.now();
  const payload = `${prevHash}:${storedPrompt}:${storedResponse}:${ts}`;
  const hash = sha256(payload);
  const entry = {
    prevHash, hash,
    prompt: storedPrompt,
    response: storedResponse,
    model: MODEL,
    decision: "OK", code: "OK",
    ts
  };
  auditAppend(entry);
  memoryChain.push(entry);
  return { response: fullResponse, decision: "OK", model: MODEL, prevHash, hash, ts, code: "OK", audit: entry };
}