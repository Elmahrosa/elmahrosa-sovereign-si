import { test } from "node:test";
import assert from "node:assert/strict";
import { chat, doctor, redactPII, verify, MODE, LOCAL_ONLY, failClosed, MODEL_REGISTRY, ASR_MODEL } from "../services/sovereignKernel.js";
import { getLastHash, getAllEntries } from "../services/auditLog.js";

test("PHASE-GATE: MODE must be EGYPT_ONLY", () => {
  assert.equal(MODE, "EGYPT_ONLY");
});

test("PHASE-GATE: failClosed must be true", () => {
  assert.equal(failClosed, true);
});

test("PHASE-GATE: MODEL_REGISTRY must exist with default brain", () => {
  assert.ok(MODEL_REGISTRY);
  assert.ok(MODEL_REGISTRY["qwen3-27b"]);
  assert.equal(Object.keys(MODEL_REGISTRY).length, 8);
});

test("PHASE-4: doctor must report EGYPT_ONLY / LOCAL_ONLY / 8 models", () => {
  const d = doctor();
  assert.equal(d.mode, "EGYPT_ONLY");
  assert.equal(d.local, true);
  assert.equal(d.default, "qwen3-27b");
  assert.equal(d.models, 8);
});

test("PHASE-5: redactPII must redact Egyptian NID", () => {
  assert.ok(redactPII("NID 30101010101010").includes("[NID]"));
});

test("PHASE-5: redactPII must redact Egyptian phone 01xxxxxxxxx", () => {
  assert.ok(redactPII("اتصل 01001234567").includes("[PHONE]"));
});

test("PHASE-5: redactPII must redact card", () => {
  assert.ok(redactPII("card 4111111111111111").includes("[CARD]"));
});

test("PHASE-5: chat must return response + audit + model", async () => {
  const r = await chat("phase5 chat");
  assert.ok(r.audit);
  assert.equal(r.model, "qwen3-27b");
});

test("PHASE-5: audit entry must have prevHash + hash + ts + model + mode", async () => {
  const all = getAllEntries();
  const last = all[all.length - 1];
  assert.ok(last.prevHash);
  assert.ok(last.hash);
  assert.ok(last.ts);
  assert.equal(last.model, "qwen3-27b");
  assert.equal(last.mode, "EGYPT_ONLY");
});

test("PHASE-5: hash must be recomputable from stored entry (single ts source)", async () => {
  const all = getAllEntries();
  const last = all[all.length - 1];
  const crypto = await import("node:crypto");
  const recomputed = crypto.createHash("sha256").update(`${last.prevHash}:${last.prompt}:${last.response}:${last.ts}`).digest("hex");
  assert.equal(recomputed, last.hash);
});

test("PHASE-5: verify must pass on current chain", () => {
  const all = getAllEntries();
  const v = verify(all);
  assert.equal(v.ok, true);
});

test("PHASE-5: verify must detect tampering", () => {
  const all = getAllEntries();
  const last = all[all.length - 1];
  const bad = { ...last, response: last.response + "X" };
  assert.equal(verify([bad]).ok, false);
});

test("PHASE-4: getLastHash must return last hash or GENESIS", () => {
  const h = getLastHash();
  assert.ok(typeof h === "string");
});

test("PHASE-4: getAllEntries must return array", () => {
  const all = getAllEntries();
  assert.ok(Array.isArray(all));
});

test("DOCTOR: locked marker must be 1.0.0-LOCKED", () => {
  const d = doctor();
  assert.equal(d.locked, "1.0.0-LOCKED");
});

test("ASR: ASR_MODEL must be qwen3-asr-1.7b (ear-default)", () => {
  assert.equal(ASR_MODEL, "qwen3-asr-1.7b");
});
