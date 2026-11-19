"""Printable exterior carving, matching surface.js; no change to protected parts."""
import math
from profile_geometry import dimensions,outer
def patterned_cut(t,h,kind):
    a=(t+math.pi)/(2*math.pi)
    if kind in ['waves','ripple']:
        amp=1.5 if kind=='waves' else 1+1.7*(1-math.cos(h*.045))
        return ((1+math.cos((h-amp*math.sin(t*12))*math.pi/4))/2)**7
    if kind=='scales':
        row=math.floor(h/9);u=(a*20+(row%2)*.5)%1;v=h%9;target=1+6*math.sqrt(max(0,1-(2*u-1)**2))
        return math.exp(-((v-target)/.7)**2)
    if kind=='circuit':
        u=(a*24)%1;period=h%36;bend=.25 if period<12 else .25+(period-12)/16 if period<20 else .75
        trace=math.exp(-((u-bend)/.065)**2);node=math.exp(-((u-.75)/.17)**2-((period-28)/1.2)**2)
        return max(trace*(1 if period<28 else 0),node)
    return 0

def surface_point(pt,p,kind):
    if kind not in ['wood','brick','knit','scales','waves','ripple','circuit']:return pt
    x,y,z=pt;g=dimensions(p);rim=g['seat']+g['coverage'];r=math.hypot(x,y)
    if z<g['seat']+5 or z>rim-5 or abs(r-outer(z,p))>.045:return pt
    theta=math.atan2(y,x);a=(theta+math.pi)/(2*math.pi);h=z-g['seat']
    if kind=='brick':
        row=math.floor(h/14);v=h%14;u=(a*12+(row%2)*.5)%1
        cut=1 if min(v,14-v)<.75 or min(u,1-u)<.025 else 0
    elif kind in ['scales','waves','ripple','circuit']:
        cut=patterned_cut(theta,h,kind)
    else:
        phase=theta*32+.7*math.sin(h*.075+theta*4)+.25*math.sin(h*.2)
        cut=((1+math.cos(phase))/2)**12
    fade=max(0,min(1,(z-g['seat']-5)/2,(rim-5-z)/2));nr=r-.35*cut*fade
    return [x*nr/r,y*nr/r,z]

def base_surface_point(pt,kind):
    if kind not in ['wood','brick','knit','scales','waves','ripple','circuit']:return pt
    x,y,z=pt;r=math.hypot(x,y)
    if abs(r-40.1)>.025 or z<=1 or z>=37:return pt
    t=math.atan2(y,x);a=(t+math.pi)/(2*math.pi);h=z-1
    if kind=='brick':
        row=math.floor(h/8);v=h%8;u=(a*12+(row%2)*.5)%1
        cut=1 if min(v,8-v)<.65 or min(u,1-u)<.025 else 0
    elif kind=='knit':
        u=(a*36)%1;v=(h%6)/6;target=.12+.76*abs(u-.5)*2
        cut=.8*math.exp(-((v-target)/.13)**2)+.2*((1+math.cos(u*2*math.pi))/2)**8
    elif kind in ['scales','waves','ripple','circuit']:
        cut=patterned_cut(t,h,kind)
    else:
        phase=t*32+.7*math.sin(h*.075+t*4)+.25*math.sin(h*.2)
        cut=((1+math.cos(phase))/2)**12
    nr=r-.35*cut*min(1,z-1,37-z)
    return [x*nr/r,y*nr/r,z]
