'use strict';
let buildFeedbackTimer=null,buildStartedAt=0;
function syncBuildFeedback(){
 const panel=$('buildFeedback'),button=$('buildStatus');if(!panel)return;
 panel.hidden=!busy;$('checks').setAttribute('aria-busy',String(busy));
 button.classList.toggle('is-building',busy);
 if(busy){const seconds=Math.floor((Date.now()-buildStartedAt)/1000);$('buildElapsed').textContent=`Time elapsed: ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;button.hidden=false;button.textContent='Building your 3MF…';}
 else{clearInterval(buildFeedbackTimer);buildFeedbackTimer=null;button.textContent=$('downloadResult').hidden?'View export':'Export ready ↗';}
}
function startBuildFeedback(){buildStartedAt=Date.now();clearInterval(buildFeedbackTimer);syncBuildFeedback();buildFeedbackTimer=setInterval(syncBuildFeedback,1000)}
