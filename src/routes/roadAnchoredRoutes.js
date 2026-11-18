// Compatibility overlay: active routes now already share the physical source.
import { routeById } from './vehicleRouteCatalog.js';
import { zoneArrivalRoute, zoneDepartureRoute } from './parkingRoutes.js';
const cache=new Map();
export function roadAnchoredRoute(id) {
  if(cache.has(id))return cache.get(id);
  const route=routeById(id);let result;
  try {
    if(!route?.zone||!route.compareTo||route.status==='proposal')result={id,applied:false,points:[],reason:'Source evidence only; no independent live zone binding'};
    else {
      const [phase,key]=route.compareTo;
      const points=phase==='arrival'?zoneArrivalRoute(key,route.zone):zoneDepartureRoute(key,route.zone);
      result={id,applied:true,points,source:'EverythingClearImage live route + explicit derived connectors',runtime:true,provisional:true,reason:'Single source frame; derived internal joins are not surveyed aisles'};
    }
  }catch(error){result={id,applied:false,points:[],reason:error.message};}
  cache.set(id,result);return result;
}
