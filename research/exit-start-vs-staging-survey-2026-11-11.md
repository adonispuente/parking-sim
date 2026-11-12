# Exit-path starts vs zone staging — Stage 3 survey

Generated: 2026-11-11 by QWEN (read-only; Stage 3 of CLAUD's plan, shared artifact
`875390fe-3ef6-4896-bb15-4b3c9c32c137`), under the Commander's 2026-11-11 supersede
directive. All values were read live from the current project at
**2026-11-11 15:40:58 UTC** and rounded to 2 decimals.

No traffic is changed by this document. It feeds the individual-parking design
(reserved spots near exit-path starts). SPARTAN is the sole writer to src/, images/
and tests/ while Stages 1-2 run; this file is the only output of Stage 3.

## Method

- Staging: `ZONE_STAGING` (read-only) from `src/parkingRoutes.js`.
- Exit paths: all 32 from `EXIT_PATHS` in `src/exitPathSource.js` (32/32 = A6 + B12 + C14).
- First vertex: each linestrip's first drawn vertex (source order).
- Distance: planar pixel distance, staging -> first vertex.
- Inside-zone: `inPolygon` from `src/sourceRouting.js` against the zone's polygon
  (`shapeAt` of `src/clearImageSource.js`): aSouth #38, aNorth #39, aBadge #37,
  bSouth #40, bBanana #41, bPocket #42, bNorth #44, cFirstNorth/cNorth #51,
  cFirstSouth/cSouth #52. cFirst*/cNorth share #51 and cFirst*/cSouth share #52,
  so those pairs compare against the same polygon; they differ in staging point.
  Polygon membership alone does NOT establish a valid parking space: the aisles,
  the C throat/mask constraints and drivability are separate gates.
- C north staging is still at the pre-move target [986,162] (C_STAGING_TARGET from
  `images/layout-overlay.json` = [986,162] as of this read). If CLAUD's Stage 2 (+50 px
  east) is promoted before this survey is consumed, the cFirstNorth/cNorth rows must be
  re-derived at [1036,162]; the +50 px east effect on their distances is the same for
  every row (recompute the distances, the inside-zone flags are unaffected).

Exact command run (script is a single node file importing project modules; it writes
nothing):

```sh
cp <workspace:exit-staging-survey.mjs> /tmp/exit-staging-survey.mjs
node /tmp/exit-staging-survey.mjs   # -> JSON, printed to stdout (33,429 bytes)
```

Script sha256: `0b7a5df7b3fd4da1554c4f0e39a36a114a7e7b544d069c0aba7a4fa4db875fd3`.
Map frame 1374x1118 (registered source). Module-load of `src/parkingRoutes.js` is
side-effect-free (route building is lazy/cached behind the exported functions).

## Zones: current staging

| zone | source shape | staging [x, y] |
|---|---|---|
| aNorth | #39 (Lot A north) | [286.45, 93.67] |
| aSouth | #38 (Lot A south) | [164.93, 89.66] |
| aBadge | #37 (Lot A black permit) | [300.05, 434.92] |
| bSouth | #40 (Lot B South) | [562.91, 498.33] |
| bBanana | #41 (Lot B banana) | [769.71, 501.46] |
| bPocket | #42 (Lot B pocket) | [779.05, 283.66] |
| bNorth | #44 (Lot B North) | [580.74, 328.27] |
| cFirstNorth | #51 (Lot C North) | [986, 162] |
| cFirstSouth | #52 (Lot C South) | [948, 326] |
| cNorth | #51 (Lot C North) | [991, 176] |
| cSouth | #52 (Lot C South) | [952, 326] |

## Lot A — 6 exit paths

### aNorth — staging [286.45, 93.67]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-16 | [155.7, 109.87] | 131.75 | no |
| exitpaths-17 | [91.18, 411.93] | 373.39 | no |
| exitpaths-24 | [396.37, 145.83] | 121.67 | yes |
| exitpaths-25 | [351.91, 134.58] | 77.19 | yes |
| exitpaths-26 | [314.69, 113.21] | 34.34 | yes |
| exitpaths-27 | [349.14, 48.85] | 77.07 | yes |

### aSouth — staging [164.93, 89.66]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-16 | [155.7, 109.87] | 22.22 | yes |
| exitpaths-17 | [91.18, 411.93] | 330.6 | yes |
| exitpaths-24 | [396.37, 145.83] | 238.15 | no |
| exitpaths-25 | [351.91, 134.58] | 192.29 | no |
| exitpaths-26 | [314.69, 113.21] | 151.59 | no |
| exitpaths-27 | [349.14, 48.85] | 188.67 | no |

### aBadge — staging [300.05, 434.92]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-16 | [155.7, 109.87] | 355.67 | no |
| exitpaths-17 | [91.18, 411.93] | 210.14 | no |
| exitpaths-24 | [396.37, 145.83] | 304.72 | no |
| exitpaths-25 | [351.91, 134.58] | 304.79 | no |
| exitpaths-26 | [314.69, 113.21] | 322.05 | no |
| exitpaths-27 | [349.14, 48.85] | 389.18 | no |

## Lot B — 12 exit paths

### bSouth — staging [562.91, 498.33]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-28 | [653.28, 217.59] | 294.93 | no |
| exitpaths-29 | [631.37, 180.52] | 325.1 | no |
| exitpaths-30 | [577.7, 162.79] | 335.87 | no |
| exitpaths-31 | [548.03, 212.53] | 286.19 | no |
| exitpaths-32 | [607.12, 211.65] | 290.07 | no |
| exitpaths-33 | [628.4, 264.39] | 242.93 | no |
| exitpaths-34 | [775.84, 286.06] | 300.66 | no |
| exitpaths-35 | [748.73, 151.9] | 393.12 | no |
| exitpaths-36 | [831.19, 368.81] | 297.91 | no |
| exitpaths-37 | [782.08, 514.05] | 219.73 | no |
| exitpaths-38 | [729.99, 517.99] | 168.23 | no |
| exitpaths-39 | [533.72, 447.01] | 59.04 | yes |

### bBanana — staging [769.71, 501.46]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-28 | [653.28, 217.59] | 306.82 | no |
| exitpaths-29 | [631.37, 180.52] | 349.48 | no |
| exitpaths-30 | [577.7, 162.79] | 389.31 | no |
| exitpaths-31 | [548.03, 212.53] | 364.17 | no |
| exitpaths-32 | [607.12, 211.65] | 332.3 | no |
| exitpaths-33 | [628.4, 264.39] | 275.99 | no |
| exitpaths-34 | [775.84, 286.06] | 215.48 | no |
| exitpaths-35 | [748.73, 151.9] | 350.19 | no |
| exitpaths-36 | [831.19, 368.81] | 146.2 | no |
| exitpaths-37 | [782.08, 514.05] | 17.65 | yes |
| exitpaths-38 | [729.99, 517.99] | 43.03 | yes |
| exitpaths-39 | [533.72, 447.01] | 242.19 | no |

### bPocket — staging [779.05, 283.66]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-28 | [653.28, 217.59] | 142.07 | no |
| exitpaths-29 | [631.37, 180.52] | 180.13 | no |
| exitpaths-30 | [577.7, 162.79] | 234.85 | no |
| exitpaths-31 | [548.03, 212.53] | 241.73 | no |
| exitpaths-32 | [607.12, 211.65] | 186.4 | no |
| exitpaths-33 | [628.4, 264.39] | 151.88 | no |
| exitpaths-34 | [775.84, 286.06] | 4.01 | yes |
| exitpaths-35 | [748.73, 151.9] | 135.2 | no |
| exitpaths-36 | [831.19, 368.81] | 99.84 | no |
| exitpaths-37 | [782.08, 514.05] | 230.41 | no |
| exitpaths-38 | [729.99, 517.99] | 239.41 | no |
| exitpaths-39 | [533.72, 447.01] | 294.74 | no |

### bNorth — staging [580.74, 328.27]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-28 | [653.28, 217.59] | 132.33 | yes |
| exitpaths-29 | [631.37, 180.52] | 156.18 | yes |
| exitpaths-30 | [577.7, 162.79] | 165.5 | yes |
| exitpaths-31 | [548.03, 212.53] | 120.27 | yes |
| exitpaths-32 | [607.12, 211.65] | 119.56 | yes |
| exitpaths-33 | [628.4, 264.39] | 79.7 | yes |
| exitpaths-34 | [775.84, 286.06] | 199.61 | no |
| exitpaths-35 | [748.73, 151.9] | 243.57 | yes |
| exitpaths-36 | [831.19, 368.81] | 253.71 | yes |
| exitpaths-37 | [782.08, 514.05] | 273.96 | no |
| exitpaths-38 | [729.99, 517.99] | 241.39 | no |
| exitpaths-39 | [533.72, 447.01] | 127.71 | no |

## Lot C — 14 exit paths

### cFirstNorth — staging [986, 162]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-18 | [931.16, 445.87] | 289.12 | no |
| exitpaths-19 | [932.27, 446.53] | 289.56 | no |
| exitpaths-20 | [934.82, 141.02] | 55.31 | yes |
| exitpaths-21 | [1066.67, 153.81] | 81.08 | yes |
| exitpaths-22 | [1150.95, 153.79] | 165.15 | yes |
| exitpaths-23 | [1185.17, 417.34] | 323.83 | no |
| exitpaths-40 | [930.65, 384.02] | 228.82 | no |
| exitpaths-41 | [889.75, 423.89] | 279.02 | no |
| exitpaths-42 | [984.56, 184.21] | 22.26 | yes |
| exitpaths-43 | [1014.6, 496.32] | 335.54 | no |
| exitpaths-44 | [1055.72, 497.54] | 342.71 | no |
| exitpaths-45 | [1100.46, 500.02] | 356.87 | no |
| exitpaths-46 | [1141.29, 498.67] | 370.76 | no |
| exitpaths-47 | [1181.97, 499.71] | 390.45 | no |

### cFirstSouth — staging [948, 326]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-18 | [931.16, 445.87] | 121.05 | yes |
| exitpaths-19 | [932.27, 446.53] | 121.55 | yes |
| exitpaths-20 | [934.82, 141.02] | 185.45 | no |
| exitpaths-21 | [1066.67, 153.81] | 209.12 | no |
| exitpaths-22 | [1150.95, 153.79] | 266.17 | no |
| exitpaths-23 | [1185.17, 417.34] | 254.15 | yes |
| exitpaths-40 | [930.65, 384.02] | 60.56 | yes |
| exitpaths-41 | [889.75, 423.89] | 113.91 | yes |
| exitpaths-42 | [984.56, 184.21] | 146.43 | no |
| exitpaths-43 | [1014.6, 496.32] | 182.88 | yes |
| exitpaths-44 | [1055.72, 497.54] | 202.56 | yes |
| exitpaths-45 | [1100.46, 500.02] | 231.36 | yes |
| exitpaths-46 | [1141.29, 498.67] | 259.18 | yes |
| exitpaths-47 | [1181.97, 499.71] | 291.41 | yes |

### cNorth — staging [991, 176]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-18 | [931.16, 445.87] | 276.42 | no |
| exitpaths-19 | [932.27, 446.53] | 276.83 | no |
| exitpaths-20 | [934.82, 141.02] | 66.18 | yes |
| exitpaths-21 | [1066.67, 153.81] | 78.86 | yes |
| exitpaths-22 | [1150.95, 153.79] | 161.48 | yes |
| exitpaths-23 | [1185.17, 417.34] | 309.75 | no |
| exitpaths-40 | [930.65, 384.02] | 216.6 | no |
| exitpaths-41 | [889.75, 423.89] | 267.77 | no |
| exitpaths-42 | [984.56, 184.21] | 10.43 | yes |
| exitpaths-43 | [1014.6, 496.32] | 321.19 | no |
| exitpaths-44 | [1055.72, 497.54] | 327.99 | no |
| exitpaths-45 | [1100.46, 500.02] | 342.01 | no |
| exitpaths-46 | [1141.29, 498.67] | 355.95 | no |
| exitpaths-47 | [1181.97, 499.71] | 375.84 | no |

### cSouth — staging [952, 326]

| exit | first vertex [x, y] | distance (px) | inside zone polygon |
|---|---|---|---|
| exitpaths-18 | [931.16, 445.87] | 121.67 | yes |
| exitpaths-19 | [932.27, 446.53] | 122.13 | yes |
| exitpaths-20 | [934.82, 141.02] | 185.78 | no |
| exitpaths-21 | [1066.67, 153.81] | 206.88 | no |
| exitpaths-22 | [1150.95, 153.79] | 263.13 | no |
| exitpaths-23 | [1185.17, 417.34] | 250.42 | yes |
| exitpaths-40 | [930.65, 384.02] | 61.82 | yes |
| exitpaths-41 | [889.75, 423.89] | 116.01 | yes |
| exitpaths-42 | [984.56, 184.21] | 145.48 | no |
| exitpaths-43 | [1014.6, 496.32] | 181.46 | yes |
| exitpaths-44 | [1055.72, 497.54] | 200.46 | yes |
| exitpaths-45 | [1100.46, 500.02] | 228.74 | yes |
| exitpaths-46 | [1141.29, 498.67] | 256.21 | yes |
| exitpaths-47 | [1181.97, 499.71] | 288.2 | yes |

## Nearest exit starts per zone (top 3, unfiltered)

| zone | nearest | distance (px) | in polygon | 2nd | 2nd dist | 3rd | 3rd dist |
|---|---|---|---|---|---|---|---|
| aNorth | exitpaths-26 | 34.34 | yes | exitpaths-27 | 77.07 | exitpaths-25 | 77.19 |
| aSouth | exitpaths-16 | 22.22 | yes | exitpaths-26 | 151.59 | exitpaths-27 | 188.67 |
| aBadge | exitpaths-17 | 210.14 | no | exitpaths-24 | 304.72 | exitpaths-25 | 304.79 |
| bSouth | exitpaths-39 | 59.04 | yes | exitpaths-38 | 168.23 | exitpaths-37 | 219.73 |
| bBanana | exitpaths-37 | 17.65 | yes | exitpaths-38 | 43.03 | exitpaths-36 | 146.2 |
| bPocket | exitpaths-34 | 4.01 | yes | exitpaths-36 | 99.84 | exitpaths-35 | 135.2 |
| bNorth | exitpaths-33 | 79.7 | yes | exitpaths-32 | 119.56 | exitpaths-31 | 120.27 |
| cFirstNorth | exitpaths-42 | 22.26 | yes | exitpaths-20 | 55.31 | exitpaths-21 | 81.08 |
| cFirstSouth | exitpaths-40 | 60.56 | yes | exitpaths-41 | 113.91 | exitpaths-18 | 121.05 |
| cNorth | exitpaths-42 | 10.43 | yes | exitpaths-20 | 66.18 | exitpaths-21 | 78.86 |
| cSouth | exitpaths-40 | 61.82 | yes | exitpaths-41 | 116.01 | exitpaths-18 | 121.67 |

## Read-only proof

- Project `git status --porcelain` line counts before and after the run are identical;
  `find src images tests -type f -newermt <run start>` returned no files.
- No file under src/, images/ or tests/ was written. The external archive and QWEN's
  preserved cleanup evidence were not touched (cleanup remains SUPERSEDED/PARKED).

