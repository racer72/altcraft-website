'use strict';
function defaultProfile(){return{id:'original-cup',name:'Original tapered cup',base:71.2,top:89.8,height:171.45,uncovered:1,kind:'tapered',measured:true}}
function validateCupProfile(raw){const p={...defaultProfile(),...raw};
 for(const k of ['base','top','height','uncovered'])if(!Number.isFinite(p[k]))throw Error('Enter all four cup measurements in millimeters.');
 if(p.parametric){
  // Older straight-can and storage bands were supported holders, not open cafe sleeves.
  if(p.sleeveMode==='band'&&(p.kind==='straight'||p.storage))p.sleeveMode='holder';
  const minimum=p.sleeveMode==='band'?25:55;
  if(!['full','band','holder'].includes(p.sleeveMode)||typeof p.storage!=='boolean'||!Number.isFinite(p.bandHeight)||!Number.isFinite(p.bandStart)||p.bandHeight<minimum||p.bandHeight>p.height-p.uncovered||p.bandStart<0||p.bandStart+p.bandHeight>p.height-p.uncovered||p.sleeveMode!=='band'&&p.bandStart!==0)throw Error('Choose a valid sleeve height and position. Holders start at the vessel bottom.');
  if(p.sleeveMode==='band'&&(p.kind!=='tapered'||p.top<=p.base+.1||p.storage))throw Error('An open cafe sleeve needs a cup that widens toward the top, with storage off.');
 }else if(p.base<69||p.top<69)throw Error('Choose a can preset or sleeve construction for smaller vessels.');
 if(p.base<50||p.base>110||p.top<50||p.top>120||p.height<80||p.height>240||p.uncovered<0||p.uncovered>70||p.height-p.uncovered<60)throw Error('Supported cups: base 50–110 mm, top 50–120 mm, height 80–240 mm, with at least 60 mm covered.');
 if(Math.abs(p.top-p.base)/(2*p.height)>.20)throw Error('This taper is too steep for the current sleeve foundation.');if(!['tapered','straight'].includes(p.kind))throw Error('Curved bottles need a measured contour; use a straight or tapered body for now.');p.name=String(p.name||'Custom cup').trim().slice(0,50);p.id=String(p.id||'custom-cup').slice(0,80);if(profileDimensions(p).rim>260)throw Error('This cup plus the storage base exceeds the current 260 mm height limit.');return p}

function profileDimensions(p){const coverage=p.parametric&&p.sleeveMode!=='full'?p.bandHeight:p.height-p.uncovered,delta=p.base/2-35.6,seat=p.parametric&&!p.storage?(p.sleeveMode==='band'?4:6.4):44+Math.max(0,delta),slope=(p.top-p.base)/(2*p.height);return{coverage,seat,rim:seat+coverage,slope,baseRadius:p.base/2,delta}}
function activeProfile(){return state.profile||defaultProfile()}
function profileOuterRadius(z,p=activeProfile()){const g=profileDimensions(p);return g.baseRadius+3.2+((p.parametric&&p.sleeveMode==='band'?p.bandStart:0)+z-g.seat)*g.slope}
function profileArtLimits(p=activeProfile()){const g=profileDimensions(p);return{bottom:g.seat+7,top:g.rim-6}}
function mapMechanicalPoint(x,y,z,p){const g=profileDimensions(p);let r=Math.hypot(x,y),nr=r,nz=z;
 if(z>38&&z<42){const t=(z-38)/4,sourceOuter=35.4+3.4*t,targetOuter=35.4+(3.4+g.delta)*t;nz=38+t*(g.seat-2-38);nr=32.4+(r-32.4)*(targetOuter-32.4)/(sourceOuter-32.4)}
 else if(z>=42&&z<=44){nz=g.seat-2+(z-42);nr=r+g.delta*Math.max(0,Math.min(1,(r-32.4)/3.4))}
 else if(z>44){nz=g.seat+(z-44)*g.coverage/170.45;const sourceInner=36+(z-44)*9.3/171.45,targetInner=g.baseRadius+.4+(nz-g.seat)*g.slope;nr=r+targetInner-sourceInner}
 return r?[x*nr/r,y*nr/r,nz]:[x,y,nz];
}
let mechanicalProfileKey="";
function remapMechanics(){if(!bodyMesh?.userData.sourcePositions)return;const p=activeProfile(),key=JSON.stringify([p.base,p.top,p.height,p.uncovered,state.texture,state.baseTexture,(state.handle?.style||'original')==='original']);if(mechanicalProfileKey===key){if(typeof updateProfileReadout==='function')updateProfileReadout();return;}mechanicalProfileKey=key;if(bodyMesh.userData.densePositions){const dense=['wood','brick','scales','waves','ripple','circuit'].includes(state.texture),bare=state.handle&&state.handle.style!=='original',tag=bare?(dense?'bareDense':'bare'):(dense?'dense':'smooth'),v=bodyMesh.userData[tag+'Positions'],idx=bodyMesh.userData[tag+'Index'];bodyMesh.userData.sourcePositions=v;bodyMesh.geometry.deleteAttribute('normal');bodyMesh.geometry.setAttribute('position',new THREE.BufferAttribute(v.slice(),3));bodyMesh.geometry.setIndex(new THREE.BufferAttribute(idx.slice(),1));}for(const [name,m]of Object.entries(mechanics)){const src=m.userData.sourcePositions,dst=m.geometry.attributes.position.array;for(let i=0;i<src.length;i+=3){const pt=name==='body'?surfacePoint(mapMechanicalPoint(src[i],src[i+1],src[i+2],p),p,state.texture):name==='disk'?[src[i]*(p.base/2-.1)/35.5,src[i+1]*(p.base/2-.1)/35.5,src[i+2]]:baseSurfacePoint([src[i],src[i+1],src[i+2]],state.baseTexture);dst.set(pt,i)}m.geometry.attributes.position.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere()}
 if(ghost){ghost.geometry.dispose();const g=profileDimensions(p),geo=new THREE.CylinderGeometry(p.top/2,p.base/2,p.height,96,1,false);geo.rotateX(Math.PI/2);ghost.geometry=geo;ghost.position.z=g.seat+p.height/2}
 if(typeof updateProfileReadout==='function')updateProfileReadout();
}
function applyCupProfile(raw){const p=validateCupProfile(raw);const nextHandle=p.parametric&&profileDimensions(p).coverage<55?{...state.handle,style:'none'}:p.parametric&&(state.handle.style==='original'||(!['none','oval'].includes(state.handle.style)&&profileDimensions(p).coverage<120))?{...state.handle,style:'oval'}:state.handle;validateHandle(nextHandle,p);const old=profileDimensions(activeProfile()),next=profileDimensions(p);remember();state.handle=nextHandle;for(const d of state.decorations){if(d.target==='base'){d.size=Math.min(30,d.size);continue}d.height=next.seat+(d.height-old.seat)*next.coverage/old.coverage;d.size=Math.max(3,Math.min(85,d.size*Math.min(next.coverage/old.coverage,p.base/activeProfile().base)))}state.profile=p;remapMechanics();refresh();resetCamera();toast(p.id==='original-cup'&&!p.parametric?'Original fitted cup restored.':'Custom size applied. Print a fit test before a full sleeve.')}
