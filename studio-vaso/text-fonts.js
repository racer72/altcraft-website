"use strict";
const VASO_TEXT_FONTS={clean:{name:'Clean bold',family:'VasoClean',weight:700},chunky:{name:'Playful chunky',family:'VasoChunky',weight:400},tall:{name:'Tall block',family:'VasoTall',weight:400},classic:{name:'Classic serif',family:'VasoClassic',weight:400}};
function selectedStudioFont(){return VASO_TEXT_FONTS[$('textFont')?.value]||VASO_TEXT_FONTS.clean}
function updateStudioTextPreview(){const preview=$('textFontPreview');if(!preview)return;const font=selectedStudioFont();preview.style.fontFamily='"'+font.family+'",sans-serif';preview.style.fontWeight=String(font.weight);preview.textContent=$('textInput').value.trim()||'Your words here';}
async function studioTextOutline(value,fontId){
 const font=VASO_TEXT_FONTS[fontId]||VASO_TEXT_FONTS.clean;
 const loaded=await document.fonts.load(font.weight+' 90px "'+font.family+'"',value);if(!loaded.length)throw Error('This lettering style could not load. Start the app with its launcher, then try again.');
 const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=190;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font=font.weight+' 100px "'+font.family+'"';const px=Math.min(100,100*1020/Math.max(1,ctx.measureText(value).width));ctx.font=font.weight+' '+px+'px "'+font.family+'"';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='black';ctx.fillText(value,550,95);return traceCanvas(canvas);
}
async function addStudioText(){
 const value=$('textInput').value.trim();if(!value)return;const id=$('textFont').value,font=VASO_TEXT_FONTS[id]||VASO_TEXT_FONTS.clean;const traced=await studioTextOutline(value,id);addDecoration('tree',{name:safeName(value),loops:traced.loops,size:15,textValue:value,textFontId:id,textFontName:font.name,booleanSolver:'MANIFOLD'});toast('Added '+font.name.toLowerCase()+' lettering. Resize it on the cup.');
}
document.addEventListener('DOMContentLoaded',()=>{$('textInput').addEventListener('input',updateStudioTextPreview);$('textFont').addEventListener('change',updateStudioTextPreview);updateStudioTextPreview()});
