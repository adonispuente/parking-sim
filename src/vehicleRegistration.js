// Identity registration: map, routes, controls and stops share source pixels.
import source, { SOURCE_BINDINGS } from './clearImageSource.js';
import { VEHICLE_ROUTE_MANIFEST as M } from './vehicleRouteManifest.js';
import { inPolygon, avoidsObstacles } from './sourceRouting.js';
import { PAVEMENT_PATCHES } from './layoutOverlay.js';
export { source };
export const bindingProblems=[];
export const boundRoutes=SOURCE_BINDINGS.map(({shape,index})=>({entry:M.routes[index],shape,problem:null}));
export const registerPoint=p=>[...p];
export const REGISTRATION=Object.freeze({method:'identity — EverythingClearImage source pixels',affine:{x:[1,0,0],y:[0,1,0]},shift:[0,0],
  landmarkResiduals:[],maxResidualPx:0,coverageBefore:1,coverageAfter:1,ok:true});
export const SOURCE_INTEGRITY=Object.freeze({ok:true,reasons:[]});
const pavement=[...source.shapes.filter(s=>s.shape_type==='polygon'&&!/building|first half/i.test(s.label)).map(s=>s.points),...PAVEMENT_PATCHES];
export const onMappedPavement=p=>avoidsObstacles(p)&&pavement.some(r=>inPolygon(p,r));
// Backward-compatible mathematical helper, not used for active registration.
export const applyAffine=(t,[x,y],shift=[0,0])=>[t.x[0]*x+t.x[1]*y+t.x[2]+shift[0],t.y[0]*x+t.y[1]*y+t.y[2]+shift[1]];
export function fitAffine(){throw new Error('Affine fitting retired: unified source uses identity registration');}
