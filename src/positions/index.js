// Positions registry: what each person on the map does, and where the code
// that implements it lives. Map coordinates come from clearImageSource.js;
// overlay points come from layoutOverlay.js; this registry adds meaning, not controllers. Human-readable guide: ./README.md and
// docs/positions.md.
//
// Each definition separates:
//   duty        - what the person at that spot does in real life
//   implemented - what the simulation actually does today
//   intended    - duties recorded but not (fully) modeled yet
//   provisional - model parameters that are estimates, not surveyed values
import { LAYOUT } from '../layoutOverlay.js';
import { buildOverlayPositions } from './overlayDefinitions.js';
import { pointAt, STAFF_POSITIONS, POSITION_ALIASES } from '../clearImageSource.js';
import { EQUITY_CLAY_STOP_POSITION, EQUITY_CLAY_MAX_WAIT_S } from '../equityClayStop.js';
import { C_ROUNDABOUT_POSITION, C_HUB_SOURCE } from '../cHubSource.js';

// Point bindings used by controllers and the route panel (formerly src/trafficPositions.js).
export const RESOLVED_A_MAIN_POSITION = Object.freeze([...pointAt(57)]);
export const MAIN_POSITION_RESOLUTION = Object.freeze({
  point: RESOLVED_A_MAIN_POSITION, candidate: RESOLVED_A_MAIN_POSITION,
  source: 'EverythingClearImage #57 (canonical; #31 alias)',
  reason: 'Exact source position; #31 retained as a duplicate observation, not a second control',
  provisional: false,
});
export const FEEDER_OFFICER_POSITION = Object.freeze([...pointAt(58)]);

const aliasesOf = index => Object.entries(POSITION_ALIASES).filter(([, to]) => to === index).map(([from]) => Number(from));

const DEFINITIONS = {
  aMain: {
    title: 'Lot A Main',
    duty: 'Waves cars in and out of Lot A at the main entrance in five-car turns: inbound Main, Lot A North departures, Lot A South departures. Keeps waiting cars back so they are clear of the cars being let through.',
    implemented: 'One movement is admitted at a time; after five clearances the turn passes to the next waiting approach. Higher-priority ready traffic can take the turn early; cars already moving keep going.',
    intended: [],
    provisional: ['North departure hold 3.0 scene units back from Main', 'South departure hold 3.2 (thin margin)', 'Inbound hold 2.2'],
    controllers: ['src/lotAControl.js'],
  },
  aExitOfficer: {
    title: 'Lot A Feeder exit officer',
    duty: 'Lets Lot A cars out onto Feeder when the merge is clear and no shuttle is coming.',
    implemented: 'Watches nearby lanes, admits waiting Lot A departures in priority order when the merge is clear. Feeder traffic never waits for an empty Lot A exit.',
    intended: [],
    provisional: ['Detection radius, hold distances and shuttle look-ahead'],
    controllers: ['src/feederOfficer.js'],
  },
  corporateOfficer: {
    title: 'Feeder / Corporate officer',
    duty: 'Police officer at the Feeder/Corporate junction. Favors people leaving (10 out for every 5 in). When the line into Lot A backs up, sends incoming cars to Bravo until it calms down.',
    implemented: 'Counts 10 departure clearances to 5 arrival clearances when both sides are waiting; a lone approach never waits for an empty quota. Shuttles and an occupied junction take precedence. Alpha-to-Bravo diversion logic exists for Feeder arrivals.',
    intended: ['Diversion that reliably triggers on real Alpha backups (current trigger only sees the last 12 scene units before Main; a longer-reach version was shelved after it made the eleven service worse)'],
    provisional: ['10:5 ratio', 'Diversion on at 6 cars, off at 2'],
    controllers: ['src/exitPriorityJunction.js', 'src/alphaQueueRelief.js', 'src/campusSimulation.js'],
  },
  permitOfficer: {
    title: 'Black Permit officer',
    duty: 'Stops both directions of Corporate Drive at the Black Permit driveway, in time, so an outbound shuttle can pull out without a clog.',
    implemented: 'Recognizes outbound shuttles by lane while they are still approaching (about 12 scene units before the merge). Holds every car that has not yet entered the bus crossing: eastbound arrivals, westbound departures and badge cars turning in. Cars already inside the crossing keep going and clear it. The hold lifts once the bus is through. Warning distance is an estimate.',
    intended: [],
    provisional: [],
    controllers: ['src/blackPermitControl.js', 'src/corporateDriveOperators.js'],
  },
  bEntrance: {
    title: 'Lot B entrance',
    duty: 'Staffs the Bravo entrance, watches its line and radios the Corporate officers and the shuttle fleet.',
    implemented: 'Route checkpoint: entrance routes are bound to this point and passage is counted. No separate admission quota in the default wide-road mode.',
    intended: ['Inside-Bravo marshal / row-filling workflow (not modeled)'],
    provisional: [],
    controllers: ['src/parkingRoutes.js', 'src/vectorRoutes.js', 'src/corporateDriveOperators.js'],
  },
  bExit: {
    title: 'Lot B north exit',
    duty: 'Coordinates Lot B departures and radios road and shuttle conditions.',
    implemented: 'When eastbound traffic stays backed up, sends B North departures west in five-car batches before they start moving. Normal exit choice follows where cars parked, not a fixed percentage.',
    intended: ['A standalone admission gate at this point (none exists)'],
    provisional: ['Backup trigger: 3 cars for 8 s', 'Five-car batches'],
    controllers: ['src/northernCorporateControl.js', 'src/campusSimulation.js'],
  },
  cEntrance: {
    title: 'Lot C staffed entrance',
    duty: 'Receives ordinary Lot C arrivals and keeps entering and exiting cars apart; coordinates with B exit and C exit.',
    implemented: 'Route checkpoint and radio member: ordinary C arrivals must pass this point before the lot interior.',
    intended: ['Per-person admission quota (not modeled)'],
    provisional: [],
    controllers: ['src/parkingRoutes.js', 'src/vectorRoutes.js', 'src/northernCorporateControl.js'],
  },
  cExit: {
    title: 'Lot C exit',
    duty: 'Brings returning C shuttles back onto Corporate and tells conflicting cars to hold or clear.',
    implemented: 'Detects C exit-leg shuttles, holds conflicting cars before the area; cars already admitted clear first. C cars may use either exit (default about 50/50).',
    intended: [],
    provisional: [],
    controllers: ['src/northernCorporateControl.js'],
  },
};

export const POSITIONS = Object.freeze(STAFF_POSITIONS.map(p => {
  const d = DEFINITIONS[p.id];
  if (!d) throw new Error(`No position definition for staffed point ${p.id} (#${p.index})`);
  return Object.freeze({ ...d, id: p.id, index: p.index, label: p.label, point: p.point, aliases: aliasesOf(p.index), staffed: true });
}));

// Control points nobody stands at. Kept here so every stop/officer rule is in one list.
export const CONTROL_POINTS = Object.freeze([Object.freeze({
  id: 'equityClayStop', title: 'Equity / Clay three-way stop', staffed: false, index: null, aliases: [],
  point: EQUITY_CLAY_STOP_POSITION,
  duty: 'Unstaffed three-way stop. Every car stops; one movement goes at a time.',
  implemented: `Cars stop for 0.8 s; one movement clears before the next is admitted. Normal order is shuttles, then departures, then arrivals, but a car stopped at the line ${EQUITY_CLAY_MAX_WAIT_S} s or longer jumps to the front of the ready queue (oldest first). This is a priority boost, not a maximum wait: an approaching shuttle, a movement already in the intersection and physical clearance still come first, and time queued behind the line is not counted.`,
  intended: [],
  provisional: ['0.8 s stop', '5 scene-unit hold/release distances', `${EQUITY_CLAY_MAX_WAIT_S} s overdue priority threshold (not a wait ceiling)`],
  controllers: ['src/equityClayStop.js'],
})]);

// Separate drawing namespace: #48 here is not EverythingClearImage #48.
export const C_HUB_POSITIONS = Object.freeze([Object.freeze({
  id: 'cRoundabout', title: 'Lot C roundabout marshal', label: 'Lot C roundabout',
  index: null, sourceIndex: 48, sourceFile: C_HUB_SOURCE, point: C_ROUNDABOUT_POSITION, aliases: [], staffed: true,
  duty: 'Manages the four-way above the roundabout, giving shuttles first priority, then exits, while separated entering and exiting lanes continue together.',
  implemented: 'Holds only conflicting movements at the drawn four-way; occupied movements and physical leaders clear first. Compatible paths may enter together.',
  intended: [], provisional: ['28px aisle separation on wide interior roads', '10 scene-unit shuttle lookahead', '1.25 scene-unit stop gap'],
  controllers: ['src/cRoundaboutControl.js', 'src/cHubRoutes.js'],
})]);

// Preserve the eight-entry source API; the new drawing has a separate namespace.
export const OVERLAY_POSITIONS = buildOverlayPositions(LAYOUT, undefined,
  [...POSITIONS, ...CONTROL_POINTS, ...C_HUB_POSITIONS].map(p => p.id));
export const ALL_POSITIONS = Object.freeze([...POSITIONS, ...CONTROL_POINTS, ...C_HUB_POSITIONS, ...OVERLAY_POSITIONS]);
export const positionById = id => ALL_POSITIONS.find(p => p.id === id);
export const positionByIndex = index => index == null ? undefined
  : POSITIONS.find(p => p.index === (POSITION_ALIASES[index] ?? index));
