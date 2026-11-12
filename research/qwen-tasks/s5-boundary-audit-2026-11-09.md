# QWEN S5 read-only boundary audit — 2026-11-09

Scope: determine whether genuine, reusable, Commander-traced pavement-boundary
polygons already exist for the two untraced road gaps. READ-ONLY. No drawing, no
boundary inference, no app/map/test/baseline edits. No broad tests.

## Verdict

**No reusable boundary geometry exists in the registered source frame for either
gap.** Both gaps are currently traced as *centerline* linestrips only. The drawing
packet (SPARTAN's) remains the correct path: boundaries must be drawn by the
Commander against `Clear Image.png`.

## Registered source frame (verified on disk)

`images/EverythingClearImage.json` over `images/Clear Image.png`, 1374×1118,
65 shapes (31 linestrip / 18 point / 16 polygon). Hash matches SPARTAN's
protected-before `e09faa49…` — file unchanged. `images/layout-overlay.json`
`565ab3fc…` and `images/Clear Image.png` `9b88a058…` also unchanged.

Road polygons in this frame: `Feeder Road` (13 pts, bbox x[0.5..52.2] — hugs the
west edge), `Equity Drive` (15 pts), `Corporate Drive` (27 pts).

## Gap 1 — lot-a-entrance-road

- SPARTAN's required points = vertices 2–6 of shape **#0 `Lot A Feeder to Lot A
  South`** (linestrip, 21 pts) + **#57 `Lot A Main Entrance position`** (point).
  Distance of all 6 required points to that centerline: **0.0–7.4 px** — they are
  centerline points, not boundary vertices.
- `Feeder Road` polygon stops at x≈52; the first required point (x=68) is outside
  it, and every gap point lies outside every current-frame road polygon.
- The entrance stretch (Feeder → Lot A Main) has **no traced boundary polygon in
  any file in the project.**
- Closest prior geometry: `A-west-connection` centerline in the lot-a-v1 scan
  (old frame, 28–53 px away under an unregistered ratio mapping — indicative
  only). It is a centerline, `confidence=medium`, and that scan's manifest says
  `requires_human_review`.

## Gap 2 — equity-exit2-driveway

- Required point = vertex 0 of shape **#10 `Clay to equity to Lot C entrance`**
  (linestrip, 11 pts) at [1032.6, 1105.7]; the linestrip runs north to
  Corporate Drive from there.
- Nearest current-frame road polygon edge: `Equity Drive` at **28.1 px** — the
  point is outside it. **No driveway boundary polygon exists in any file.**
- No lot-a-v1 feature is even near this location (nearest scan centerline
  ~1066 px under the unregistered mapping).

## Historical files inventoried (not reusable in the current frame)

| File | Frame | Status |
|---|---|---|
| `research/Map with streets.json` | 1698×1378 over `Mosst updated satelite image.png` | Road polygons `Feeder Road`/`Corporate Drive`/`Equity Drive` are **street-centerline corridors** (Equity Drive spans the whole 1698-wide map). Its source PNG **no longer exists on disk** (removed during the source switch). No registered transform to the 1374×1118 frame. |
| `research/traced updated satelite image.json` | same old frame | Same limitations; `Equity Drive` label absent, `Corporate Drive` 35 pts. Same unregistered-frame problem. |
| `research/scans/lot-a-v1/annotations.labelme.json` | same old frame | Preliminary draft, `status: requires_human_review`. Its pavement polygons (`A-east-pavement`, `A-shuttle-pavement`) cover the Lot A forecourt/roof areas, not the entrance-road stretch; even under an unregistered width-ratio mapping, all 6 gap points fall outside every scan pavement polygon. |

The only file in the *current* frame is `EverythingClearImage.json` (+ the 5
advisory overlay features in `layout-overlay.json`, none `pave:`).

## Limitations

1. Nothing I did draws, infers, or buffers centerlines into boundaries — the
   centerline proximity numbers above are diagnostic only.
2. The old-frame files cannot be transferred to the current frame: different
   raster (1698×1378 vs 1374×1118), different image, no established registration
   transform, and the old satellite PNG is gone from `images/`.
3. The lot-a-v1 scan is explicitly a review draft; its centerlines are
   medium-confidence visual interpretations, not boundaries.
4. I did not read `EverythingClearImage.json`'s 65 shapes against every building
   polygon in the current frame; the road-polygon tests cover the only features
   relevant to these two gaps.

## Provenance summary for the drawing packet

- Reference markers in SPARTAN's packet are centerline anchors: correct to show,
  but they must be drawn around, not as vertices (as the packet's legend says).
- `pave:lot-a-entrance-road`: actual pavement between the Feeder Road polygon
  (west edge x≈52) and the Lot A building, both of which exist in the current
  frame and are visible in `Clear Image.png` — the Commander has both anchors on
  screen.
- `pave:equity-exit2-driveway`: pavement between the `Equity Drive` polygon edge
  (28 px from the anchor) and the traced street it joins.

No app source, map, overlay, test, or baseline file was modified. No server
started or stopped.
