# Elmahrosa Sovereign SI

**First Egyptian Sovereign Intelligence Kernel**

Orchestrates open UAE Arabic models (Falcon family + Jais 3) **locally** under TEOS governance.

**Data stays in Egypt.**

## Quick Start

1. Clone this repo
2. Set environment:
   ```
   TEOS_SOVEREIGN_MODE=LOCAL
   TEOS_DATA_RESIDENCY=EGYPT_ONLY
   ```
3. Run `scripts/download-models.ps1` (or equivalent)
4. Require `services/sovereignKernel.js` from TEOS products

See [`SOVEREIGN_SI.md`](SOVEREIGN_SI.md) for full vision, model status, and sovereignty rules.

## Integration Points

- TEOS DealMaker (revenue OS)
- TEOS Sentinel Shield (governance)
- TEOS AI Gateway (offline Claude Code)
- Other Elmahrosa products

## License & Attribution

Open weights retain their original licenses (Apache 2.0 / Falcon / Jais).
Elmahrosa product layer is proprietary under TESL.

Built in Egypt. Nations own their code.
