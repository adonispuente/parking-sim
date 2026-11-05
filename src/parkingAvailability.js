// Total currently usable operational capacity, including the reserved51 badge
// spaces once within A411. Arrival holds close general A, not badge access.
export function openParkingCapacity(lots, occupancy={}, reserved={}, controls={}) {
  return lots.reduce((total,lot)=>{
    const id=lot.id.replace('lot-','');
    if(lot.open===false)return total;
    if(controls.gateStatus?.[id])return total+(id==='a'?Math.max(0,51-(controls.badgeParking??0)-(controls.badgeReserved??0)):0);
    return total+Math.max(0,lot.capacity-(occupancy[id]??0)-(reserved[id]??0));
  },0);
}
