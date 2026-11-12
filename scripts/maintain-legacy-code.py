#!/usr/bin/env python3
"""Recoverable retirement of the obsolete hand-drawn campus modules (2026-11-08).

This is a fixed, reviewed inventory, not a general dead-code deletion tool.
Run from any directory: plan, apply, verify, or restore <exact paths>.
Use restore --destination <empty-folder> for isolated recovery checks.
"""
import argparse
import hashlib
import json
import re
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
META = ROOT / 'research' / 'legacy-code-cleanup'
MANIFEST = META / 'manifest.json'
BUNDLE = ROOT.parent / 'parking-sim-archives' / '2026-11-08-legacy-code'
CANDIDATES = (
    'src/campus.js', 'src/eastCampus.js', 'src/lotA.js', 'src/lotAParking.js',
    'tests/campus.test.js', 'tests/lot-a.test.js',
    'tests/lot-a-parking.test.js', 'tests/lot-a-envelope.test.js',
)
IMPORT = re.compile(
    r'''(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?['"]([^'"]+)['"]'''
    r'''|import\(\s*['"]([^'"]+)['"]\s*\)'''
)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def record(path):
    if path.is_symlink() or not path.is_file():
        raise SystemExit('Expected regular file, not symlink: ' + str(path))
    return {'path': path.relative_to(ROOT).as_posix(),
            'bytes': path.stat().st_size, 'sha256': sha(path)}


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n')


def dependency_issues():
    """Reject surviving relative JS imports into the fixed retirement set."""
    retired = {(ROOT / name).resolve() for name in CANDIDATES}
    issues = []
    for folder in ('src', 'tests', 'scripts'):
        for path in sorted((ROOT / folder).rglob('*')):
            if path.suffix not in ('.js', '.jsx', '.mjs') or path.resolve() in retired:
                continue
            for match in IMPORT.finditer(path.read_text()):
                specifier = match.group(1) or match.group(2)
                if not specifier.startswith('.'):
                    continue
                base = path.parent / specifier
                choices = (base, Path(str(base) + '.js'), Path(str(base) + '.jsx'), base / 'index.js')
                if any(choice.resolve() in retired for choice in choices):
                    issues.append(f'{path.relative_to(ROOT)} imports retired {specifier}')
    return issues


def protected_records():
    paths = [p for folder in ('src', 'tests', 'images', 'scripts')
             for p in (ROOT / folder).rglob('*') if p.is_file()]
    paths += [ROOT / name for name in ('package.json', 'package-lock.json', 'index.html')]
    return [record(p) for p in sorted(paths) if p.relative_to(ROOT).as_posix() not in CANDIDATES]


def plan():
    if MANIFEST.exists() or BUNDLE.exists():
        raise SystemExit('Existing cleanup state; refusing to overwrite.')
    issues = dependency_issues()
    if issues:
        raise SystemExit('\n'.join(issues))
    data = {'version': 1, 'root': str(ROOT), 'state': 'planned',
            'archive': str(BUNDLE / 'legacy-code.tar.gz'),
            'reason': 'Retired pre-traced-map hand-drawn layout modules and exclusive tests; not traffic fixes.',
            'remove': [record(ROOT / name) for name in CANDIDATES],
            'protectedAtPlan': protected_records()}
    save(MANIFEST, data)
    print(json.dumps({'state': data['state'], 'files': len(data['remove']),
                      'bytes': sum(row['bytes'] for row in data['remove']),
                      'protected': len(data['protectedAtPlan'])}, indent=2))


def archive_issues(data):
    expected = {row['path']: row for row in data['remove']}
    issues = []
    with tarfile.open(data['archive'], 'r:gz') as archive:
        members = archive.getmembers()
        if len(members) != len(expected) or {m.name for m in members} != set(expected):
            issues.append('Archive inventory mismatch')
        for member in members:
            row = expected.get(member.name)
            if row is None or not member.isfile():
                issues.append('Unexpected/nonregular member: ' + member.name)
                continue
            with archive.extractfile(member) as stream:
                digest = hashlib.sha256(stream.read()).hexdigest()
            if digest != row['sha256'] or member.size != row['bytes']:
                issues.append('Member content mismatch: ' + member.name)
    if data.get('archiveSha256') and sha(Path(data['archive'])) != data['archiveSha256']:
        issues.append('Whole archive checksum mismatch')
    return issues


def apply():
    data = json.loads(MANIFEST.read_text())
    if data['state'] != 'planned' or BUNDLE.exists():
        raise SystemExit('Not a fresh plan; inspect state before continuing.')
    if dependency_issues():
        raise SystemExit('New dependency on retired files; refusing cleanup.')
    for row in data['remove'] + data['protectedAtPlan']:
        if record(ROOT / row['path']) != row:
            raise SystemExit('Concurrent edit since plan: ' + row['path'])
    BUNDLE.mkdir(parents=True)
    with tarfile.open(data['archive'], 'w:gz', dereference=False) as archive:
        for row in data['remove']:
            archive.add(ROOT / row['path'], arcname=row['path'], recursive=False)
    issues = archive_issues(data)
    if issues:
        raise SystemExit('\n'.join(issues))
    data['archiveSha256'] = sha(Path(data['archive']))
    data['state'] = 'archive-verified-before-removal'
    save(MANIFEST, data)
    save(BUNDLE / 'manifest.json', data)
    for row in data['remove']:
        path = ROOT / row['path']
        if record(path) != row:
            raise SystemExit('Concurrent edit before removal: ' + row['path'])
        path.unlink()
    data['state'] = 'applied'
    save(MANIFEST, data)
    save(BUNDLE / 'manifest.json', data)
    print(json.dumps({'state': data['state'], 'removed': len(data['remove']),
                      'archiveSha256': data['archiveSha256']}, indent=2))


def verify():
    data = json.loads(MANIFEST.read_text())
    issues = archive_issues(data) + dependency_issues()
    for row in data['remove']:
        if (ROOT / row['path']).exists():
            issues.append('Retired original present: ' + row['path'])
    # Later intentional owner edits are reported, not silently called corruption.
    changed = [row['path'] for row in data['protectedAtPlan']
               if not (ROOT / row['path']).is_file() or record(ROOT / row['path']) != row]
    result = {'state': data['state'], 'archiveIssues': issues,
              'archivedFiles': len(data['remove']),
              'protectedAtPlan': len(data['protectedAtPlan']),
              'survivorsChangedSincePlan': changed,
              'archive': data['archive'], 'archiveSha256': data['archiveSha256']}
    save(META / 'verification.json', result)
    print(json.dumps(result, indent=2))
    if issues:
        raise SystemExit(1)


def restore(names, destination):
    data = json.loads(MANIFEST.read_text())
    issues = archive_issues(data)
    if issues:
        raise SystemExit('\n'.join(issues))
    allowed = {row['path']: row for row in data['remove']}
    if not names or not set(names).issubset(allowed):
        raise SystemExit('Supply exact original paths from the manifest.')
    target = Path(destination).resolve() if destination else ROOT
    # Preflight every destination, so refusal never causes partial restoration.
    for name in names:
        path = target / name
        if path.exists() or path.is_symlink() or not path.resolve().is_relative_to(target):
            raise SystemExit('Refusing overwrite/unsafe destination: ' + str(path))
    with tarfile.open(data['archive'], 'r:gz') as archive:
        for name in names:
            path = target / name
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.parent.resolve().is_relative_to(target):
                raise SystemExit('Unsafe parent: ' + str(path))
            with archive.extractfile(name) as source, path.open('xb') as out:
                out.write(source.read())
            if sha(path) != allowed[name]['sha256']:
                raise SystemExit('Restore checksum mismatch: ' + name)
            print('Restored and checksum verified: ' + str(path))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('plan', 'apply', 'verify', 'restore'))
    parser.add_argument('paths', nargs='*')
    parser.add_argument('--destination')
    args = parser.parse_args()
    if args.action == 'restore':
        restore(args.paths, args.destination)
    else:
        globals()[args.action]()
