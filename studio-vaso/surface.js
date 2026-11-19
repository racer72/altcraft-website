'use strict';
const PRINT_TEXTURES=['wood','brick','knit','scales','waves','ripple','circuit'];
function patternedCut(t,h,kind){
 const a=(t+Math.PI)/(2*Math.PI);
 if(kind==='waves'||kind==='ripple'){const amp=kind==='waves'?1.5:1+1.7*(1-Math.cos(h*.045));return Math.pow((1+Math.cos((h-amp*Math.sin(t*12))*Math.PI/4))/2,7)}
 if(kind==='scales'){const row=Math.floor(h/9),u=((a*20+(row%2)*.5)%1+1)%1,v=h%9,target=1+6*Math.sqrt(Math.max(0,1-Math.pow(2*u-1,2)));return Math.exp(-Math.pow((v-target)/.7,2))}
 if(kind==='circuit'){const lane=Math.floor(a*24),u=((a*24)%1+1)%1,period=h%36,bend=period<12?.25:period<20?.25+(period-12)/16:.75,trace=Math.exp(-Math.pow((u-bend)/.065,2)),node=Math.exp(-Math.pow((u-.75)/.17,2)-Math.pow((period-28)/1.2,2));return Math.max(trace*(period<28?1:0),node)}
 return 0;
}

// Carve only the exterior skin. Seats, cavity, handle and threads stay intact.
function surfacePoint(pt,p,kind){
 if(!PRINT_TEXTURES.includes(kind))return pt;
 const [x,y,z]=pt,g=profileDimensions(p),r=Math.hypot(x,y),outer=profileOuterRadius(z,p);
 if(z<g.seat+5||z>g.rim-5||Math.abs(r-outer)>.045)return pt;
 const theta=Math.atan2(y,x),a=(theta+Math.PI)/(2*Math.PI),h=z-g.seat;
 let cut;
 if(kind==='brick'){
  const row=Math.floor(h/14),v=h%14,u=((a*12+(row%2)*.5)%1+1)%1;
  cut=Math.min(v,14-v)<.75||Math.min(u,1-u)<.025?1:0;
 }else if(['scales','waves','ripple','circuit'].includes(kind)){cut=patternedCut(theta,h,kind)}else{
  const phase=theta*32+.7*Math.sin(h*.075+theta*4)+.25*Math.sin(h*.2);
  cut=Math.pow((1+Math.cos(phase))/2,12);
 }
 const fade=Math.min(1,(z-g.seat-5)/2,(g.rim-5-z)/2),nr=r-.35*cut*Math.max(0,fade);
 return[x*nr/r,y*nr/r,z];
}
function baseSurfacePoint(pt,kind){
 if(!PRINT_TEXTURES.includes(kind))return pt;
 const [x,y,z]=pt,r=Math.hypot(x,y);
 // The internal thread reaches about R37.05; only the R40.1 exterior is carved.
 if(Math.abs(r-40.1)>.025||z<=1||z>=37)return pt;
 const t=Math.atan2(y,x),a=(t+Math.PI)/(2*Math.PI),h=z-1;
 let cut;
 if(kind==='brick'){const row=Math.floor(h/8),v=h%8,u=((a*12+(row%2)*.5)%1+1)%1;cut=Math.min(v,8-v)<.65||Math.min(u,1-u)<.025?1:0;}
 else if(kind==='knit'){const u=((a*36)%1+1)%1,v=(h%6)/6,target=.12+.76*Math.abs(u-.5)*2;cut=.8*Math.exp(-Math.pow((v-target)/.13,2))+.2*Math.pow((1+Math.cos(u*2*Math.PI))/2,8);}
 else if(['scales','waves','ripple','circuit'].includes(kind)){cut=patternedCut(t,h,kind)}
 else{const phase=t*32+.7*Math.sin(h*.075+t*4)+.25*Math.sin(h*.2);cut=Math.pow((1+Math.cos(phase))/2,12);}
 const nr=r-.35*cut*Math.min(1,z-1,37-z);
 return[x*nr/r,y*nr/r,z];
}
