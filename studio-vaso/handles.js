'use strict';
let handlePaths={},customHandleMesh=null,customHandleKey='';
function validateHandle(raw,p=activeProfile()){
 const h={style:p.parametric?'oval':'original',reach:34,thickness:13,...raw};if(p.parametric&&h.style==='original')throw Error('Choose a parametric handle or No handle for this sleeve.');
 if(!['original','classic','tree','oval','horn','log','none'].includes(h.style)||!Number.isFinite(h.reach)||h.reach<26||h.reach>44||!Number.isFinite(h.thickness)||h.thickness<10||h.thickness>14)throw Error('Choose a supported handle, 26–44 mm reach and 10–14 mm grip thickness.');
 if(!['original','none'].includes(h.style)&&profileDimensions(p).coverage<(p.parametric&&h.style==='oval'?55:120))throw Error('These handle styles need at least 120 mm of sleeve coverage.');return h;
}
function makeHandleGeometry(raw,p=activeProfile()){
 const h=validateHandle(raw,p);if(['original','none'].includes(h.style))return null;
 const g=profileDimensions(p),radius=h.thickness/2,path=[];
 if(h.style==='horn'){const raw=handlePaths.hornMesh;if(!raw)throw Error('The horn shape is still loading.');return{vertices:raw.vertices.map(([gap,y,t])=>{const z=g.seat+t*g.coverage,outer=profileOuterRadius(z,p),yy=y*h.thickness/13;let x=outer+gap*h.reach/34;const inner=outer-2.5;if(Math.hypot(x,yy)<inner)x=Math.sqrt(Math.max(0,inner*inner-yy*yy));return[x,yy,z]}),triangles:raw.triangles.map(t=>t.slice())}}
 if(['oval','horn','log'].includes(h.style)){const lo=g.seat+Math.max(g.coverage*.13,14),hi=g.seat+g.coverage-Math.max(g.coverage*.11,14);for(let i=0;i<=128;i++){const a=Math.PI*i/128,z=(lo+hi)/2-(hi-lo)*Math.cos(a)/2;path.push([profileOuterRadius(z,p)-.7+(h.reach+radius+.7)*Math.sin(a)*(h.style==='horn'?1-.10*Math.cos(a):h.style==='log'?1+.45*Math.cos(a)**2:1),z])}}
 else for(const[x,z]of handlePaths[h.style]){const nz=g.seat+(z-44)*g.coverage/170.45,oldGap=x-(38.8+(z-44)*9.3/171.45),gap=Math.max(-.7,oldGap)+Math.max(0,oldGap)*(h.reach/34-1)+(radius-6.5)*Math.max(0,Math.min(1,oldGap/10));path.push([profileOuterRadius(nz,p)+gap,nz])}
 const vertices=[],triangles=[],K=32,clip=(x,y,z,end=false)=>{const outer=profileOuterRadius(z,p),inner=outer-2.8+.3;if(Math.hypot(x,y)<inner)x=Math.sqrt(Math.max(0,inner*inner-y*y));if(end&&Math.hypot(x,y)>outer-.25)x=Math.sqrt(Math.max(0,(outer-.25)**2-y*y));return[x,y,z]};
 path.forEach(([x,z],i)=>{const prev=path[Math.max(0,i-1)],next=path[Math.min(path.length-1,i+1)],dx=next[0]-prev[0],dz=next[1]-prev[1],length=Math.hypot(dx,dz);for(let k=0;k<K;k++){const a=k*TAU/K,t=i/(path.length-1),rr=radius*(h.style==='horn'?1.25-.5*t:h.style==='log'?1+.08*(1-Math.cos(a))/2*Math.sin(Math.PI*t)*(Math.cos(5*a+.7*Math.sin(3*Math.PI*t))+.35*Math.cos(9*a)):1),u=rr*Math.cos(a),y=rr*Math.sin(a);vertices.push(clip(x-u*dz/length,y,z+u*dx/length,i===0||i===path.length-1))}});
 for(let i=0;i<path.length-1;i++)for(let k=0;k<K;k++){const a=i*K+k,b=i*K+(k+1)%K;triangles.push([a,b,b+K],[a,b+K,a+K])}
 for(const[end,base]of [[false,0],[true,(path.length-1)*K]]){const[x,z]=path[end?path.length-1:0],idx=vertices.length;vertices.push(clip(x,0,z));for(let k=0;k<K;k++)triangles.push(end?[base+k,base+(k+1)%K,idx]:[base+(k+1)%K,base+k,idx])}
 for(const t of triangles)t.reverse();return{vertices,triangles};
}
function updateCustomHandle(){
 const key=JSON.stringify([state.handle,activeProfile(),state.palette[state.partColors.body]]);if(key===customHandleKey)return;const data=makeHandleGeometry(state.handle);customHandleKey=key;
 if(customHandleMesh){bodyGroup.remove(customHandleMesh);customHandleMesh.geometry.dispose();customHandleMesh.material.dispose();customHandleMesh=null}
 if(data){customHandleMesh=new THREE.Mesh(toGeometry(data),mat(state.palette[state.partColors.body]));customHandleMesh.castShadow=true;customHandleMesh.material.wireframe=$('wire').checked;bodyGroup.add(customHandleMesh)}
}
function renderHandleControls(){if(!$('handleStyle'))return;const h=state.handle||{style:'original',reach:34,thickness:13};$('handleStyle').value=h.style;for(const k of ['reach','thickness']){$('handle'+k).value=h[k];$('handle'+k+'Value').textContent=h[k]+' mm';$('handle'+k).disabled=['original','none'].includes(h.style)}$('handleNote').textContent=h.style==='none'?'Sleeve only. No handle will be printed.':h.style==='original'?'Your original handle is retained. Choose a new style to adjust its reach and grip.':'New handle prototype: test the grip and strength with a filled cup. Tree contours have narrower sections; reach is a size control, not a guaranteed minimum opening.'}
document.addEventListener('DOMContentLoaded',()=>{
 $('openHandles').onclick=()=>{document.querySelector('[data-tab=handles]').click();document.querySelector('.library-sidebar').scrollTop=0};
 function setHandle(save=true){const before=state.handle;try{const h=validateHandle({style:$('handleStyle').value,reach:Number($('handlereach').value),thickness:Number($('handlethickness').value)});if(save)remember();state.handle=h;refresh()}catch(e){state.handle=before;renderHandleControls();toast(e.message)}}
 $('handleStyle').onchange=()=>setHandle();for(const k of ['reach','thickness']){const input=$('handle'+k);input.onpointerdown=remember;input.onkeydown=e=>{if(e.key.startsWith('Arrow'))remember()};input.oninput=()=>setHandle(false)}
 $('resetHandle').onclick=()=>{remember();state.handle={style:'original',reach:34,thickness:13};refresh()};
});
