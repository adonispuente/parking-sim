# Feeder F1 independent verification plan — 2026-11-07
Goal: verify retained F1 and Equity rollback; no simulation edits. Read owner F1 plan/report/tests, traffic.js, Equity report/diagnosis, checkpoint and same-map runner.
1. Check F1 after and Equity before manifests; fingerprint source/tests/maps/runner/package inputs. Live-input freeze requested from CLAUD.
2. Run saved focused/targeted tests, suite, build, three-service runner and all-stalls probe. This is independent post-change verification.
3. Compare exact failure names, every traffic field except wallMs, and full stall chains. Verify final identity.
4. Save explicit provisional/acceptance disposition and publish restart evidence. Preserve negative results and cleanup request.
Risks: thin modeled clearance, crossing-mouth keep-clear absent, Corporate timing/shuttle regressions. No global-window/threshold changes or rejected candidate reapplication. No repository restructuring during verification. F1 owner plan's revert-on-regression rule was breached; provisional retention is not acceptance.
Proof commands: shasum -a 256 -c manifests; node --test focused/targeted files; npm test; npm run build; node research/spartan-continuation-traffic.mjs enabled; node research/claudy-eleven-all-stalls-probe.mjs eleven with independent output. Expanded before/after hashes and structured audit. No server.
