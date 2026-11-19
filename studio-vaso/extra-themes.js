'use strict';
const makePacksBeforeExtras=makeStudioPacks;
makeStudioPacks=function(){const base=makePacksBeforeExtras(),ids=new Set(VASO_EXTRA_THEME_PACKS.map(p=>p.id));return [...base.filter(p=>!ids.has(p.id)),...VASO_EXTRA_THEME_PACKS.map(p=>{const previous=base.find(b=>b.id===p.id);return previous&&['valentine','new-year'].includes(p.id)?{...p,assets:[...p.assets,...previous.assets]}:p})]};
function applyExtraThemePalette(pack){
 if(!canApplyPackPalette(pack.palette))return false;
 if(!samePalette(state.palette,pack.palette)){remember();state.palette=pack.palette.slice();refresh()}
 return true;
}
const addArtworkBeforeExtras=addLibraryArtwork;
addLibraryArtwork=function(a){const pack=VASO_EXTRA_THEME_PACKS.find(p=>p.id===a.theme);if(pack&&!applyExtraThemePalette(pack))return;return addArtworkBeforeExtras(a)};
STUDIO_BACKDROPS.halloween={file:'halloween-workshop-painterly-v1',ext:'jpg',name:'Moonlit Halloween workshop'};
STUDIO_BACKDROPS.cyberpunk={file:'cyberpunk-workshop-painterly-v1',ext:'jpg',name:'Neon city workshop'};


STUDIO_BACKDROPS.steampunk={file:'steampunk-workshop-painterly-v1',ext:'jpg',name:'Airship workshop'};
STUDIO_BACKDROPS.echopunk={file:'echopunk-workshop-painterly-v1',ext:'jpg',name:'Overgrown greenhouse workshop'};
const renderEditorBeforePackNotes=renderEditor;
renderEditor=function(...args){const result=renderEditorBeforePackNotes(...args);let note=document.getElementById('packPrintNotes');const d=getSelected();if(!note&&document.getElementById('editor')){note=document.createElement('p');note.id='packPrintNotes';note.className='help';document.getElementById('editor').appendChild(note)}if(note){note.hidden=!d?.printNotes?.length;note.textContent=d?.printNotes?.join(' ')||''}return result};

STUDIO_BACKDROPS['naughty-christmas']={file:'desert-christmas-mall-painterly-v1',ext:'jpg',name:'Desert Christmas mall'};
