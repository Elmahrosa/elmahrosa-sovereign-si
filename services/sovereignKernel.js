 // EGYPT_ONLY - LOCAL MODE - FAIL-CLOSED SOVEREIGN KERNEL
 export const VERSION = "1.0.0-LOCKED";
 export const MODE = process.env.TEOS_SOVEREIGN_MODE || process.env.TEOS_DATA_RESIDENCY || "EGYPT_ONLY";
 import { createHash } from "crypto";
 let prev = "GENESIS";
 function chain(data){
   const h = createHash("sha256").update(prev + JSON.stringify(data)).digest("hex");
   prev = h; return h;
 }
 function redactPII(text){
   if(!text) return text;
   return text.replace(/\b\d{14}\b/g, "[REDACTED_NID]");
 }
 function failClosed(code, details){
   const entry = { decision:"BLOCKED", code, prevHash: chain({code, ts:Date.now()}), details: redactPII(details) };
   const err = new Error(code); err.sovereign = entry; throw err;
 }
 export async function ocr(image){ failClosed("MODEL_UNAVAILABLE", "ocr model not loaded locally"); }
 export async function asr(audio){ failClosed("MODEL_UNAVAILABLE", "asr model not loaded locally"); }
 export async function translate(text){ failClosed("MODEL_UNAVAILABLE", "translate model not loaded locally"); }
 export async function chat(req){
   const url = req?.url || req?.endpoint || "";
   if(url.startsWith("http") && !url.includes("localhost") && !url.includes("127.0.0.1")){
     failClosed("POLICY_BLOCKED", `external endpoint blocked: ${url}`);
   }
   failClosed("MODEL_UNAVAILABLE", "chat model not loaded");
 }
 export function doctor(){ return { mode: MODE, status: "EGYPT_ONLY - LOCAL MODE - OK", prevHash: prev }; }
 export { redactPII, chain };
