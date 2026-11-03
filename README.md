# TEOS Sovereign SI

Local-only AI gateway for Windows. Prompts go to a model running on your own machine (Ollama, `127.0.0.1:11434`); nothing is sent to a cloud API.

![CI](https://github.com/Elmahrosa/elmahrosa-sovereign-si/actions/workflows/doctor.yml/badge.svg)

## What it does
- `server.mjs` serves a chat page and Cinema Studio on `http://localhost:3100` (loopback only).
- `services/sovereignKernel.js` is the policy layer: refuses any non-loopback engine URL, redacts Egyptian NID / phone / card numbers before logging, and writes every attempt (including blocked or failed ones) to a SHA-256 hash-chained audit log at `data/sovereign-audit.jsonl` (git-ignored). If the log is damaged, the kernel stops instead of restarting the chain.
- Default model: `qwen3:8b` via Ollama. The other registry entries are optional and are not installed by default.

## Run
```powershell
# one-time (needs internet once)
./scripts/download-models.ps1      # installs Ollama model qwen3:8b
# every time
npm run doctor                     # checks policy, audit chain, Ollama + model
npm start                          # http://localhost:3100/chat.html  and  /cinema.html
```

Optional video engine for Cinema Studio: set `VIDEO_ENGINE_URL` (loopback only, default `http://127.0.0.1:8000`).

## Verify
```powershell
npm test
npm run doctor:ci      # offline checks used by CI
```
Release zips are built with `scripts/build-release.ps1` (from git, reproducible) and published as GitHub release assets with a `.sha256` file:
```powershell
Get-FileHash .\elmahrosa-sovereign-si-<version>.zip -Algorithm SHA256
```

## Limits (read before relying on it)
- "Offline" means no outbound calls from this app. The one-time model download needs internet.
- Redaction is pattern based (14-digit NID, Egyptian mobile, 16-digit card). It is not a complete PII detector.
- The audit log is tamper-evident, not tamper-proof: someone with file access can delete the whole file.

Built in Alexandria by Elmahrosa International.
