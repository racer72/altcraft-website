'use strict';
const studioSteps=[
 ['Cup size','Start with the right fit','parts','Choose the cup or bottle you are covering. Add a measured size if yours is not listed.'],
 ['Handle','Choose the shape and grip','handles','Pick a handle style, then adjust its reach and thickness. You can come back to this at any time.'],
 ['Texture','Finish the sleeve and base','finishes','Choose a sleeve finish and a screw-on bottom finish. They can match or be different.'],
 ['Artwork','Add shapes, words and color','design','Choose a pack below and click a shape to add it. Drag artwork on the cup; select a layer on the right to resize or stack it. Finished multicolor art keeps its approved colors.'],
 ['Review & export','Check it, then make it','review','Look around your design, check the flat layout and inspect the print layout. Build your 3MF when you are ready.']
];let currentStudioStep=0;
function chooseStudioStep(index){currentStudioStep=index;const step=studioSteps[index];document.querySelectorAll('.workflow-step').forEach((b,i)=>{b.classList.toggle('active',i===index);if(i===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
 if(step[2]==='review'){document.querySelectorAll('.library-sidebar .panel').forEach(p=>p.hidden=p.id!=='reviewPanel')}else document.querySelector('[data-tab="'+step[2]+'"]').click();
 $('stepNumber').textContent='STEP '+(index+1)+' OF 5';$('stepTitle').textContent=step[0];$('stepHelp').textContent=step[3];$('previousStep').disabled=index===0;$('nextStep').disabled=index===4;document.querySelector('.library-sidebar').scrollTop=0;
}
document.addEventListener('DOMContentLoaded',()=>{
 const rail=document.createElement('aside');rail.className='workflow-rail';rail.setAttribute('aria-label','Design workflow');rail.innerHTML='<div class="workflow-intro"><span class="eyebrow">YOUR WORKSPACE</span><h2>Make your cup.</h2><p>Follow the steps, or jump back whenever you like.</p></div><nav id="workflowSteps" aria-label="Design steps"></nav><div class="rail-view-heading">VIEW YOUR DESIGN</div><div id="railViews" class="rail-views"></div><div class="step-navigation"><button id="previousStep" aria-label="Previous step">Back</button><button id="nextStep" aria-label="Next step">Next →</button></div>';
 document.querySelector('main').prepend(rail);
 studioSteps.forEach((s,i)=>{const b=document.createElement('button');b.className='workflow-step';b.innerHTML='<span class="step-index">'+(i+1)+'</span><span><strong>'+s[0]+'</strong><small>'+s[1]+'</small></span>';b.onclick=()=>chooseStudioStep(i);$('workflowSteps').appendChild(b)});
 for(const id of ['assembled','flatPreview','layout'])$('railViews').appendChild($(id));$('assembled').textContent='3D design view';$('flatPreview').textContent='2D wrap layout';$('layout').textContent='Print layout';
 $('openHandles').hidden=true;$('openTextures').hidden=true;
 const title=document.querySelector('.canvas-title>div');title.replaceChildren();title.innerHTML='<div id="stepNumber" class="eyebrow"></div><h2 id="stepTitle"></h2><p id="stepHelp"></p>';
 // Keep the pack-title target for existing library updates without mixing it into step guidance.
 const packTitle=document.createElement('span');packTitle.id='canvasTitle';packTitle.hidden=true;title.appendChild(packTitle);
 const review=document.createElement('div');review.id='reviewPanel';review.className='panel';review.hidden=true;review.innerHTML='<section class="review-start"><div><div class="eyebrow">BEFORE YOU PRINT</div><h2>Ready for the real thing?</h2><p>Use the views on the left to check placement. Save your project so you can keep editing later.</p></div><div class="review-checklist"><p><strong>1. Look around</strong> Check the artwork, colors and handle.</p><p><strong>2. Check the layouts</strong> Review the wrap and the separate printable parts.</p><p><strong>3. Build your file</strong> Export runs the geometry checks. Review supports and layers in your slicer.</p></div><button id="guidedExport" class="primary">Build checked 3MF →</button></section>';
 document.querySelector('.library-sidebar').appendChild(review);$('guidedExport').onclick=()=>$('export').click();$('previousStep').onclick=()=>chooseStudioStep(Math.max(0,currentStudioStep-1));$('nextStep').onclick=()=>chooseStudioStep(Math.min(4,currentStudioStep+1));
 chooseStudioStep(0);
});
