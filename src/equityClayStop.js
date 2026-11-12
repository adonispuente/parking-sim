// Three-way Equity/Clay stop confirmed by Commander. Intersection is derived
// from the shared turn vertices of source routes10/11/13/15, not a new road.
import { routeAt, WORLD_SCALE } from './clearImageSource.js';
import { trafficClass, compareTrafficPriority } from './trafficPriority.js';
// Provisional (2026-11-08): a car stopped at the line this long moves to the
// front of the ready queue (oldest first), so a steady departure stream cannot
// starve an arrival. This is a priority boost, NOT a maximum wait: an
// approaching shuttle, a movement already admitted or occupying the
// intersection, and physical clearance all still come first, and time spent
// queued behind the line is not counted.
export const EQUITY_CLAY_MAX_WAIT_S=20;
export function compareEquityStopQueue(a,b,clock,stoppedAt){
  const wa=clock-stoppedAt(a),wb=clock-stoppedAt(b);
  const oa=wa>=EQUITY_CLAY_MAX_WAIT_S,ob=wb>=EQUITY_CLAY_MAX_WAIT_S;
  if(oa!==ob)return oa?-1:1;
  if(oa&&ob&&wa!==wb)return wb-wa;
  return compareTrafficPriority(a,b)||(stoppedAt(a)-stoppedAt(b));
}
const vertices=[routeAt(10)[1],... [11,13,15].map(i=>routeAt(i).filter(p=>p[1]>1020&&p[1]<1060).sort((a,b)=>Math.abs(a[0]-1032)-Math.abs(b[0]-1032))[0])];
export const EQUITY_CLAY_STOP_POSITION=Object.freeze([0,1].map(axis=>vertices.reduce((sum,p)=>sum+p[axis],0)/vertices.length));
// Clay extends beyond polygon55; separate its two explicitly traced travel
// directions without claiming the old pavement polygon describes that spur.
export function alignClayApproach(source,fallback){
  const [x,y]=EQUITY_CLAY_STOP_POSITION;
  return source.map((p,i)=>{
    if(Math.abs(p[0]-x)>35||p[1]<y||p[1]>1118)return fallback[i];
    const a=source[Math.max(0,i-1)],b=source[Math.min(source.length-1,i+1)];
    const dy=b[1]-a[1],dx=b[0]-a[0],n=Math.hypot(dx,dy);
    const weight=Math.max(0,Math.min(1,(Math.abs(dy)/(n||1)-.55)/.35));
    const target=x-Math.sign(dy)*12;
    return [fallback[i][0]+(target-fallback[i][0])*weight,fallback[i][1]];
  });
}
export function attachEquityClayStop(state){
  const [x,z]=EQUITY_CLAY_STOP_POSITION.map(v=>v*WORLD_SCALE),cache=new WeakMap();
  const stopped=new WeakMap(),passed=new WeakMap();let admitted=null,laneId=null;
  const gate=state.equityClayStop={position:EQUITY_CLAY_STOP_POSITION,name:'Equity / Clay three-way stop',waiting:0,admittedId:null,cleared:0,reason:'free flow'};
  const control=car=>{
    const lane=state.lanes[car.lane];if(!lane)return null;
    if(!cache.has(lane)){
      let gap=Infinity,merge=0;const n=Math.max(1,Math.ceil(lane.length/.2));
      for(let i=0;i<=n;i++){const p=lane.path.getPointAt(i/n),d=Math.hypot(p.x-x,p.z-z);if(d<gap){gap=d;merge=lane.length*i/n;}}
      cache.set(lane,gap<5?{merge,stop:Math.max(0,merge-5),release:Math.min(lane.length,merge+5)}:null);
    }return cache.get(lane);
  };
  const clear=car=>{const c=control(car);return c&&(car.distance>=state.lanes[car.lane].length||car.distance-(car.bodyLength??1.35)/2>=c.release);};
  state.prepareEquityClayStop=()=>{
    for(const car of state.cars){delete car.equityStopDistance;car.holdForEquityStop=false;}
    if(admitted&&(!state.cars.includes(admitted)||admitted.lane!==laneId||clear(admitted))){admitted=null;gate.admittedId=null;}
    const cars=state.cars.filter(c=>control(c)&&passed.get(c)!==c.lane&&!clear(c));
    const occupied=cars.filter(c=>c.distance>control(c).stop+.2&&c.distance<control(c).release+(c.bodyLength??1.35)/2);
    const ready=cars.filter(c=>c.distance>=control(c).stop-.05&&c.distance<=control(c).stop+.2);
    for(const car of ready)if(stopped.get(car)?.lane!==car.lane)stopped.set(car,{lane:car.lane,time:state.clock});
    gate.waiting=ready.length;
    const approachingBus=cars.some(c=>trafficClass(c)==='shuttle'&&control(c).stop-c.distance<5);
    const queue=ready.filter(c=>state.clock-stopped.get(c).time>=.8&&(!approachingBus||trafficClass(c)==='shuttle'));
    queue.sort((a,b)=>compareEquityStopQueue(a,b,state.clock,c=>stopped.get(c).time));
    if(!admitted&&!occupied.length&&queue.length){admitted=queue[0];laneId=admitted.lane;gate.admittedId=admitted.id;}
    for(const car of cars){
      if(car===admitted||occupied.includes(car))continue;
      car.equityStopDistance=control(car).stop;car.holdForEquityStop=car.distance>=control(car).stop-.05;
    }
    gate.reason=admitted?'release one movement':occupied.length?'clear occupied intersection':ready.length?'stop and yield':'free flow';
  };
  state.observeEquityClayStop=()=>{for(const car of state.cars)if(passed.get(car)!==car.lane&&clear(car)){passed.set(car,car.lane);gate.cleared++;}};
}
