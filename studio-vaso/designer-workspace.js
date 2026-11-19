'use strict';
// Workspace tools use the existing geometry, undo and export paths.
let designerReady=false;
function designerFootprint(d){
 const angle=d.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const region of d.regions||[{loops:d.loops||LIB[d.shape]?.loops||[]}])for(const loop of region.loops)for(const [x,y]of loop){const u=(x*c-y*s)*d.size,v=(x*s+y*c)*d.size;minX=Math.min(minX,u);maxX=Math.max(maxX,u);minY=Math.min(minY,v);maxY=Math.max(maxY,v)}
 return {width:maxX-minX,height:maxY-minY,centerY:(minY+maxY)/2};
}
function designerEdit(change){const d=getSelected();if(!d)return;remember();change(d);refresh()}
function designerFilterAssets(){
 const query=($('artSearch')?.value||'').trim().toLowerCase();let shown=0,total=0;
 for(const card of $('assetGrid').querySelectorAll('.asset-card')){const name=card.querySelector('button')?.textContent||'';card.hidden=!!query&&!name.toLowerCase().includes(query);total++;if(!card.hidden)shown++}
 if($('artSearchStatus'))$('artSearchStatus').textContent=shown===total?`${total} designs in this pack`:`${shown} of ${total} designs`;
 if($('artSearchEmpty'))$('artSearchEmpty').hidden=shown!==0;
}
function designerFilterLayers(){
 const query=($('layerSearch')?.value||'').trim().toLowerCase();
 for(const row of $('objects').querySelectorAll('.object-row'))row.hidden=!!query&&!row.textContent.toLowerCase().includes(query);
}
function designerSync(){
 if(!designerReady)return;const d=getSelected();$('inspectorEmpty').hidden=!!d;
 if(renderer?.domElement){renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D cup design canvas')}
 $('layerSearch').hidden=state.decorations.length<5&&!$('layerSearch').value;
 const advanced=$('advancedArtTools'),mirror=$('mirrorArtworkControls');if(advanced&&mirror&&mirror.parentElement!==advanced)advanced.querySelector('summary').after(mirror);
 if(d){
  for(const key of ['height','angle','size','rotation','depth']){const input=$('precise-'+key),range=$(key);input.min=range.min;input.max=range.max;input.disabled=range.disabled;if(document.activeElement!==input)input.value=Number(d[key].toFixed(2))}
  if(document.activeElement!==$('artName'))$('artName').value=d.name;
  const f=designerFootprint(d);$('artFootprint').textContent=Number.isFinite(f.width)?`Flat footprint · ${f.width.toFixed(1)} × ${f.height.toFixed(1)} mm`:'';
 }
 const p=activeProfile(),g=profileDimensions(p);$('workspaceFitName').textContent=p.name;$('workspaceFitSize').textContent=`${p.base.toFixed(1)} → ${p.top.toFixed(1)} mm · ${g.coverage.toFixed(1)} mm covered`;
 const count=state.decorations.filter(a=>a.visible).length,finish=[...$('surfaceTexture').options].find(o=>o.value===(state.texture||'none'))?.textContent||'Smooth';
 $('workspaceSummary').textContent=`${count} visible ${count===1?'design':'designs'} · ${finish}`;
 designerFilterLayers();
}
const designerEditorLegacy=renderEditor;
renderEditor=function(...args){const result=designerEditorLegacy(...args);designerSync();return result};
const designerObjectsLegacy=renderObjects;
renderObjects=function(...args){const result=designerObjectsLegacy(...args);if(designerReady)designerFilterLayers();return result};
const designerRefreshLegacy=refresh;
refresh=function(...args){const result=designerRefreshLegacy(...args);designerSync();return result};
const designerFinishDragLegacy=finishArtworkDrag;
finishArtworkDrag=function(cancel=false){const id=artworkDrag?.id,moved=artworkDrag?.moved;designerFinishDragLegacy(cancel);if(cancel||!moved||!$('snapPlacement')?.checked)return;const d=state.decorations.find(a=>a.id===id);if(d){d.height=Math.round(d.height/2)*2;d.angle=Math.round(d.angle/5)*5;refresh()}};

document.addEventListener('DOMContentLoaded',()=>{
 document.body.classList.add('designer-workspace');
 studioSteps[3][3]='Pick a pack and add artwork. Drag it on the cup; use Design details for precise edits.';
 const library=document.querySelector('.library-sidebar'),rail=document.querySelector('.workflow-rail'),inspector=document.querySelector('.inspector');
 const head=document.createElement('div');head.className='designer-tools-heading';
 const stepTitle=document.querySelector('.canvas-title>div');head.appendChild(stepTitle);
 const world=document.querySelector('.creator-room');if(world){world.querySelector('span').textContent='DESIGN PACK';head.prepend(world)}library.prepend(head);
 const intro=rail.querySelector('.workflow-intro');intro.innerHTML='<span class="designer-rail-mark" aria-hidden="true">V</span><span class="eyebrow">DESIGN STUDIO</span>';
 document.querySelectorAll('.workflow-step').forEach((b,i)=>{b.title=`${i+1}. ${studioSteps[i][0]} — ${studioSteps[i][3]}`;b.querySelector('.step-index').textContent=String(i+1)});
 const summary=document.createElement('div');summary.className='designer-fit-summary';summary.innerHTML='<strong id="workspaceFitName"></strong><span id="workspaceFitSize"></span><small id="workspaceSummary"></small>';document.querySelector('.workspace').appendChild(summary);
 const search=document.createElement('div');search.className='designer-search';search.innerHTML='<label for="artSearch">Find artwork in this pack</label><input id="artSearch" type="search" placeholder="Search trees, stars, names…" autocomplete="off"><span id="artSearchStatus" role="status"></span>';$('assetGrid').before(search);
 const empty=document.createElement('p');empty.id='artSearchEmpty';empty.className='help';empty.hidden=true;empty.textContent='No matching artwork. Try another word or switch packs.';$('assetGrid').after(empty);$('artSearch').oninput=designerFilterAssets;
 new MutationObserver(designerFilterAssets).observe($('assetGrid'),{childList:true});
 $('assetCategory').addEventListener('change',()=>{$('artSearch').value='';designerFilterAssets()});
 const layerSearch=document.createElement('input');layerSearch.id='layerSearch';layerSearch.type='search';layerSearch.placeholder='Find a layer…';layerSearch.setAttribute('aria-label','Search layers');$('objects').before(layerSearch);layerSearch.oninput=designerFilterLayers;
 const emptyEditor=document.createElement('section');emptyEditor.id='inspectorEmpty';emptyEditor.innerHTML='<h3>Select a design to edit</h3><p>Click artwork on the cup or choose a layer above. You can drag it, enter exact measurements, or use the placement tools.</p>';inspector.querySelector('.layer-shelf').after(emptyEditor);
 const name=document.createElement('label');name.className='designer-art-name';name.innerHTML='Design name<input id="artName" maxlength="60" autocomplete="off">';
 const naming=document.createElement('details');naming.className='designer-rename';const nameSummary=document.createElement('summary');nameSummary.textContent='Rename design';naming.append(nameSummary,name);$('editor').querySelector('.section-head').after(naming);
 const renameArtwork=()=>{const d=getSelected(),raw=$('artName').value.trim();if(!raw){if(d)$('artName').value=d.name;return}const value=safeName(raw);if(d&&value!==d.name)designerEdit(a=>a.name=value);designerSync()};
 $('artName').onchange=renameArtwork;$('artName').onblur=renameArtwork;$('artName').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();renameArtwork();$('artName').blur()}};
 const footprint=document.createElement('p');footprint.id='artFootprint';footprint.className='help';naming.after(footprint);
 for(const key of ['height','angle','size','rotation','depth']){
  const range=$(key),input=document.createElement('input');input.id='precise-'+key;input.type='number';input.step=key==='rotation'?'1':'.1';range.step=input.step;input.setAttribute('aria-label',`Exact ${key==='angle'?'angle around cup':key==='height'?'height on cup':key==='size'?'artwork size':key==='rotation'?'artwork rotation':'relief depth'}`);input.className='designer-precise';
  const row=document.createElement('div');row.className='designer-range-row';range.before(row);row.append(range,input);
  const commit=()=>{const d=getSelected();if(!d)return;if(!input.value.trim()||!Number.isFinite(Number(input.value))){input.value=d[key];return}const value=Math.max(Number(range.min),Math.min(Number(range.max),Number(input.value)));if(Math.abs(value-d[key])<.0001){input.value=d[key];return}remember();d[key]=value;refresh();input.value=Number(getSelected()[key].toFixed(2))};
  input.onchange=commit;input.onblur=commit;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();commit();input.blur()}};
 }
 const tools=document.createElement('section');tools.className='designer-placement';tools.innerHTML='<h3>Quick placement</h3><div class="designer-placement-grid"><button id="centerArtwork">Center height</button><button id="frontArtwork">Face front</button><button id="turnArtwork">Turn 90°</button><button id="focusArtwork">Focus design</button></div><label class="designer-snap"><input id="snapPlacement" type="checkbox"> Snap after dragging · 2 mm / 5°</label><p class="help">Arrow keys nudge the selected design. Hold Shift for larger steps. Ctrl+D duplicates; Delete removes.</p>';$('editor').appendChild(tools);
 footprint.after(tools);
 const advanced=document.createElement('details');advanced.id='advancedArtTools';const advancedTitle=document.createElement('summary');advancedTitle.textContent='Layering, mirror & repeat';advanced.appendChild(advancedTitle);
 for(const element of [$('artLayer').closest('label'),$('artFront').parentElement,$('layerHint'),$('repeatCount').parentElement,$('placementNote')])advanced.appendChild(element);
 $('editor').appendChild(advanced);
 $('centerArtwork').onclick=()=>designerEdit(d=>{const limits=d.target==='base'?{bottom:4,top:34}:profileArtLimits();d.height=(limits.bottom+limits.top)/2-designerFootprint(d).centerY});
 $('frontArtwork').onclick=()=>designerEdit(d=>d.angle=-90);
 $('turnArtwork').onclick=()=>designerEdit(d=>d.rotation=((d.rotation+90+180)%360+360)%360-180);
 $('focusArtwork').onclick=()=>{const d=getSelected(),mesh=meshes.get(d?.id);if(!mesh)return toast('Show this design in Layers before focusing it.');scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(mesh),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),angle=d.angle*Math.PI/180,distance=Math.max(130,Math.min(650,Math.max(size.x,size.y,size.z)*3.8));controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(Math.cos(angle)*distance,Math.sin(angle)*distance,distance*.24));controls.update()};
 const extraViews=document.createElement('div');extraViews.className='designer-extra-views';extraViews.innerHTML='<button id="topView">Top</button><button id="sideView">Side</button>';document.querySelector('.view-tools').prepend(extraViews);
 $('topView').onclick=()=>{camera.position.copy(controls.target).add(new THREE.Vector3(0,-.1,470));controls.update()};$('sideView').onclick=()=>{camera.position.copy(controls.target).add(new THREE.Vector3(470,0,70));controls.update()};
 const keyboard=e=>{if(e.defaultPrevented||artworkDrag||document.querySelector('dialog[open]')||e.target.closest('input,select,textarea,button,[contenteditable=true]'))return;const d=getSelected();if(!d)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();$('duplicate').click();return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();$('remove').click();return}
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();designerEdit(a=>{if(e.key==='ArrowUp'||e.key==='ArrowDown')a.height+=(e.key==='ArrowUp'?1:-1)*(e.shiftKey?5:1);else a.angle=((a.angle+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?10:1)+180)%360+360)%360-180})}
 };document.addEventListener('keydown',keyboard);
 const shortHelp=document.createElement('p');shortHelp.className='designer-keyboard-help';shortHelp.textContent='Drag artwork to place · Drag empty space to orbit · Scroll to zoom';document.querySelector('.workspace').appendChild(shortHelp);
 const toggle=document.createElement('button');toggle.id='toggleDesignDetails';toggle.textContent='Design details';toggle.className='designer-details-toggle';toggle.onclick=()=>inspector.classList.toggle('open');document.querySelector('.workspace').appendChild(toggle);
 const closeDetails=document.createElement('button');closeDetails.id='closeDesignDetails';closeDetails.textContent='×';closeDetails.setAttribute('aria-label','Close design details');closeDetails.onclick=()=>inspector.classList.remove('open');inspector.querySelector('.inspector-heading').appendChild(closeDetails);
 $('clear').textContent='Clear artwork';$('reset').textContent='Reset view';
 designerReady=true;designerFilterAssets();designerSync();requestAnimationFrame(()=>resize());
});
