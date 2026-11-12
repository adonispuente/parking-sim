#!/usr/bin/env python3
"""Apply the unused-code removal edits. Exact-match, all-or-nothing: verifies
every expected line/block exists before writing anything; if any expectation
fails, it changes nothing and exits 1."""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # project root

EDITS = {
    "src/traffic.js": {
        "remove": [
            "export const PAVEMENT = tracedFeatures.find(f=>/feeder road/i.test(f.label))?.points ?? [];",
            "export function insidePavement([x,z]) { let inside=false; for(let i=0,j=PAVEMENT.length-1;i<PAVEMENT.length;j=i++){const [a,b]=PAVEMENT[i],[c,d]=PAVEMENT[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)inside=!inside;} return inside; }",
        ],
        "replace": [
            ("import { tracedFeatures, traceWorldPoint } from './tracedMap.js';",
             "import { traceWorldPoint } from './tracedMap.js';"),
        ],
    },
    "src/shuttleRoutes.js": {
        "remove": [
            "export const internalShuttlePath=internalPath;",
        ],
    },
    "src/vectorRoutes.js": {
        "remove": [
            "export const VECTOR_REGISTRATION=Object.freeze({scaleX:1,scaleY:1,offsetX:0,offsetY:0});",
            "export const SHUTTLE_ACCESS={home:{arrival:[SHUTTLE_HOME],departure:[SHUTTLE_HOME]},b:{arrival:[bEntrance],departure:[pointAt(62)]},c:{arrival:[cEntrance],departure:[pointAt(64)]}};",
        ],
        "replace": [
            ("import { routeAt, pointAt, SHUTTLE_HOME } from './clearImageSource.js';",
             "import { routeAt, pointAt } from './clearImageSource.js';"),
        ],
    },
    "src/vehicleRouteCatalog.js": {
        "remove": [
            "export const SEGMENT_STEP_PX=1;",
            "export const LIVE_GUIDANCE_ENABLED=true;",
            "export const routeAudit=()=>[];",
        ],
    },
    "src/lotAControl.js": {
        "remove": [
            "export const A_DEPARTURE_BATCH_SIZE = LOT_A_MAIN_BATCH_SIZE;",
            "export const LOT_A_APPROACH_LABELS = Object.freeze({",
            "  aNorth: 'North', aSouth: 'South', aMain: 'Main inbound',",
            "});",
        ],
    },
    "src/alphaQueueRelief.js": {
        "remove": [
            "export const ALPHA_RELIEF_DEFAULTS = Object.freeze({ enabled: true, high: 6, low: 2 });",
        ],
    },
    "src/clearImageSource.js": {
        "remove": [
            "export const CANONICAL_POSITIONS = Object.freeze({aMain:57,bEntrance:61,bExit:62,cEntrance:63,cExit:64});",
        ],
    },
    "src/parkingRoutes.js": {
        "remove": [
            "export const ZONE_SOURCE_INDICES=Object.freeze(ZONE_SOURCE);",
        ],
    },
    "src/roadAnchoredRoutes.js": {
        "remove": [
            "export const roadAnchorSummary=()=>[...cache.values()].map(r=>({id:r.id,available:r.applied,reason:r.reason}));",
        ],
    },
    "src/positions/index.js": {
        "remove": [
            "export const POSITION_SOURCE = SOURCE_FILE;",
        ],
        "replace": [
            ("import { pointAt, STAFF_POSITIONS, POSITION_ALIASES, SOURCE_FILE } from '../clearImageSource.js';",
             "import { pointAt, STAFF_POSITIONS, POSITION_ALIASES } from '../clearImageSource.js';"),
        ],
    },
}
DELETIONS = [
    "images/Clear Image.json",
    "images/HopeCityLayout.json",
    "images/HopeCityLayout.png",
    "images/HopeCityLayoutCUpdated.json",
    "images/HopeCityLayoutFirstHalfincluded.json",
    "images/HopeCityLayoutVectors.json",
    "images/Lot A revision.json",
    "images/Vehicle Routes.json",
    ".cgap2.mjs",
    "PLAN.md",
]

def main():
    plan = {}   # rel -> new full text
    for rel, spec in EDITS.items():
        path = os.path.join(ROOT, rel)
        with open(path) as fh:
            text = fh.read()
        lines = text.splitlines(keepends=True)
        removes = [l.rstrip("\n") for l in spec.get("remove", [])]
        replaces = spec.get("replace", [])
        # Expectation checks (nothing written yet).
        for want in removes:
            if sum(1 for ln in lines if ln.rstrip("\n") == want) != 1:
                print(f"ABORT {rel}: expected exactly 1 of: {want[:60]!r} (got {sum(1 for ln in lines if ln.rstrip(chr(10)) == want)})")
                sys.exit(1)
        for old, new in replaces:
            if text.count(old) != 1:
                print(f"ABORT {rel}: expected exactly 1 of: {old[:60]!r} (got {text.count(old)})")
                sys.exit(1)
        out = []
        for ln in lines:
            stripped = ln.rstrip("\n")
            if any(stripped == r for r in removes):
                continue
            nl = ln if stripped.endswith("\n") else ""
            for old, new in replaces:
                if old in ln:
                    ln = ln.replace(old, new)
                    break
            out.append(ln + nl if nl or ln else ln)
        plan[rel] = "".join(out)
    # Deletions: confirm every file still exists.
    for rel in DELETIONS:
        if not os.path.exists(os.path.join(ROOT, rel)):
            print(f"ABORT: deletion target missing: {rel}")
            sys.exit(1)
    # All expectations held - write edits.
    for rel, text in plan.items():
        with open(os.path.join(ROOT, rel), "w") as fh:
            fh.write(text)
        print(f"edited: {rel}")
    print("ALL EDITS APPLIED (deletions handled by the caller after this check)")
    with open(os.path.join(ROOT, "research/runs/qwen-cleanup-1109/edit-plan-applied.json"), "w") as fh:
        json.dump({"edited": sorted(plan), "deleted": DELETIONS}, fh, indent=2)

if __name__ == "__main__":
    main()
