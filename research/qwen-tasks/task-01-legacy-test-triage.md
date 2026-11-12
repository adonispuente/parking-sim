# QWEN Task 01 — Triage the 27 failing tests (read-only, report only)

Assigned by: CLAUD (lead while SPARTAN and GPT MINION are token-capped)
Date: 2026-11-07
Project root: `/Users/adonispuente/Desktop/Developer/parking-sim`
Raw test output (TAP, exact): `research/qwen-tasks/full-suite-2026-11-07.tap`

---

## 1. What you are doing, in one paragraph

The full test suite has **242 tests: 215 pass, 27 fail**. We believe most failures are old tests written for a map and rules that the Commander has since replaced. Some may be **real bugs** that newer code introduced. Your job is to look at each of the 27 failures, decide which kind it is, and write a report with evidence. **You do not fix anything.** CLAUD reads your report, verifies it, and makes any changes.

## 2. Hard rules — read these twice

1. **Do NOT edit, create, rename or delete any file under `src/` or `tests/`.** Read only.
2. The **only** file you write is your report: `research/qwen-tasks/task-01-report.md`. Then publish it with `group.publish`.
3. **Do not run `npm run dev`, `vite`, or start any server.** A preview server is already running; do not touch it.
4. You **may** run tests to inspect a failure, one file at a time, from the project root:
   `node --test --test-reporter=tap tests/<file>.test.js`
   Do NOT run `node --test tests/` (passing the folder produces one fake failure). Always pass `.test.js` file paths.
5. Never guess. If you cannot tell, write **UNSURE** and say what you would need to decide. An honest UNSURE beats a wrong verdict.
6. Every verdict must cite a file and line number you actually read (e.g. `src/model.js:42`).

## 3. Background you need

### 3.1 Source of truth (most important fact)
The Commander decided: **`Clear Image.png` + `EverythingClearImage.json` are the single source of truth** for map geometry, staffed positions and vehicle routes. The adapter is `src/clearImageSource.js`.

The **old** sources are retired: `HopeCityLayoutVectors.json`, the older satellite image, and the older traced-map frame. A test expecting coordinates, aspect ratios, trace names or object shapes from those old sources is **obsolete**, not a bug.

### 3.2 Commander's current operating rules (tests must agree with these)
- **Total capacity is 1584** (A / B / C sections). **Badge parking is 51, inside Lot A's 411.** Badge share of cars is **fixed at 5%**.
- **Priority:** shuttles first, then departures, then arrivals. Vehicles already inside a crossing clear first.
- **Lot A Main Position** (between north and south in Lot A) controls all three approaches, counts **5 cars**, then switches.
- **Buses may pass through other buses**, but still wait for cars.
- **Feeder / Corporate Drive officer:** when both queues wait, releases **10 exits then 5 entries**. A lone queue keeps moving.
- **Lot B west exit:** a car leaves immediately if its path is clear.
- **Lot B, Clay congestion:** when the road east to Clay is clogged, B sends **small batches (provisionally 5)** toward the feeder.
- **Lot C entry:** cars enter **only** through the **Lot C entrance position (#63)**, near the Lot B exit.
- **Lot C far-right north-east exit (#64): shuttle-only.** Cars never use it. Car departures from C use `cWest` only.
- The C north-east exit position **stops Corporate traffic to let shuttles out**. All positions share shuttle locations by radio.
- **Removed from the UI today by the Commander:** parking occupancy section, empty-lots / A-full / B-full buttons, volunteer section, the **"four-b-one-c"** shuttle dispatch section, and the C roundabout direction dropdown. The engine's dispatch logic may still exist; only the UI was removed.

### 3.3 Staffed position numbers (`src/clearImageSource.js:36-43`)
- #62 = Lot B exit position
- #63 = Lot C entrance position
- #64 = Lot C north-east exit position (shuttle release)

### 3.4 Files you will most likely need
- `src/clearImageSource.js` — reads EverythingClearImage.json; positions and traces
- `src/model.js` — layout / lot / capacity model
- `src/lotA.js`, `src/lotAParking.js`, `src/campus.js`, `src/tracedMap.js` — older layout modules (likely what legacy tests import)
- `src/vectorRoutes.js`, `src/parkingRoutes.js`, `src/trafficPolicy.js`, `src/sourceRouting.js` — car route building
- `src/campusSimulation.js` — departure route choice, simulation wiring
- `src/shuttles.js`, `src/shuttleRoutes.js` — buses and dispatch modes
- `src/sundayServices.js` — service demand and capacities
- `src/northernCorporateControl.js` — C exit shuttle hold, radio
- `src/trafficPositions.js` — Lot A Main Position location
- `src/vehicleRouteCatalog.js`, `src/vehicleRouteManifest.js`, `src/roadAnchoredRoutes.js` — route provenance
Use `fs.search` to locate anything else a test imports.

## 4. The three verdicts

| Verdict | Meaning | Example |
|---|---|---|
| **OBSOLETE** | Test checks the retired map, a removed feature, or a rule the Commander changed. Code is correct; test is outdated. | Expects capacity 898; confirmed total is 1584. |
| **REAL BUG** | Test checks a rule still true (section 3.2) and the code breaks it. | Test says C cars must enter via #63, and a built C route skips #63. |
| **UNSURE** | You cannot tell from the code and rules. | Say exactly what is missing. |

For OBSOLETE, also say **RETIRE** (feature is gone; delete the test) or **UPDATE** (keep the idea, change the expected value — give the new value with file:line evidence).

## 5. The 27 failures (exact)

Find each in the raw TAP file for the full error and stack.

| # | Test file : line | Test name | Error |
|---|---|---|---|
| 32 | campus.test.js:6 | latest map preserves satellite aspect and has three polygon roofs | expected aspect 1.2322, got 1.2290 |
| 33 | campus.test.js:11 | curved spine joins both frontage streets in image coordinates | Cannot read 'points' of undefined |
| 34 | campus.test.js:19 | invalid trace coordinates and widths are rejected | Cannot read 'points' of undefined |
| 52 | clear-image-runtime.test.js:68 | connectors prefer traced pavement; fallbacks are flagged | expected false, got true |
| 74 | equity-routing.test.js:18 | two labeled Equity entrances are distinct inbound origins | expected true, got false |
| 75 | equity-routing.test.js:30 | both Equity C routes follow pavement then the staffed west entrance, not an exit | "eCWest traverses Equity Drive" false |
| 96 | lot-a-batch-control.test.js:31 | badge cars turn east/right inside permit entrance, stay clear of A pickup and roofs | expected true, got false |
| 97 | lot-a-envelope.test.js:14 | photo boundary contains entire east apron and matches pavement coordinates | Cannot read 'points' of undefined |
| 98 | lot-a-envelope.test.js:29 | revision one boundary migration retains building, custom rows and lot state | Cannot set 'count' of undefined |
| 118 | lot-a-parking.test.js:6 | parking trace renders serializable surfaces and all three parking banks | expected true, got false |
| 119 | lot-a-parking.test.js:17 | migration preserves non-A geometry and only applies once | Cannot set 'count' of undefined |
| 128 | lot-a.test.js:25 | applying Lot A preserves every other object and project name | Cannot set 'x' of undefined |
| 129 | lot-a.test.js:34 | malformed mass coordinates and heights are rejected | Cannot read 'masses' of undefined |
| 130 | lot-a.test.js:42 | saved-layout update clears current positions only once and preserves other items | Cannot set 'modelRevision' of undefined |
| 131 | model.test.js:5 | starter layout round-trips and has three provisional lots | expected 898, got 1584 |
| 132 | model.test.js:15 | closing a lot reduces capacity and removes its demonstration route | expected 487, got 1173 |
| 134 | model.test.js:34 | deleting a lot unassigns its parking rows rather than leaving dangling references | Cannot read 'lotId' of undefined |
| 135 | model.test.js:41 | invalid imports are rejected without mutating input | Cannot set 'lotId' of undefined |
| 159 | route-layout-alignment.test.js:16 | resolved Main Position has one shared coordinate and all general approaches attach | expected true, got false |
| 160 | route-layout-alignment.test.js:26 | road anchoring preserves physical road/entrance; proposals and missing shuttle returns are not invented | deepStrictEqual mismatch |
| 203 | shuttles.test.js:23 | five persistent buses loop with four to B and one cycling all C stops | expected true, got false |
| 204 | shuttles.test.js:34 | B full switches to C after current trip completes at home, with no midroute jump | expected 'all-c', got 'four-b-one-c' |
| 206 | shuttles.test.js:53 | badge parking stays available when general campus is full without inflating 1584 | expected 2, got 51 |
| 207 | shuttles.test.js:61 | departure releases count-only A/B/C simultaneously through proper exits and buses continue | deepStrictEqual mismatch |
| 210 | sunday-services.test.js:13 | confirmed section capacities total 1584; badge 51 stays inside A 411 | deepStrictEqual mismatch |
| 218 | sunday-services.test.js:83 | three full Sunday scenario runs finish their demands, retain new cohorts and clear previous cohorts | expected 300, got 850 |
| 242 | vehicle-routes.test.js:60 | connector provenance is disclosed per mode; untraced joins are not called surveyed | "C staffed entrance #63 to #8 interior" false |

## 6. Highest priority — do these first

These test rules that are **still true today**, so they are the likeliest real bugs. Spend most of your effort here:

- **#75 and #242** — Lot C entry through #63. CLAUD's newer `tests/charlie-staffed-entry.test.js` passes and says every C arrival lane passes #63. Find out why these two disagree. Is the old test checking an old trace name/frame (OBSOLETE), or is there a real gap (e.g. a route reaches #63 without driving on Equity Drive pavement, or the #63→#8 interior join is untraced but labelled otherwise)?
- **#159** — Lot A Main Position must have one shared coordinate and every general approach must attach. If an approach does not attach, cars could bypass the five-car control. That is a live rule.
- **#52** — connector provenance. If a fallback connector is not flagged, an estimated road is being called "traced". That breaks a live honesty rule.
- **#96** — badge cars inside the permit entrance.
- **#206 / #210 / #218** — capacity 1584, badge 51 inside A 411, and demand counts are live rules. Find out whether the test or the code has the wrong number, and where the code's number comes from.
- **#203 / #204 / #207** — the "four-b-one-c" UI was removed today, but the engine may still use it. Report the engine default and whether the test expectation is still meaningful.

The rest (campus aspect ratio, `.points` / `.masses` / `.count` / `.x` of undefined, 898/487 capacities) look like retired-map tests. Confirm quickly: find which object the test reads and show it no longer exists in the current source.

## 7. How to investigate one failure

1. Open the test file at the listed line with `fs.read` (numbered:true). Read the whole test function.
2. Read the imports at the top of that test file.
3. Open the source function the test calls and read it.
4. Ask: "Is what this test checks one of the rules in 3.2, or the source of truth in 3.1?"
   - Yes, and code fails it → **REAL BUG**.
   - It checks the old map / removed feature / changed number → **OBSOLETE**.
   - Can't tell → **UNSURE**.
5. If needed, run that one file: `node --test --test-reporter=tap tests/<file>.test.js`.
6. Write the entry in the report.

## 8. Report format (copy exactly)

Write `research/qwen-tasks/task-01-report.md`:

```
# Task 01 report — legacy test triage
Author: QWEN   Date: 2026-11-07
Files changed: only this report.

## Summary
- REAL BUG: <count> — <test numbers>
- OBSOLETE (RETIRE): <count> — <test numbers>
- OBSOLETE (UPDATE): <count> — <test numbers>
- UNSURE: <count> — <test numbers>
- NOT CHECKED: <count> — <test numbers>

## Real bugs (most important first)
### #<n> <test name>
- Test: tests/<file>:<line>
- Rule it protects: <quote the rule from section 3.2>
- What the code does instead: <one or two sentences>
- Evidence: src/<file>:<line>, <what you saw>
- Suggested fix (do not apply): <one sentence>

## Obsolete tests
### #<n> <test name>
- Test: tests/<file>:<line>
- Why obsolete: <retired source / removed feature / changed number>
- Evidence: <file:line>
- Action: RETIRE or UPDATE (new expected value: <value>, from <file:line>)

## Unsure
### #<n> <test name>
- What I found:
- What I need to decide:

## Commands I ran
<each command and its pass/fail count>
```

## 9. When you are done

1. `group.publish` the report with title "QWEN task 01 report — legacy test triage".
2. Reply with: the summary counts, the REAL BUG test numbers, and the published artifact id.
3. Do not claim you fixed anything.

If your tool budget runs out before all 27, **publish what you have**, mark the rest NOT CHECKED, and say so. Do section 6 first so the important ones are covered.
