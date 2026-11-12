#!/usr/bin/env python3
"""Manifest-first, recoverable research cleanup. Run from any working directory."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
META = ROOT / 'research' / 'cleanup'
BUNDLE = ROOT.parent / 'parking-sim-archives' / '2026-11-07-repo-cleanup'
MANIFEST = META / 'manifest.json'
ACTIVE_PREFIXES = (
    'spartan-feeder-f1-', 'spartan-asouth-', 'claudy-asouth-',
    'claudy-feeder-', 'claudy-equity-', 'claudy-corporate-',
    'claudy-corp-on-f1-', 'claudy-shuttle-delay-', 'claudy-departure-timing-',
    'claudy-eleven-all-stalls',
)
ACTIVE_DIRS = (
    'claudy-backup-asouth', 'claudy-backup-feeder-middle',
    'claudy-backup-equity-exit2', 'claudy-backup-corporate-occupant',
    'claudy-backup-relief-reach', 'claudy-corporate-occupant-parked',
    'claudy-equity-exit2-parked', 'claudy-relief-reach-parked',
    'building-references',
)
EXPLICIT = {
    'PROGRESS-CHECKPOINT.md', 'progress-history.md', 'CLEANUP.md',
    'spartan-continuation-traffic.mjs', 'claudy-corporate-cycle-timeline-probe.mjs',
    'spartan-continuation-map-diff.json', 'spartan-continuation-plan-2026-11-06.md',
    'spartan-remaining-requirements-ledger-2026-11-07.md',
    'spartan-claudy-handback-2026-11-06.md',
    'claudy-main-hold-back-report-2026-11-06.md',
    'claudy-main-hold-back-after.sha256', 'claudy-main-hold-back-before.sha256',
    'claudy-relief-reach-report-2026-11-06.md', 'claudy-relief-reach-plan-2026-11-06.md',
    'claudy-relief-reach-before.sha256',
}


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def record(path):
    relative = path.relative_to(ROOT).as_posix()
    if path.is_symlink():
        return {'path': relative, 'type': 'symlink', 'target': os.readlink(path)}
    return {'path': relative, 'type': 'file', 'bytes': path.stat().st_size,
            'sha256': digest(path)}


def walk(folder):
    for base, dirs, files in os.walk(folder, followlinks=False):
        for name in sorted(dirs[:]):
            path = Path(base) / name
            if path.is_symlink():
                yield path
                dirs.remove(name)
        for name in sorted(files):
            yield Path(base) / name


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n')


def protected():
    paths = []
    for name in ('src', 'tests', 'images', 'scripts'):
        paths.extend(walk(ROOT / name))
    paths.extend(ROOT / name for name in ('package.json', 'package-lock.json',
                                          'index.html', 'PLAN.md', 'LICENSE'))
    return [record(p) for p in sorted(paths)]


def plan():
    if MANIFEST.exists():
        raise SystemExit('Manifest exists; inspect it rather than overwrite it.')
    all_paths = [p for p in walk(ROOT / 'research') if META not in p.parents]
    keep = set()
    by_name = {}
    for path in all_paths:
        by_name.setdefault(path.name, []).append(path)
        rel = path.relative_to(ROOT / 'research')
        top = rel.parts[0]
        if (top in ACTIVE_DIRS or top in EXPLICIT or top.startswith(ACTIVE_PREFIXES)
                or (top == 'scans' and '.venv' not in rel.parts)
                or (len(rel.parts) == 1 and path.suffix == '.json'
                    and not top.startswith(('claudy-', 'spartan-', 'eleven-', 'clear-image-', 'v3-')))):
            keep.add(path)
    # Preserve exact known research filenames cited by production code/tests and
    # the static dependency closure of retained scripts. No glob expansion of
    # historical prose: that would retain the entire stacked history.
    inputs = list(walk(ROOT / 'src')) + list(walk(ROOT / 'tests'))
    pending = inputs + [p for p in keep if p.suffix in ('.mjs', '.js', '.py')]
    visited = set()
    while pending:
        path = pending.pop()
        if path in visited or path.is_symlink():
            continue
        visited.add(path)
        text = path.read_text(errors='replace')
        for name, candidates in by_name.items():
            if name not in text:
                continue
            for candidate in candidates:
                # Ambiguous basenames in venv/backups are not root references.
                if candidate.parent != ROOT / 'research':
                    continue
                if candidate not in keep:
                    keep.add(candidate)
                    if candidate.suffix in ('.mjs', '.js', '.py'):
                        pending.append(candidate)
    archived = [record(p) for p in all_paths if p not in keep]
    # Checkpoint is snapshotted but retained until explicitly shortened.
    checkpoint = record(ROOT / 'research' / 'PROGRESS-CHECKPOINT.md')
    data = {'version': 1, 'root': str(ROOT), 'bundle': str(BUNDLE),
            'archive': str(BUNDLE / 'research-history.tar.gz'),
            'researchFilesBefore': len(all_paths),
            'researchTopLevelBefore': len(list((ROOT / 'research').iterdir())),
            'remove': archived, 'snapshotOnly': [checkpoint],
            'keep': sorted(p.relative_to(ROOT).as_posix() for p in keep),
            'protected': protected(), 'state': 'planned'}
    write_json(MANIFEST, data)
    print(json.dumps({'plannedArchiveFiles': len(archived),
                      'archiveInputBytes': sum(r.get('bytes', 0) for r in archived),
                      'keepFiles': len(keep), 'bundle': str(BUNDLE)}, indent=2))


def archive_checks(data):
    issues = []
    expected = {r['path']: r for r in data['remove'] + data['snapshotOnly']}
    with tarfile.open(data['archive'], 'r:gz') as tar:
        members = tar.getmembers()
        if {m.name for m in members} != set(expected) or len(members) != len(expected):
            issues.append('Archive inventory differs from manifest')
        for member in members:
            row = expected.get(member.name)
            if row is None:
                continue
            if row['type'] == 'symlink':
                if not member.issym() or member.linkname != row['target']:
                    issues.append(member.name + ': symlink mismatch')
            elif not member.isfile():
                issues.append(member.name + ': expected regular file')
            else:
                with tar.extractfile(member) as stream:
                    h = hashlib.sha256()
                    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                        h.update(chunk)
                if h.hexdigest() != row['sha256'] or member.size != row['bytes']:
                    issues.append(member.name + ': content mismatch')
    return issues


def apply():
    data = json.loads(MANIFEST.read_text())
    if data['state'] != 'planned' or BUNDLE.exists():
        raise SystemExit('Not a fresh planned cleanup; inspect state before continuing.')
    # Refuse to act on moving files or concurrent simulation edits.
    for row in data['remove'] + data['snapshotOnly'] + data['protected']:
        if record(ROOT / row['path']) != row:
            raise SystemExit('Changed since inventory: ' + row['path'])
    BUNDLE.mkdir(parents=True)
    with tarfile.open(data['archive'], 'w:gz', compresslevel=6, dereference=False) as tar:
        for row in data['remove'] + data['snapshotOnly']:
            tar.add(ROOT / row['path'], arcname=row['path'], recursive=False)
    issues = archive_checks(data)
    if issues:
        raise SystemExit(json.dumps(issues))
    data['archiveSha256'] = digest(Path(data['archive']))
    data['archiveBytes'] = Path(data['archive']).stat().st_size
    data['state'] = 'archived-verified-before-removal'
    write_json(MANIFEST, data)
    write_json(BUNDLE / 'manifest.json', data)
    for row in data['remove']:
        path = ROOT / row['path']
        if record(path) != row:
            raise SystemExit('Concurrent edit: refusing to remove ' + row['path'])
        path.unlink()
    for base, dirs, files in os.walk(ROOT / 'research', topdown=False):
        path = Path(base)
        if path != ROOT / 'research' and not any(path.iterdir()):
            path.rmdir()
    data['state'] = 'applied'
    write_json(MANIFEST, data)
    write_json(BUNDLE / 'manifest.json', data)
    print(json.dumps({'removedFiles': len(data['remove']),
                      'archiveBytes': data['archiveBytes'],
                      'archiveSha256': data['archiveSha256']}, indent=2))


def verify():
    data = json.loads(MANIFEST.read_text())
    issues = archive_checks(data)
    if digest(Path(data['archive'])) != data['archiveSha256']:
        issues.append('Archive SHA-256 changed')
    for row in data['protected']:
        path = ROOT / row['path']
        if not path.exists() or record(path) != row:
            issues.append('Protected file missing/changed: ' + row['path'])
    for name in data['keep']:
        if not (ROOT / name).exists():
            issues.append('Retained path missing: ' + name)
    for row in data['remove']:
        path = ROOT / row['path']
        if path.exists() or path.is_symlink():
            issues.append('Archived original still present: ' + row['path'])
    result = {'issues': issues, 'archivedEntries': len(data['remove']),
              'archiveInputBytes': sum(r.get('bytes', 0) for r in data['remove']),
              'protectedFilesUnchanged': len(data['protected']),
              'researchTopLevelBefore': data['researchTopLevelBefore'],
              'researchTopLevelAfter': len(list((ROOT / 'research').iterdir())),
              'archiveSha256': data['archiveSha256'],
              'archiveBytes': data['archiveBytes'], 'state': data['state']}
    write_json(META / 'verification.json', result)
    print(json.dumps(result, indent=2))
    if issues:
        raise SystemExit(1)


def restore(names):
    data = json.loads(MANIFEST.read_text())
    if archive_checks(data) or digest(Path(data['archive'])) != data['archiveSha256']:
        raise SystemExit('Archive verification failed; nothing restored.')
    allowed = {r['path'] for r in data['remove'] + data['snapshotOnly']}
    if not names or not set(names).issubset(allowed):
        raise SystemExit('Specify exact original paths present in manifest.')
    with tarfile.open(data['archive'], 'r:gz') as tar:
        for name in names:
            dest = ROOT / name
            if dest.exists() or dest.is_symlink():
                raise SystemExit('Refusing to overwrite: ' + name)
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.parent.resolve().is_relative_to(ROOT):
                raise SystemExit('Unsafe destination parent: ' + name)
            member = tar.getmember(name)
            if member.issym():
                dest.symlink_to(member.linkname)
            else:
                with tar.extractfile(member) as source, dest.open('xb') as target:
                    for chunk in iter(lambda: source.read(1024 * 1024), b''):
                        target.write(chunk)
                dest.chmod(member.mode)
            print('Restored ' + name)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('plan', 'apply', 'verify', 'restore'))
    parser.add_argument('paths', nargs='*')
    args = parser.parse_args()
    if args.action == 'restore':
        restore(args.paths)
    else:
        globals()[args.action]()
