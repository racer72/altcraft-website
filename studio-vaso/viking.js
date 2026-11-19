
'use strict';
const VIKING_STUDIO_PALETTE=['#353A3C','#F5EDCB','#AE7538','#AD2823'];
function vikingColorSlot(fill){
 const hex=String(fill||'#353A3C').replace('#','');const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255),hi=Math.max(...rgb),lo=Math.min(...rgb),[r,g,b]=rgb;
 const delta=hi-lo,hue=delta===0?0:((hi===r?(g-b)/delta:hi===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360;
 if(delta>.15&&(hue<16||hue>340)&&r>.4)return 3;
 if(hi-lo<.14)return hi>.42?1:0;
 if(r>.72&&g>.70&&b>.52)return 1;
 if(g>r*1.18||b>r*1.25||hi<.29)return 0;
 return 2;
}
function sharedVikingAsset(asset){const a=JSON.parse(JSON.stringify(asset)),source=a.lockedPalette.slice();a.sourcePalette=source;a.regions.forEach(r=>{r.sourceFill=r.sourceFill||source[r.fixedColor];r.color=r.fixedColor=vikingColorSlot(r.sourceFill)});a.color=a.regions[0].color;a.lockedPalette=VIKING_STUDIO_PALETTE.slice();delete a.individualPalette;return a}
const VASO_VIKING_STUDIO_PACK={...VASO_VIKING_ILLUSTRATED,id:'viking',name:'Viking',palette:VIKING_STUDIO_PALETTE.slice(),autoPalette:true,description:'Ten Viking designs in one locked four-color palette. Click a design to add it, then drag it or use Design details.',assets:VASO_VIKING_ILLUSTRATED.assets.map(sharedVikingAsset)};
const makeBeforeViking=makeStudioPacks;
makeStudioPacks=function(){return [...makeBeforeViking().filter(p=>!['viking','viking-illustrated'].includes(p.id)),VASO_VIKING_STUDIO_PACK]};
function applyVikingPalette(){
 if(state.decorations.some(d=>d.lockColors&&d.theme!=='viking'&&!samePalette(d.lockedPalette,VIKING_STUDIO_PALETTE))){toast('Your current artwork uses another locked palette. Clear that artwork or start a separate project before adding Viking designs.');return false}
 const needsChange=!samePalette(state.palette,VIKING_STUDIO_PALETTE)||state.decorations.some(d=>d.theme==='viking'&&d.lockColors&&(!samePalette(d.lockedPalette,VIKING_STUDIO_PALETTE)||d.regions.some(r=>r.fixedColor!==vikingColorSlot(r.sourceFill||d.lockedPalette[r.fixedColor]))));
 if(needsChange){remember();state.decorations=state.decorations.map(d=>d.theme==='viking'&&d.regions?sharedVikingAsset(d):d);state.palette=VIKING_STUDIO_PALETTE.slice();refresh()}
 return true;
}
