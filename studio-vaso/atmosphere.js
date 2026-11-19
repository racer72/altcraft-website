'use strict';
let roomMotionEnabled=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const saved=localStorage.getItem('vaso-room-motion');if(saved!==null)roomMotionEnabled=saved==='true'}catch(e){}
let roomCanvas=null,roomCtx=null,roomFrame=0,roomLastTime=0,roomTime=0,roomWidth=0,roomHeight=0,roomRunning=false;
const roomParticles=Array.from({length:48},(_,i)=>({x:((i*73)%193)/193,y:((i*47)%173)/173,r:1+(i%4)*.4,s:.025+(i%6)*.006,phase:i*1.78}));
function roomImagePoint(x,y){const scale=Math.max(roomWidth/1672,roomHeight/941);return [(roomWidth-1672*scale)/2+x*1672*scale,(roomHeight-941*scale)/2+y*941*scale,scale]}
function roomGlow(x,y,r,alpha){const p=roomImagePoint(x,y),g=roomCtx.createRadialGradient(p[0],p[1],0,p[0],p[1],r*p[2]);g.addColorStop(0,'rgba(255,153,48,'+alpha+')');g.addColorStop(1,'rgba(255,153,48,0)');roomCtx.fillStyle=g;roomCtx.fillRect(p[0]-r*p[2],p[1]-r*p[2],r*p[2]*2,r*p[2]*2)}

let tavernFlameMask=null;
function prepareTavernFlames(){
 const image=new Image();image.onload=()=>{
  const x=Math.round(image.naturalWidth*.054),y=Math.round(image.naturalHeight*.315),w=Math.round(image.naturalWidth*.16),h=Math.round(image.naturalHeight*.24),mask=document.createElement('canvas');mask.width=w;mask.height=h;const ctx=mask.getContext('2d');ctx.drawImage(image,x,y,w,h,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h);
  for(let row=0;row<h;row++)for(let col=0;col<w;col++){const i=(row*w+col)*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],heat=Math.max(0,Math.min(1,(r-165)/65))*Math.max(0,Math.min(1,(g-68)/80))*(r>b*1.25?1:0),edge=Math.min(1,col/18,(w-1-col)/18,row/16,(h-1-row)/16);pixels.data[i+3]=Math.round(255*heat*edge*.8)}
  ctx.putImageData(pixels,0,0);if(roomCanvas)roomCanvas.dataset.flameTexture='ready';const warp=document.createElement('canvas');warp.width=w+40;warp.height=h+40;tavernFlameMask={canvas:mask,warp,ctx:warp.getContext('2d'),x:x/image.naturalWidth,y:y/image.naturalHeight,w:w/image.naturalWidth,h:h/image.naturalHeight};
 };image.src='assets/backdrops/viking-tavern-painterly-v1.png';
}
function drawTavernFlames(){
 if(!tavernFlameMask)return;const f=tavernFlameMask,origin=roomImagePoint(f.x,f.y),end=roomImagePoint(f.x+f.w,f.y+f.h),w=f.canvas.width,h=f.canvas.height,sx=(end[0]-origin[0])/w,sy=(end[1]-origin[1])/h;
 f.ctx.clearRect(0,0,f.warp.width,f.warp.height);f.ctx.globalAlpha=.7;
 for(let y=0;y<h;y++){const rise=1-y/h,dx=(Math.sin(roomTime*4.7+y*.055)+.45*Math.sin(roomTime*7.2-y*.033))*(2+7*rise),dy=-Math.sin(roomTime*3.4+y*.025)*2.7*rise;f.ctx.drawImage(f.canvas,0,y,w,Math.min(2,h-y),20+dx,20+y+dy,w,Math.min(2,h-y))}
 roomCtx.save();roomCtx.globalCompositeOperation='screen';roomCtx.globalAlpha=.65;roomCtx.filter='blur('+(.85*origin[2])+'px)';roomCtx.drawImage(f.warp,origin[0]-20*sx,origin[1]-20*sy,f.warp.width*sx,f.warp.height*sy);roomCtx.filter='none';roomCtx.globalAlpha=1;
 for(let i=0;i<9;i++){const life=(roomTime*(.22+(i%3)*.035)+i*.143)%1,point=roomImagePoint(.09+(i%4)*.023+Math.sin(roomTime+i)*.004,.535-life*.22);roomCtx.fillStyle='rgba(255,187,83,'+Math.sin(Math.PI*life)*.38+')';roomCtx.beginPath();roomCtx.arc(point[0],point[1],(1+(i%2))*.7*point[2],0,TAU);roomCtx.fill()}
 roomCtx.restore();
}


function drawNewYearRoom(){
 // Quiet, distant gold bursts remain inside the winter window.
 const a=roomImagePoint(.125,.055),b=roomImagePoint(.24,.49);roomCtx.save();roomCtx.beginPath();roomCtx.rect(a[0],a[1],b[0]-a[0],b[1]-a[1]);roomCtx.clip();
 for(let i=0;i<3;i++){const t=(roomTime+i*2.5)%8;if(t>2.4)continue;const life=t/2.4,p=roomImagePoint(.157+i*.027,.30+(i%2)*.065),r=(12+55*Math.sqrt(life))*p[2],alpha=Math.sin(Math.PI*life)*.32;roomCtx.strokeStyle='rgba(255,223,154,'+alpha+')';roomCtx.lineWidth=Math.max(.7,p[2]);for(let k=0;k<14;k++){const angle=k*TAU/14+i*.23,drop=life*life*8*p[2];roomCtx.beginPath();roomCtx.moveTo(p[0]+Math.cos(angle)*r*.67,p[1]+Math.sin(angle)*r*.67+drop);roomCtx.lineTo(p[0]+Math.cos(angle)*r,p[1]+Math.sin(angle)*r+drop);roomCtx.stroke()}}
 roomCtx.restore();for(const [i,pos] of [[0,[.1,.49]],[1,[.126,.54]],[2,[.26,.57]],[3,[.845,.27]],[4,[.86,.3]],[5,[.98,.27]]])roomGlow(pos[0],pos[1],34,.045+.022*Math.sin(roomTime*2.1+i));
}

function drawRetroRoom(){
 roomGlow(.07,.28,260,.018+.008*Math.sin(roomTime*.38));
 for(const p of roomParticles.slice(0,16)){const y=(p.y-roomTime*p.s*.16+100)%1,point=roomImagePoint(.015+p.x*.14,.10+y*.45);roomCtx.fillStyle='rgba(255,244,209,'+(.05+.06*Math.sin(Math.PI*y))+')';roomCtx.beginPath();roomCtx.arc(point[0],point[1],p.r*.55*point[2],0,TAU);roomCtx.fill()}
}
function drawHologramRoom(){
 roomCtx.save();roomCtx.globalCompositeOperation='screen';
 for(const [i,pos] of [[0,[.06,.28]],[1,[.945,.285]]]){const p=roomImagePoint(pos[0],pos[1]),radius=150*p[2],g=roomCtx.createRadialGradient(p[0],p[1],0,p[0],p[1],radius),color=i?'157,115,255':'72,204,255';g.addColorStop(0,'rgba('+color+','+(.035+.015*Math.sin(roomTime*.7+i))+')');g.addColorStop(1,'rgba('+color+',0)');roomCtx.fillStyle=g;roomCtx.fillRect(p[0]-radius,p[1]-radius,radius*2,radius*2);roomCtx.strokeStyle='rgba('+color+',.22)';roomCtx.lineWidth=Math.max(.6,p[2]);roomCtx.beginPath();roomCtx.ellipse(p[0],p[1],(i?145:120)*p[2],34*p[2],i?-.25:.08,roomTime*.16+i,roomTime*.16+i+Math.PI*.75);roomCtx.stroke()}
 roomCtx.restore();
}

function paintRoomFrame(now){
 roomFrame=0;if(!roomRunning)return;roomFrame=requestAnimationFrame(paintRoomFrame);if(now-roomLastTime<33)return;const dt=Math.min(.06,(now-roomLastTime)/1000||.033);roomLastTime=now;roomTime+=dt;
 const rect=$('viewport').getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.5);if(rect.width!==roomWidth||rect.height!==roomHeight){roomWidth=rect.width;roomHeight=rect.height;roomCanvas.width=Math.round(roomWidth*dpr);roomCanvas.height=Math.round(roomHeight*dpr);roomCtx.setTransform(dpr,0,0,dpr,0,0)}roomCtx.clearRect(0,0,roomWidth,roomHeight);
 const christmas=state.activePack==='christmas',valentine=state.activePack==='valentine',newYear=state.activePack==='new-year',flicker=.055+.025*Math.sin(roomTime*7)+.015*Math.sin(roomTime*13.7);if(christmas||valentine||newYear||state.activePack==='viking')roomGlow(christmas?.95:valentine?.98:newYear?.98:.13,valentine?.64:newYear?.63:.49,225,flicker);if(state.activePack==='viking')drawTavernFlames();
 if(christmas){
  // Clip snowfall to the window, behind the tree and inside its frame.
  const a=roomImagePoint(.178,.04),b=roomImagePoint(.255,.48);roomCtx.save();roomCtx.beginPath();roomCtx.rect(a[0],a[1],b[0]-a[0],b[1]-a[1]);roomCtx.clip();
  for(const p of roomParticles){const y=(p.y+roomTime*p.s)%1,point=roomImagePoint(.172+p.x*.09+Math.sin(roomTime*.5+p.phase)*.005,.02+y*.49);roomCtx.fillStyle='rgba(235,246,255,'+(.38+p.r*.12)+')';roomCtx.beginPath();roomCtx.arc(point[0],point[1],p.r*point[2],0,TAU);roomCtx.fill()}roomCtx.restore();
  for(const [i,pos] of [[0,[.047,.107]],[1,[.098,.169]],[2,[.034,.267]],[3,[.12,.347]],[4,[.077,.443]],[5,[.13,.525]]])roomGlow(pos[0],pos[1],11,.12+.10*Math.sin(roomTime*.9+i*1.7));
 }else if(newYear){
  drawNewYearRoom();
 }else if(valentine){
  for(const [i,pos] of [[0,[.067,.51]],[1,[.905,.26]],[2,[.94,.33]],[3,[.765,.60]]])roomGlow(pos[0],pos[1],30,.045+.025*Math.sin(roomTime*2.3+i));
 }else if(state.activePack==='halloween'){
  for(const [i,pos] of [[0,[.08,.36]],[1,[.12,.44]],[2,[.16,.52]],[3,[.77,.55]],[4,[.86,.36]],[5,[.92,.36]]])roomGlow(pos[0],pos[1],42,.045+.018*Math.sin(roomTime*6.1+i)+.009*Math.sin(roomTime*10.7+i));
 }else if(state.activePack==='halloween'){
  for(const [i,pos] of [[0,[.08,.36]],[1,[.12,.44]],[2,[.16,.52]],[3,[.77,.55]],[4,[.86,.36]],[5,[.92,.36]]])roomGlow(pos[0],pos[1],42,.045+.018*Math.sin(roomTime*6.1+i)+.009*Math.sin(roomTime*10.7+i));
 }else if(state.activePack==='steampunk'){
  roomGlow(.91,.37,110,.025+.01*Math.sin(roomTime*.6));for(const p of roomParticles.slice(0,12)){const life=(p.y+roomTime*.06)%1,q=roomImagePoint(.91+Math.sin(roomTime*.6+p.phase)*.012,.51-life*.2);roomCtx.fillStyle='rgba(245,235,211,'+Math.sin(Math.PI*life)*.035+')';roomCtx.beginPath();roomCtx.arc(q[0],q[1],(4+life*12)*q[2],0,TAU);roomCtx.fill()}
 }else if(state.activePack==='echopunk'){drawRetroRoom();
 }else if(state.activePack==='naughty-christmas'){
 for(const [i,pos] of [[0,[.08,.64]],[1,[.89,.62]],[2,[.95,.62]]])roomGlow(pos[0],pos[1],45,.035+.012*Math.sin(roomTime*4+i));
 }else if(state.activePack==='essentials'){drawRetroRoom();
 }else if((state.activePack==='personal'||state.activePack==='cyberpunk')){drawHologramRoom();
 }else{
  for(const p of roomParticles){const y=1-(p.y+roomTime*p.s*.45)%1,point=roomImagePoint(.07+p.x*.22+Math.sin(roomTime*.25+p.phase)*.008,.15+y*.51);roomCtx.fillStyle='rgba(255,222,153,'+(.035+.08*Math.sin(Math.PI*y))+')';roomCtx.beginPath();roomCtx.arc(point[0],point[1],p.r*.65*point[2],0,TAU);roomCtx.fill()}
 }
}
function syncRoomAtmosphere(){
 if(!roomCanvas)return;const themed=['christmas','viking','valentine','new-year','essentials','personal','cyberpunk','halloween','steampunk','echopunk','naughty-christmas'].includes(state.activePack),modal=!!document.querySelector('dialog[open]'),show=studioBackdropEnabled&&state.view!=='layout'&&themed,run=show&&roomMotionEnabled&&!document.hidden&&!modal;
 roomCanvas.hidden=!show;if(run&&!roomRunning){roomRunning=true;roomLastTime=0;roomFrame=requestAnimationFrame(paintRoomFrame)}else if(!run){roomRunning=false;if(roomFrame)cancelAnimationFrame(roomFrame);roomFrame=0;roomCtx.clearRect(0,0,roomWidth,roomHeight)}
 roomCanvas.dataset.motion=run?'running':'paused';const b=$('roomMotionToggle');if(b){b.hidden=!show;b.textContent=roomMotionEnabled?'Motion: on':'Motion: off';b.setAttribute('aria-pressed',String(roomMotionEnabled));}
}
document.addEventListener('DOMContentLoaded',()=>{
 roomCanvas=document.createElement('canvas');roomCanvas.id='roomAtmosphere';roomCanvas.setAttribute('aria-hidden','true');roomCtx=roomCanvas.getContext('2d');$('viewport').prepend(roomCanvas);prepareTavernFlames();
 const b=document.createElement('button');b.id='roomMotionToggle';b.className='atmosphere-toggle';b.onclick=()=>{roomMotionEnabled=!roomMotionEnabled;try{localStorage.setItem('vaso-room-motion',String(roomMotionEnabled))}catch(e){}syncRoomAtmosphere()};document.querySelector('.workspace').appendChild(b);$('assetCategory').addEventListener('change',syncRoomAtmosphere);document.addEventListener('visibilitychange',syncRoomAtmosphere);$('flatPreview').addEventListener('click',syncRoomAtmosphere);$('flatDialog').addEventListener('close',syncRoomAtmosphere);syncRoomAtmosphere();
});
