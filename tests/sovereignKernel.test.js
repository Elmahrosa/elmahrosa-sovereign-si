import { test } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { chat, doctor, redactPII, verify, MODEL_REGISTRY, MODE } from "../services/sovereignKernel.js";
import { getLastHash, getAllEntries } from "../services/auditLog.js";

test("doctor must report EGYPT_ONLY + LOCKED 1.0.0-LOCKED", () => {
  const d = doctor();
  assert.equal(d.mode, "EGYPT_ONLY");
  assert.equal(d.local, true);
  assert.equal(d.default, "qwen3:8b");
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
  assert.equal(r.model, "qwen3:8b");
  assert.ok(r.audit);
  assert.ok(r.audit.hash);
  assert.ok(r.audit.ts);
});

test("chat audit hash must be recomputable from entry fields (single ts source)", async () => {
  const r = await chat("recompute me");
  const recomputed = crypto.createHash("sha256").update(`${r.audit.prevHash}:${r.audit.prompt}:${r.audit.response}:${r.audit.ts}`).digest("hex");
  assert.equal(recomputed, r.audit.hash);
});

test("verify must pass for valid entries and detect tampering", () => {
  const ts = Date.now();
  const hash = crypto.createHash("sha256").update(`GENESIS:sv:sv:${ts}`).digest("hex");
  const good = { prevHash: "GENESIS", prompt: "sv", response: "sv", ts, hash };
  assert.equal(verify([good]).ok, true);
  const bad = { ...good, response: "TAMPERED" };
  assert.equal(verify([bad]).ok, false);
});
