import fs from 'node:fs';
import crypto from 'node:crypto';
const read = name => fs.readFileSync('research/' + name, 'utf8');
const lines = name => read(name).trim().split('\n').filter(Boolean);
const traffic = name => lines(name).map(JSON.parse);
const clean = row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'wallMs'));
const failures = name => [...new Set(lines(name).filter(s => s.startsWith('✖ ') && !s.startsWith('✖ failing tests:')).map(s => s.slice(2).replace(/ \([0-9.]+ms\)$/, '')))].sort();
const summary = name => Object.fromEntries(['tests','pass','fail','todo'].map(key => [key, Number(read(name).match(new RegExp('ℹ ' + key + ' ([0-9]+)'))?.[1])]));
const manifests = {};
for (const name of ['claudy-feeder-middle-after.sha256','claudy-equity-exit2-before.sha256','spartan-feeder-f1-inputs-before.sha256']) {
  const rows = lines(name).map(s => {
    const [,hash,path] = s.match(/^([a-f0-9]{64})  (.+)$/);
    return {path, ok: crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex') === hash};
  });
  manifests[name] = {entries:rows.length, mismatches:rows.filter(r => !r.ok)};
}
const fail = failures('spartan-feeder-f1-suite.log');
const comparisons = {};
for (const name of ['claudy-feeder-middle-npm.log','spartan-asouth-final-suite.log']) {
  const other = failures(name);
  comparisons[name] = {added:fail.filter(s => !other.includes(s)), removed:other.filter(s => !fail.includes(s))};
}
const own = traffic('spartan-feeder-f1-traffic.jsonl');
const owner = traffic('claudy-feeder-middle-traffic.jsonl');
const before = traffic('spartan-asouth-traffic.jsonl');
const all = JSON.parse(read('spartan-feeder-f1-eleven-all-stalls.json'));
const byId = new Map(all.stalled.map(c => [c.id,c]));
const terminals = {}; let missing = 0, cycles = 0;
for (const car of all.stalled) {
  let cur = car; const seen = new Set();
  while (cur.to != null) {
    if (seen.has(cur.id)) {cycles++; break;}
    seen.add(cur.id);
    const next = byId.get(cur.to);
    if (!next) {missing++; break;}
    cur = next;
  }
  terminals[cur.id] = (terminals[cur.id] ?? 0) + 1;
}
const metrics = r => ({entered:r.entered, stalled:r.stalledCount, west:r.westStalls, shuttleTrips:r.busTrips.reduce((a,b) => a+b,0), departed:r.departed});
const result = {manifests,
  tests:Object.fromEntries(['focused','targeted','suite'].map(k => [k,summary('spartan-feeder-f1-'+k+'.log')])),
  failureNames:{count:fail.length, names:fail, comparisons},
  traffic:own.map(r => ({scenario:r.scenario,demand:r.demand,...metrics(r),
    previous:metrics(before.find(b => b.scenario === r.scenario)),
    matchesOwnerExceptWallMs:JSON.stringify(clean(r)) === JSON.stringify(clean(owner.find(b => b.scenario === r.scenario))),
    issues:r.issues,relief:r.relief})),
  allStalls:{total:all.stalledCount,terminals,missing,cycles,
    matchesOwnerEntireDocument:JSON.stringify(all) === JSON.stringify(JSON.parse(read('claudy-feeder-middle-eleven-all-stalls.json'))),
    bWestDeparturesOnFeeder:all.stalled.filter(c => c.phase === 'departing' && c.route.startsWith('Departure · bWest · ') && c.px[0] < 55).map(c => c.id)}};
fs.writeFileSync('research/spartan-feeder-f1-audit.json', JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if (Object.values(manifests).some(m => m.mismatches.length) || result.traffic.some(r => !r.matchesOwnerExceptWallMs)) process.exitCode=1;
