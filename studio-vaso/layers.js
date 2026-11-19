'use strict';
function raisedLayer(d){return d.mode==='raised'?(d.layer||0):0}
function orderedArtwork(){return state.decorations.map((d,i)=>({d,i})).sort((a,b)=>raisedLayer(a.d)-raisedLayer(b.d)||a.i-b.i).map(x=>x.d)}
function layerOffset(d){let offset=0;for(let level=0;level<raisedLayer(d);level++){const depths=state.decorations.filter(x=>x.visible&&(x.target||'body')===(d.target||'body')&&x.mode==='raised'&&raisedLayer(x)===level).map(x=>x.depth);offset+=Math.max(.8,...depths)}return offset}
function artworkTop(d){return d.mode==='raised'?layerOffset(d)+d.depth:0}
function artworkCutter(d){const top=Math.max(0,...state.decorations.filter(x=>x.visible).map(artworkTop))+1;const mesh=capGeometry(d,top-artworkTop(d),-1.21,.1),limits=(d.target==='base'?{bottom:3.8,top:34.2}:profileArtLimits());for(const v of mesh.vertices)v[2]=Math.max(limits.bottom,Math.min(limits.top,v[2]));return mesh}
function renderLayerControls(){const d=getSelected();if(!d||!$('artLayer'))return;$('artLayer').value=raisedLayer(d);$('artLayer').disabled=d.mode!=='raised';$('layerHint').textContent=d.mode==='raised'?`Front surface: ${artworkTop(d).toFixed(1)} mm above the sleeve. Higher layers sit above lower ones.`:'Flush inlays stay at the sleeve surface. Choose Raised to build stacked relief.'}
function moveInLayer(front){const d=getSelected();if(!d)return;remember();state.decorations=state.decorations.filter(x=>x!==d);if(front)state.decorations.push(d);else state.decorations.unshift(d);refresh()}
document.addEventListener('DOMContentLoaded',()=>{
 $('artLayer').onchange=e=>{const d=getSelected();if(!d)return;remember();d.layer=Number(e.target.value);refresh()};$('artFront').onclick=()=>moveInLayer(true);$('artBack').onclick=()=>moveInLayer(false);
});
