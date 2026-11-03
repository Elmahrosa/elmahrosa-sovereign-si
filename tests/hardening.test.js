import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const AUDIT = path.join(os.tmpdir(), `teos-hardening-${process.pid}.jsonl`);
process.env.TEOS_AUDIT_PATH = AUDIT;
fs.rmSync(AUDIT, { force: true });

const { chat, redactPII, verify } = await import("../services/sovereignKernel.js");
const { getAllEntries, getLastHash } = await import("../services/auditLog.js");

test("redactPII: Arabic-Indic digits", () => {
  assert.match(redactPII("رقمي ٣٠١٠١٠١٠١٠١٠١٠"), /\[NID\]/);
});
test("redactPII: +20 international phone", () => {
  assert.match(redactPII("call +201001234567"), /\[PHONE\]/);
});
test("redactPII: card with spaces and dashes", () => {
  assert.match(redactPII("4111 1111 1111 1111"), /\[CARD\]/);
  assert.match(redactPII("4111-1111-1111-1111"), /\[CARD\]/);
});
test("redactPII: number straddling the 500-char cut does not leak", () => {
  const out = redactPII("x".repeat(493) + " 30101010101010");
  assert.doesNotMatch(out, /301010/);
});

test("FAIL-CLOSED: non-loopback engine URL is blocked AND audited", async () => {
  await assert.rejects(chat({ prompt: "x", url: "http://example.com" }), { code: "POLICY_BLOCKED" });
  const last = getAllEntries().at(-1);
  assert.equal(last.status, "ERROR");
  assert.match(last.response, /POLICY_BLOCKED/);
  assert.equal(verify(getAllEntries()).ok, true);
});

test("FAIL-CLOSED: unreachable local engine is audited", async () => {
  await assert.rejects(chat({ prompt: "x", url: "http://127.0.0.1:9" }), { code: "MODEL_UNAVAILABLE" });
  assert.match(getAllEntries().at(-1).response, /MODEL_UNAVAILABLE/);
});

test("FAIL-CLOSED: corrupt audit log stops the kernel instead of restarting at GENESIS", async () => {
  fs.appendFileSync(AUDIT, '{"broken\n');
  assert.throws(() => getLastHash(), { code: "AUDIT_CORRUPT" });
  await assert.rejects(chat("anything"), { code: "AUDIT_CORRUPT" });
});
