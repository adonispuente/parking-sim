# SPARTAN continuation — run 1b07ff71
Goal: bounded implementation of revised Alpha/Feeder operations; exact CLAUDYBEAR handback next run. No specialist launched now.

Inspected: current campus redirects closed gates only. Parked relief has six/two queue hysteresis but lacks explicit lane metadata, built-pose proof and updated route history. Restored log reports SAME eight Main failures (7pass/8fail/1TODO), exit1: cannot attribute these to previous candidate. Current A approaches differ from Clear Image.json; retain uploaded revision, not historical map.

Steps:
1. Back up owned files; statically summarize map identity (no baseline tests/build/simulation).
2. Implement #59 queue relief first: eligible Feeder general requests choose available/open Bravo; on-road Alpha redirects only before decision point, preserving built pose, identity/cohort, reservations, assignments and route history. No permit/bus diversion. Save coverage BEFORE tests.
3. Focused continuity/accounting tests; targeted/full saved-failure-name comparison; build. Then all3 post-change traffic scenarios. Historical older-map totals are not like-for-like acceptance evidence.
4. If time permits, isolate explicit-role three-lane Feeder separation as second slice, never re-offset a redirect's initial pose. Save change/coverage before checks; reject new safety/traffic regressions.
5. Update checkpoint/history and immutable handback with raw logs, exact current gates and next action.

Risks: six/two and lane offsets provisional; third-lane direction unspecified. Main geometry/stop overlap remains unresolved. Preserve safety thresholds/priorities, playback, B repairs, B7vertices20–24, two-way streets/medians. Do not globally refine conflict windows, loosen collision margins or claim person-level attendance. No unchanged-baseline test cycle.

## Slice2 — revised-trace station connectors
Read-only geometry measurements: fixed #57 residual to revised routes0/1/18/19 is6.444/7.131/7.486/7.442px. Existing6px source-corridor rejects all, falls to grid through(216,104), producing reversed approaches and26/36 reduced outbound median samples. New LOCAL Main corridor join may accommodate only endpoint residual <=existing12px station merge radius, capped at max(6,residual endpoints), with every segment sample roof-clear/within that source corridor and explicit provenance. No source JSON/station edits, no global routing/collision threshold changes. Save source+focused regression before checks; verify Main geometry, full suite and3same-map traffic scenarios vs slice1. Feeder3lane is still not active; next separate slice.
