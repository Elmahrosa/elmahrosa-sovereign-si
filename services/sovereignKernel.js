export const VERSION = "1.1.0-PHASE2";
export const ALLOWED_MODES = ['EGYPT_ONLY', 'LOCAL'];
export const MODE = (process.env.TEOS_SOVEREIGN_MODE || process.env.TEOS_DATA_RESIDENCY || "EGYPT_ONLY").toUpperCase();
export const MODEL_REGISTRY = process.env.TEOS_MODEL_REGISTRY || process.env.MODEL_REGISTRY || "LOCAL_ONLY";
export const LOCAL_MODEL = process.env.TEOS_LOCAL_MODEL || "qwen2.5:1.5b";
export const REGISTRY_DETAIL = {
  "qwen2.5:1.5b": { status: "INSTALLED", size: "986MB" },
  "llama3.2:3b": { status: "PENDING" },
  "mistral:7b": { status: "PENDING" }
};
import { createHash } from "crypto";
let prev = "GENESIS";
function chain(data){ const h = createHash("sha256").update(prev + JSON.stringify(data)).digest("hex"); prev = h; return h; }
function validateMode(m){
  if(!ALLOWED_MODES.includes(m)){
    const entry = { code: "MODE_INVALID", decision: "BLOCKED", status: "BLOCKED", msg: `${m} not in ${ALLOWED_MODES.join(',')}`, mode: m, prevHash: prev, ts: Date.now() };
    chain(entry);
    const err = new Error(`MODE_INVALID: ${m}`); err.sovereign = entry; throw err;
  }
  return m;
}
function failClosed(code, msg){
  const entry = { code, decision: "BLOCKED", status: "BLOCKED", block: "BLOCKED", msg, mode: MODE, registry: MODEL_REGISTRY, prevHash: prev, ts: Date.now() };
  chain(entry);
  const err = new Error(code); err.code = code; err.sovereign = entry; throw err;
}
export async function ocr(image){ failClosed("MODEL_UNAVAILABLE", "ocr model not loaded locally"); }
export async function asr(audio){ failClosed("MODEL_UNAVAILABLE", "asr model not loaded locally"); }
export async function translate(text){ failClosed("MODEL_UNAVAILABLE", "translate model not loaded locally"); }
export async function chat(req){
  validateMode(MODE);
  const url = req?.url || req?.endpoint || "";
  if(url && url.startsWith("http") && !url.includes("127.0.0.1") && !url.includes("localhost")){
    failClosed("POLICY_BLOCKED", `external endpoint blocked: ${url} - EGYPT_ONLY`);
  }
  try{
    const prompt = req?.prompt || req?.text || "انت مساعد سيادي مصري";
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ model: LOCAL_MODEL, prompt, stream: false })
    });
    if(!res.ok) failClosed("MODEL_UNAVAILABLE", `local model ${LOCAL_MODEL} not running`);
    const data = await res.json();
    return { response: data.response, mode: MODE, registry: MODEL_REGISTRY, model: LOCAL_MODEL, prevHash: chain({prompt, model: LOCAL_MODEL}) };
  }catch(e){ if(e.sovereign) throw e; failClosed("MODEL_UNAVAILABLE", e.message); }
}
export function doctor(){ 
  try{
    validateMode(MODE);
    return { version: VERSION, mode: MODE, allowedModes: ALLOWED_MODES, registry: MODEL_REGISTRY, registryDetail: REGISTRY_DETAIL, model: LOCAL_MODEL, status: `${MODE} - LOCAL_ONLY - 1 installed / 3 total - OK`, prevHash: prev, failClosed: true };
  }catch(e){
    return { version: VERSION, status: e.message, error: e.message, allowedModes: ALLOWED_MODES, prevHash: prev };
  }
}
export { chain };
export function redactPII(s){ return String(s).replace(/\d{11,}/g, "[REDACTED]"); }
export function verify(){ return { version: VERSION, prevHash: prev }; }
