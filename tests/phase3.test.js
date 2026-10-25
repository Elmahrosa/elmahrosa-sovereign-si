 import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { chat, doctor, validateMode, redactPII, verify, ALLOWED_MODES } from "../services/sovereignKernel.js";

// ---- PHASE 3 + PHASE 2 REGRESSION (13 القديمة) ----
test("PHASE3-1: POLICY_BLOCKED for external URL", async () => {
  try{
    await chat({prompt:"test", url:"https://evil.com"});
    assert.fail("should have thrown");
  }catch(e){
    assert.equal(e.sovereign.code, "POLICY_BLOCKED");
    assert.equal(e.sovereign.decision, "BLOCKED");
  }
});

test("PHASE3-2: bypass ?x=127.0.0.1 must still BLOCK", async () => {
  try{
    await chat({prompt:"test", url:"https://evil.com/?x=127.0.0.1"});
    assert.fail("bypass should have been blocked");
  }catch(e){
    assert.equal(e.sovereign.code, "POLICY_BLOCKED");
  }
});

test("PHASE3-3: MODEL_UNAVAILABLE when Ollama off OR OK when on", async () => {
  try{
    const result = await chat({prompt:"hello"});
    assert.ok(result.response || result.model);
    assert.equal(result.decision, "OK");
  }catch(e){
    assert.ok(e.sovereign);
    assert.equal(e.sovereign.code, "MODEL_UNAVAILABLE");
  }
});

test("PHASE3-4: doctor reports honest status", () => {
  const d = doctor();
  assert.ok(d.status.includes("1 installed"));
  assert.equal(d.registry, "LOCAL_ONLY");
});

test("PHASE2-REGRESSION: MODE_INVALID for REMOTE mode must BLOCK", () => {
  try{
    validateMode("REMOTE");
    assert.fail("REMOTE should throw MODE_INVALID");
  }catch(e){
    assert.equal(e.code, "MODE_INVALID");
    assert.ok(e.sovereign);
    assert.equal(e.sovereign.code, "MODE_INVALID");
    assert.equal(e.sovereign.decision, "BLOCKED");
  }
  assert.ok(ALLOWED_MODES.includes("EGYPT_ONLY"));
});

test("PHASE2-REGRESSION: redactPII covers Egyptian phone 01xxxxxxxxx", () => {
  assert.equal(redactPII("اتصل 01001234567"), "اتصل [PHONE_REDACTED]");
  assert.equal(redactPII("رقمي 01123456789"), "رقمي [PHONE_REDACTED]");
  assert.equal(redactPII("NID 30101010101010"), "NID [NID_REDACTED]");
  assert.equal(redactPII("generic 12345678901"), "generic [REDACTED]");
});

test("PHASE5: hash recomputable from stored entry even with 600-char prompt", async () => {
  const longPrompt = '01001234567 ' + 'a'.repeat(600);
  try{
    const result = await chat({ prompt: longPrompt });
    const payload = `${result.audit.prevHash}:${result.audit.prompt}:${result.audit.response}:${result.audit.ts}`;
    const recomputed = crypto.createHash("sha256").update(payload).digest("hex");
    assert.equal(recomputed, result.audit.hash);
    assert.equal(recomputed, result.hash);
    assert.ok(!result.audit.prompt.includes("01001234567"));
    assert.ok(result.audit.prompt.includes("[PHONE_REDACTED]"));
  }catch(e){
    if(e.sovereign?.code === "MODEL_UNAVAILABLE") return;
    throw e;
  }
});

test("PHASE5: JSONL entry redacted before disk write", async () => {
  const promptWithNID = 'عقد قرض رقم 30101010101010 ورقم 01001234567';
  try{
    const result = await chat({ prompt: promptWithNID });
    assert.ok(!result.audit.prompt.includes("30101010101010"));
    assert.ok(!result.audit.prompt.includes("01001234567"));
    assert.ok(result.audit.prompt.includes("[NID_REDACTED]") || result.audit.prompt.includes("[PHONE_REDACTED]"));
    assert.ok(result.audit.hash);
    assert.ok(result.audit.prevHash !== undefined);
  }catch(e){
    if(e.sovereign?.code === "MODEL_UNAVAILABLE") return;
    throw e;
  }
});

test("ocr must BLOCK with MODEL_UNAVAILABLE", async () => {
  try{ await (await import("../services/sovereignKernel.js")).ocr("img"); assert.fail(); }catch(e){ assert.equal(e.sovereign.code,"MODEL_UNAVAILABLE"); }
});
test("asr must BLOCK with MODEL_UNAVAILABLE", async () => {
  try{ await (await import("../services/sovereignKernel.js")).asr("audio"); assert.fail(); }catch(e){ assert.equal(e.sovereign.code,"MODEL_UNAVAILABLE"); }
});
test("chat to external URL must BLOCK with POLICY_BLOCKED", async () => {
  try{ await chat({prompt:"hi", url:"https://api.openai.com"}); assert.fail(); }catch(e){ assert.equal(e.sovereign.code,"POLICY_BLOCKED"); }
});
test("redactPII must redact NID", () => {
  assert.ok(redactPII("30101010101010").includes("[NID_REDACTED]"));
});
test("doctor must report EGYPT_ONLY", () => {
  assert.ok(doctor().mode.includes("EGYPT_ONLY") || doctor().status.includes("EGYPT_ONLY"));
});

// ---------- PHASE5 LOCKS (3 الجديدة) ----------
test("PHASE5-1: JSONL stores REDACTED prompt/response, caller keeps full", async () => {
  const PHONE = "01001234567";
  const origFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ response: `هاتصل بيك على ${PHONE}` }) });
  try {
    const r = await chat({ prompt: `رقمي ${PHONE}، اتصل بيا` });
    const { readAll } = await import("../services/auditLog.js");
    const all = readAll();
    const last = all[all.length - 1];
    assert.ok(!last.prompt.includes(PHONE), "prompt in log MUST be redacted");
    assert.ok(!last.response.includes(PHONE), "response in log MUST be redacted");
    assert.ok(String(r?.response ?? r).includes(PHONE), "caller MUST still receive full response");
  } finally {
    global.fetch = origFetch;
  }
});

test("PHASE5-2: stored hash is recomputable from entry alone", async () => {
  const { readAll } = await import("../services/auditLog.js");
  const all = readAll();
  if(all.length === 0) return;
  const last = all[all.length - 1];
  const recomputed = crypto.createHash("sha256").update(`${last.prevHash}:${last.prompt}:${last.response}:${last.ts}`).digest("hex");
  assert.equal(recomputed, last.hash, "hash MUST equal recomputation of stored fields");
});

test("PHASE5-3: verify() recomputes the whole chain and detects tampering", async () => {
  const fs = await import("fs");
  const { readAll, getLogPath } = await import("../services/auditLog.js");
  const all = readAll();
  if(all.length === 0) return;
  const before = verify();
  assert.equal(before.ok, true, `verify must pass on clean chain, got: ${before.status}`);
  const lines = fs.readFileSync(getLogPath(), "utf8").trim().split("\n");
  const lastEntry = JSON.parse(lines[lines.length - 1]);
  lastEntry.response = lastEntry.response + "X";
  lines[lines.length - 1] = JSON.stringify(lastEntry);
  fs.writeFileSync(getLogPath(), lines.join("\n") + "\n", "utf8");
  const after = verify();
  assert.equal(after.ok, false, "verify MUST detect tampered entry");
});