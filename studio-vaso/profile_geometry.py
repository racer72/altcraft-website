"""Same measured-profile mapping used by the browser. Threads at z<=38 stay fixed."""
import math
DEFAULT={'id':'original-cup','name':'Original tapered cup','base':71.2,'top':89.8,'height':171.45,'uncovered':1,'kind':'tapered','measured':True}
def dimensions(p):
    return {'coverage':p['bandHeight'] if p.get('parametric') and p['sleeveMode']!='full' else p['height']-p['uncovered'],'seat':(4 if p['sleeveMode']=='band' else 6.4) if p.get('parametric') and not p['storage'] else 44+max(0,p['base']/2-35.6),'slope':(p['top']-p['base'])/(2*p['height']),'delta':p['base']/2-35.6}
def validate_profile(raw=None):
    p={**DEFAULT,**(raw or {})}
    for k in ['base','top','height','uncovered']:
        if type(p[k]) not in [int,float] or not math.isfinite(p[k]):raise ValueError('Cup dimensions must be finite numbers.')
    if not(50<=p['base']<=110 and 50<=p['top']<=120 and 80<=p['height']<=240 and 0<=p['uncovered']<=70 and p['height']-p['uncovered']>=60):raise ValueError('Unsupported cup dimensions.')
    if p.get('parametric'):
        if p.get('sleeveMode')=='band' and (p['kind']=='straight' or p.get('storage')):p['sleeveMode']='holder'
        if p.get('sleeveMode') not in ['full','band','holder'] or type(p.get('storage')) is not bool:raise ValueError('Invalid sleeve construction.')
        for k in ['bandHeight','bandStart']:
            if type(p.get(k)) not in [int,float] or not math.isfinite(p[k]):raise ValueError('Invalid band dimensions.')
        if not((25 if p['sleeveMode']=='band' else 55)<=p['bandHeight']<=p['height']-p['uncovered'] and 0<=p['bandStart']<=p['height']-p['uncovered']-p['bandHeight']) or p['sleeveMode']!='band' and p['bandStart']!=0:raise ValueError('Invalid band position.')
        if p['sleeveMode']=='band' and (p['kind']!='tapered' or p['top']<=p['base']+.1 or p['storage']):raise ValueError('Open cafe sleeves require a cup that widens upward, with storage off.')
    elif p['base']<69 or p['top']<69:raise ValueError('Smaller vessels require parametric construction.')
    d=dimensions(p)
    if abs(d['slope'])>.20 or d['seat']+d['coverage']>260:raise ValueError('Cup exceeds the supported taper or print height.')
    if p['kind'] not in ['tapered','straight']:raise ValueError('Curved bottles require a measured contour.')
    return p
def outer(z,p):
    d=dimensions(p);return p['base']/2+3.2+((p['bandStart'] if p.get('parametric') and p['sleeveMode']=='band' else 0)+z-d['seat'])*d['slope']
def art_limits(p):
    d=dimensions(p);return d['seat']+7,d['seat']+d['coverage']-6
def map_point(x,y,z,p):
    if p.get('parametric'):
        from vessel_geometry import storage_point
        return storage_point(x,y,z,p)
    d=dimensions(p);r=math.hypot(x,y);nr=r;nz=z
    if 38<z<42:
        t=(z-38)/4;source=35.4+3.4*t;target=35.4+(3.4+d['delta'])*t
        nz=38+t*(d['seat']-2-38);nr=32.4+(r-32.4)*(target-32.4)/(source-32.4)
    elif 42<=z<=44:
        nz=d['seat']-2+(z-42);nr=r+d['delta']*max(0,min(1,(r-32.4)/3.4))
    elif z>44:
        nz=d['seat']+(z-44)*d['coverage']/170.45
        source=36+(z-44)*9.3/171.45;target=p['base']/2+.4+(nz-d['seat'])*d['slope'];nr=r+target-source
    return (x*nr/r,y*nr/r,nz) if r else (x,y,nz)
