# South-Clearance Follow-Up — The Seven Failing Lot A Main/South Assertions

**QWEN · 2026-11-10 · bounded read-only inventory**
Project: `/Users/adonispuente/Desktop/Developer/parking-sim`
Evidence base: `research/runs/lot-a-main-takeover-5cd4/live-narrow.log` (post-SPARTAN-takeover) and `control-narrow.log` (pre-edit baseline), plus the three test files and the lane-builder source.
No project file was edited; no long suite/simulation was run; no geometry or route was redesigned.

---

## TL;DR

| # | Test file (start line) | Firing assertion (line) | Class | Route type | Control (pre-edit) | Live (post-takeover) |
|---|---|---|---|---|---|---|
| 1 | `lot-a-main-held-departure.test.js` :47 | `mainStopBack(a:aNorth arrival) === MAIN_STOP_BACK` :51 | **Stale numeric** | Main-controlled | FAIL | **FAIL** |
| 2 | `lot-a-main-median.test.js` :47 | `mainStopBack(out:aNorth) === MAIN_STOP_BACK` :57 | **Stale numeric** | Main-controlled | FAIL | **FAIL** |
| 3 | `lot-a-main-median.test.js` :121 | held departure vs FULL arrival lane, `deepEqual(bad, [])` :122 | **Geometric** | Main-controlled (post-Main aisle) | FAIL (masked) | **FAIL** |
| 4 | `lot-a-main-median.test.js` :146 | `A_MEDIAN_PROVENANCE reduced === []` :148 | **Stale fixture** | Main-controlled | FAIL | **FAIL** |
| 5 | `lot-a-south-held-chord.test.js` :80 | a:aNorth arrival stop `!= 2.2` :83 | **Stale numeric** | Main-controlled | FAIL | **FAIL** |
| 6 | `lot-a-south-held-chord.test.js` :89 | `min chord gap 0.808 < 0.9` :91 | **Geometric** | Main-controlled | FAIL (0.890) | **FAIL** (0.808) |
| 7 | `lot-a-south-held-chord.test.js` :94 | `min chord gap 0.198 < 0.9` :96 | **Geometric** | Main-controlled (post-Main aisle) | FAIL (0.710) | **FAIL** (0.198) |

**Split of the seven: 4 stale-numeric/fixture (1, 2, 4, 5) and 3 geometric (3, 6, 7).**
**Route type: all seven are Main-controlled. None involve a bypass approach** (see §Route type).

The narrow run confirms the count: control `tests 31 / pass 24 / fail 9`; live `tests 31 / pass 24 / fail 7`. The two that flipped 9→7 are **median :61** and **median :113** (documented in §The 9→7 delta).

---

## The 9→7 delta — what SPARTAN's edit actually fixed

Two tests failed in the control and pass in the live. Both are the **`built lane keeps Main` anchor-proximity** assertion, and both are fixed by the same code: SPARTAN's 60px-arc preservation in the lane builder.

- **`lot-a-main-median.test.js:61`** — "held arrival body clears every A departure lane on built lanes"
  - Control: `✖` at `:65` `a:aNorth built lane keeps Main` (`assert.ok(d(pts[k], main) < .5, ...)`).
  - Live: `✔`.
  - Mechanism: `keepRight` (src/traffic.js:90-99) previously applied generic street-centering to every route, re-centering the a:aNorth arrival so its nearest built point drifted **> 0.5px** from the Main anchor (pointAt(57)). SPARTAN's branch `if(mainArc[i] < 60) return [...p]` preserves the local 60px arc for routes traversing the exact Main anchor, so the built a:aNorth lane now sits within 0.5px and the held-arrival body clears the departure lanes.

- **`lot-a-main-median.test.js:113`** — "held departure body clears every A arrival APPROACH (median side) on built lanes"
  - Control: `✖` at `:99` `out:aNorth built lane keeps Main` (same 0.5px anchor assert, inside the shared `heldDepartureGaps` helper).
  - Live: `✔`. Same mechanism, for the out:aNorth departure lane.

Both fixed checks are **anchor-geometry** (the built lane stays within 0.5px of the single staffed Main position), not clearance. SPARTAN's fix is a lane-builder change, not a route or gate change.

---

## Per-assertion detail

### 1. `lot-a-main-held-departure.test.js:47` — stale numeric
```
L51  assert.equal(mainStopBack(a.raw), MAIN_STOP_BACK, `${a.key}:${a.zone} base stop-back unchanged`);
```
Fires with `a:aNorth base stop-back unchanged`. `a.raw` is the **a:aNorth arrival** (inbound). `mainStopBack(points)` returns `MAIN_FOLD_STOP_BACK` (3.0) when into·out < 0, else `MAIN_STOP_BACK` (1.7) — src/lotAControl.js:22-28. The a:aNorth arrival **folds** at Main (approaches, then turns into north staging), so `mainStopBack` returns **3.0**, not the hardcoded 1.7 the test expects. *(3.0 is source-inferred from the fold branch; the test prints only the route name, not the number — high confidence.)* Inherited pre-existing failure; unchanged by the takeover.

### 2. `lot-a-main-median.test.js:47` — stale numeric
```
L57  assert.equal(mainStopBack(r), MAIN_STOP_BACK, `out:${z} stop-back unchanged`);   // over departures aNorth/aSouth
```
Fires with `a:aNorth stop-back unchanged`. Same root cause as #1, on the **out:aNorth departure** (a fold → 3.0, not 1.7). Inherited; unchanged.

### 3. `lot-a-main-median.test.js:121` — geometric
```
L122 assert.deepEqual(heldDepartureGaps('full'), []);
```
- Control: fails **earlier** at `:99` `out:aNorth built lane keeps Main` — the helper throws on the first anchor assert before sampling any gap, so the real clearance gap was **masked**.
- Live: the `keeps Main` asserts now **pass** (the 9→7 fix), so the helper proceeds to sample the full-lane body and **finds a genuine clearance violation**: the held `out:aSouth` departure body sits **2.42–4.83px** from the `a:*:aSouth` full arrival lane — all entries in the `bad` list are `g < CONFLICT_PX` (CONFLICT_PX = 0.9 / WORLD_SCALE, px). The violation is **downstream of Main** (post-Main aisle, where the aSouth departure and aSouth arrival share pavement).

This is the test that **changed failure mode** under SPARTAN's edit: from an anchor-geometry failure to a real full-lane clearance failure. It is the same underlying aSouth conflict CLAUD logged (296<->961, ~0.90 world) and that SPARTAN's south-first follow-up reproduced (Main lock ~10:38, 251<->1000).

### 4. `lot-a-main-median.test.js:146` — stale fixture
```
L148 assert.deepEqual(reduced, [], JSON.stringify(reduced));   // reduced = A_MEDIAN_PROVENANCE.filter(p => p.reduced > 0)
```
Fires because `A_MEDIAN_PROVENANCE` still records `reduced > 0` samples — e.g. `out:a:aNorth after: reduced 21 of 36, minFactor 0.5` and `in:*:aNorth before: reduced 2, minFactor 0, offPavement 3`. The provenance list was **recorded under the old median offsets**; it is a frozen data snapshot, not a live recompute. Stale fixture: the recorded provenance no longer reflects current geometry, so the "nothing was reduced" guard fails on the captured data. (Distinct from a live clearance problem.) Inherited; unchanged.

### 5. `lot-a-south-held-chord.test.js:80` — stale numeric
```
L83  for (const a of arrivals) assert.ok(Math.abs(a.lane.aControl.mergeDistance - heldStop(a.lane) - 2.2) < 1e-9, a.name);
```
Fires with `a:aNorth` (a.name). The test hardcodes a **uniform 2.2** aMain hold for every arrival, but `mainHoldBack(raw,'aMain') = max(mainStopBack, 2.2)` and the a:aNorth arrival folds → 3.0 floor, so its applied stop is **3.0**, not 2.2. (26 arrivals built; 13 keys x 2 zones.) Inherited; unchanged.

### 6. `lot-a-south-held-chord.test.js:89` — geometric
```
L91  assert.ok(m >= CONFLICT_WIDTH, `min chord gap ${m.toFixed(3)} < ${CONFLICT_WIDTH}`);   // forwardMin: admitted departure vs held arrival
```
Chord-sampled clearance (routeWindow 1.5-unit chords, LOOKAHEAD 6, CONFLICT_WIDTH 0.9). Control **0.890** world, live **0.808** world — both just inside the 0.9 conflict width. A **marginal** geometric clearance, slightly worse under the takeover but already failing.

### 7. `lot-a-south-held-chord.test.js:94` — geometric  ⚠ worst of the set
```
L96  assert.ok(m >= CONFLICT_WIDTH, `min chord gap ${m.toFixed(3)} < ${CONFLICT_WIDTH}`);   // reverseMin: held departure vs admitted arrival, full lane incl post-Main
```
Control **0.710** world, live **0.198** world. **This is the one that materially worsened (0.710 -> 0.198, ~3.6x closer).** The held departure body is now well inside the 0.9 conflict width against an admitted-arrival chord in the post-Main aisle. A genuine clearance failure, and the largest movement in the set — consistent with the aSouth direction CLAUD died mid-trial on. Flag to SPARTAN for the broader South-clearance fix.

---

## Route type — Main-controlled vs bypass

**All seven are Main-controlled. None involve a bypass approach.**

Evidence from the route construction the tests build on:
- All three files call `zoneArrivalRoute` / `zoneDepartureRoute` (src/parkingRoutes.js) and assert against the single staffed anchor `main = LOT_A_MAIN_POSITION` (= `pointAt(57)`).
- `lot-a-main-median.test.js:44` only admits an arrival if `raw.some(p => d(p, main) < .001)` — i.e. the route must actually touch the Main anchor. Test :47 additionally requires **every** general A route to cross Main **exactly once**.
- `src/vectorRoutes.js` throws `'C arrival bypasses staffed entrance'` if a C arrival does not end at the staffed entrance — the codebase actively rejects bypasses.
- No test in this failing set builds a route that avoids the anchor; every failing assertion is evaluated on a lane that traverses Main (some in the post-Main aisle, §3/#7).

Conclusion: this failing cluster is the **single staffed Lot A Main position and its near-Main geometry** — not a separate bypass corridor. A bypass-route hypothesis does not apply here.

---

## Classification summary for SPARTAN

- **Root-cause class A — fold-vs-1.7 stop-back (stale numeric):** #1, #2, #5. All three fail because **a:aNorth (and its aNorth siblings: badgeA, eB, eBMain, e2BMain, eCWest, e2CWest) are fold routes at Main** (mainStopBack -> 3.0), while the tests hardcode the non-fold expectations (1.7 base, uniform 2.2 hold). A fixture alignment (fold routes expect 3.0) would likely clear all three. **Unchanged by the takeover; pre-existing.**
- **Root-cause class B — aSouth post-Main clearance (geometric):** #3, #6, #7. The aSouth departure/arrival pair shares the post-Main aisle and its chord/body clearance sits at or below the 0.9 conflict width. This is the **real, open South-clearance problem** — and #7 worsened under the takeover (0.710 -> 0.198). This is where the geometry work belongs.
- **Root-cause class C — frozen provenance (stale fixture):** #4. `A_MEDIAN_PROVENANCE` is a recorded snapshot captured under old offsets; re-record it (or align the guard) rather than treat it as a live clearance signal.

## Could not confirm / confidence

- **3.0 fold value in #1/#2/#5** — source-inferred from src/lotAControl.js:22-28 (mainStopBack fold branch); the tests print only the route name, so the numeric is not in the log. **High confidence** (the source is unambiguous), but I did not observe the literal 3.0 in a diff.
- **Exact px->world factor (WORLD_SCALE)** for the #3 px values — not re-read this pass; the test self-reports in px and only adds a pair to `bad` when `g < CONFLICT_PX = 0.9/WORLD_SCALE`, so every listed pair is a violation by construction. **Medium confidence** on the exact px threshold; the violation status is certain.
- **Why #7 moved 0.710 -> 0.198** — I can attribute it to the takeover (the only diff between the two runs) and to the aSouth direction, but the precise lane/segment pair driving the 0.198 is not isolated in these logs. **Open for SPARTAN** (the broader South-clearance fix).
- No new failing test names appeared in live; the set is exactly the 7 listed. **High confidence** (full verdict map extracted from both logs).

**Saved & shared:** this file (project `research/qwen-tasks/`), byte-identical workspace copy, published to group. Handoff to SPARTAN queued. Read-only integrity: no project file modified this pass.
