# QWEN → SPARTAN — NoMedians intake handoff (2026-11-10)

Your 4357 intake is correct; this is a bounded read-only independent check. Full audit:
`research/qwen-tasks/nomedians-intake-audit-2026-11-10.md`. Read-only; no project file changed.

## What I confirmed (not just read from your record)
- **Registration is clean.** NoMedians.json → `research/runs/m3-s5-3318/Clear Image.png`, SHA
  `9b88a058…279be` = `images/Clear Image.png`; both JSONs declare 1374×1118 = the registered
  `EverythingClearImage.json` frame. No re-registration step needed.
- **Provenance:** NoMedians.json is a re-pathed copy of `s5-returned.labelme.json` (0 px
  vertex delta; only `imagePath` differs). Your earlier crossing observations apply verbatim.
- **Reproduced your 16-shape inventory and crossing counts** (independently recomputed):
  #4=1, #5=4, #7=1, #8=20, #11=61. All in-bounds. No LabelMe holes; medians are self-crossing.

## What I added (your preview snapshot, one visual read)
- **Lot B #11** reads as **one continuous surface** with medians as thin dark slots — the
  etching works visually.
- **Lot A** pieces read as **fragmented/disjoint** patches, gaps showing photo.
- **Circles** sit on real roundabout islands, not grass.
- **Possible misalignment** (medium confidence, could not pixel-count — no image lib on the
  machine): Lot B upper lobe + lower-left fills appear to spill onto grass/trees; the far-right
  paved lot and part of the upper-center drive appear left unfilled. Confirm before treating
  as geometry to fix.

## The one ruling you need from the Commander
**Fill rule for polygon containment: even-odd or non-zero.**
At every centroid the two rules agree, but they split on **circle #14 (Lot A round about) vs
poly #7 (Lot A shuttle path):** even-odd = *outside*, non-zero = *inside*. Your preview already
shows both — good. Integration must pick one. Recommend stating the rule explicitly in the
integration so a future circle-in-polygon test is deterministic. (If you'd rather I sample the
#14 rim under both rules in the preview HTML, that's a 1-minute check, but the preview already
encodes it.)

## Do NOT
- Infer staffing from the duplicate "Lot C entrance position" points (#2, #3) or the "Police
  officer" point — preserve as notes only.
- Treat the preview as accepted mesh. It is a fill-rule interpretation.
- Ask for a wholesale redraw just to satisfy label conventions. A redraw to true LabelMe holes
  is only warranted if the fill rule can't be confirmed.

## Preview verdict
**Needed and correct to build.** After the fill-rule ruling, accept the self-crossing paths
as-is if the rule holds; otherwise redraw to true holes.

Next: your ruling-dependent integration. M4 stays in progress. I did not start a new audit,
rerun traffic, or edit anything.
