'use strict';
const STUDIO_BACKDROPS={christmas:{file:'christmas-workshop-painterly-v1',ext:'jpg',name:'Christmas workshop'},viking:{file:'viking-tavern-painterly-v1',ext:'jpg',name:'Nordic tavern'},'new-year':{file:'new-year-celebration-painterly-v1',ext:'jpg',name:'Midnight celebration'},valentine:{file:'valentine-atelier-painterly-v1',ext:'jpg',name:'Rose atelier'},essentials:{file:'retro-kitchen-painterly-v1',ext:'jpg',name:'Retro kitchen'},personal:{file:'holographic-studio-painterly-v1',ext:'jpg',name:'Holographic atelier'}};
let studioBackdropEnabled=true,studioBackdropKey='',studioPlainFloor=null,studioShadowFloor=null;
try{studioBackdropEnabled=localStorage.getItem('vaso-backdrop-enabled')!=='false'}catch(e){}
function syncStudioBackdrop(){
 if(!scene||!renderer||!studioFloor)return;
 const theme=STUDIO_BACKDROPS[state.activePack]||STUDIO_BACKDROPS.essentials,show=studioBackdropEnabled&&state.view!=='layout',key=[theme.file,show].join(':');
 if(studioBackdropKey!==key){
  studioBackdropKey=key;const viewport=$('viewport');viewport.style.backgroundImage=show?`linear-gradient(#ffffff18,#ffffff0a),url("assets/backdrops/${theme.file}.${theme.ext||'svg'}")`:'none';viewport.dataset.backdrop=show?theme.file:'plain';viewport.closest('.workspace').classList.toggle('themed-backdrop',show);
  scene.background=show?null:new THREE.Color('#EDF0E7');renderer.setClearColor('#EDF0E7',show?0:1);
  if(!studioPlainFloor){studioPlainFloor=studioFloor.material;studioShadowFloor=new THREE.ShadowMaterial({color:'#403428',opacity:.18});}
  studioFloor.material=show?studioShadowFloor:studioPlainFloor;
 }
 if(typeof syncRoomAtmosphere==='function')syncRoomAtmosphere();
 const button=$('themeBackdropToggle');if(button){button.textContent=studioBackdropEnabled?'Backdrop: on':'Backdrop: off';button.setAttribute('aria-pressed',String(studioBackdropEnabled));button.title=state.view==='layout'?'The build plate always uses a plain background':theme.name+' · preview setting';}
}
const applyLayoutBeforeBackdrop=applyLayout;
applyLayout=function(...args){const result=applyLayoutBeforeBackdrop(...args);syncStudioBackdrop();return result};
document.addEventListener('DOMContentLoaded',()=>{
 const button=document.createElement('button');button.id='themeBackdropToggle';button.className='backdrop-toggle';button.onclick=()=>{studioBackdropEnabled=!studioBackdropEnabled;try{localStorage.setItem('vaso-backdrop-enabled',String(studioBackdropEnabled))}catch(e){}syncStudioBackdrop()};
 const workspace=document.querySelector('.workspace');workspace.appendChild(button);$('assetCategory').addEventListener('change',syncStudioBackdrop);syncStudioBackdrop();
});
