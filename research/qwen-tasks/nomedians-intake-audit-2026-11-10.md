# QWEN bounded read-only intake audit — `images/NoMedians.json` (2026-11-10)

Scope: verify frame registration, polygon validity, median-hole representation, and the three
circle annotations; report only actionable ambiguities; state the preview-needed verdict.
**Read-only.** No project file edited, no traffic rerun, no routes/staffing inferred.

## Verdict

1. **Frame registration is unambiguous and correct.** NoMedians.json and the registered source
   frame (`EverythingClearImage.json`) both declare 1374×1118, and the PNG the drawing points
   to is byte-identical to `images/Clear Image.png`. No re-registration needed.
2. **The median etching is self-crossing, not LabelMe holes.** No shape uses LabelMe's
   hole/`group_id` mechanism. Every "median removed" region is encoded as a single closed path
   that crosses back over itself. That is a drawing convention the current renderer does not
   share, so **the exact-fill preview SPARTAN built is the right first step and is genuinely
   needed** — but the preview is a fill-rule *interpretation*, not acceptance of geometry.
3. **One load-bearing fill-rule split** (see §5) that must be ruled before integration.

Confidence: **high** on registration and geometry; **medium** on the grass/pavement visual
check (single annotated screenshot read, not pixel-counted — no image library was available
on this machine for the run).

## 1. Registration (verified)

- `imagePath` → `research/runs/m3-s5-3318/Clear Image.png`; exists on disk; **SHA-256
  `9b88a058…279be`, byte-identical to `images/Clear Image.png`** (recomputed this run).
- Declared dims 1374×1118 = registered `EverythingClearImage.json` dims (1374×1118). **Match.**
- All 16 shapes, all vertices finite and in-bounds (recomputed; matches SPARTAN's inventory).
- `imageData` is empty (length 0) — the annotation is image-reference only, so the PNG must
  resolve at load. It does.

## 2. Provenance (verified)

`images/NoMedians.json` (SHA `185dbe8f…01b9f`) vs `research/runs/m3-s5-3318/s5-returned.labelme.json`
(SHA `1754aaa0…1ba01f`):

- All 16 shapes identical label-for-label, vertex-for-vertex; **max per-vertex delta 0.0 px**.
- Sole diff is the `imagePath` field (`../research/runs/m3-s5-3318/…` vs `Clear Image.png`).
- **Conclusion:** the "new" file is a re-pathed copy of the m3-s5-3318 return. No new geometry.
  Earlier geometry concerns (self-crossings) therefore apply to this file exactly as they did.

## 3. Shape inventory (16 shapes, all in-bounds)

| # | type | label | pts | self-crossings |
|---|------|-------|-----|----------------|
| 0 | polygon | pave:lot-a-entrance-road | 60 | 0 |
| 1 | polygon | pave:equity-exit2-driveway | 24 | 0 |
| 2 | point | Lot C entrance position | 1 | — |
| 3 | point | Lot C entrance position | 1 | — *(duplicate of #2, identical coords)* |
| 4 | polygon | Lot B Entrance detailed layout | 49 | 1 |
| 5 | polygon | Lot A North With Medians excluded | 70 | 4 |
| 6 | polygon | Lot A south excluding medians | 56 | 0 |
| 7 | polygon | Lot A shuttle path and round about | 73 | 1 |
| 8 | polygon | Lot A black permit avoiding medians | 109 | 20 |
| 9 | polygon | Lot A to B crosswalk | 4 | 0 |
| 10 | point | Police officer | 1 | — |
| 11 | polygon | Lot B with medians removed | 291 | **61** |
| 12 | polygon | Lot A North pedestrian area road | 11 | 0 |
| 13 | circle | Lot B round about | (608,427) r31.6 | — |
| 14 | circle | Lot A round about | (139,367) r33.3 | — |
| 15 | circle | Lot C round about | (955,260) r32.6 | — |

## 4. Median representation and what the fills actually show

- **No LabelMe holes** exist in the file; medians are internal self-crossing loops. Shape #11
  (Lot B, 291 pts) has 61 crossings concentrated in **40 distinct vertex locations**, several
  visited 4–5 times — classic "path retraces itself around each island" tracing, not a clean
  polygon-with-holes.
- Read of SPARTAN's `preview-all.png` (intake run 4357, even-odd fills over the source image):
  - **Lot B (#11) renders as one continuous surface** with the medians showing as thin dark
    slots — the etching *does* read correctly as a single pavement mask.
  - **Lot A pieces render as fragmented, disjoint patches** — the orange loops/bars do not form
    a connected surface, with photo showing through the gaps.
  - **Circles sit on real roundabout islands** (not grass), per the visual.
  - **Misalignment (medium confidence):** the upper yellow (Lot B) lobe and the lower-left fills
    spill onto landscaped grass/trees, while the large paved lot on the far right and part of
    the upper-center drive are left unfilled. I could not pixel-count this (no PIL/sharp/jimp
    on the machine); treat as a visual observation to confirm, not a measured defect.

## 5. The load-bearing fill-rule split (actionable)

At each polygon's bbox centroid, even-odd and non-zero **agree** for all 10 polygons. The split
is in circle-vs-polygon containment:

| circle | center | even-odd inside | non-zero inside |
|--------|--------|-----------------|-----------------|
| #13 Lot B round about | (608,427) | poly #11 | poly #11 |
| #14 **Lot A round about** | (139,367) | **none** | **poly #7** |
| #15 Lot C round about | (955,260) | none | none |

Edge-sampling #14 around its 33 px radius: under non-zero it is **entirely inside poly #7
(Lot A shuttle path)**; under even-odd part of its rim is outside. **This is the only fill-rule
disagreement in the file.** It means: if SPARTAN's integration (or any circle-in-polygon test)
uses even-odd, the Lot A roundabout classifies as *not on* the shuttle path; non-zero says it
is. The preview already surfaces both rules, but integration must pick one — **SPARTAN needs a
ruling: even-odd or non-zero for containment.**

## 6. Actionable ambiguities (do NOT infer)

1. **Fill rule:** even-odd vs non-zero for polygon containment — drives the Lot A roundabout
   (#14) classification. *Needs a ruling.*
2. **Circle meaning:** disc (paved island), central island, or full ring? Affects whether they
   become fill holes, fill discs, or outline-only markers. *Unresolved in the file.*
3. **Duplicate "Lot C entrance position"** points (#2 & #3, identical). Preserve as notes only;
   do not treat as two staffed positions. *Preserved, not adopted.*
4. **Grass/pavement misalignment** (Lot B upper lobe, lower-left fills, unfilled right lot).
   *Visual observation only — confirm before treating as geometry to fix.*

## 7. Preview-needed verdict

**Yes — SPARTAN's exact-fill preview is needed and correct to build.** The self-crossing, no-LabelMe-hole
geometry makes raw fills ambiguous, and the preview is the cheapest way to show literal coverage
without redrawing. **But:** the preview is a fill-rule interpretation, not accepted mesh. Before
any integration, resolve #5 (fill rule) and #2 (circle meaning), and confirm #4. If the fill
rule is confirmed, the self-crossing paths can be accepted as-is (no redraw); if not, a redraw
to true LabelMe holes is the cleaner long-term form. Do not ask for a wholesale redraw solely
to satisfy label conventions.

## 8. Read-only integrity

Recomputed this run: `images/NoMedians.json` SHA `185dbe8f…01b9f`, `images/Clear Image.png`
SHA `9b88a058…279be`, `images/EverythingClearImage.json` `e09faa49…abd90` — all unchanged and
matching SPARTAN's intake record (`verification.json`: sourceUnchanged true, changed []). No
application, map, test, or route file touched; no build or traffic run.

Saved to `research/qwen-tasks/`. Handoff note to SPARTAN in `handoffs/nomedians-intake-qwen-2026-11-10.md`.
CLAUD unassigned per Commander.
