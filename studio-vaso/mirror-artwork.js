"use strict";
// Reflect stored outlines in the artwork's current on-cup orientation.
// All regions and the shared pocket move together; no new project format is needed.
function mirroredArtworkLoops(loops,axis,rotation=0){
 const t=rotation*Math.PI/180,c=Math.cos(t),s=Math.sin(t);
 return loops.map(loop=>loop.map(([x,y])=>{let u=c*x-s*y,v=s*x+c*y;if(axis==='horizontal')u=-u;else v=-v;return [c*u+s*v,-s*u+c*v]}));
}
function mirrorSelectedArtwork(axis){
 const d=getSelected();if(!d)return;if(!['horizontal','vertical'].includes(axis))return;
 remember();const flip=loops=>mirroredArtworkLoops(loops,axis,d.rotation||0);
 d.loops=flip(d.loops||LIB[d.shape].loops);
 if(d.regions)d.regions=d.regions.map(r=>({...r,loops:flip(r.loops)}));
 if(d.groupLoops)d.groupLoops=flip(d.groupLoops);
 refresh();toast(axis==='horizontal'?'Artwork mirrored left to right.':'Artwork mirrored top to bottom.');
}
function syncArtworkMirrorControls(){
 let row=document.getElementById('mirrorArtworkControls');
 if(!row){const editor=document.getElementById('editor');if(!editor)return;row=document.createElement('div');row.id='mirrorArtworkControls';row.className='mirror-artwork-controls';const label=document.createElement('span');label.textContent='Mirror artwork';row.appendChild(label);
 for(const [axis,text] of [['horizontal','Mirror left / right'],['vertical','Mirror up / down']]){const b=document.createElement('button');b.type='button';b.id='mirrorArtwork'+(axis==='horizontal'?'Horizontal':'Vertical');b.textContent=text;b.title='Flip the whole selected design, including all color regions';b.onclick=()=>mirrorSelectedArtwork(axis);row.appendChild(b)}
 const rotation=document.getElementById('rotation')?.closest('label');if(rotation)rotation.after(row);else editor.appendChild(row);
 }
 row.hidden=!getSelected();
}
const renderEditorBeforeArtworkMirror=renderEditor;
renderEditor=function(...args){const result=renderEditorBeforeArtworkMirror(...args);syncArtworkMirrorControls();return result};
document.addEventListener('DOMContentLoaded',syncArtworkMirrorControls);
