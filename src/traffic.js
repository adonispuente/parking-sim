import * as THREE from 'three';
import { tracedFeatures, traceWorldPoint } from './tracedMap.js';
import { VECTOR_ROUTES, vectorToTrace } from './vectorRoutes.js';
import { createZonedCampus } from './campusSimulation.js';
import { indexLanePath } from './lanePath.js';

const point = ([x,y]) => { const [wx,wz]=traceWorldPoint([x,y]); return new THREE.Vector3(wx,.6,wz); };
export const CENTERLINE = [[70,1360],[76,1000],[78,700],[85,660],[200,660],[360,660],[500,620],[570,540],[590,440],[610,350],[660,270],[720,200],[850,145],[1050,145],[1400,145]].map(([x,y])=>{const p=point([x,y]);return [p.x,p.z];});
export const PAVEMENT = tracedFeatures.find(f=>/feeder road/i.test(f.label))?.points ?? [];
export function insidePavement([x,z]) { let inside=false; for(let i=0,j=PAVEMENT.length-1;i<PAVEMENT.length;j=i++){const [a,b]=PAVEMENT[i],[c,d]=PAVEMENT[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)inside=!inside;} return inside; }
const lane=(coords,name)=>{
  const pts=coords.map(p=>point(vectorToTrace(p))),path=new THREE.CurvePath();
  for(let i=1;i<pts.length;i++)if(pts[i].distanceTo(pts[i-1])>.00001)path.add(new THREE.LineCurve3(pts[i-1],pts[i]));
  indexLanePath(path);
  return {path,length:path.getLength(),name};
};
// Legacy preview helper, not the source of campus permissions.
export function makeLanes(){const center=new THREE.CatmullRomCurve3(CENTERLINE.map(([x,z])=>new THREE.Vector3(x,.6,z)),false,'centripetal');return [1,-1].map(direction=>{const pts=Array.from({length:501},(_,i)=>{const p=center.getPointAt(i/500),t=center.getTangentAt(i/500);return p.add(new THREE.Vector3(-t.z,0,t.x).multiplyScalar(.52*direction));});if(direction<0)pts.reverse();const path=new THREE.CatmullRomCurve3(pts,false,'centripetal');return {path,length:path.getLength(),name:direction===1?'Northbound':'Southbound'};});}
const arrivalNames={a:'Feeder → A public',badgeA:'Feeder → A Black Permit',bWest:'Feeder → B west',cWest:'Feeder → C staffed entrance',eCWest:'Equity Entrance → C staffed entrance',e2CWest:'Equity entrance/exit 2 → C staffed entrance'};
const legacyLanes=Object.entries(arrivalNames).map(([key,name])=>lane(VECTOR_ROUTES.arrival[key],name));
export function createCampusTraffic(options={}) {return createZonedCampus(options,lane,legacyLanes);}
export function createTraffic(){return createCampusTraffic();}
export function createTenCarDemo(options={}){
  const state=createCampusTraffic({...options,service:{enabled:false}});state.mode='demo';
  const step=state.step;let issued=0,nextArrival=0;
  state.step=(dt,rates,lotSettings)=>{
    if(state.phase!=='departure'&&issued<10&&state.clock>=nextArrival){const source=issued%3===2?(issued%2?2:1):0;state.waiting[source]++;issued++;nextArrival+=3;}
    step(dt,[0,0,0],lotSettings);
  };
  return state;
}
