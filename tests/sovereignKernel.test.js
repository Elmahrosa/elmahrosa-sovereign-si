import { test } from "node:test";
import assert from "node:assert";
import { chat, doctor, redactPII, verify, MODEL_REGISTRY, MODE } from "../services/sovereignKernel.js";
import { getLastHash, getAllEntries } from "../services/auditLog.js";

test("doctor must report EGYPT_ONLY + LOCKED 1.0.0-LOCKED", () => {
  const d = doctor();
  assert.equal(d.mode, "EGYPT_ONLY");
  assert.equal(d.local, true);
  assert.equal(d.default, "qwen3-27b");
  assert.ok(d.models >= 1);
  assert.equal(d.locked, "1.0.0-LOCKED");
});

test("redactPII must redact NID / PHONE / CARD", () => {
  assert.ok(redactPII("nid 30101010101010").includes("[NID]"));
  assert.ok(redactPII("phone 01001234567").includes("[PHONE]"));
  assert.ok(redactPII("card 4111111111111111").includes("[CARD]"));
});

test("chat must return response + audit + model", async () => {
  const r = await chat("hello sovereign");
  assert.ok(String(r.response).length > 0);
  assert.equal(r.model, "qwen3-27b");
  assert.ok(r.audit);
  assert.ok(r.audit.hash);
  assert.ok(r.audit.ts);
});

test("chat audit hash must be recomputable from entry fields (single ts source)", async () => {
  const r = await chat("recompute me");
  const crypto = await import("node:crypto");
  const recomputed = crypto.createHash("sha256").update(`${r.audit.prevHash}:${r.audit.prompt}:${r.audit.response}:${r.audit.ts}`).digest("hex");
  assert.equal(recomputed, r.audit.hash);
});

test("verify must pass for valid entries and detect tampering", async () => {
  const all = getAllEntries();
  const v = verify(all);
  assert.equal(v.ok, true);
  const last = all[all.length - 1];
  const bad = { ...last, response: "TAMPERED" };
  assert.equal(verify([bad]).ok, false);
});
