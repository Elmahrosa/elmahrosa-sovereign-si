# Release v1.0.1

**Tag:** `v1.0.1`
**Default model:** `qwen3:8b` via Ollama (local)
**Data residency:** local only. The server binds to 127.0.0.1 and refuses any non-loopback engine URL.

## Fixes
- Audit log is fail-closed: a corrupt log stops the kernel instead of restarting the chain.
- Every attempt is audited, including blocked and failed calls.
- PII redaction handles Arabic digits, +20 phone numbers, and cards with spaces or dashes, and redacts before truncating.
- `npm run doctor` checks policy, the audit chain, Ollama, and that the model is pulled.
- Video resolution and FPS are forwarded to the video engine.
- Unused Next.js files removed (`app/`, `components/`).
- Tests no longer write to the real audit log.

## Verification
- `npm test`: 28/28 pass
- CI runs on Ubuntu and Windows
- SHA256 of the release zip: see the GitHub release page

## Notes
- v1.0.0-LOCKED-EGYPT_ONLY-REV2 is superseded: its chat endpoint was broken.