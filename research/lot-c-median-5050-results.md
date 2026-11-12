# Lot C median entrance + 50/50 exit split — results (2026-11-07, CLAUD)

Source packet: QWEN artifact 0d2f6cca (research/qwen-tasks/lot-c-median-5050-exit-instruction.md).

## Rules implemented
1. Lot C entrance = two roads split by a median; cars enter and exit at the same time.
2. C car departures use both Lot C exits ~50/50. Shuttles excluded (keep #64 + Corporate hold).

## Key finding
Traces already carry two separated roadways: entry #8/#9/#10 on the west side (ends ~[976,125]),
exit #13 on the east side (starts ~[995,132]). The head-on conflict came from parking staging
inside the throat (cNorth [987,92], cFirstNorth [976,125]). Built-lane throat gap: 0.00 px before,
15.94 px after (conflict width 10.89 px). No lane offsets needed.

## Changes
- src/parkingRoutes.js: C_MEDIAN (provisional), C_MEDIAN_PROVENANCE, inCThroat; C staging
  target [986,162], throat box excluded (x 955-1015, y<140). cFirstNorth now [986,162], cNorth [991,176].
- src/campusSimulation.js: departurePolicy.c = split (default) | west | east; split = car-id parity.
- src/SundayControls.jsx: Lot C departures select enabled.
- tests/c-entrance-median.test.js (new, 4 tests); eleven-performance and northern-radio tests updated.

## Verification
- Full suite 219/246; same 27 baseline failures, zero new. Build passes.
- Headless 11 a.m., 5 buses, 20 sim-min: C car departures 28 west / 29 east; 0 routing issues;
  bus trips 5,5,5,5,4; C-exit shuttle hold fired 4 times.
- Browser preview not visually checked.

## Open
1. 50/50 = even alternation, switchable in menu.
2. Cars and returning shuttles share the far-right exit road near #64 — confirm.
3. Median not visible in Clear Image; tail y=140 is a provisional parameter.
