'use strict';
// One continuous workspace. Existing project, geometry, history and exports stay in charge.
let flowReady=false,flowArtMode='add',flowLastSelection=null;
const FLOW_STAGES=[
 ['Fit your cup','Cup & fit','Choose the container, then set how much of it you want to cover.'],
 ['Choose a handle','Handle','Choose a comfortable shape and adjust the grip.'],
 ['Set the look','Surface & color','Choose textures and colors for the sleeve and its bottom.'],
 ['Make it yours','Artwork','Add a design, then select it on the cup to adjust its placement.'],
 ['Ready to print?','Review','Check your design and save an editable copy before building the print file.']
];
function flowSetArtMode(mode){
 flowArtMode=mode==='edit'&&getSelected()?'edit':'add';flowApplyStage();
}
function flowApplyStage(){
 if(!flowReady)return;
 const art=currentStudioStep===3,editing=art&&flowArtMode==='edit'&&!!getSelected();
 $('flowArtTabs').hidden=!art;
 $('flowAddArt').setAttribute('aria-selected',String(!editing));$('flowEditArt').setAttribute('aria-selected',String(editing));$('flowEditArt').disabled=!getSelected();
 document.querySelector('.inspector').hidden=!editing;
 if(art)$('design').hidden=editing;
 document.body.dataset.flowStage=String(currentStudioStep);document.body.dataset.flowArtMode=editing?'edit':'add';
 $('previousStep').disabled=currentStudioStep===0;
 $('nextStep').disabled=!!busy;
 $('nextStep').textContent=['Next: Handle','Next: Surface & color','Next: Artwork','Review design','Build 3MF'][currentStudioStep];
 $('nextStep').classList.add('primary');
 $('flowSelectedName').textContent=getSelected()?.name||'No design selected';
 $('flowLayersCount').textContent=String(state.decorations.length);
 $('flowLayersEmpty').hidden=state.decorations.length>0;
}
function flowSync(){
 if(!flowReady)return;
 const d=getSelected();
 if(currentStudioStep===3&&d&&d.id!==flowLastSelection)flowArtMode='edit';
 flowLastSelection=d?.id||null;
 flowApplyStage();
 const p=activeProfile(),g=profileDimensions(p),handle=[...$('handleStyle').options].find(o=>o.value===state.handle?.style)?.textContent||'Original handle',finish=[...$('surfaceTexture').options].find(o=>o.value===(state.texture||'none'))?.textContent||'Smooth';
 $('flowReviewFit').textContent=`${p.name} · ${p.base.toFixed(1)} → ${p.top.toFixed(1)} mm`;
 $('flowReviewLook').textContent=`${handle} · ${finish}`;
 const visible=state.decorations.filter(a=>a.visible).length;$('flowReviewArt').textContent=`${visible} visible ${visible===1?'design':'designs'} · ${g.coverage.toFixed(1)} mm covered`;
 const name=state.projectName||'Untitled Vaso';$('flowCanvasProject').textContent=name;
 if($('lockedArtworkNote'))$('lockedArtworkNote').textContent='This design keeps its pack colors. Move, resize and layer it as one piece.';
}
const flowLegacyChoose=chooseStudioStep;
chooseStudioStep=function(index){
 const previous=currentStudioStep;flowLegacyChoose(index);
 if(flowReady){if(index===3&&previous!==3)flowArtMode='add';flowApplyStage();const scroll=document.querySelector('.library-sidebar .panel:not([hidden])');if(scroll)scroll.scrollTop=0;document.querySelector('.inspector').scrollTop=0}
};
const flowLegacyEditor=renderEditor;
renderEditor=function(...args){const result=flowLegacyEditor(...args);flowSync();return result};
const flowLegacyRefresh=refresh;
refresh=function(...args){const result=flowLegacyRefresh(...args);flowSync();return result};
const flowLegacyDrag=beginArtworkDrag;
beginArtworkDrag=function(...args){const result=flowLegacyDrag(...args);if(flowReady){if(currentStudioStep!==3)chooseStudioStep(3);flowSetArtMode('edit')}return result};

document.addEventListener('DOMContentLoaded',()=>{
 document.body.classList.add('flow-workspace');
 const main=document.querySelector('main'),library=document.querySelector('.library-sidebar'),workspace=document.querySelector('.workspace'),inspector=document.querySelector('.inspector'),rail=document.querySelector('.workflow-rail');
 FLOW_STAGES.forEach((s,i)=>{studioSteps[i][0]=s[0];studioSteps[i][3]=s[2];const b=document.querySelectorAll('.workflow-step')[i];b.querySelector('strong').textContent=s[1];b.title=s[2]});
 // A single tool column: library and selected-art editor occupy the same location.
 const heading=document.querySelector('.designer-tools-heading');
 const tabs=document.createElement('div');tabs.id='flowArtTabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Artwork tools');tabs.innerHTML='<button id="flowAddArt" role="tab" aria-selected="true">Add artwork</button><button id="flowEditArt" role="tab" aria-selected="false">Edit selected</button>';
 heading.after(tabs);$('flowAddArt').onclick=()=>flowSetArtMode('add');$('flowEditArt').onclick=()=>flowSetArtMode('edit');
 const selectedName=document.createElement('div');selectedName.className='flow-selection-label';selectedName.innerHTML='<span>EDITING</span><strong id="flowSelectedName"></strong>';inspector.prepend(selectedName);
 library.appendChild(inspector);
 const pack=document.querySelector('.creator-room');if(pack){pack.querySelector('span').textContent='ARTWORK PACK';$('design').prepend(pack)}
 // Project naming belongs with file actions; layers remain available beside the cup.
 const project=document.createElement('label');project.className='flow-project-name';project.textContent='PROJECT';project.appendChild($('projectName'));document.querySelector('.header-actions').before(project);
 const layers=inspector.querySelector('.layer-shelf'),drawer=document.createElement('details');drawer.id='flowLayerDrawer';drawer.innerHTML='<summary>On your cup <span id="flowLayersCount">0</span><span class="flow-drawer-chevron" aria-hidden="true">⌃</span></summary><p id="flowLayersEmpty">Added designs appear here. Select one to edit it.</p>';drawer.appendChild(layers);library.appendChild(drawer);
 $('objects').addEventListener('click',e=>{if(e.target.closest('.select-object')){if(currentStudioStep!==3)chooseStudioStep(3);flowSetArtMode('edit');drawer.open=false}});
 const footer=document.createElement('div');footer.className='flow-step-footer';footer.appendChild(document.querySelector('.step-navigation'));library.appendChild(footer);
 $('previousStep').onclick=()=>chooseStudioStep(Math.max(0,currentStudioStep-1));$('nextStep').onclick=()=>currentStudioStep<4?chooseStudioStep(currentStudioStep+1):$('export').click();
 // All material choices live in Surface & color, reference-display options in View.
 const colors=$('bodyColor').closest('section'),palette=inspector.querySelector('.filament-settings'),colorSection=document.createElement('section');colorSection.className='flow-color-section';colorSection.innerHTML='<h3>Cup colors</h3><p class="help">Assign your four filaments to the printed parts.</p>';
 for(const id of ['bodyColor','baseColor','diskColor'])colorSection.appendChild($(id).closest('label'));
 $('finishes').appendChild(colorSection);$('finishes').appendChild(palette);
 const options=document.createElement('details');options.className='flow-view-options';options.innerHTML='<summary>View options</summary><div class="flow-view-options-content"></div>';
 const optionsContent=options.querySelector('div');for(const id of ['themeBackdropToggle','roomMotionToggle'])if($(id))optionsContent.appendChild($(id));
 for(const id of ['ghost','wire'])optionsContent.appendChild($(id).closest('label'));
 colors.remove();
 const viewbar=document.createElement('div');viewbar.className='flow-canvas-bar';viewbar.innerHTML='<span id="flowCanvasProject"></span>';viewbar.appendChild($('railViews'));viewbar.appendChild(options);workspace.prepend(viewbar);
 $('assembled').textContent='3D view';$('flatPreview').textContent='2D layout';$('layout').textContent='Print layout';
 const clearRow=document.createElement('div');clearRow.className='flow-library-actions';clearRow.appendChild($('clear'));$('design').appendChild(clearRow);
 if($('buildStatus'))document.querySelector('.header-actions').insertBefore($('buildStatus'),$('export'));
 // Review is a summary with direct routes back, rather than a second set of tools.
 const review=$('reviewPanel').querySelector('.review-checklist');review.replaceChildren();
 for(const [title,id,index]of [['Cup & fit','flowReviewFit',0],['Surface & handle','flowReviewLook',1],['Artwork','flowReviewArt',3]]){
  const card=document.createElement('div');card.className='flow-review-card';const text=document.createElement('div'),h=document.createElement('strong'),p=document.createElement('p'),edit=document.createElement('button');h.textContent=title;p.id=id;edit.textContent='Edit';edit.onclick=()=>chooseStudioStep(index);text.append(h,p);card.append(text,edit);review.appendChild(card)
 }
 const save=document.createElement('button');save.textContent='Save editable project';save.onclick=()=>$('saveProject').click();save.className='flow-review-save';$('guidedExport').before(save);$('guidedExport').textContent='Build checked 3MF';
 const reviewNote=document.createElement('p');reviewNote.className='help';reviewNote.textContent='Geometry is checked when you build the file. Review supports and layers in your slicer before printing.';$('guidedExport').after(reviewNote);
 // Put related edits together: placement first, then dimensions and relief.
 $('editor').querySelector('.section-head').classList.add('flow-editor-heading');
 const footnote=document.createElement('p');footnote.className='flow-editor-tip';footnote.textContent='Tip: click a design on the cup to edit it here. Arrow keys nudge; Shift moves farther.';$('editor').appendChild(footnote);
 $('designer-keyboard-help')?.remove();
 for(const id of ['toggleDesignDetails','closeDesignDetails','toggleInspector'])if($(id))$(id).hidden=true;
 const header=document.querySelector('header');new ResizeObserver(()=>{document.documentElement.style.setProperty('--flow-header-height',header.getBoundingClientRect().height+'px')}).observe(header);
 flowLastSelection=getSelected()?.id||null;flowReady=true;chooseStudioStep(currentStudioStep);flowSync();requestAnimationFrame(()=>resize());
});

document.addEventListener('DOMContentLoaded',()=>{document.getElementById('creatorTheme')?.setAttribute('aria-label','Artwork pack')});

document.addEventListener('DOMContentLoaded',()=>{const p=document.querySelector('#reviewPanel .review-start>p');if(p)p.textContent='Use the views above the cup to check placement. Save your project so you can keep editing later.'});
