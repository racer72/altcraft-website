"""Local-only cup studio. No data is sent to an external service."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,os,subprocess,threading,uuid,sys,shutil,webbrowser,traceback
from profile_geometry import validate_profile,outer,art_limits
ROOT=Path(__file__).resolve().parent
BLENDER=shutil.which('blender') or next((str(p) for p in [Path(r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'),Path(r'C:\Program Files\Blender Foundation\Blender 5.0\blender.exe')] if p.exists()),None)
JOBS={};POOL=ThreadPoolExecutor(max_workers=1)
def run_job(job_id):
    job=JOBS[job_id];folder=ROOT/'exports'/job_id
    job.update(status='running',message='Building solid pockets and checking meshes locally. This can take a few minutes…')
    try:
        with (folder/'build.log').open('w',encoding='utf-8') as log:
            result=subprocess.run([BLENDER,'--background','--factory-startup','--python',str(ROOT/'build.py'),'--',str(folder)],cwd=str(ROOT),stdout=log,stderr=subprocess.STDOUT,timeout=600,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        report_path=folder/'report.json'
        report=json.loads(report_path.read_text()) if report_path.exists() else None
        if result.returncode or not report or not report.get('passed'):
            job.update(report=report)
            detail=report.get('summary') if report else 'The geometry builder stopped unexpectedly. See exports/'+job_id+'/build.log.'
            raise ValueError(detail)
        job.update(status='done',message='Build complete',report=report,url='/exports/'+job_id+'/Evergreen-cup-U1.3mf')
    except subprocess.TimeoutExpired:job.update(status='error',message='Build exceeded 10 minutes. Try fewer or simpler decorations.')
    except Exception as e:job.update(status='error',message=str(e))

def validate(data):
    import math
    profile=validate_profile(data.get('profile') or data.get('project',{}).get('profile'))
    data['profile']=profile
    lo,hi=art_limits(profile)
    if not isinstance(data,dict) or len(data.get('palette',[]))!=4:raise ValueError('Four filament colors are required.')
    import re
    if any(not isinstance(c,str) or not re.fullmatch(r'#[0-9A-Fa-f]{6}',c) for c in data['palette']):raise ValueError('Invalid palette.')
    if any(type(data.get('partColors',{}).get(k)) is not int or not 0<=data['partColors'][k]<=3 for k in ['body','base','disk']):raise ValueError('Invalid part filament assignment.')
    parts=data.get('decorations')
    if not isinstance(parts,list) or len(parts)>120:raise ValueError('Maximum 120 exported artwork regions.')
    locked=[d for d in data.get('project',{}).get('decorations',[]) if d.get('lockColors') and d.get('regions')]
    for group in locked:
        if [c.lower() for c in data['palette']]!=[c.lower() for c in group.get('lockedPalette',[])]:raise ValueError('Locked artwork palette was changed.')
        expected={r['id']:r.get('fixedColor') for r in group['regions']}
        actual={d.get('regionId'):d.get('color') for d in parts if d.get('groupId')==group.get('id')}
        if group.get('visible') and actual!=expected:raise ValueError('Locked artwork region colors were changed.')
    for d in parts:
        if type(d.get('color')) is not int or not 0<=d['color']<=3:raise ValueError('Invalid decoration filament.')
        if d.get('mode') not in ['raised','inlay'] or not isinstance(d.get('depth'),(int,float)) or not .6<=d['depth']<=(1.2 if d['mode']=='inlay' else 2):raise ValueError('Unsupported relief depth.')
        if type(d.get('layer',0)) is not int or not 0<=d.get('layer',0)<=2 or d['mode']=='inlay' and d.get('layer',0)!=0:raise ValueError('Invalid raised layer.')
        for mesh_index,mesh in enumerate([d,d.get('cutter',{}),d.get('stackCutter',d.get('cutter',{}))]):
            v=mesh.get('vertices');f=mesh.get('triangles')
            combined_pocket=mesh_index==1 and not d.get('skipPocket') and any(g.get('id')==d.get('groupId') and len(g.get('regions',[]))>1 for g in data.get('project',{}).get('decorations',[]))
            vertex_limit=300000 if d.get('wrapScene') or combined_pocket else 150000
            triangle_limit=vertex_limit*2
            if not isinstance(v,list) or not isinstance(f,list) or not 4<=len(v)<=vertex_limit or not 4<=len(f)<=triangle_limit:
                label=['artwork','combined pocket' if combined_pocket else 'pocket','layer cutter'][mesh_index]
                raise ValueError(str(d.get('name','Decoration'))+' '+label+' is invalid or too large. Limits: '+str(vertex_limit)+' vertices and '+str(triangle_limit)+' triangles.')
            for p in v:
                if not isinstance(p,list) or len(p)!=3 or not all(isinstance(x,(float,int)) and math.isfinite(x) for x in p):raise ValueError('Invalid mesh vertex.')
                x,y,z=p;r=math.hypot(x,y);outer_r=outer(z,profile)
                if d.get('target')=='base':
                    k=profile['base']/71.2 if profile.get('parametric') else 1
                    if profile.get('parametric') and not profile['storage'] or d['mode']!='raised' or d.get('layer',0):raise ValueError('Cap artwork needs storage and a raised base layer.')
                    if z<3.8 or z>34.2 or r<40.1*k-1.3 or r>40.1*k+3:raise ValueError('Cap artwork enters a protected area.')
                elif z<lo-(.15 if mesh_index==2 else .01) or z>hi+(.15 if mesh_index==2 else .01) or r<outer_r-1.221 or r>outer_r+7.101:raise ValueError('Decoration enters a protected mechanical area.')
            if any(not isinstance(t,list) or len(t)!=3 or any(type(i) is not int or i<0 or i>=len(v) for i in t) for t in f):raise ValueError('Invalid triangle index.')
    return data

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def authorized(self):return self.headers.get('Host','').split(':')[0] in ['127.0.0.1','localhost']
    def send_json(self,data,status=200):
        raw=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
    def do_GET(self):
        if not self.authorized():return self.send_json({'error':'Localhost only'},403)
        path=self.path.split('?')[0]
        if path=='/api/info':return self.send_json({'builder':bool(BLENDER),'version':1})
        if path.startswith('/api/jobs/'):
            return self.send_json(JOBS.get(path.rsplit('/',1)[-1],{'status':'error','message':'Job not found'}))
        if path.startswith('/mechanics/') and not path.endswith(('.bin','.json')):return self.send_error(403)
        if path.endswith(('.py','.npz','.cmd','.log')):return self.send_error(403)
        super().do_GET()
    def do_POST(self):
        if not self.authorized():return self.send_json({'error':'Localhost only'},403)
        origin=self.headers.get('Origin','')
        if origin and origin not in ['http://'+self.headers['Host']]:return self.send_json({'error':'Origin refused'},403)
        if self.path!='/api/build':return self.send_error(404)
        if not BLENDER:return self.send_json({'error':'Blender is required for solid exports.'},503)
        try:
            if not self.headers.get('Content-Type','').startswith('application/json'):raise ValueError('JSON required.')
            length=int(self.headers.get('Content-Length',0))
            if length<1 or length>64000000:raise ValueError('Project exceeds the build request size limit (64 MB).')
            data=validate(json.loads(self.rfile.read(length)))
            if any(j['status'] in ['running','queued'] for j in JOBS.values()):raise ValueError('A build is already running. Please wait for it to finish.')
            key=uuid.uuid4().hex;folder=ROOT/'exports'/key;folder.mkdir(parents=True)
            (folder/'request.json').write_text(json.dumps(data),encoding='utf-8')
            JOBS[key]={'status':'queued','message':'Queued for local geometry builder…'};POOL.submit(run_job,key);self.send_json({'id':key},202)
        except Exception as e:
            (ROOT/'exports').mkdir(parents=True,exist_ok=True)
            (ROOT/'exports'/'last-request-error.txt').write_text(str(e),encoding='utf-8')
            self.send_json({'error':str(e)},400)
    def log_message(self,fmt,*args):
        # Keep local build polling from filling a launcher output pipe.
        if self.path.startswith('/api/jobs/'):return
        super().log_message(fmt,*args)
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff');super().end_headers()

if __name__=='__main__':
    port=int(os.environ.get('CUP_STUDIO_PORT','8780'))
    try:server=ThreadingHTTPServer(('127.0.0.1',port),Handler)
    except OSError:
        print('Studio is already running, or port',port,'is in use.');sys.exit(1)
    print('Evergreen Cup Studio: http://127.0.0.1:'+str(port),flush=True)
    if '--open' in sys.argv:webbrowser.open('http://127.0.0.1:'+str(port))
    server.serve_forever()
