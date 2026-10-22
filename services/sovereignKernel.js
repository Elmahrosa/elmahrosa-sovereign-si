/**
 * Elmahrosa Sovereign Kernel
 * LOCAL_ONLY orchestration of open UAE Arabic models under TEOS governance.
 * Data never leaves Egypt.
 */

const path = require('path');
const fs = require('fs');

const MODE = process.env.TEOS_SOVEREIGN_MODE || 'LOCAL';
const RESIDENCY = process.env.TEOS_DATA_RESIDENCY || 'EGYPT_ONLY';
const MODELS_PATH = process.env.SOVEREIGN_MODELS_PATH || path.join(__dirname, '..', 'models');

function assertSovereign() {
  if (RESIDENCY !== 'EGYPT_ONLY') {
    throw new Error('Data residency violation: must be EGYPT_ONLY');
  }
  if (MODE !== 'LOCAL') {
    throw new Error('Sovereign mode must be LOCAL for production');
  }
}

function loadLocal(modelKey) {
  assertSovereign();
  const modelDir = path.join(MODELS_PATH, modelKey);
  if (!fs.existsSync(modelDir)) {
    console.warn(`[SovereignKernel] Model not found locally: ${modelKey} — graceful fallback`);
    return null;
  }
  // TODO: actual llama.cpp / transformers local load
  return { key: modelKey, path: modelDir, local: true };
}

const KERNEL = {
  ocr: () => loadLocal('falcon-ocr-arabic'),
  asr: () => loadLocal('jais-asr') || loadLocal('falcon-asr'),
  emirati: () => loadLocal('falcon-emirati-7b'),
  brain: () => loadLocal('jais-3-7b'),
  speech: () => loadLocal('jais-asr'),
};

async function secureInference(modelKey, data) {
  assertSovereign();
  // 1. PII scrub (stub)
  // 2. Audit log hook (integrate with TEOS audit)
  // 3. Local inference only
  const model = KERNEL[modelKey]();
  if (!model) throw new Error(`Model ${modelKey} not available locally`);
  // return model.infer(data);
  return { status: 'stub', model: modelKey, local: true };
}

module.exports = {
  MODE,
  RESIDENCY,
  MODELS_PATH,
  KERNEL,
  secureInference,
  assertSovereign,
};
