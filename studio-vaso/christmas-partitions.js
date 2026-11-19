'use strict';
// Prepare the supplied color regions before bending them onto a curved wall.
// Only exact copies of the included artwork are upgraded; custom art stays intact.
const christmasOriginalRegions=new Map(SLIM_CHRISTMAS_PACK.assets.map(a=>[a.name,JSON.stringify((a.regions||[]).map(r=>[r.id,r.loops]))]));
const christmasOriginalPockets=new Map(SLIM_CHRISTMAS_PACK.assets.filter(a=>a.groupLoops).map(a=>[a.name,JSON.parse(JSON.stringify(a.groupLoops))]));
function prepareChristmasArtwork(d){
 const patch=VASO_CHRISTMAS_PARTITIONS[d.name];
 if(!patch||!d.regions)return false;
 if(d.preparedPartition){
  const signature=JSON.stringify(d.regions.map(r=>[r.id,r.loops]));
  const expected=JSON.stringify(patch.regions.map(r=>[r.id,r.loops]));
  if(d.partitionRevision===1&&signature===expected&&christmasOriginalPockets.has(d.name)){d.groupLoops=JSON.parse(JSON.stringify(patch.groupLoops));return true}
  return false;
 }
 if(JSON.stringify(d.regions.map(r=>[r.id,r.loops]))!==christmasOriginalRegions.get(d.name))return false;
 const byId=new Map(patch.regions.map(r=>[r.id,r.loops]));
 if(d.regions.some(r=>!byId.has(r.id)))return false;
 d.regions=d.regions.map(r=>({...r,loops:JSON.parse(JSON.stringify(byId.get(r.id)))}));
 d.groupLoops=JSON.parse(JSON.stringify(patch.groupLoops));
 d.preparedPartition=true;d.partitionRevision=1;
 d.regionClearanceMm=.08*(d.size||patch.referenceSize)/patch.referenceSize;
 return true;
}
for(const a of SLIM_CHRISTMAS_PACK.assets)prepareChristmasArtwork(a);
const partitionValidateLegacy=validateProject;
validateProject=function(s){const out=partitionValidateLegacy(s);for(const d of out.decorations)prepareChristmasArtwork(d);return out};
const partitionExportLegacy=exportArtwork;
exportArtwork=function(){
 const before=state.decorations;
 state.decorations=before.map(d=>{const copy=JSON.parse(JSON.stringify(d));prepareChristmasArtwork(copy);return copy});
 try{return partitionExportLegacy()}finally{state.decorations=before}
};

