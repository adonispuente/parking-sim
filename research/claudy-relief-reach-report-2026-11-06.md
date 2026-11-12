# CLAUDYBEAR #59 relief reach — PARKED, source restored (run 13165634)
Acceptance: REJECTED, eleven regression.

Diagnosis: eleven t=2000/3600 s, 36 Alpha arrivals frozen on aNorth at 2.6 pitch; #59 decision line 56.7 world before Main. The counter looked only 12 world back (max 4-5 cars), so high=6 never tripped (queued 4, 0 transitions). Probe: research/claudy-relief-reach-probe.mjs.

Candidate (parked: research/claudy-relief-reach-parked/): per-lane Main-to-#59 reach; trigger max(6, ceil(0.75 x reach/2.6)) = 16 on aNorth (the first version, trigger 6, broke lot-a-main-position.test.js:86). Checks: focused 14/14; suite 156 pass/28 fail/1 TODO, failing names identical to the connector suite; build 0.

Traffic vs same-map connector (claudy-relief-reach-traffic.jsonl vs spartan-continuation-connectors-traffic.jsonl):
- nine: 950/0 stalled/0 west, unchanged
- eleven: entered 119->79, stalled 94->149, west 2->4, B dep 290->267, C dep 103->64. Relief active, 31 assigned + 5 redirected. REGRESSION.
- final: entered 81->89, stalled 102->98, west 8->6, B dep 322->311

Decision: parked. Source restored from research/claudy-backup-relief-reach/. All 69 source/test hashes match claudy-relief-reach-before.sha256. Restored focused tests 13/13.

Why: the root lock is identical with and without diversion. Arrival 965 (198,86) yields clear-occupied-conflict to departure 179 (238,92), which is held by lot-a-main-five-car-batch. Diversion moves the line to Bravo while Main stays locked, and the extra Bravo load cost B/C departures at eleven. The extra eleven stalls are not localized; the traffic script records only the first 16.

Next: (1) fix the 965/179 Main lock with a narrow batch-held validation, not the reverted global conflict-window change; (2) re-apply the parked reach candidate and rerun the three services; (3) the three-lane Feeder middle outbound slice is not started.
