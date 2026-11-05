import { writeFileSync } from 'node:fs';
import { buildShuttleRoutes, SHUTTLE_STOPS } from '../src/shuttleRoutes.js';
const colors=['#ff8c42','#f8e16c','#df72f4','#4df0c8','#62baff'];
const paths=Object.entries(buildShuttleRoutes()).map(([id,route],i)=>
  ['outbound','inbound'].map(direction=>`<polyline points="${route[direction].map(p=>p.join(',')).join(' ')}" fill="none" stroke="${colors[i]}" stroke-width="2" ${direction==='inbound'?'stroke-dasharray="4 3"':''}><title>${id}: ${direction}; provisional aisles</title></polyline>`).join('')).join('');
const stops=SHUTTLE_STOPS.map(s=>`<g><circle cx="${s.point[0]}" cy="${s.point[1]}" r="4" fill="white" stroke="black"/><text x="${s.point[0]+5}" y="${s.point[1]-6}" fill="white" stroke="black" paint-order="stroke" stroke-width="2" font-size="11">${s.id}</text></g>`).join('');
writeFileSync(new URL('./shuttle-route-preview.svg',import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 735 566" width="735" height="566"><image href="../images/HopeCityLayout.png" width="735" height="566"/>${paths}${stops}<rect width="735" height="19" fill="#162d29"/><text x="8" y="14" fill="white" font-size="11">SHUTTLE ROUTE REVIEW · solid outbound / dashed return · internal aisles provisional</text></svg>`);
writeFileSync(new URL('./shuttle-route-preview.json',import.meta.url),JSON.stringify({source:'images/HopeCityLayout.png',width:735,height:566,stops:SHUTTLE_STOPS,routes:buildShuttleRoutes(),note:'Provisional internal aisles; source geometry unchanged.'},null,2));
