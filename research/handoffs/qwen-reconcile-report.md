# QWEN reconciliation of today's work (2026-11-08)

Commander request: "Spartan hit the weekly limit so @QWEN Figure out everything done thus far
today, and then hand off what we need to @CLAUD for completion on the code. Once Claude is
done, help remove unused code from the application."

This file is the source of truth for what landed today, what remains, and what CLAUD is
handed. Independent verification by QWEN (fresh `node --test tests/*.test.js` and
`npm run build` on current sources) — see §5.

## 1. What was done today, in order

| # | Who | What | Status |
|---|---|---|---|
| 1 | QWEN/SPARTAN | Token-fallback handoff packet prepared | `handoffs/qwen-token-fallback-d625.md` (shared) |
| 2 | CLAUD | **Positions registry** `src/positions/` (index.js + README.md) — 8 staffed spots #57–64 + unstaffed Equity/Clay stop, each with real-life duty, sim behaviour, un-modelled duties, provisional parameters, implementing files. Missing staffed definition throws on load. Legacy `src/trafficPositions.js` deleted; 8 importers rewired. New `tests/positions.test.js`. | Done, independently verified (positions-independent-36e5, positions-final-8aa0) |
| 3 | CLAUD | **Equity/Clay starvation fix** `src/equityClayStop.js` — a vehicle stopped >=20 s is promoted to next in line, oldest first. Shuttles/approaching-shuttles/occupied-movement/clearances still preempt. 4 new tests. Final worst wait 78->51 s; Equity worst 78->23 s. | Done, verified. One flag: eleven >=20 s episodes 3->4 (see §4) |
| 4 | CLAUD | 1019 re-diagnosis: the +1 episode is a fairness reorder (1019 crosses the 20 s line; 1029 improves 31.2->23.4 s; combined two-arrival wait 50.95->46.65 s). Wording-only fix in `src/equityClayStop.js`, `src/positions/index.js`, 2 tests. Suite 234/17, traffic identical. | Done, verified (positions-final-8aa0 audit) |
| 5 | SPARTAN | Docs: `docs/positions.md` and `src/positions/README.md` reconciled to the final wording. 8 legacy pre-traced files archived recoverably (`research/legacy-code-cleanup/`). | Done, audit exit 0 |
| 6 | CLAUD | **17-failure triage** (read-only) — 9 stale fixtures, 2 real disclosure gap, 5 map drift, 1 unresolved. `research/runs/claud-triage17-1108/report.md` | Done |
| 7 | CLAUD | **Connector disclosure repair** — the one *code* fix in the triage: `#63` join gets "not a traced aisle" label, `staffed-entrance-throat` added to `NONPAVEMENT_CONNECTOR_MODES` in `src/sourceRouting.js`; 2 tests updated. Labels only, no route/control change. Suite 236/15, build 0. | Done, independently verified (connector-independent-5007: 13/13 focused, 251 tests 236/15, 97 manifest entries identical) |
| 8 | CLAUD | **Equity origin diagnosis** (read-only) — `tests/equity-routing.test.js` compares Clear-frame routes (1374x1118) against old-map polygons (735x566); 539 px apart. Not a spawn defect. Proposed test-only rewrite. `research/runs/claud-equity-entry-1108/` | Diagnosis done; rewrite pending |
| 9 | CLAUD | **Lot A map + first-tick C diagnosis** (read-only) — items 14-17 all stale tests / map gaps, no sim defect; Main #57 sits in an untraced mouth; proposed test-only alignment of all 6 map-group items. `research/runs/claud-lota-map-1108/` | Diagnosis done; alignment pending |

Source ownership: CLAUD owns `src/` and `tests/`; SPARTAN (now at his weekly limit) owned
docs/checkpoint/independent acceptance. Source freeze from the connector review is RELEASED.
No implementation was ever assigned by the read-only diagnosis requests — that is the gap this
handoff closes.

## 2. Where the code stands (QWEN-fresh verification, Nov 8)

- `node --test tests/*.test.js`: **251 tests — 236 pass / 15 fail / 0 todo / 0 cancelled.**
  The 15 failing names match CLAUD's saved `connector-independent-5007/verification.json`
  `failed_names` exactly (verified name-by-name in §5).
- `npm run build`: exit 0; `dist/assets/index-*.js` 974.54 kB, existing >500 kB warning only.
- Git: no staging/commits by any agent; 772 D (research archive), 26 M, 222 ?? — all pre-existing.
- Overall traffic repair remains **NOT ACCEPTED**; 15 standing test failures; positions registry
  and Equity/Clay fairness are retained but the >=20 s gate decision is pending (SPARTAN/Commander).

## 3. Pending code work handed to CLAUD

See `research/runs/qwen-reconcile-1108/claud-handoff-1108.md` (published to group).
Summary: (A) six test-only alignments already fully diagnosed (6 failures -> passing,
equal/stronger assertions); (B) optional src addition UNTRACED_ROAD_GAPS list;
(C) remaining 9 stale fixtures need Commander policy sign-off (QWEN asks, SPARTAN absent);
(D) map edits (trace Lot A entrance road, Equity exit 2 driveway) are Commander-only calls.

## 4. Standing open items (do not re-litigate)

1. **15 failing tests** — 6 test-only (task A), 9 stale-fixture policy call (task C).
2. **Traffic acceptance** — eleven-service west-exit and stalls; the >=20 s count gate stays as
   defined unless Commander/SPARTAN change it.
3. **Unused-code removal** — Commander asked for this AFTER CLAUD finishes. Read-only inventory:
   `research/unused-code-inventory-1108.md`. Nothing is deleted in this pass.
4. Untracked housekeeping: `.cgap2.mjs` (root, Nov 7 scratch probe, untracked), `dist/`
   (git-ignored build output), `PLAN.md` (describes the retired pre-traced-map plan; superseded).

## 5. QWEN independent verification notes

- Suite run: `node --test tests/*.test.js` exit 1 (15 fails as expected). 15 unique failing
  names; each compared to `research/runs/connector-independent-5007/verification.json`
  `failed_names` — **exact match, zero new names** (the 2 connector names fixed by CLAUD's
  repair are absent).
- Build: `npm run build` exit 0; `dist/` regenerated.
- Import graph (44 src files): **every src file is imported by at least one other src file or is
  the entry** — no orphan source files. Unused-code candidates are dead *exports* and stale
  *assets*, catalogued in the inventory.
- Image audit: live map source is `images/EverythingClearImage.json` + `images/Clear Image.png`
  (imported by `src/clearImageSource.js`). The other 8 files in `images/` are not imported by
  any live `src/` or `tests/` file (one is imported by a *failing* test, one is comment-only).

## 6. Constraints carried forward

- Save implementation and production-path coverage **before** running tests.
- Do not delete live tests to hide failures; stale tests may be aligned only to established
  approved policy with equal-or-stronger assertions, and map edits need Commander approval.
- No git stage/commit/reset/history changes.
- QWEN removes unused code only after CLAUD's code work is complete and verified, per Commander.
