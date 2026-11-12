# Stage 1R-b — Lot A South departure lane separation (CLAUD, 2026-11-11)

Addendum to `handoffs/asouth-c-revision-2-claud.md` (sha256 a4e2dd6d…f2af3c). It releases Stage 1R-b for an isolated trial only.

Commander decision, 2026-11-11 (brief answer): "Yes, two lanes side by side". The Lot A South aisle carries arrivals and departures at the same time, so departures get their own lane beside the arrivals. This is the same treatment approved for Lot A North.

## Scope
- Change only the built Lot A South departure lane that follows exitpaths-16, and only on the shared stretch. The shared stretch is every part of the exit-16 return leg that lies closer than 10.89 px to arrival trace #0. Measure it; do not assume it. My trial evidence places it around [123–149, 212–259], but it may be longer.
- Arrival trace #0 is untouched.
- The drawn catalog stays untouched: `images/ExitPathsAndC.json`, `src/exitPathSource.js` and the off-white overlay keep the exact drawn vertices. The separation exists only in the built traffic lane, with a `CONNECTOR_PROVENANCE` entry `{context:'Lot A South departure own lane beside arrival #0', mode:'lane-separation', provisional:true, source:'Commander 2026-11-11: two lanes side by side'}`.
- Everything outside the shared stretch follows exitpaths-16 exactly. That includes the Main pass within about 4 px and the existing post-Main suffix.

## Method
1. Measure first, change nothing yet. For the shared stretch, report on each side of exit 16:
   - the perpendicular drivable room (`drivableAllowed`);
   - the obstacle clearance (`clearSegment`).
2. Shift the departure leg to the side that has room, so that its separation from arrival #0 is at least 10.89 px along the whole stretch. Target about 12 px, matching A North. Use the existing lane-offset helper pattern already in the codebase; do not hand-place new coordinate literals.
3. Taper the shift in and out over the existing exit-16 vertices on either side of the stretch. Every tapered segment must pass `clearSegment(a,b)` and `clearSegment(a,b,drivableAllowed)`.
4. If neither side has 10.89 px of drivable room, STOP. Report the measured room per side. Do not narrow the threshold or move arrival #0.

## Build together with 1R-a
Trial = exitpaths-16 route + this separation + the feeder-officer exit-room guard (1R-a), in a fresh isolated copy from the current live baseline. Re-hash live files first. Run this only after Stage 2R is finished or stopped: one writer at a time.

## Kill-tests (all must pass to promote; promote 1R-a and 1R-b together)
| Check | Pass condition |
|---|---|
| Separation | Minimum gap between built exit-16 departure and arrival #0 is at least 10.89 px over the whole lane. Report the worst pair. |
| Geometry | Both joins and every taper segment are clear and drivable. `npm run layout:check` exits 0. |
| Default 11:00 | Horizon of at least 9000 s, past let-out. No freeze. Max wait reported against the baseline (31 s) and the guard-only trial (50 s). End A/B/C counters are not below the baseline. |
| South-first | Horizon of at least 9000 s. It must be no worse than the existing open defect, which is a freeze since 2030 s (10:38:50) with 251 ← 1000. Any NEW lock location fails the trial. If it locks only at the old 251 ← 1000 site, report it as the existing defect, not as acceptance. |
| Tests | Exit-path catalog/display 39/39. Feeder-officer tests plus the new exit-room unit test. Narrow Lot A set. `npm run build` exits 0. |
| Browser | Top view: the departure lane is visibly beside the arrival on the shared stretch, and the drawn off-white exit 16 is unchanged. Rewind once. |
| Integrity | The other 63 routes are unchanged. The protected file set is unchanged except the permitted files. |

## On promotion only
- The median-crossing chord (~[164,88]→[204,100]) is removed from live A South departures.
- Exit 16 is marked "in traffic use", and `ACTIVATED_EXIT_IDS` gains exit 16 only.

## On failure
Do not promote. Hand back with the failing chain, clock and car positions. CLAUD diagnoses next.
