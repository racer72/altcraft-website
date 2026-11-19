'use strict';
function renderLayerColorButtons(){const root=$('layerColors'),d=getSelected();if(!root||!d)return;root.replaceChildren();state.palette.forEach((color,i)=>{const b=document.createElement('button');b.className='layer-swatch'+(d.color===i?' active':'');b.style.setProperty('--swatch',color);b.type='button';b.setAttribute('aria-label','Color selected layer with filament '+(i+1));b.setAttribute('aria-pressed',String(d.color===i));b.textContent=i+1;b.onclick=()=>{if(d.color===i)return;remember();d.color=i;refresh()};root.appendChild(b)})}
const renderDetailsBeforeLayout=renderEditor;
renderEditor=function(){renderDetailsBeforeLayout();renderLayerColorButtons()};
document.addEventListener('DOMContentLoaded',()=>{
 const inspector=document.querySelector('.inspector'),heading=inspector.querySelector('.inspector-heading'),layers=$('objects').closest('section'),palette=$('palette').closest('section');
 layers.classList.add('layer-shelf');heading.after(layers);const details=document.createElement('details');details.className='filament-settings';const summary=document.createElement('summary');summary.textContent='Edit your four filament colors';details.append(summary,palette);inspector.append(details);
 document.querySelector('.library-sidebar .intro h2').textContent='Your design shelf';document.querySelector('.library-sidebar .intro p').textContent='Choose a shape. Make it your own.';
 $('clear').onclick=()=>{if(!state.decorations.length)return toast('Your design is already clear.');remember();state.decorations=[];selected=null;refresh();toast('Design cleared. Undo brings it back.');};
 renderLayerColorButtons();
});
