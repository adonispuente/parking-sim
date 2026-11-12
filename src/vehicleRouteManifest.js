// Exact index+label bindings: duplicate labels NEVER determine identity.
import { SOURCE_BINDINGS, SOURCE_FILE, SOURCE_IMAGE, SOURCE_PAIR, IMAGE_SIZE } from './clearImageSource.js';
const ids=['a-in-south','a-in-north','badge-in','shuttle-home-to-bsouth','b-in-south','b-in-banana','b-in-pocket','b-in-north','c-in-feeder','c-in-feeder-equity','c-in-clay-equity','b-out-clay','b-out-equity-feeder','c-out-main-clay','c-out-main-feeder','c-out-clay','c-out-feeder','b-out-main-feeder','a-out-north','a-out-south','badge-out','c-out-potential-1','c-out-potential-2','c-out-potential-3','shuttle-overflow-1','shuttle-overflow-2','shuttle-overflow-3','shuttle-overflow-4','shuttle-overflow-5','shuttle-overflow-6','shuttle-c-all','pos-a-main-alias','pos-b-entrance-alias','pos-b-exit-alias','pos-c-entrance-alias','pos-c-exit-alias'];
const zones={0:'aSouth',1:'aNorth',2:'aBadge',4:'bSouth',5:'bBanana',6:'bPocket',7:'bNorth',18:'aNorth',19:'aSouth',20:'aBadge'};
const comparisons={0:['arrival','a'],1:['arrival','a'],2:['arrival','badgeA'],4:['arrival','bWest'],5:['arrival','bWest'],6:['arrival','bWest'],7:['arrival','bWest'],8:['arrival','cWest'],9:['arrival','eCWest'],10:['arrival','e2CWest'],11:['departure','bNorth'],13:['departure','cWest'],15:['departure','cEast'],17:['departure','bWest'],18:['departure','a'],19:['departure','a'],20:['departure','badgeA']};
const canonicalIds={57:'pos-a-main',58:'officer-a-exit',59:'officer-corporate',60:'officer-permit',61:'pos-b-entrance',62:'pos-b-exit',63:'pos-c-entrance',64:'pos-c-exit'};
export const VEHICLE_ROUTE_MANIFEST=Object.freeze({
  source:{file:SOURCE_FILE,imagePath:SOURCE_IMAGE,sourcePair:SOURCE_PAIR,...IMAGE_SIZE},
  target:{file:SOURCE_FILE,...IMAGE_SIZE},registration:{method:'identity',maxResidualPx:0,refineSearchPx:0,minRefineGain:0,landmarks:[]},
  thresholds:{stopPx:18,joinPx:18,positionPx:0,minCoverage:.85,frameMarginSourcePx:15,bCheckpointPx:25},
  runtime:{unifiedSource:true,bArrivalGuidance:true},
  routes:SOURCE_BINDINGS.map(({index,label,shape})=>({index,label,id:ids[index]??canonicalIds[index]??`source-${index}`,shapeType:shape.shape_type,
    kind:shape.shape_type==='point'?'position':shape.shape_type==='polygon'?'geometry':index===3||index>=24?'shuttle':index<=10?'arrival':'departure',
    phase:shape.shape_type==='point'?'staffing':shape.shape_type==='polygon'?'map':index===3||index>=24?'shuttle':index<=10?'arrival':'departure',
    zone:zones[index],compareTo:comparisons[index],status:index>=21&&index<=23?'proposal':undefined,
    runtime:shape.shape_type==='linestrip'&&!(index>=21&&index<=23)?{use:'unified-source'}:null,
    notes:index===53?'Capacity-neutral first-half allocation mask; never extra pavement':index>=31&&index<=35?'Duplicate observation; canonical staffing is #57/#61–64':
      index>=24&&index<=30?'Source shuttle evidence; closed #24/#25 loops, #29 return, other C lines outbound only':'Single-source geometry / route evidence',
  })),
});
