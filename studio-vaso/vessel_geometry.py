"""Alternate sleeve foundations. Legacy fitted-cup geometry remains unchanged."""
import math
from profile_geometry import dimensions,outer
from surface_geometry import surface_point,base_surface_point

def storage_scale(p):return p['base']/71.2 if p.get('parametric') else 1

def storage_point(x,y,z,p):
    d=dimensions(p);k=storage_scale(p);r=math.hypot(x,y);nr=r;nz=z
    if z<=38:nr=r*k
    elif z<42:
        t=(z-38)/4;source=35.4+3.4*t;target=35.4*k+(p['base']/2+3.2-35.4*k)*t
        nr=32.4*k+(r-32.4)*(target-32.4*k)/(source-32.4);nz=38+t*(d['seat']-2-38)
    elif z<=44:
        nr=p['base']/2+.4+(r-36) if r>=36 else 32.4*k+(r-32.4)*(p['base']/2+.4-32.4*k)/3.6
        nz=d['seat']-2+z-42
    else:
        nz=d['seat']+(z-44)*d['coverage']/170.45
        nr=r+(p['base']/2+.4+(nz-d['seat'])*d['slope'])-(36+(z-44)*9.3/171.45)
    return [x*nr/r,y*nr/r,nz] if r else [x,y,nz]

def sleeve_mesh(p,texture='none'):
    d=dimensions(p);seat=d['seat'];rim=seat+d['coverage'];lo=4;path=[]
    for i in range(math.ceil((rim-lo)/2)+1):
        z=lo+(rim-lo)*i/math.ceil((rim-lo)/2);path.append([outer(z,p),z])
    path.extend([[outer(rim,p)-2.8,rim],[outer(seat,p)-2.8,seat]])
    if p['sleeveMode']!='band':path.extend([[p['base']/2-10,seat],[p['base']/2-10,lo]])
    n=256;v=[];f=[]
    for r,z in path:
        for i in range(n):
            a=2*math.pi*i/n;v.append(surface_point([r*math.cos(a),r*math.sin(a),z],p,texture))
    for j in range(len(path)):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;c=((j+1)%len(path))*n+i;e=((j+1)%len(path))*n+(i+1)%n
            f.extend([[a,b,e],[a,e,c]])
    return {'vertices':v,'triangles':f}

def base_point(pt,p,texture):
    x,y,z=base_surface_point(pt,texture);k=storage_scale(p);return [x*k,y*k,z]
