# Independent aSouth review plan — 2026-11-07
Goal: independently verify the saved aSouth revision and decide latent-fix/TODO disposition, without accepting eleven west2->3.
Read: owner report/75-entry manifest, actual lotAControl/sharedTraffic, changed tests, runner/package, checkpoint.
1. Verify manifest; fingerprint source/tests/runner/maps. CLAUD analyzes separate Feeder work during source freeze.
2. Run post-change focused/full/build/all three services; compare exact28 failure names and traffic except wallMs.
3. Save and run independent research-only tests calling public production advanceSharedTraffic on production-built lanes, both held directions, with old-stop negative controls; no copied conflict algorithm.
4. Remove the full-lane TODO only if its stated geometric assertion reproducibly passes; record that this is not latent integrated-traffic proof.
5. Recheck identity; save evidence/report/checkpoint/history, publish handback and release source.
Risks: narrow sampled0.956/0.979 margins vs0.9; copied chord tests drift; pair checks are sampled, not continuous physics. Keep aSouth provisional pending parked Corporate integration. Existing28failures and eleven west gate stay failed.
Out of scope: no SPARTAN Feeder/Equity/Corporate implementation, no combined rejected candidates/global conflict change, no server.
Commands: shasum -a256 -c owner after manifest; node --test Lot A files; npm test; npm run build; node research/spartan-continuation-traffic.mjs enabled; node --test independent production review; before/after hashes.
