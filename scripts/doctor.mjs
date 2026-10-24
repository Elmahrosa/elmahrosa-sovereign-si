import fs from 'fs';
import path from 'path';

console.log("=== Elmahrosa Sovereign SI - Doctor Gate ===");
let ok = true;

try {
  const kernelPath = './services/sovereignKernel.js';
  if (!fs.existsSync(kernelPath)) {
    console.error("[FAIL] missing services/sovereignKernel.js");
    ok = false;
  } else {
    const stat = fs.statSync(kernelPath);
    console.log(`[INFO] kernel size: ${stat.size} bytes`);
    if (stat.size < 5000) {
      console.error(`[FAIL] kernel too small ${stat.size} - STUB detected! Need >5000`);
      ok = false;
    } else {
      console.log(`[PASS] kernel size OK: ${stat.size}`);
    }
    const content = fs.readFileSync(kernelPath, 'utf8');
    if (!content.includes("1.0.0-LOCKED") || !content.includes("failClosed")) {
      console.error("[FAIL] kernel not LOCKED version");
      ok = false;
    } else {
      console.log("[PASS] kernel LOCKED markers found");
    }
  }

  const manifestPath = './core/models/manifest.json';
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`[INFO] manifest models: ${manifest.models?.length || 0}`);
    const hasHashes = manifest.models?.every(m => m.sha256 && m.sha256.length > 10);
    if (!hasHashes) {
      console.warn("[WARN] hashes incomplete");
    } else {
      console.log("[PASS] manifest hashes present");
    }
  } else {
    console.warn("[WARN] manifest not found yet - will be created");
  }

} catch (e) {
  console.error("[FAIL] doctor error:", e.message);
  ok = false;
}

if (ok) {
  console.log("\n=== DOCTOR PASS - Phase 1 LOCKED READY ===");
  process.exit(0);
} else {
  console.log("\n=== DOCTOR FAIL - Fix issues above ===");
  process.exit(1);
}