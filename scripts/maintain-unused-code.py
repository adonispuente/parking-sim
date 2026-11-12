#!/usr/bin/env python3
"""Recoverable unused-code cleanup for parking-sim (2026-11-08, QWEN).

Commands:
  backup   Copy every file about to change/delete into the recovery archive,
           with relative paths, plus before.sha256 of the whole set.
  verify   Re-check the archive: every entry present, sha256 matches the
           before fingerprint, archive is self-consistent.
  restore  Copy archived files back over the project (refuses to overwrite a
           file that differs from the archived version unless --force).

The archive lives OUTSIDE the project (parking-sim-archives) so the repo
stays clean; recovery is single-machine only.
"""
import argparse, hashlib, json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # project root
ARCHIVE = "/Users/adonispuente/Desktop/Developer/parking-sim-archives/2026-11-09-cleanup"

# Exact removal set, re-verified against the live tree on 2026-11-08.
# files = relative paths whose pre-change content is archived and which are
# DELETED from the project (images + strays).
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
# Edits: 10 src files, lines removed (1-based), exact expected content.
EDITS = {
    "src/traffic.js": {
        "remove_lines": [
            ("export const PAVEMENT = tracedFeatures.find(f=>/feeder road/i.test(f.label))?.points ?? [];", "PAVEMENT const (only reader was insidePavement)"),
            ("export function insidePavement([x,z]) { let inside=false; for(let i=0,j=PAVEMENT.length-1;i<PAVEMENT.length;j=i++){const [a,b]=PAVEMENT[i],[c,d]=PAVEMENT[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)inside=!inside;} return inside; }", "dead export (0 references)"),
        ],
        "replace_lines": [
            ("import { tracedFeatures, traceWorldPoint } from './tracedMap.js';", "import { traceWorldPoint } from './tracedMap.js';", "trim tracedFeatures (orphaned after PAVEMENT removal)"),
        ],
    },
    "src/shuttleRoutes.js": {
        "remove_lines": [
            ("export const internalShuttlePath=internalPath;", "alias of live internalPath; 0 references"),
        ],
    },
    "src/vectorRoutes.js": {
        "remove_lines": [
            ("export const VECTOR_REGISTRATION=Object.freeze({scaleX:1,scaleY:1,offsetX:0,offsetY:0});", "dead export"),
            ("export const SHUTTLE_ACCESS={home:{arrival:[SHUTTLE_HOME],departure:[SHUTTLE_HOME]},b:{arrival:[bEntrance],departure:[pointAt(62)]},c:{arrival:[cEntrance],departure:[pointAt(64)]}};", "dead export; orphans SHUTTLE_HOME import"),
        ],
        "replace_lines": [
            ("import { routeAt, pointAt, SHUTTLE_HOME } from './clearImageSource.js';", "import { routeAt, pointAt } from './clearImageSource.js';", "trim SHUTTLE_HOME (orphaned after SHUTTLE_ACCESS removal)"),
        ],
    },
    "src/vehicleRouteCatalog.js": {
        "remove_lines": [
            ("export const SEGMENT_STEP_PX=1;", "dead export"),
            ("export const LIVE_GUIDANCE_ENABLED=true;", "dead export (catalog literal uses its own true)"),
            ("export const routeAudit=()=>[];", "no-op stub; 0 references"),
        ],
    },
    "src/lotAControl.js": {
        "remove_lines": [
            ("export const A_DEPARTURE_BATCH_SIZE = LOT_A_MAIN_BATCH_SIZE;", "alias; 0 references (A_DEPARTURE_MERGE stays - live)"),
        ],
        "remove_blocks": [
            [  # 3-line block
                "export const LOT_A_APPROACH_LABELS = Object.freeze({",
                "  aNorth: 'North', aSouth: 'South', aMain: 'Main inbound',",
                "});",
            ],
        ],
    },
    "src/alphaQueueRelief.js": {
        "remove_lines": [
            ("export const ALPHA_RELIEF_DEFAULTS = Object.freeze({ enabled: true, high: 6, low: 2 });", "dead export (attach function defaults are hardcoded)"),
        ],
    },
    "src/clearImageSource.js": {
        "remove_lines": [
            ("export const CANONICAL_POSITIONS = Object.freeze({aMain:57,bEntrance:61,bExit:62,cEntrance:63,cExit:64});", "dead export"),
        ],
    },
    "src/parkingRoutes.js": {
        "remove_lines": [
            ("export const ZONE_SOURCE_INDICES=Object.freeze(ZONE_SOURCE);", "alias; 0 references (ZONE_SOURCE stays - used by staging/geometry)"),
        ],
    },
    "src/roadAnchoredRoutes.js": {
        "remove_lines": [
            ("export const roadAnchorSummary=()=>[...cache.values()].map(r=>({id:r.id,available:r.applied,reason:r.reason}));", "dead export (roadAnchoredRoute stays - live)"),
        ],
    },
    "src/positions/index.js": {
        "remove_lines": [
            ("export const POSITION_SOURCE = SOURCE_FILE;", "alias; 0 references"),
        ],
        "replace_lines": [
            ("import { pointAt, STAFF_POSITIONS, POSITION_ALIASES, SOURCE_FILE } from '../clearImageSource.js';", "import { pointAt, STAFF_POSITIONS, POSITION_ALIASES } from '../clearImageSource.js';", "trim SOURCE_FILE (orphaned after POSITION_SOURCE removal)"),
        ],
    },
}
ALL_FILES = sorted(set(list(DELETIONS) + list(EDITS)))


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def archive_dir(rel):
    return os.path.join(ARCHIVE, rel)


def cmd_backup(_args):
    os.makedirs(ARCHIVE, exist_ok=True)
    manifest = []
    for rel in ALL_FILES:
        src = os.path.join(ROOT, rel)
        if not os.path.exists(src):
            print(f"SKIP (already gone): {rel}")
            continue
        dst = archive_dir(rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.exists(dst):
            print(f"ABORT: {dst} exists; refusing to overwrite a previous archive entry (use a dated dir).")
            sys.exit(1)
        shutil.copy2(src, dst)
        manifest.append({"path": rel, "sha256": sha256(dst), "bytes": os.path.getsize(dst)})
    with open(os.path.join(ARCHIVE, "manifest.json"), "w") as fh:
        json.dump({"created": "2026-11-08", "root": ROOT, "entries": manifest}, fh, indent=2)
    print(f"backup complete: {len(manifest)} files -> {ARCHIVE}")
    for m in manifest:
        print(f"  {m['sha256'][:12]}  {m['path']}")


def load_manifest():
    with open(os.path.join(ARCHIVE, "manifest.json")) as fh:
        return json.load(fh)["entries"]


def cmd_verify(_args):
    issues = 0
    for m in load_manifest():
        dst = archive_dir(m["path"])
        if not os.path.exists(dst):
            print(f"FAIL missing: {m['path']}"); issues += 1; continue
        got = sha256(dst)
        if got != m["sha256"] or os.path.getsize(dst) != m["bytes"]:
            print(f"FAIL mismatch: {m['path']}"); issues += 1
        else:
            print(f"ok: {m['path']}")
    print(f"verify: {len(load_manifest())} entries, {issues} issue(s)")
    sys.exit(1 if issues else 0)


def cmd_restore(args):
    for m in load_manifest():
        dst = archive_dir(m["path"])
        src = os.path.join(ROOT, m["path"])
        if os.path.exists(src) and sha256(src) != m["sha256"] and not args.force:
            print(f"SKIP (differs, use --force): {m['path']}"); continue
        os.makedirs(os.path.dirname(src), exist_ok=True)
        shutil.copy2(dst, src)
        print(f"restored: {m['path']}")
    print("restore complete")


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("backup")
    sub.add_parser("verify")
    rp = sub.add_parser("restore")
    rp.add_argument("--force", action="store_true")
    a = p.parse_args()
    {"backup": cmd_backup, "verify": cmd_verify, "restore": cmd_restore}[a.cmd](a)


if __name__ == "__main__":
    main()
