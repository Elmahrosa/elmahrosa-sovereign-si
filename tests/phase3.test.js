import { test } from "node:test";
import assert from "node:assert/strict";
import { chat, doctor, validateMode, redactPII, ALLOWED_MODES } from "../services/sovereignKernel.js";

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