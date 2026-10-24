import { test } from "node:test";
import assert from "node:assert";
import { ocr, asr, chat, redactPII, doctor } from "../services/sovereignKernel.js";
test("ocr must BLOCK with MODEL_UNAVAILABLE", async () => {
  try { await ocr("fake"); assert.fail("should have thrown"); }
  catch(e){ assert.equal(e.sovereign.code, "MODEL_UNAVAILABLE"); assert.equal(e.sovereign.decision, "BLOCKED"); }
});
test("asr must BLOCK with MODEL_UNAVAILABLE", async () => {
  try { await asr("fake"); assert.fail("should have thrown"); }
  catch(e){ assert.equal(e.sovereign.code, "MODEL_UNAVAILABLE"); }
});
test("chat to external URL must BLOCK with POLICY_BLOCKED", async () => {
  try { await chat({url:"https://api.openai.com/v1/chat"}); assert.fail("should have thrown"); }
  catch(e){ assert.equal(e.sovereign.code, "POLICY_BLOCKED"); }
});
test("redactPII must redact NID", () => {
  const out = redactPII("my nid 12345678901234 test");
  assert.equal(out.includes("12345678901234"), false);
  assert.equal(out.includes("REDACTED"), true);
});
test("doctor must report EGYPT_ONLY", () => {
  const d = doctor(); assert.equal(d.mode, "EGYPT_ONLY");
});
