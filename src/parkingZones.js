// Operational allocations supplied by the parking team, not image-derived stalls.
export const PARKING_ZONES = Object.freeze([
  { id:'aNorth', lot:'a', label:'Lot A North', capacity:210, general:true },
  { id:'aSouth', lot:'a', label:'Lot A South', capacity:150, general:true },
  { id:'aBadge', lot:'a', label:'Lot A black permit', capacity:51, general:false },
  { id:'bSouth', lot:'b', label:'Lot B south', capacity:75, general:true },
  { id:'bBanana', lot:'b', label:'Lot B banana', capacity:100, general:true },
  { id:'bPocket', lot:'b', label:'Lot B pocket', capacity:8, general:true },
  { id:'bNorth', lot:'b', label:'Lot B North', capacity:304, general:true },
  // Provisional 343-car first-half allocation, not an image-derived stall count.
  // First172+remaining171 keeps North343; first171+remaining172 keeps South343.
  { id:'cFirstNorth', lot:'c', label:'Lot C first half · North', capacity:172, general:true, side:'north', half:'first' },
  { id:'cFirstSouth', lot:'c', label:'Lot C first half · South', capacity:171, general:true, side:'south', half:'first' },
  { id:'cNorth', lot:'c', label:'Lot C remainder · North', capacity:171, general:true, side:'north', half:'remainder' },
  { id:'cSouth', lot:'c', label:'Lot C remainder · South', capacity:172, general:true, side:'south', half:'remainder' },
]);
export const ZONE_BY_ID = Object.fromEntries(PARKING_ZONES.map(z=>[z.id,z]));
export const GENERAL_CAPACITY = Object.freeze({a:360,b:487,c:686});
export const LOT_CAPACITY = Object.freeze({a:411,b:487,c:686});
export const DEFAULT_ZONE_PRIORITY = Object.freeze({a:['aNorth','aSouth'],b:['bSouth','bNorth','bBanana','bPocket'],c:['cFirstNorth','cFirstSouth','cNorth','cSouth']});
export const blankZones = () => Object.fromEntries(PARKING_ZONES.map(z=>[z.id,0]));
export function distributeInitialOccupancy(lots={}, supplied={}) {
  const result=blankZones();
  for(const lot of ['a','b','c']) {
    const zones=PARKING_ZONES.filter(z=>z.lot===lot);
    let remaining=Math.max(0,Math.min(LOT_CAPACITY[lot],Math.floor(Number(lots[lot])||0)));
    if(lot==='c')while(remaining>0) {
      const id=chooseZone('c',result,{});if(!id)break;
      result[id]++;remaining--;
    }
    for(const id of lot==='c'?[]:[...DEFAULT_ZONE_PRIORITY[lot],...(lot==='a'?['aBadge']:[])]) {
      const n=Math.min(remaining,ZONE_BY_ID[id].capacity);result[id]=n;remaining-=n;
    }
    for(const z of zones)if(supplied[z.id]!==undefined)result[z.id]=Math.max(0,Math.min(z.capacity,Math.floor(Number(supplied[z.id])||0)));
  }
  return result;
}
export function lotTotals(zones, includeBadge=true) {
  return Object.fromEntries(['a','b','c'].map(lot=>[lot,PARKING_ZONES.filter(z=>z.lot===lot&&(includeBadge||z.general)).reduce((n,z)=>n+(zones[z.id]??0),0)]));
}
export function chooseZone(lot, occupancy, reserved, {category='general',preferred='auto',closed=[]}={}) {
  const ids=category==='badge'&&lot==='a'?['aBadge']:[...DEFAULT_ZONE_PRIORITY[lot]];
  if(lot==='c'&&preferred==='auto') {
    // Balance North/South inside the active half, including inbound reservations.
    // Do not open the remainder while either first-half section can accept cars.
    for(const half of ['first','remainder']) {
      const available=ids.filter(id=>ZONE_BY_ID[id].half===half&&!closed.includes(id)&&
        (occupancy[id]??0)+(reserved[id]??0)<ZONE_BY_ID[id].capacity);
      available.sort((a,b)=>((occupancy[a]??0)+(reserved[a]??0))/ZONE_BY_ID[a].capacity-
        ((occupancy[b]??0)+(reserved[b]??0))/ZONE_BY_ID[b].capacity);
      if(available.length)return available[0];
    }
    return null;
  }
  // Volunteer preference precedes default fill order, but cannot override capacity/access.
  if(ids.includes(preferred)){ids.splice(ids.indexOf(preferred),1);ids.unshift(preferred);}
  return ids.find(id=>!closed.includes(id)&&(occupancy[id]??0)+(reserved[id]??0)<ZONE_BY_ID[id].capacity)??null;
}
