'use strict';
function renderFlatLayout(){
 if(!$('flatWrap')||!$('flatDialog').open)return;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),p=activeProfile(),g=profileDimensions(p),circ=2*Math.PI*profileOuterRadius(g.seat+g.coverage/2,p),H=g.coverage;
 svg.setAttribute('viewBox',`-12 -14 ${circ+24} ${H+28}`);svg.setAttribute('aria-label','Unwrapped cup artwork');svg.setAttribute('role','img');
 const el=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);svg.appendChild(e);return e};
 el('rect',{x:0,y:0,width:circ,height:H,fill:state.palette[state.partColors.body],rx:1});
 if(state.texture==='brick'){for(let row=0;row<Math.ceil(H/14);row++){const y=H-row*14;el('line',{x1:0,x2:circ,y1:y,y2:y,stroke:'#10251b77','stroke-width':1});for(let col=0;col<12;col++){const x=(col+(row%2)*.5)*circ/12;el('line',{x1:x,x2:x,y1:Math.max(0,y-14),y2:y,stroke:'#10251b77','stroke-width':1})}}}else if(state.texture==='wood'){for(let col=0;col<32;col++){const pts=Array.from({length:50},(_,i)=>{const y=i*H/49,x=col*circ/32+Math.sin(y*.075+col*.7)*.9;return (i?'L':'M')+x+','+y}).join(' ');el('path',{d:pts,fill:'none',stroke:'#10251b66','stroke-width':.6})}}
 for(let i=0;i<=4;i++){const x=circ*i/4;el('line',{x1:x,x2:x,y1:0,y2:H,stroke:'#fff6','stroke-dasharray':'1 2','stroke-width':.4});const t=el('text',{x,y:-4,fill:'#647968','font-size':4,'text-anchor':'middle'});t.textContent=['Seam','Front','Handle','Back','Seam'][i]}
 const handleX=circ/2;el('line',{x1:handleX,x2:handleX,y1:0,y2:H,stroke:'#e9b94e','stroke-width':1,'stroke-dasharray':'3 2'});
 for(const d of orderedArtwork()){if(!d.visible||d.target==='base')continue;const c=Math.cos(d.rotation*Math.PI/180),sn=Math.sin(d.rotation*Math.PI/180),r=profileOuterRadius(d.height,p),x=((d.angle+180)%360+360)%360/360*circ,y=g.rim-d.height,regions=d.regions||[{loops:d.loops||LIB[d.shape]?.loops||[],color:d.color}];
  for(const region of regions){const loops=region.loops,color=d.regions?fixedColor(d,region):d.color;for(const offset of [-circ,0,circ]){const path=el('path',{d:loops.map(l=>l.map(([u,v],i)=>`${i?'L':'M'}${x+offset+(u*c-v*sn)*d.size*circ/(2*Math.PI*r)},${y-(u*sn+v*c)*d.size}`).join(' ')+'Z').join(' '),'data-decoration':d.id,fill:state.palette[color],'fill-rule':'evenodd',stroke:d.id===selected?'#f5b84a':'#0003','stroke-width':d.id===selected?1:.2});path.style.cursor='pointer';path.onclick=()=>{selected=d.id;renderEditor();renderObjects();highlight();renderFlatLayout()};const title=document.createElementNS(ns,'title');title.textContent=d.name;path.appendChild(title)}}
 }
 // Clip seam-crossing artwork to the rectangular guide.
 const defs=document.createElementNS(ns,'defs');defs.innerHTML=`<clipPath id="wrapClip"><rect width="${circ}" height="${H}"/></clipPath>`;svg.prepend(defs);for(const path of svg.querySelectorAll('path'))path.setAttribute('clip-path','url(#wrapClip)');
 const label=el('text',{x:0,y:H+8,fill:'#647968','font-size':4});label.textContent=`${H.toFixed(1)} mm covered height · ${circ.toFixed(1)} mm circumference at mid-height`;
 $('flatWrap').replaceChildren(svg);
}
document.addEventListener('DOMContentLoaded',()=>{
 $('flatPreview').onclick=()=>{$('flatDialog').showModal();renderFlatLayout()};$('closeFlat').onclick=()=>$('flatDialog').close();
 $('openTextures').onclick=()=>{document.querySelector('[data-tab=finishes]').click();document.querySelector('.library-sidebar').scrollTop=0};
 $('baseTexture').onchange=e=>{remember();state.baseTexture=e.target.value;refresh();toast('Bottom finish updated. Internal threads stay protected.')};
 $('matchBaseFinish').onclick=()=>{remember();state.baseTexture=state.texture||'none';refresh()};
 $('resetFinishes').onclick=()=>{remember();state.texture='none';state.baseTexture='none';refresh()};
 $('surfaceTexture').onchange=e=>{remember();state.texture=e.target.value;refresh();toast('Surface updated. Texture is included in the 3MF export.')};
 document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.target.matches('textarea,select,input:not([type=range]):not([type=color]):not([type=checkbox])')||e.target.isContentEditable)return;const k=e.key.toLowerCase();if(k==='z'||k==='y'){e.preventDefault();$(k==='y'||e.shiftKey?'redo':'undo').click()}});
});
