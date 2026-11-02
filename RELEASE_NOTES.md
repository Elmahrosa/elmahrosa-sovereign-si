# Release v1.1.0 — `qwen3:8b` Local Sovereign

**Tag:** `v1.1.0-qwen3-8b-local`
**Node:** Sovereign Node — Alexandria, Egypt
**Data Residency:** EGYPT_ONLY — Local-only, fail-closed, no cloud, no API.

## 🚀 Highlights

- Default brain upgraded to **Qwen3 8B** (`qwen3:8b`) via Ollama — local, 5.2GB, `default: true`.
- `MODEL_REGISTRY` now exposes **8 models** with `qwen3:8b` as the default sovereign brain.

## ✅ Fixes

- **Audit hash chain**: deterministic timestamp — single `Date.now()` source used for hash + stored entry (was double `Date.now()` causing chain mismatch).
- **`public/cinema.html`**: removed leftover PowerShell here-string artifacts (`cd D:\...`, `@'`, `'@ | Set-Content...`, `Select-String...`); file now starts with `<!doctype html>` and ends with `</html>`.

## 🧪 Verification

- `npm test` → **21/21 PASS**
- `npm run doctor` → **BEHAVIORAL PASS**
- CI (`sovereign-doctor`) → **GREEN** (Run #27)

## 🏷️ Tag

- `v1.1.0-qwen3-8b-local` — Qwen3 8B local default.

## 🔐 Sovereignty

- LOCAL_ONLY / EGYPT_ONLY / failClosed.
- No remote engine, no secrets, no ALLOW_REMOTE_ENGINE backdoor.
- Audit log JSONL append-only, PII redacted, hash chain recomputable.

---

**Built in Alexandria / Egypt. Nations own their code.**
