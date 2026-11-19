'use strict';
function vasoIsCan(p){return canPresets.some(c=>c[0]===p.id)||p.kind==='straight'}
const renderOrganizedVasoLegacy=renderVesselOptions;
renderVesselOptions=function(){renderOrganizedVasoLegacy();if(!$('vasoCoverage'))return;const p=activeProfile(),can=vasoIsCan(p),tapered=p.kind==='tapered'&&p.top>p.base+.1;
 $('vesselConstruction').hidden=!can;$('taperedSleeveOptions').hidden=!tapered;
 const preset=canPresets.find(c=>c[0]===p.id);if(preset&&p.name!==preset[1]){p.name=preset[1];$('profileName').textContent=p.name}
 let legacy=$('vasoCoverage').querySelector('[value=legacy]');if(!legacy){legacy=document.createElement('option');legacy.value='legacy';legacy.disabled=true;$('vasoCoverage').appendChild(legacy)}legacy.hidden=p.sleeveMode!=='holder';legacy.textContent='Saved coverage · '+(p.bandHeight||60)+' mm';$('vasoCoverage').value=p.sleeveMode==='holder'?'legacy':p.sleeveMode==='band'?(p.bandHeight/(p.height-p.uncovered)>.62?'three-quarter':'half'):'full';
 $('sleeveMode').querySelector('[value=holder]').hidden=true;$('sleeveMode').querySelector('[value=holder]').disabled=true;
 $('vesselConstructionNote').textContent='The can stays supported at the bottom. Add a matching screw-on compartment for extra storage. Measure your can and print a fit test.';
 if(p.sleeveMode==='band')$('profileNote').textContent='The open sleeve follows your measured taper. Adjust its height and position, then print a fit test.';
};
document.addEventListener('DOMContentLoaded',()=>{
 const parts=$('parts'),choices=$('cupProfiles').closest('section'),fit=$('profileDimensions').closest('section'),construction=$('vesselConstruction');choices.id='yourVasoSection';choices.querySelector('h3').textContent='Your Vaso';
 // Keep selecting a can possible even while its construction controls are hidden.
 const quick=$('quickCanSize').closest('label');quick.firstChild.textContent='Can sizes';choices.insertBefore(quick,$('cupProfiles'));choices.querySelector('.section-head').appendChild($('editProfile'));$('editProfile').textContent='Edit selected size';
 const tapered=document.createElement('section');tapered.id='taperedSleeveOptions';tapered.innerHTML='<h3>Sleeve coverage</h3><label class="field">Coverage<select id="vasoCoverage"><option value="full">Full sleeve</option><option value="half">Half sleeve</option><option value="three-quarter">¾ sleeve</option></select></label><p class="help">Open sleeves follow the cup’s taper. Choose a starting coverage, then adjust the height and position.</p>';
 const oldCoverage=$('sleeveMode').closest('label');oldCoverage.hidden=true;tapered.append(oldCoverage,$('bandOptions'));parts.insertBefore(tapered,construction);parts.prepend(choices);parts.appendChild(fit);
 $('vasoCoverage').onchange=()=>{try{const old=activeProfile(),choice=$('vasoCoverage').value;if(choice==='full'){applyCupProfile({...old,parametric:true,sleeveMode:'full',storage:old.sleeveMode==='band'?false:!!old.storage,bandHeight:Math.max(55,old.bandHeight||60),bandStart:0})}else{const available=old.height-old.uncovered,height=Math.round(available*(choice==='half'?.5:.75));applyCupProfile({...old,parametric:true,sleeveMode:'band',storage:false,bandHeight:height,bandStart:Math.floor((available-height)/2)});$('ghost').checked=true;refresh()}renderVesselOptions()}catch(e){toast(e.message);renderVesselOptions()}};
 const changeExisting=changeVesselConstruction;for(const id of ['storageBottom','bandHeight','bandStart'])$(id).onchange=()=>{changeExisting();renderVesselOptions()};renderVesselOptions();
});

function renderVasoDropdown(){const select=$('vasoSize');if(!select)return;const buttons=[...$('cupProfiles').querySelectorAll('button')];select.replaceChildren();for(let i=0;i<buttons.length;i++){const b=buttons[i],o=document.createElement('option');o.value=String(i);o.textContent=b.querySelector('strong')?.textContent||b.textContent;if(b.classList.contains('draft'))o.textContent+=' · add measurements';o.selected=b.classList.contains('active');select.appendChild(o)}const active=buttons.findIndex(b=>b.classList.contains('active'));if(active>=0)select.value=String(active);else{const o=document.createElement('option');o.value='current';o.textContent=activeProfile().name+' · current size';o.selected=true;select.prepend(o);select.value='current'}}
const renderVasoDropdownLegacy=renderCupProfileCards;
renderCupProfileCards=function(){renderVasoDropdownLegacy();renderVasoDropdown()};
document.addEventListener('DOMContentLoaded',()=>{const label=document.createElement('label');label.className='field';label.htmlFor='vasoSize';label.innerHTML='Choose your Vaso<select id="vasoSize"></select>';$('cupProfiles').before(label);$('cupProfiles').hidden=true;$('quickCanSize').closest('label').hidden=true;$('vasoSize').onchange=()=>{const value=$('vasoSize').value;if(value==='current')return;const b=$('cupProfiles').querySelectorAll('button')[Number(value)];if(b)b.click();renderVasoDropdown()};renderVasoDropdown()});
