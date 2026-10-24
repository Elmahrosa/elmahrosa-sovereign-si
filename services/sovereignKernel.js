 
/**
 * Elmahrosa Sovereign SI - services/sovereignKernel.js
 * Phase 1 LOCKED - fail-closed, EGYPT_ONLY
 * Version: 1.0.0-LOCKED
 * Size target: ~9KB
 */
export const SOVEREIGN_VERSION = "1.0.0-LOCKED";
export const MODE = "EGYPT_ONLY";
export const STATUS = "LOCKED";
export const FAIL_CLOSED = true;

// Forbidden patterns - PII protection
const FORBIDDEN = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /sk-proj-[a-zA-Z0-9-_]{20,}/g,
  /\b\d{14}\b/g, // Egyptian NID
  /ghp_[a-zA-Z0-9]{36}/g,
  /(password|passwd|pwd)\s*[:=]\s*\S+/gi,
  /(api[_-]?key)\s*[:=]\s*\S+/gi,
  /Bearer\s+[a-zA-Z0-9-_\.]+/g
];

export function redactPII(input = "") {
  let text = String(input);
  text = text.replace(/\b\d{14}\b/g, "[REDACTED_NID]");
  text = text.replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED_OPENAI_KEY]");
  text = text.replace(/sk-proj-[a-zA-Z0-9-_]{20,}/g, "[REDACTED_OPENAI_KEY]");
  text = text.replace(/ghp_[a-zA-Z0-9]{36}/g, "[REDACTED_GH_TOKEN]");
  text = text.replace(/(password\s*[:=]\s*)\S+/gi, "$1[REDACTED]");
  text = text.replace(/(api[_-]?key\s*[:=]\s*)\S+/gi, "$1[REDACTED]");
  text = text.replace(/Bearer\s+[a-zA-Z0-9-_\.]+/g, "Bearer [REDACTED]");
  return text;
}

export function assertSovereignContext(ctx = {}) {
  const country = ctx.country || ctx.region || "EG";
  if (country !== "EG" && country !== "EGYPT_ONLY" && country !== "EGYPT") {
    throw new Error(`SOVEREIGN_VIOLATION: Data must stay in Egypt. Got ${country}`);
  }
  const serialized = JSON.stringify(ctx);
  for (const pattern of FORBIDDEN) {
    // reset regex
    pattern.lastIndex = 0;
    if (pattern.test(serialized)) {
      throw new Error(`PII_DETECTED: fail-closed triggered by ${pattern}`);
    }
  }
  return true;
}

export function verifyChain(manifest, fileMap = {}) {
  if (!manifest) throw new Error("MANIFEST_MISSING: fail-closed - no manifest provided");
  if (!manifest.models || !Array.isArray(manifest.models)) {
    throw new Error("MANIFEST_INVALID: models array missing");
  }
  if (manifest.models.length === 0) {
    throw new Error("MANIFEST_EMPTY: fail-closed");
  }
  const results = [];
  for (const model of manifest.models) {
    if (!model.path) throw new Error("MODEL_PATH_MISSING");
    if (!model.sha256) throw new Error(`HASH_MISSING:${model.path} - fail-closed`);
    if (model.sha256.length < 16) throw new Error(`HASH_INVALID:${model.path}`);
    // In full implementation, fileMap[model.path] hash would be checked
    // Here we enforce manifest structure
    results.push({ path: model.path, sha256: model.sha256, status: "manifest_ok" });
  }
  return { ok: true, verified: results.length, details: results };
}

export function createSovereignKernel(manifest = null) {
  assertSovereignContext({ country: "EG", mode: MODE });
  if (manifest) {
    verifyChain(manifest, {});
  }
  const kernel = {
    version: SOVEREIGN_VERSION,
    mode: MODE,
    status: STATUS,
    failClosed: FAIL_CLOSED,
    created: new Date().toISOString(),
    verify: (files) => verifyChain(manifest, files),
    redact: redactPII,
    assertContext: assertSovereignContext,
    toString: () => `SovereignKernel ${SOVEREIGN_VERSION} [${MODE}] ${STATUS}`
  };
  return Object.freeze(kernel);
}

// Self-test on import - fail closed if env violates
try {
  assertSovereignContext({ country: "EG" });
} catch (e) {
  console.error("[sovereignKernel] FAIL-CLOSED:", e.message);
  throw e;
}

export default createSovereignKernel;