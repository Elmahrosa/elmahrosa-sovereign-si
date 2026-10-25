import { test } from "node:test";
import assert from "node:assert/strict";
import { chat, doctor } from "../services/sovereignKernel.js";

test("PHASE3-1: POLICY_BLOCKED for external URL", async () => {
  try{
    await chat({prompt:"test", url:"https://evil.com"});
    assert.fail("should have thrown");
  }catch(e){
    assert.equal(e.sovereign.code, "POLICY_BLOCKED");
    assert.equal(e.sovereign.decision, "BLOCKED");
  }
});

test("PHASE3-2: bypass ?x=127.0.0.1 must still BLOCK (hostname validation)", async () => {
  try{
    await chat({prompt:"test", url:"https://evil.com/?x=127.0.0.1"});
    assert.fail("bypass should have been blocked");
  }catch(e){
    assert.equal(e.sovereign.code, "POLICY_BLOCKED");
  }
});

test("PHASE3-3: MODEL_UNAVAILABLE when Ollama off OR OK when on (honest fail-closed)", async () => {
  try{
    const result = await chat({prompt:"hello"});
    // Ollama ON - should return honest OK with model name
    assert.ok(result.response || result.model, "should have response when Ollama on");
    assert.equal(result.decision, "OK");
    console.log("  Ollama ON - got honest OK:", result.model);
  }catch(e){
    // Ollama OFF - should fail closed with sovereign
    assert.ok(e.sovereign, "should have sovereign field");
    assert.equal(e.sovereign.code, "MODEL_UNAVAILABLE");
    assert.equal(e.sovereign.decision, "BLOCKED");
    console.log("  Ollama OFF - got honest BLOCKED");
  }
});

test("PHASE3-4: doctor reports honest status", () => {
  const d = doctor();
  assert.ok(d.status.includes("1 installed"));
  assert.equal(d.registry, "LOCAL_ONLY");
});