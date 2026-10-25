export const VERSION = "1.0.0-LOCKED";
export const MODE = process.env.TEOS_SOVEREIGN_MODE || process.env.TEOS_DATA_RESIDENCY || "EGYPT_ONLY";
export const MODEL_REGISTRY = process.env.TEOS_MODEL_REGISTRY || process.env.MODEL_REGISTRY || "LOCAL_ONLY";
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
  if(url){ failClosed("POLICY_BLOCKED", `external endpoint blocked: ${url}`); }
  failClosed("MODEL_UNAVAILABLE", "chat model not loaded");
}
export function doctor(){ return { version: VERSION, mode: MODE, registry: MODEL_REGISTRY, status: `${MODE} - LOCAL MODE - OK`, prevHash: prev, failClosed: true } }
export { chain };
export function redactPII(s){ return String(s).replace(/\d{11,}/g, "[REDACTED]"); }
