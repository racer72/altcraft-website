"""Parametric handle paths; matching handles.js. Dimensions are millimeters."""
from pathlib import Path
import json,math
from profile_geometry import DEFAULT,dimensions,outer
PATHS=json.loads((Path(__file__).parent/'mechanics/handle-paths.json').read_text())
STYLES=['original','classic','tree','oval','horn','log','none']
def validate_handle(raw=None,p=DEFAULT):
 h={'style':'oval' if p.get('parametric') else 'original','reach':34,'thickness':13,**(raw or {})}
 if p.get('parametric') and h['style']=='original':raise ValueError('Choose a parametric handle or No handle for this sleeve.')
 if h['style'] not in STYLES:raise ValueError('Choose a supported handle style.')
 for k,lo,hi in [('reach',26,44),('thickness',10,14)]:
  if type(h[k]) not in [float,int] or not math.isfinite(h[k]) or not lo<=h[k]<=hi:raise ValueError('Handle reach must be 26–44 mm and grip thickness 10–14 mm.')
 if h['style'] not in ['original','none'] and dimensions(p)['coverage']<(55 if p.get('parametric') and h['style']=='oval' else 120):raise ValueError('These handle styles need at least 120 mm of sleeve coverage.')
 return h
def handle_mesh(raw,p):
 h=validate_handle(raw,p)
 if h['style'] in ['original','none']:return None
 g=dimensions(p);radius=h['thickness']/2;path=[]
 if h['style']=='horn':
  vertices=[]
  for gap,y,t in PATHS['hornMesh']['vertices']:
   z=g['seat']+t*g['coverage'];yy=y*h['thickness']/13;x=outer(z,p)+gap*h['reach']/34;inner=outer(z,p)-2.5
   if math.hypot(x,yy)<inner:x=math.sqrt(max(0,inner*inner-yy*yy))
   vertices.append([x,yy,z])
  return {'vertices':vertices,'triangles':[t[:] for t in PATHS['hornMesh']['triangles']]}
 if h['style'] in ['oval','horn','log']:
  lo=g['seat']+max(g['coverage']*.13,14);hi=g['seat']+g['coverage']-max(g['coverage']*.11,14)
  for i in range(129):
   t=i/128;a=math.pi*t;z=(lo+hi)/2-(hi-lo)*math.cos(a)/2
   path.append([outer(z,p)-.7+(h['reach']+radius+.7)*math.sin(a)*(1-.10*math.cos(a) if h['style']=='horn' else 1+.45*math.cos(a)**2 if h['style']=='log' else 1),z])
 else:
  for x,z in PATHS[h['style']]:
   nz=g['seat']+(z-44)*g['coverage']/170.45;gap=x-(38.8+(z-44)*9.3/171.45)
   gap=max(-.7,gap)+max(0,gap)*(h['reach']/34-1)+(radius-6.5)*max(0,min(1,gap/10))
   path.append([outer(nz,p)+gap,nz])
 v=[];f=[];K=32
 def clip(x,y,z,end=False):
  # End caps stay buried in the wall, outside the cup cavity.
  inner=outer(z,p)-2.8+.3
  if math.hypot(x,y)<inner:x=math.sqrt(max(0,inner*inner-y*y))
  limit=outer(z,p)-.25
  if end and math.hypot(x,y)>limit:x=math.sqrt(max(0,limit*limit-y*y))
  return [x,y,z]
 for i,(x,z) in enumerate(path):
  prev=path[max(0,i-1)];nxt=path[min(len(path)-1,i+1)];dx=nxt[0]-prev[0];dz=nxt[1]-prev[1];length=math.hypot(dx,dz)
  for k in range(K):
   a=k*2*math.pi/K;t=i/(len(path)-1)
   rr=radius*(1.25-.5*t if h['style']=='horn' else 1+.08*(1-math.cos(a))/2*math.sin(math.pi*t)*(math.cos(5*a+.7*math.sin(3*math.pi*t))+.35*math.cos(9*a)) if h['style']=='log' else 1)
   u=rr*math.cos(a);y=rr*math.sin(a)
   v.append(clip(x-u*dz/length,y,z+u*dx/length,i==0 or i==len(path)-1))
 for i in range(len(path)-1):
  for k in range(K):
   a=i*K+k;b=i*K+(k+1)%K;f.extend([[a,b,b+K],[a,b+K,a+K]])
 for end,base in [(False,0),(True,(len(path)-1)*K)]:
  x,z=path[-1] if end else path[0];idx=len(v);v.append(clip(x,0,z))
  for k in range(K):f.append([base+k,base+(k+1)%K,idx] if end else [base+(k+1)%K,base+k,idx])
 return {'vertices':v,'triangles':[t[::-1] for t in f]}
