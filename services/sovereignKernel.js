export const VERSION = "1.0.0-LOCKED";
export const MODE = process.env.TEOS_SOVEREIGN_MODE || process.env.TEOS_DATA_RESIDENCY || "EGYPT_ONLY";
export const MODEL_REGISTRY = process.env.TEOS_MODEL_REGISTRY || process.env.MODEL_REGISTRY || "LOCAL_ONLY";
export const LOCAL_MODEL = process.env.TEOS_LOCAL_MODEL || "qwen2.5:1.5b";
import { createHash } from "crypto";
let prev = "GENESIS";
function chain(data){ const h = createHash("sha256").update(prev + JSON.stringify(data)).digest("hex"); prev = h; return h; }
function failClosed(code, msg){
  const entry = { code, msg, mode: MODE, registry: MODEL_REGISTRY, prevHash: prev, ts: Date.now() };
  chain(entry);
  const err = new Error(code); err.sovereign = entry; throw err;
}
export async function ocr(image){ failClosed("MODEL_UNAVAILABLE", "ocr model not loaded locally"); }
export async function asr(audio){ failClosed("MODEL_UNAVAILABLE", "asr model not loaded locally"); }
export async function translate(text){ failClosed("MODEL_UNAVAILABLE", "translate model not loaded locally"); }
export async function chat(req){
  const url = req?.url || req?.endpoint || "";
  if(url && url.startsWith("http") && !url.includes("127.0.0.1") && !url.includes("localhost")){
    failClosed("POLICY_BLOCKED", `external endpoint blocked: ${url} - EGYPT_ONLY`);
  }
  // LOCAL_ONLY QWEN call
  try{
    const prompt = req?.prompt || req?.text || "انت مساعد سيادي مصري";
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ model: LOCAL_MODEL, prompt, stream: false })
    });
    if(!res.ok) failClosed("MODEL_UNAVAILABLE", `local model ${LOCAL_MODEL} not running - run ollama serve`);
    const data = await res.json();
    const out = { response: data.response, mode: MODE, registry: MODEL_REGISTRY, model: LOCAL_MODEL, prevHash: chain({prompt, model: LOCAL_MODEL}) };
    return out;
  }catch(e){
    if(e.sovereign) throw e;
    failClosed("MODEL_UNAVAILABLE", e.message);
  }
}
export function doctor(){ return { version: VERSION, mode: MODE, registry: MODEL_REGISTRY, model: LOCAL_MODEL, status: `${MODE} - LOCAL MODE - OK`, prevHash: prev, failClosed: true } }
export { chain };
export function redactPII(s){ return String(s).replace(/\d{11,}/g, "[REDACTED]"); }
