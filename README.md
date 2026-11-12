# Parking Sim

A browser-based campus parking and shuttle simulator built with React, Three.js, and Vite. It models arrivals, parking, service dismissals, departures, volunteer traffic control, and shuttle circulation across Lots A, B, and C. Top and 3D views share the same simulation.

## Run locally

Use Node.js 22.12 or newer and npm. From the project directory:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). `npm run build` creates `dist/`; `npm run preview` serves that build. The app runs locally in the browser, without an API server or database. Layout edits persist in browser local storage on the current device.

## Using the simulator

The page opens on the 11:00 service. Choose the service time, playback speed (up to 40×), and initial parked counts above the map, then press **Start**. **Reset** sits beside Start and keeps the selected inputs. The same controls appear first on mobile. Satellite overlay, Routes, and Lot fullness toggles sit at the top too; enabling the satellite overlay switches to Top view. Routes shows or hides both route lines and parking hubs together. Lot fullness independently toggles occupancy shading. Flow explanations and advanced settings are in the expandable section below the map. The dashboard shows arrivals, occupied and reserved parking, departures, and shuttle status. Change lot availability and section preferences to explore routing. Playback supports speed changes and seeking; Top/3D, labels, occupancy, photo, and Routes controls help inspect the map. Routes also shows source geometry and provisional joins; the Route sources panel reports what the engine actually uses.

Sunday presets cover 9:00, 11:00, and 1:15 services. Service timing, demand, arrival sources, dismissal readiness, and carry into the next service are defined in `src/sundayServices.js` and `src/serviceCarry.js`. Random-looking choices are deterministic so playback can reconstruct a run.

## Parking hubs and capacity

Cars reserve a section space when assigned, follow an arrival route to a hub, become parked there, and later depart from that same hub. Hubs represent groups of parked cars, rather than individual stalls or extra capacity. Hub markers display parked counts. Arrivals balance parked cars and inbound reservations across the hubs in their assigned section.

| Lot / section | Capacity | Parking anchors |
| --- | ---: | --- |
| A North | 210 | ABHubs shapes 73, 74, 75 |
| A South | 150 | ABHubs shapes 71, 72, 76 |
| A black permit | 51 | Separate section staging point; no drawn hub |
| B South | 75 | ABHubs shape 67 |
| B Banana | 100 | ABHubs shapes 65, 66 |
| B Pocket | 8 | ABHubs shape 68 |
| B North | 304 | ABHubs shapes 60–64, 69 |
| C first half / remainder | 686 total | LotCHubs shapes 51–57; allocations in `parkingZones.js` |

A has 360 general spaces plus 51 black permit spaces; B has 487; C has 686. Sections remain the authority for capacity and fill order. C balances north/south within its first half before opening the remainder.

A/B anchors are bound in `src/abHubSource.js`. A North hub arrivals and A hub exits use a graph of drawn aisles with estimated short joins and lane offsets in `src/abHubRoutes.js`. B hub departures merge into the existing forward shuttle circulation (`EverythingClearImage` route 25), using a short derived closure through the B entrance-side aisle when another lap is necessary to reach the selected exit. B arrivals retain their established forward circulation through B South and branch locally to the selected hub. The B South hub parks arrivals on their first South pass; later sections continue through the existing South checkpoint. Hub spurs project onto aisle segments so cars do not overshoot and reverse. A South arrivals branch from the established split aisle to their hub. A general traffic still crosses Main. Hub departures follow the drawn exit direction and join the established Main approaches; each A section limits its active hub departures to keep the waiting queue clear of the upper arrival aisle. By default, B North splits evenly between its three northern/eastern hubs (north exit) and three western hubs (west exit), B South uses the north exit, Banana uses west, and Pocket uses north. Explicit scenario exit overrides and northern radio diversions remain available; South keeps its north exit during automatic radio diversions; C defaults to a deterministic split between its two exits. A permits two active hub departures per section, B permits two per section, and C permits two per hub while cars remain in its interior. Waiting cars stay parked until their approach has room.

A/B cars retain `abHubId`; C cars retain `cHubId`. IDs survive parking, departure, service carry, and old-checkpoint upgrades. `abHubOccupancy` and `cHubOccupancy` are parked counts, distinct from section reservations. `playbackFrames.js` captures these counts for presentation during seeking.

## How the code fits together

| Area | Entry points / responsibility |
| --- | --- |
| UI | `src/main.jsx`, `SundayControls.jsx`, `RouteSourcesPanel.jsx`, `styles.css` |
| Map and rendering | `src/Scene.jsx`; `presentation*`, `buildingModels.js`, `worldActors.js` |
| Traffic construction | `src/traffic.js`: `createCampusTraffic(options)`, built lane geometry and street lane offsets |
| Vehicle lifecycle | `src/campusSimulation.js`: assignment, reservation, parking, redirects, departure, controller updates |
| Parking rules | `src/parkingZones.js`, `trafficPolicy.js`, `parkingRoutes.js` |
| Hub geometry | `src/abHubSource.js`, `abHubRoutes.js`, `cHubSource.js`, `cHubRoutes.js` |
| Movement and clearance | `src/sharedTraffic.js`, `vehicleInteractions.js`, `lanePath.js`, `trafficPriority.js` |
| Roads and connectors | `src/sourceRouting.js`, `pavementRouting.js`, `vectorRoutes.js`, `corporateLanes.js` |
| Volunteer controls | `src/lotAControl.js`, `feederOfficer.js`, `corporateDriveOperators.js`, `northernCorporateControl.js`, `blackPermitControl.js`, `equityClayStop.js`, `cEntranceControl.js`, `cRoundaboutControl.js` |
| Position registry | `src/positions/`; [position guide](src/positions/README.md) and [operational positions](docs/positions.md) |
| Shuttles | `src/shuttles.js`, `shuttleRoutes.js`, `cShuttleLoop.js`, `shuttleDemand.js` |
| Schedule and replay | `src/sundayServices.js`, `serviceCarry.js`, `playback.js`, `playbackFrames.js` |
| Source diagnostics | `src/vehicleRouteCatalog.js`, `vehicleRegistration.js`, `exitPathSource.js` |

A simulation `step(delta, rates, lotSettings)` advances at most 0.1 simulated seconds. The engine launches eligible vehicles, updates controllers, applies shared traffic clearance, and completes arrivals/departures. `entered` counts launched arrivals; `exited` counts arrivals that reached parking; `departed` counts cars that left campus. Parked vehicles and moving vehicles are separate collections. The staffed C entrance reserves approaching shuttle turns and stops only conflicting car movements before the actual conflict, clearing cars already admitted or ahead of a bus. The estimated turn apron shares C’s wide-aisle cycle recovery; unrelated Corporate stretches do not. Entrance and roundabout stops compose independently. UI replay rebuilds engine state from the starting inputs; saved presentation frames do not restore controller closures.

## Drawings and coordinates

All active drawings use the registered **1374 × 1118** image frame: `[x, y]` in source pixels. `clearImageSource.js` converts these to Three.js `[x, z]` using `WORLD_SCALE`. Source indices below are zero-based and belong to the named file, not a global shape list.

| File | Role |
| --- | --- |
| `images/Clear Image.png` | Reference photograph |
| `images/EverythingClearImage.json` | Frozen 65-shape base map, routes, buildings, section polygons, and staffing points |
| `images/ABHubs.json` | Six A hubs, ten B hubs, and the active A aisle/exit traces |
| `images/LotCHubs.json` | Seven C hubs, C aisles, roundabout position, and four-way area; later appended shapes are ignored by its C binding |
| `images/ExitPathsAndC.json` | Validated exit catalog and the active C shuttle trace at shape 50 |
| `images/ExitPaths.json` | Earlier exit drawing retained for source integrity comparison |
| `images/NoMedians.json` | Presentation pavement; does not independently change traffic rules |
| `images/layout-overlay.json` | Explicitly adopted layout features, pavement patches, and rules; other features remain advisory |

Other drawing revisions and the `research/`, `handoffs/`, `handbacks/`, and `shared/` directories are historical design and verification evidence. They are not loaded as application modules. Some recovery scripts refer to archives on a previous developer's machine; they are historical, fixed inventories rather than general cleanup tools. Runtime imports and tests determine whether an asset is active; filenames alone do not.

Do not reorder or append shapes to the frozen base map. Add supported layout features through the overlay, or explicitly update a drawing's binding and tests when adopting a new source. [Layout authoring guide](layout/README.md) explains LabelMe labels, runtime/advisory features, and the checker. Drawn centerlines, estimated lane offsets, and roof clearance are modeling inputs, not surveyed lane widths or certified vehicle clearance.

## Validation and agent workflow

```sh
# Hub behavior, exact anchors, carries, and mixed traffic with shuttles
node --test tests/ab-hubs.test.js tests/c-hubs.test.js

# All automated tests (includes long simulated service scenarios)
npm test

# Validate overlay geometry and build the app
npm run layout:check
npm run build
```

Known baseline test debt: some tests still assert earlier starter layouts, C section allocations, Main geometry, or shuttle settings. These failures were already present in the November 12 starting tree. Compare failures against the baseline before changing operational rules to satisfy an older fixture. The hub, five-car Main, three-service, and 40-minute shuttle regression checks pass for this implementation.

`layout:check` writes a review SVG under `research/layout-check/`. Put new diagnostic runs under ignored `research/runs/`. `scripts/profile-eleven.mjs` profiles a deterministic 11:00 scenario; `PROFILE_SECONDS` controls its simulated duration.

Before changing behavior, read the relevant source module and nearby tests, and inspect `git status`. Keep exact drawn anchors, section capacities, route direction, and controller admission rules explicit. Test actual vehicle completion in addition to route construction: a roof-clear route can still lock against another queue. When changing state metadata, update parked records, service carry, redirects, replay frames, and rendered statistics together. Check that route failures surface through `routingIssues` without dropping vehicles.

For UI changes, inspect the running app in Top and 3D views. For geometry changes, inspect Routes and its source diagnostics as well as the automated checks. Run the affected tests first, then the full suite, layout check, and build. Avoid deleting drawings or research evidence simply because the app does not import them.
