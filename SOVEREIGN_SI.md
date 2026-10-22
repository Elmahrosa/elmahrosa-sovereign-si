# Elmahrosa Sovereign SI — First Egyptian Sovereign Intelligence Layer

**Elmahrosa Digital / المنصة السيادية الموحدة**

**Tagline:** From SIM to Loan, Data Stays in Egypt.

## Vision

UAE built the open models (Falcon family + Jais 3).
Saudi has ALLaM.
Egypt builds the **Sovereign Intelligence (SI) operator layer**.

We do **not** train a sixth base LLM.
We orchestrate open weights **locally** under Egyptian governance (TEOS `executeCapability()`, fail-closed, audit, RBAC, data residency).

## The Five Models as Kernel Layers

| Layer | Model | Size | Role | Status (Oct 2026) |
|-------|-------|------|------|-------------------|
| Ear (ASR) | Falcon-ASR + Jais-ASR | 1.6B / — | Gulf + Egyptian call transcription, 19 dialects | Falcon demo-only; Jais-ASR open (`IFM/Jais-ASR`) |
| Eye (OCR) | Falcon-OCR-Arabic | 270M | Contracts, forms, scanned Egyptian documents | Strong open performance |
| Local Understanding | Falcon-Emirati 7B | 7B | Emirati/Gulf idioms + culture (84.83% Alyah) | Chat available; weights pending |
| Brain / Agents | Jais 3 Fleet (start with 7B) | 7B–375B | Arabic agents, business workflows, 512K context | Fully open (`inception42/Jais-3-7B`) |
| Voice | Jais Speech / Jais-ASR | — | Spoken commands, 19 Arab countries | Open (`IFM/Jais-ASR`) |

## Sovereignty Rules (Non-Negotiable)

1. **LOCAL_ONLY** by default. `TEOS_SOVEREIGN_MODE=LOCAL`
2. **EGYPT_ONLY** data residency. Any attempt to call external API fails closed.
3. Attribution retained: TII (Falcon), MBZUAI/Inception42 (Jais). We never claim we trained the weights.
4. Product is the wrapper + governance + business memory (SOR) + 13 agents + audit.
5. Proof for Central Bank / regulators lives in `TRANSPARENCY.md`.

## Roadmap

- Phase 0: This repo + documentation
- Phase 1: `sovereignKernel.js` + download scripts + graceful fallback
- Phase 2: Wire into TEOS DealMaker + other products (Sentinel, Gateway, etc.)
- Phase 3: Close first real governed deal via local models → claim "First Egyptian Sovereign SI Operator"

**Built in Alexandria / Damanhur, Egypt. Deployed under Egyptian law.**
