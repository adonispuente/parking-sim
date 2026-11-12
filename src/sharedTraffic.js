import { compareTrafficPriority, trafficClass } from './trafficPriority.js';
import { busesPassThrough } from './vehicleInteractions.js';

// Shared lane following + local right-of-way, not full swept-body physics.
// Values are scene units / simulation seconds, not assumed surveyed meters.
const LOOKAHEAD = 6;
const BODY_GAP = 1.25;
export const CONFLICT_WIDTH = .9;
const halfLength = car => (car.bodyLength ?? 1.35) / 2;
const pointAt = (state, car, distance) => {
  const lane = state.lanes[car.lane];
  return lane.path.getPointAt(Math.max(0, Math.min(1, distance / lane.length)));
};
const pose = (state, car, distance = car.distance) => {
  const lane = state.lanes[car.lane];
  const t = Math.max(0, Math.min(1, distance / lane.length));
  return { point: lane.path.getPointAt(t), tangent: lane.path.getTangentAt(t) };
};
const clamp = value => Math.max(0, Math.min(1, value));
// Independent staffed positions compose their limits; one must never clear
// another position's stop by overwriting the same property.
const stopDistance = car => Math.min(car.cEntranceStopDistance??Infinity,car.cRoundaboutStopDistance??Infinity,car.northernStopDistance??Infinity,car.controlStopDistance??Infinity,car.feederStopDistance??Infinity,car.corridorStopDistance??Infinity,car.corporateJunctionStopDistance??Infinity,car.permitStopDistance??Infinity,car.equityStopDistance??Infinity);

function nearestSegments(a, b, c, d) {
  const ux = b.x - a.x, uz = b.z - a.z, vx = d.x - c.x, vz = d.z - c.z;
  const cross = ux * vz - uz * vx;
  if (Math.abs(cross) > 1e-9) {
    const dx = c.x - a.x, dz = c.z - a.z;
    const t = (dx * vz - dz * vx) / cross, u = (dx * uz - dz * ux) / cross;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { t, u, gap: 0 };
  }
  const uu = ux * ux + uz * uz, vv = vx * vx + vz * vz;
  let t=0,u=clamp(((a.x-c.x)*vx+(a.z-c.z)*vz)/(vv||1));
  let dx=a.x-c.x-vx*u,dz=a.z-c.z-vz*u,best=dx*dx+dz*dz;
  let next=clamp(((b.x-c.x)*vx+(b.z-c.z)*vz)/(vv||1));
  dx=b.x-c.x-vx*next;dz=b.z-c.z-vz*next;
  let squared=dx*dx+dz*dz;
  if(squared<best){best=squared;t=1;u=next;}
  next=clamp(((c.x-a.x)*ux+(c.z-a.z)*uz)/(uu||1));
  dx=a.x+ux*next-c.x;dz=a.z+uz*next-c.z;squared=dx*dx+dz*dz;
  if(squared<best){best=squared;t=next;u=0;}
  next=clamp(((d.x-a.x)*ux+(d.z-a.z)*uz)/(uu||1));
  dx=a.x+ux*next-d.x;dz=a.z+uz*next-d.z;squared=dx*dx+dz*dz;
  if(squared<best){best=squared;t=next;u=1;}
  return {t,u,gap:Math.sqrt(best)};
}

// Include the rear body so a priority bus does not enter before a car's tail clears.
function routeWindow(state, car) {
  const lane = state.lanes[car.lane];
  const start = Math.max(0, car.distance - halfLength(car) - .6);
  // A car capped by a staffed stop cannot travel past it, so it must not
  // reserve crossings beyond its stop line. Its body (stop + half length) is
  // still claimed. Without this, a South car held at Lot A Main "occupied" the
  // admitted North car's exit through its lookahead and the gate deadlocked.
  const stop = stopDistance(car);
  const capped = Number.isFinite(stop) ? Math.max(car.distance, stop) + halfLength(car) : Infinity;
  const end = Math.min(lane.length, car.distance + LOOKAHEAD, capped);
  const count = Math.max(1, Math.ceil((end - start) / 1.5));
  return Array.from({ length: count + 1 }, (_, i) => {
    const distance = start + (end - start) * i / count;
    // Conflict windows only use positions. Computing a tangent here sampled
    // each path two additional times, for every lookahead/body point.
    return { point: pointAt(state, car, distance), relative: distance - car.distance };
  });
}

function firstConflict(a, b) {
  let best = null, score = Infinity;
  for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) {
    const hit = nearestSegments(a[i - 1].point, a[i].point, b[j - 1].point, b[j].point);
    // Opposing SEPARATED lanes are independent via the geometric gap below.
    // Opposing paths on the same connector still conflict: skipping every
    // negative tangent let cars and buses enter a head-on stalemate at C.
    if (hit.gap >= CONFLICT_WIDTH) continue;
    const da = a[i - 1].relative + (a[i].relative - a[i - 1].relative) * hit.t;
    const db = b[j - 1].relative + (b[j].relative - b[j - 1].relative) * hit.u;
    const cost = Math.max(0, da) + Math.max(0, db);
    if (cost < score) { score = cost; best = { a: da, b: db }; }
  }
  return best;
}

export function advanceSharedTraffic(state, dt) {
  const poses = new Map(state.cars.map(car => [car.id, pose(state, car)]));
  const byId = new Map(state.cars.map(car => [car.id, car]));
  const order = new Map(state.cars.map((car, index) => [car.id, index]));
  const buckets = new Map(), neighbors = new Map(), cellSize = LOOKAHEAD * 2;
  const nearby = car => {
    if (neighbors.has(car.id)) return neighbors.get(car.id);
    const p = poses.get(car.id).point, x = Math.floor(p.x / cellSize), z = Math.floor(p.z / cellSize);
    const result = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
      result.push(...(buckets.get(`${x + dx},${z + dz}`) ?? []));
    neighbors.set(car.id, result);
    return result;
  };
  for (const car of state.cars) {
    const p = poses.get(car.id).point, key = `${Math.floor(p.x / cellSize)},${Math.floor(p.z / cellSize)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(car);
  }
  const proposed = new Map(), leaders = new Map(), windows = new Map(), constraints = new Map();
  const windowFor = car => {
    if (!windows.has(car.id)) windows.set(car.id, routeWindow(state, car));
    return windows.get(car.id);
  };
  const limit = (car, distance, other, reason) => {
    const next = Math.max(car.distance, distance);
    if(!constraints.has(car.id))constraints.set(car.id,[]);
    constraints.get(car.id).push({next,other,reason});
    if (next < proposed.get(car.id) - 1e-8) {
      proposed.set(car.id, next);
      car.yieldingTo = other.id; car.yieldReason = reason;
    }
  };
  for (const car of state.cars) {
    car.yieldingTo = null; car.yieldReason = null;
    proposed.set(car.id, Math.max(car.distance,Math.min(stopDistance(car),car.distance + (car.speed ?? 2.8) * dt)));
  }
  // Physical queue order always outranks operational preference: never drive
  // through a slower lead car or ask it to yield backwards to the bus behind it.
  for (const car of state.cars) {
    const here = poses.get(car.id);
    for (const other of nearby(car)) {
      if (other === car || busesPassThrough(car, other)) continue;
      const ahead = poses.get(other.id), dx = ahead.point.x - here.point.x, dz = ahead.point.z - here.point.z;
      const alignment = here.tangent.dot(ahead.tangent);
      if (alignment <= .7) continue;
      const lateral = Math.abs(dx * here.tangent.z - dz * here.tangent.x);
      const hx = here.tangent.x + ahead.tangent.x, hz = here.tangent.z + ahead.tangent.z;
      const along = (dx * hx + dz * hz) / (Math.hypot(hx, hz) || 1);
      const orderedAhead = along > .02 || (Math.abs(along) <= .02 && compareTrafficPriority(other, car) < 0);
      const gap = halfLength(car) + halfLength(other) + BODY_GAP;
      if (orderedAhead && lateral < .85 && along < gap + (car.speed ?? 2.8) * dt) {
        limit(car, car.distance + Math.max(0, along - gap), other, 'safe-following');
        if (!leaders.has(car.id)) leaders.set(car.id, new Set());
        leaders.get(car.id).add(other.id);
      }
    }
  }
  const follows = (car, other, seen = new Set()) => {
    if (seen.has(car.id)) return false;
    seen.add(car.id);
    for (const id of leaders.get(car.id) ?? []) {
      if (id === other.id) return true;
      const lead = byId.get(id);
      if (lead && follows(lead, other, seen)) return true;
    }
    return false;
  };
  for (const car of state.cars) for (const other of nearby(car)) {
    // The old string-pair Set visited each pair when its first array member
    // was reached. Array indices preserve that ordering without stringify/sort.
    if (order.get(other.id) <= order.get(car.id) || busesPassThrough(car, other)) continue;
    const a = poses.get(car.id), b = poses.get(other.id);
    if (a.point.distanceTo(b.point) > LOOKAHEAD * 2 + 1) continue;
    const dx = b.point.x - a.point.x, dz = b.point.z - a.point.z;
    const alignment = a.tangent.dot(b.tangent);
    const lateral = Math.abs(dx * a.tangent.z - dz * a.tangent.x);
    if (alignment > .7 && lateral < .85) continue; // handled as one physical queue
    const hit = firstConflict(windowFor(car), windowFor(other));
    if (!hit) continue;
    const occupiedA = hit.a <= halfLength(car) + .6;
    const occupiedB = hit.b <= halfLength(other) + .6;
    let winner;
    if (occupiedA !== occupiedB) winner = occupiedA ? car : other;
    else if (occupiedA && occupiedB && Math.abs(hit.a - hit.b) > .05) winner = hit.a < hit.b ? car : other;
    else winner = compareTrafficPriority(car, other) <= 0 ? car : other;
    let loser = winner === car ? other : car;
    // Let any lead vehicle clear, including a chain of cars blocking a bus.
    if (follows(winner, loser)) [winner, loser] = [loser, winner];
    const winnerDistance = winner === car ? hit.a : hit.b;
    // A held/queued vehicle cannot reserve a crossing it cannot approach yet.
    // But its body still occupies any conflict area it has already reached.
    if (winnerDistance > halfLength(winner) + .6 &&
      (winner.holdForCEntrance || winner.holdForCRoundabout || winner.holdForNorthern || winner.holdForGate || winner.holdForBatch || winner.holdForOfficer || winner.holdForCorridor || winner.holdForCorporateJunction || winner.holdForPermit || winner.holdForEquityStop || (winner.speed ?? 2.8) === 0 ||
        proposed.get(winner.id) <= winner.distance + 1e-8)) continue;
    const loserDistance = loser === car ? hit.a : hit.b;
    const gap = halfLength(loser) + halfLength(winner) + BODY_GAP;
    const reason = (winner === car ? occupiedA : occupiedB) ? 'clear-occupied-conflict' : `${trafficClass(winner)}-priority`;
    limit(loser, loser.distance + Math.max(0, loserDistance - gap), winner, reason);
  }
  // A staffed junction must not let lookahead reservations form a closed chain.
  // In a cycle only, permit a blocking vehicle to clear if its actual swept body
  // remains clear this substep. Never waive a same-lane following or gate hold.
  // Reservation padding is not physical occupancy: a wide bus can otherwise be
  // treated as occupying several different nearby crossings at once.
  const bodyWindow=(car,next)=>{
    const lane=state.lanes[car.lane],start=Math.max(0,car.distance-halfLength(car)),end=Math.min(lane.length,next+halfLength(car));
    const count=Math.max(1,Math.ceil((end-start)/.5));
    return Array.from({length:count+1},(_,i)=>pointAt(state,car,start+(end-start)*i/count));
  };
  const sweepClear=(car,other)=>{
    if(busesPassThrough(car,other))return true;
    const a=bodyWindow(car,car.distance+(car.speed??2.8)*dt),b=bodyWindow(other,proposed.get(other.id));
    const clearance=(car.fleetBus? .44:.325)+(other.fleetBus? .44:.325)+.15;
    for(let i=1;i<a.length;i++)for(let j=1;j<b.length;j++)if(nearestSegments(a[i-1],a[i],b[j-1],b[j]).gap<clearance)return false;
    return true;
  };
  // Wide lot aisles (Lot C, ~5 car widths): when a vehicle and the one it waits on are
  // both inside, the blocked vehicle may steer around instead of needing a clear centerline.
  const wideAisle=car=>{const other=byId.get(car.yieldingTo);return !!(other&&(state.canPullAroundInWideAisle?state.canPullAroundInWideAisle(car,other):state.inWideAisle&&state.inWideAisle(car)&&state.inWideAisle(other)));};
  for(let pass=0;pass<state.cars.length;pass++) {
    const visited=new Set();let released=false;
    for(const start of state.cars) {
      if(visited.has(start.id))continue;
      const chain=[],indices=new Map();let current=start;
      while(current&&!visited.has(current.id)) {
        if(indices.has(current.id)) {
          const cycle=chain.slice(indices.get(current.id));
          const candidate=cycle.filter(car=>car.yieldReason!=='safe-following'&&!car.holdForCEntrance&&!car.holdForCRoundabout&&!car.holdForNorthern&&!car.holdForGate&&!car.holdForBatch&&!car.holdForOfficer&&!car.holdForCorridor&&!car.holdForCorporateJunction&&!car.holdForPermit&&!car.holdForEquityStop&&
            (wideAisle(car)||nearby(car).every(other=>other===car||sweepClear(car,other))))
            .sort(compareTrafficPriority)[0];
          if(candidate) {
            const entries=constraints.get(candidate.id)??[];
            const index=entries.findIndex(item=>item.other.id===candidate.yieldingTo&&item.reason===candidate.yieldReason);
            if(index>=0)entries.splice(index,1);
            proposed.set(candidate.id,Math.max(candidate.distance,Math.min(stopDistance(candidate),candidate.distance+(candidate.speed??2.8)*dt)));
            candidate.yieldingTo=null;candidate.yieldReason=null;
            for(const item of entries)if(item.next<proposed.get(candidate.id)-1e-8){
              proposed.set(candidate.id,item.next);candidate.yieldingTo=item.other.id;candidate.yieldReason=item.reason;
            }
            released=true;
          }
          break;
        }
        indices.set(current.id,chain.length);chain.push(current);
        current=current.holdForGate?null:byId.get(current.yieldingTo);
      }
      for(const car of chain)visited.add(car.id);
      if(released)break;
    }
    if(!released)break;
  }
  const summary = { shuttle: 0, departure: 0, arrival: 0 };
  for (const car of state.cars) {
    if (car.holdForGate) { proposed.set(car.id, car.distance); car.yieldReason = 'closed-gate'; }
    if(Number.isFinite(stopDistance(car))) {
      const capped=Math.max(car.distance,Math.min(stopDistance(car),proposed.get(car.id)));
      if(capped<car.distance+(car.speed??2.8)*dt-1e-8&&car.holdForBatch)car.yieldReason='lot-a-main-five-car-batch';
      if(capped<car.distance+(car.speed??2.8)*dt-1e-8&&car.holdForOfficer)car.yieldReason='feeder-officer-merge';
      if(capped<car.distance+(car.speed??2.8)*dt-1e-8&&car.holdForCorridor)car.yieldReason='corporate-drive-valve';
      if(capped<car.distance+(car.speed??2.8)*dt-1e-8&&car.holdForCorporateJunction)car.yieldReason='corporate-feeder-officer';
      if(capped<car.distance+(car.speed??2.8)*dt-1e-8&&car.holdForPermit)car.yieldReason='black-permit-shuttle-release';
      if(capped<car.distance+(car.speed??2.8)*dt-1e-8&&car.holdForEquityStop)car.yieldReason='equity-clay-stop';
      if(capped<car.distance+(car.speed??2.8)*dt-1e-8&&car.holdForNorthern)car.yieldReason='charlie-exit-radio-shuttle-release';
      if(capped<car.distance+(car.speed??2.8)*dt-1e-8&&car.holdForCRoundabout)car.yieldReason='lot-c-roundabout-marshal';
      proposed.set(car.id,capped);
    }
    const distance = proposed.get(car.id);
    car.trafficWaiting = distance < car.distance + (car.speed ?? 2.8) * dt - .001;
    if (car.trafficWaiting) summary[trafficClass(car)]++;
    car.distance = distance;
  }
  state.priorityWaiting = summary;
}
