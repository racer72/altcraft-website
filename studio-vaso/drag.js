'use strict';
let artworkDrag=null,artworkDragFrame=0;
function pointerRay(e){const r=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();scene.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);return ray}
function hitArtwork(e){if(!bodyMesh)return null;const ray=pointerRay(e),occluders=[bodyMesh,capMesh,...(customHandleMesh?[customHandleMesh]:[])],wall=ray.intersectObjects(occluders.filter(m=>m.visible))[0],priority=new Map(orderedArtwork().map((d,i)=>[d.id,i]));return ray.intersectObjects([...meshes.values()]).filter(h=>!wall||h.distance<wall.distance+.12).sort((a,b)=>priority.get(b.object.userData.decoration)-priority.get(a.object.userData.decoration)||a.distance-b.distance)[0]}
function beginArtworkDrag(e,kind,id,hit=null){
 const d=state.decorations.find(x=>x.id===id);if(!d)return;selected=id;renderObjects();renderEditor();highlight();
 const capture=kind==='3d'?renderer.domElement:$('flatWrap'),start={id,kind,capture,pointer:e.pointerId,x:e.clientX,y:e.clientY,height:d.height,angle:d.angle,moved:false,last:e,before:null};
 if(kind==='3d'){
  controls.enableDamping=false;controls.update();controls.enableDamping=true;
  const origin=bodyGroup.getWorldPosition(new THREE.Vector3()),normal=camera.position.clone().sub(origin);normal.z=0;normal.normalize();start.tangent=new THREE.Vector3(-normal.y,normal.x,0);start.plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,hit.point);start.point=pointerRay(e).ray.intersectPlane(start.plane,new THREE.Vector3());if(!start.point)return;controls.enabled=false;
 }else{const svg=$('flatWrap').querySelector('svg');start.matrix=svg.getScreenCTM().inverse();start.point=new DOMPoint(e.clientX,e.clientY).matrixTransform(start.matrix);const g=profileDimensions(activeProfile());start.circ=TAU*profileOuterRadius(g.seat+g.coverage/2)}
 artworkDrag=start;capture.setPointerCapture(e.pointerId);capture.style.cursor='grabbing';e.preventDefault();e.stopImmediatePropagation();
}
function moveArtworkDrag(e){const drag=artworkDrag;if(!drag||e.pointerId!==drag.pointer)return;drag.last=e;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<3)return;if(!drag.moved){drag.before=JSON.stringify(state);remember();drag.moved=true}e.preventDefault();e.stopImmediatePropagation();if(!artworkDragFrame)artworkDragFrame=requestAnimationFrame(applyArtworkDrag)}
function applyArtworkDrag(){artworkDragFrame=0;const drag=artworkDrag;if(!drag||!drag.moved)return;const d=state.decorations.find(x=>x.id===drag.id);if(!d)return;let height,angle;
 if(drag.kind==='3d'){const point=pointerRay(drag.last).ray.intersectPlane(drag.plane,new THREE.Vector3());if(!point)return;const delta=point.sub(drag.point);height=drag.height+delta.z;angle=drag.angle+delta.dot(drag.tangent)/outerRadius(drag.height)*180/Math.PI}
 else{const p=new DOMPoint(drag.last.clientX,drag.last.clientY).matrixTransform(drag.matrix);height=drag.height-(p.y-drag.point.y);angle=drag.angle+(p.x-drag.point.x)/drag.circ*360}
 d.height=height;d.angle=((angle+180)%360+360)%360-180;const m=meshes.get(d.id);if(m){m.geometry.dispose();m.geometry=decorationGeometry(d)}renderEditor();highlight();renderFlatLayout();$('previewStatus').textContent=`Moving ${d.name} · ${d.height.toFixed(1)} mm · ${Math.round(d.angle)}°`;
}
function finishArtworkDrag(cancel=false){const drag=artworkDrag;if(!drag)return;if(artworkDragFrame){cancelAnimationFrame(artworkDragFrame);artworkDragFrame=0}if(drag.moved&&!cancel)applyArtworkDrag();artworkDrag=null;if(cancel&&drag.before){state=JSON.parse(drag.before);history.pop();future=[]}controls.enabled=true;drag.capture.style.cursor='';if(drag.capture.hasPointerCapture(drag.pointer))drag.capture.releasePointerCapture(drag.pointer);if(drag.moved)refresh();else{renderFlatLayout();updateUndo()}}
function setupArtworkDragging(){
 const canvas=renderer.domElement;canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',e=>{if(artworkDrag||e.button!==0||e.altKey)return;const hit=hitArtwork(e);if(hit)beginArtworkDrag(e,'3d',hit.object.userData.decoration,hit)},true);
 canvas.addEventListener('pointermove',moveArtworkDrag,true);canvas.addEventListener('pointerup',e=>{if(artworkDrag){e.stopImmediatePropagation();finishArtworkDrag()}},true);canvas.addEventListener('pointercancel',()=>finishArtworkDrag(true),true);
 const flat=$('flatWrap');flat.style.touchAction='none';flat.addEventListener('pointerdown',e=>{const path=e.target.closest('path[data-decoration]');if(path&&e.button===0)beginArtworkDrag(e,'flat',path.dataset.decoration)},true);flat.addEventListener('pointermove',moveArtworkDrag,true);flat.addEventListener('pointerup',()=>finishArtworkDrag(),true);flat.addEventListener('pointercancel',()=>finishArtworkDrag(true),true);
 document.addEventListener('keydown',e=>{if(artworkDrag&&(e.key==='Escape'||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'))){e.preventDefault();e.stopImmediatePropagation();finishArtworkDrag(true)}},true);
 window.addEventListener('blur',()=>finishArtworkDrag(true));for(const target of [canvas,flat])target.addEventListener('lostpointercapture',()=>{if(artworkDrag&&artworkDrag.capture===target)finishArtworkDrag(true)});
}
