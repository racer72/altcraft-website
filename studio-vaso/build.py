"""Blender solid builder; input vertices are in the original millimeter coordinates."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import sys,json,io,hashlib,xml.etree.ElementTree as ET,math
import bpy,bmesh,numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from surface_geometry import surface_point,base_surface_point
from handle_geometry import validate_handle,handle_mesh
from vessel_geometry import sleeve_mesh,base_point,storage_scale
from profile_geometry import validate_profile,dimensions,outer,art_limits,map_point
ROOT=Path(__file__).resolve().parent
FOLDER=Path(sys.argv[sys.argv.index('--')+1]);REQUEST=json.loads((FOLDER/'request.json').read_text())
PROFILE=validate_profile(REQUEST.get('profile') or REQUEST.get('project',{}).get('profile'))
HANDLE=validate_handle(REQUEST.get('project',{}).get('handle'),PROFILE)
TEXTURE=REQUEST.get('project',{}).get('texture','none')
BASE_TEXTURE=REQUEST.get('project',{}).get('baseTexture','none')
USE_MANIFOLD=TEXTURE!='none' or any(d.get('booleanSolver')=='MANIFOLD' or d.get('preparedPartition') and d.get('booleanSolver')!='EXACT' for d in REQUEST['decorations'])
MIN_ART,MAX_ART=art_limits(PROFILE)
for decoration in REQUEST['decorations']:
    level=decoration.get('layer',0)
    if type(level) is not int or not 0<=level<=2 or decoration['mode']=='inlay' and level!=0:raise ValueError('Invalid raised layer.')
REQUEST['decorations']=sorted(REQUEST['decorations'],key=lambda d:d.get('layer',0))
REPORT={'passed':False,'parts':[],'checks':{},'summary':''}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def create(name,v,f):
    me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);return ob
def load(name,file):
    if file=='final-body-shell.npz' and PROFILE.get('parametric') and not PROFILE['storage']:
        mesh=sleeve_mesh(PROFILE,TEXTURE);return create(name,mesh['vertices'],mesh['triangles'])
    source=('bare-body-dense.npz' if TEXTURE in ['wood','brick','scales','waves','ripple','circuit'] else 'bare-body.npz') if file=='final-body-shell.npz' and HANDLE['style']!='original' else ('textured-body-shell.npz' if file=='final-body-shell.npz' and TEXTURE in ['wood','brick','scales','waves','ripple','circuit'] else file)
    d=np.load(ROOT/'mechanics'/source);v=d['v'].tolist();
    if file=='final-body-shell.npz':v=[surface_point(map_point(*p,PROFILE),PROFILE,TEXTURE) for p in v]
    elif file=='final-red-cap.npz':v=[base_point(p,PROFILE,BASE_TEXTURE) for p in v]
    elif file=='final-separator-disk.npz':v=[[x*(PROFILE['base']/2-.1)/35.5,y*(PROFILE['base']/2-.1)/35.5,z] for x,y,z in v]
    f=d['f']
    if file=='final-body-shell.npz' and TEXTURE in ['wood','brick','scales','waves','ripple','circuit']:
        # Custom radial mapping can collapse sub-micron edges at Float32 precision.
        # Weld exact coincident output coordinates before making the reference mesh.
        v,inv=np.unique(np.asarray(v,dtype=np.float32),axis=0,return_inverse=True)
        f=inv[f];f=f[(f[:,0]!=f[:,1])&(f[:,1]!=f[:,2])&(f[:,0]!=f[:,2])]
        v=v.tolist()
    return create(name,v,f.tolist())
def triangulate(ob):
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free();ob.data.update()
def clean_boolean_skin(ob,outward=2.75,tolerance=.00002):
    """Repair only microscopic numerical slivers in the decorated outer skin."""
    bm=bmesh.new();bm.from_mesh(ob.data)
    def skin(v):
        x,y,z=v.co;outer_r=outer(z,PROFILE);r=math.hypot(x,y)
        if ob.name=='Screw-on storage base':return 3.8<z<34.2 and r>39.3*storage_scale(PROFILE)
        return MIN_ART-.02<z<MAX_ART+.02 and outer_r-1.23<r<outer_r+outward
    verts=[v for v in bm.verts if skin(v)]
    bmesh.ops.remove_doubles(bm,verts=verts,dist=tolerance)
    edges=[e for e in bm.edges if all(skin(v) for v in e.verts)]
    bmesh.ops.dissolve_degenerate(bm,edges=edges,dist=tolerance)
    boundary={e for e in bm.edges if e.is_boundary}
    while boundary:
        first=boundary.pop();component={first};queue=[first]
        while queue:
            edge=queue.pop()
            for v in edge.verts:
                for other in v.link_edges:
                    if other in boundary:boundary.remove(other);component.add(other);queue.append(other)
        if sum(e.calc_length() for e in component)<.02 and all(skin(v) for e in component for v in e.verts):
            bmesh.ops.holes_fill(bm,edges=list(component),sides=12)
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    for _ in range(3):
        small=[f for f in bm.faces if f.calc_area()<1e-9 and all(skin(v) for v in f.verts)]
        if not small:break
        edges=list({e for f in small for e in f.edges})
        bmesh.ops.dissolve_degenerate(bm,edges=edges,dist=.001)
        bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free();ob.data.update()
def collapse_skin_slivers(ob,outward=2.75):
    bm=bmesh.new();bm.from_mesh(ob.data)
    def allowed(v):
        x,y,z=v.co;r=math.hypot(x,y)
        return MIN_ART-.02<z<MAX_ART+.02 and outer(z,PROFILE)-1.23<r<outer(z,PROFILE)+outward
    fixed=0;flipped=0
    for _ in range(80):
        small=[f for f in bm.faces if f.calc_area()<1e-9]
        if not small:break
        chosen=[];blocked=set();seen=set()
        for face in small:
            for edge in sorted(face.edges,key=lambda e:e.calc_length()):
                if edge in seen:continue
                seen.add(edge);a,b=edge.verts
                if a in blocked or b in blocked or not edge.is_manifold or not allowed(a) or not allowed(b) or edge.calc_length()>.01:continue
                na={e.other_vert(a) for e in a.link_edges};nb={e.other_vert(b) for e in b.link_edges}
                opposite={v for f in edge.link_faces for v in f.verts if v not in edge.verts}
                if na.intersection(nb)==opposite:
                    chosen.append(edge);blocked.update(na|nb|{a,b});break
        if not chosen:
            bm.normal_update();improved=False
            for face in small:
                for edge in sorted(face.edges,key=lambda e:e.calc_length(),reverse=True):
                    if not edge.is_manifold or edge.calc_length()>.01 or any(len(f.verts)!=3 for f in edge.link_faces):continue
                    corners={v for f in edge.link_faces for v in f.verts}
                    if not all(allowed(v) for v in corners):continue
                    ref=max(edge.link_faces,key=lambda f:f.calc_area());origin=ref.verts[0].co
                    if max(abs(ref.normal.dot(v.co-origin)) for v in corners)>.002:continue
                    before=sum(f.calc_area()<1e-9 for f in edge.link_faces)
                    result=bmesh.ops.rotate_edges(bm,edges=[edge],use_ccw=False).get('edges',[])
                    if not result:continue
                    new_edge=result[0];after=sum(f.calc_area()<1e-9 for f in new_edge.link_faces)
                    if new_edge.is_manifold and after<before:improved=True;flipped+=1;break
                    bmesh.ops.rotate_edges(bm,edges=[new_edge],use_ccw=False)
                if improved:break
            if improved:continue
            break
        bmesh.ops.collapse(bm,edges=chosen,uvs=False);fixed+=len(chosen)
    wires=[e for e in bm.edges if e.is_wire and all(allowed(v) for v in e.verts)]
    if wires:bmesh.ops.delete(bm,geom=wires,context='EDGES')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free();ob.data.update()
    print('Safely collapsed microscopic skin edges: '+str(fixed)+'; retriangulated corners: '+str(flipped),flush=True)

def split_pinched_skin_fans(ob):
    """Separate coincident face fans at microscopic Boolean pinch edges.

    This changes connectivity only, never coordinates or the protected mechanics.
    Larger defects remain failures for the existing export audit.
    """
    bm=bmesh.new();bm.from_mesh(ob.data);bm.verts.ensure_lookup_table();bm.faces.ensure_lookup_table()
    def allowed(v):
        x,y,z=v.co;r=math.hypot(x,y)
        return MIN_ART-.02<z<MAX_ART+.02 and outer(z,PROFILE)-1.23<r<outer(z,PROFILE)+2.75
    defects=[e for e in bm.edges if not e.is_manifold]
    if not defects:
        bm.free();return 0
    print('Pinch-edge audit: '+str([{'length':e.calc_length(),'faces':len(e.link_faces),'points':[list(v.co) for v in e.verts]} for e in defects[:6]]),flush=True)
    if any(len(e.link_faces)!=4 or e.calc_length()>.1 or not all(allowed(v) for v in e.verts) for e in defects):
        bm.free();return 0
    vertices=[list(v.co) for v in bm.verts];faces=[list(v.index for v in f.verts) for f in bm.faces];fixed=0
    for vertex in {v for e in defects for v in e.verts}:
        remaining=set(vertex.link_faces);fans=[]
        while remaining:
            queue=[remaining.pop()];fan=[]
            while queue:
                face=queue.pop();fan.append(face)
                for edge in face.edges:
                    if vertex not in edge.verts or len(edge.link_faces)!=2:continue
                    for neighbor in edge.link_faces:
                        if neighbor in remaining:remaining.remove(neighbor);queue.append(neighbor)
            fans.append(fan)
        for fan in fans[1:]:
            index=len(vertices);vertices.append(list(vertex.co));fixed+=1
            for face in fan:faces[face.index]=[index if i==vertex.index else i for i in faces[face.index]]
    bm.free()
    if fixed:
        mesh=bpy.data.meshes.new(ob.name+' repaired skin');mesh.from_pydata(vertices,[],faces);mesh.update();ob.data=mesh
    print('Separated microscopic skin fans: '+str(fixed),flush=True)
    return fixed

def inspect(ob):
    bm=bmesh.new();bm.from_mesh(ob.data)
    small_faces=[face for face in bm.faces if face.calc_area()<1e-9]
    for face in small_faces[:5]:print('Small face in '+ob.name+': '+str([list(v.co) for v in face.verts]),flush=True)
    if len(small_faces)>5:print(str(len(small_faces))+' microscopic faces found in '+ob.name,flush=True)
    boundary=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges);degenerate=sum(f.calc_area()<1e-9 for f in bm.faces);volume=bm.calc_volume(signed=True);bm.free()
    v=np.array([p.co[:] for p in ob.data.vertices]);bounds=[v.min(0).tolist(),v.max(0).tolist()] if len(v) else None
    return {'name':ob.name,'vertices':len(ob.data.vertices),'triangles':len(ob.data.polygons),'boundary_edges':boundary,'nonmanifold_edges':nonmanifold,'degenerate_faces':degenerate,'signed_volume_mm3':volume,'bounds':bounds,'passed':not(boundary or nonmanifold or degenerate) and volume>1e-5}
def boolean(target,cutter,operation):
    bpy.context.view_layer.objects.active=target
    mod=target.modifiers.new(operation,'BOOLEAN');mod.solver='MANIFOLD' if USE_MANIFOLD else 'EXACT';mod.operation=operation;mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
def copy_obj(ob,name):
    c=ob.copy();c.data=ob.data.copy();c.name=name;bpy.context.collection.objects.link(c);return c
def remove(ob):bpy.data.objects.remove(ob,do_unlink=True)
def bounds_intersect(a,b):
    av=[a.matrix_world@v.co for v in a.data.vertices];bv=[b.matrix_world@v.co for v in b.data.vertices]
    return all(min(p[k] for p in av)<max(p[k] for p in bv)-.00001 and min(p[k] for p in bv)<max(p[k] for p in av)-.00001 for k in range(3))
def intersection_volume(a,b):
    if not bounds_intersect(a,b):return 0
    c=copy_obj(a,'Intersection check');boolean(c,b,'INTERSECT');bm=bmesh.new();bm.from_mesh(c.data);vol=abs(bm.calc_volume(signed=True));bm.free();remove(c);return vol
def arrays(ob):
    v=np.empty(len(ob.data.vertices)*3,np.float32);ob.data.vertices.foreach_get('co',v);v=v.reshape(-1,3)
    f=np.empty(len(ob.data.polygons)*3,np.int32);ob.data.polygons.foreach_get('vertices',f);return v,f.reshape(-1,3)
def same_mesh(ob,file):
    d=np.load(ROOT/'mechanics'/file);v,f=arrays(ob);return np.array_equal(v,d['v']) and np.array_equal(f,d['f'])

def package(parts):
    NS='http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
    model=ET.Element('model',{'unit':'millimeter','xml:lang':'en-US','xmlns':NS,'xmlns:slic3rpe':'http://schemas.slic3r.org/3mf/2017/06'})
    for key,value in [('Application','OrcaSlicer-02.03.00'),('BambuStudio:3mfVersion','1'),('Title','Studio Vaso — Snapmaker U1')]:ET.SubElement(model,'metadata',name=key).text=value
    resources=ET.SubElement(model,'resources');materials=ET.SubElement(resources,'basematerials',id='100')
    for i,color in enumerate(REQUEST['palette']):ET.SubElement(materials,'base',name='Filament '+str(i+1),displaycolor=color+'FF')
    config=ET.Element('config')
    for i,(ob,slot,group) in enumerate(parts,1):
        obj=ET.SubElement(resources,'object',id=str(i),type='model',pid='100',pindex=str(slot));mesh=ET.SubElement(obj,'mesh');vertices=ET.SubElement(mesh,'vertices');tris=ET.SubElement(mesh,'triangles')
        v,f=arrays(ob)
        for x,y,z in v:ET.SubElement(vertices,'vertex',x=f'{x:.6f}',y=f'{y:.6f}',z=f'{z:.6f}')
        for a,b,c in f:ET.SubElement(tris,'triangle',v1=str(a),v2=str(b),v3=str(c),pid='100',p1=str(slot))
    wrappers=[(200,'Decorated sleeve and handle','body',(80,100,-4)),(201,'Screw-on storage base','base',(220,205,0)),(202,'Cup seat separator disk','disk',(210,90,0))]
    build=ET.SubElement(model,'build')
    if PROFILE.get('parametric'):wrappers=[(200,'Sleeve and optional handle','body',(85,198,-4)),(201,'Matching screw-on storage base','base',(65,65,0)),(202,'Cup seat separator disk','disk',(210,65,0))]
    for oid,name,group,pos in wrappers:
        if not any(g==group for _,_,g in parts):continue
        for ob,_,g in parts:
            if g!=group:continue
            vv=arrays(ob)[0]+np.array(pos);lo=vv.min(0);hi=vv.max(0)
            if min(lo)<-.001 or hi[0]>270 or hi[1]>270 or hi[2]>270:raise ValueError('The print layout exceeds the 270 mm build plate. Reduce the size or handle reach.')
        REPORT['checks']['within_270mm_build_volume']=True
        wrapper=ET.SubElement(resources,'object',id=str(oid),type='model');components=ET.SubElement(wrapper,'components');obj=ET.SubElement(config,'object',id=str(oid))
        ET.SubElement(obj,'metadata',key='name',value=name);ET.SubElement(obj,'metadata',key='extruder',value=str(REQUEST['partColors'][group]+1))
        for i,(ob,slot,g) in enumerate(parts,1):
            if g!=group:continue
            ET.SubElement(components,'component',objectid=str(i))
            part=ET.SubElement(obj,'part',id=str(i),subtype='normal_part');ET.SubElement(part,'metadata',key='name',value=ob.name);ET.SubElement(part,'metadata',key='extruder',value=str(slot+1))
        ET.SubElement(build,'item',objectid=str(oid),transform=f'1 0 0 0 1 0 0 0 1 {pos[0]} {pos[1]} {pos[2]}',printable='1')
    settings={};ignore={'type','from','name','setting_id','inherits','instantiation','compatible_printers','compatible_printers_condition'}
    for kind in ['machine','process']:settings.update({k:v for k,v in json.loads((ROOT/'mechanics'/(kind+'-profile.json')).read_text()).items() if k not in ignore})
    for k,v in json.loads((ROOT/'mechanics'/'filament-profile.json').read_text()).items():
        if k not in ignore:settings[k]=[v[0]]*4 if isinstance(v,list) and v else v
    settings.update({'filament_colour':REQUEST['palette'],'filament_settings_id':['Snapmaker PLA Matte @U1']*4,'filament_is_support':['0']*4,'filament_type':['PLA']*4,'filament_diameter':['1.75']*4,'printer_settings_id':'Snapmaker U1 (0.4 nozzle)','print_settings_id':'0.20mm Standard @Snapmaker U1 (0.4 nozzle)','wall_loops':'4','enable_support':'0','layer_height':'0.20','enable_prime_tower':'1','wipe_tower_x':'15','wipe_tower_y':'240'})
    with ZipFile(FOLDER/'Evergreen-cup-U1.3mf','w',ZIP_DEFLATED,compresslevel=6) as z:
        z.writestr('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="application/octet-stream"/><Default Extension="json" ContentType="application/json"/></Types>')
        z.writestr('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
        z.writestr('3D/3dmodel.model',ET.tostring(model,encoding='utf-8',xml_declaration=True));z.writestr('Metadata/model_settings.config',ET.tostring(config,encoding='utf-8',xml_declaration=True));z.writestr('Metadata/project_settings.config',json.dumps(settings));z.writestr('Metadata/mesh-checks.json',json.dumps(REPORT,indent=2));z.writestr('Metadata/evergreen-project.json',json.dumps(REQUEST.get('project',{})))

try:
    body=load('Sleeve and selected handle','final-body-shell.npz');base=load('Screw-on storage base','final-red-cap.npz');disk=load('Cup seat separator','final-separator-disk.npz')
    handle_cavity_preserved=True;handle_fused=True
    if HANDLE['style'] not in ['original','none']:
        shell_keys={tuple(round(float(x),4) for x in v.co) for v in body.data.vertices if v.co.z<MIN_ART-.02 or math.hypot(v.co.x,v.co.y)<outer(v.co.z,PROFILE)-1.23}
        hd=handle_mesh(HANDLE,PROFILE);grip=create('Custom structural handle',hd['vertices'],hd['triangles']);triangulate(grip)
        if not inspect(grip)['passed']:raise ValueError('The handle geometry could not be built. Try a different size.')
        print('Fusing handle: '+HANDLE['style'],flush=True);boolean(body,grip,'UNION');remove(grip);triangulate(body);clean_boolean_skin(body)
        result={tuple(round(float(x),4) for x in v.co) for v in body.data.vertices}
        handle_cavity_preserved=shell_keys.issubset(result)
        if not handle_cavity_preserved:raise ValueError('Handle changed the cup cavity or lower mechanics. Export stopped.')
        bm=bmesh.new();bm.from_mesh(body.data);unseen=set(bm.verts);components=0
        while unseen:
            components+=1;queue=[unseen.pop()]
            while queue:
                v=queue.pop()
                for edge in v.link_edges:
                    other=edge.other_vert(v)
                    if other in unseen:unseen.remove(other);queue.append(other)
        bm.free();handle_fused=components==1
        if not handle_fused:raise ValueError('The handle did not fuse into one sleeve solid. Try a different size.')
    cap_art=[d for d in REQUEST['decorations'] if d.get('target')=='base']
    REQUEST['decorations']=[d for d in REQUEST['decorations'] if d.get('target')!='base']
    pristine=copy_obj(body,'Protected mechanical reference')
    objects=[];cutters=[];stack_cutters=[]
    for i,d in enumerate(REQUEST['decorations']):
        name=str(d.get('name','Decoration'))[:50]+' '+str(i+1)
        ob=create(name,d['vertices'],d['triangles']);ob['vaso_group_id']=d.get('groupId',d.get('id',''));triangulate(ob)
        report=inspect(ob)
        if not report['passed']:raise ValueError(name+' is not a closed valid solid. Try a simpler outline.')
        objects.append((ob,d['color'],'body'))
        cut=create('Pocket cutter '+str(i+1),d['cutter']['vertices'],d['cutter']['triangles']);triangulate(cut);cutters.append(cut)
        stack_data=d.get('stackCutter',d['cutter']);sc=create('Layer footprint '+str(i+1),stack_data['vertices'],stack_data['triangles']);triangulate(sc);stack_cutters.append(sc)
    text_cutters=[cut for cut,d in zip(cutters,REQUEST['decorations']) if d.get('textFontId') and not d.get('skipPocket')]
    combined_text_cut=None
    if len(text_cutters)>1:
        combined_text_cut=copy_obj(text_cutters[0],'Combined lettering pockets')
        for tool in text_cutters[1:]:boolean(combined_text_cut,tool,'UNION')
        triangulate(combined_text_cut)
    for i,((ob,_,_),cut,d) in enumerate(zip(objects,cutters,REQUEST['decorations'])):
        # Expected overlap is only the shallow root/pocket. A handle collision penetrates farther.
        test=copy_obj(cut,'Protected handle check')
        for v in test.data.vertices:
            z=v.co.z;outer_r=outer(z,PROFILE);r=math.hypot(v.co.x,v.co.y)
            # Allow for chord sag in a curved, triangulated surface. The probe
            # uses the cutter's outer skin so flush inlays do not collapse.
            if r<outer_r+.35 and r>0:v.co.x*=((outer_r+.35)/r);v.co.y*=((outer_r+.35)/r)
        test.data.update()
        collision=intersection_volume(test,pristine) if HANDLE['style']!='none' and not d.get('skipPocket') else 0;remove(test)
        if collision>.02:raise ValueError(ob.name+' is too close to the handle. Move it around the cup and rebuild.')
        print('Cutting pocket:',ob.name,flush=True)
        if not d.get('skipPocket') and not (combined_text_cut and d.get('textFontId')):boolean(body,cut,'DIFFERENCE')
        remove(cut)
    if combined_text_cut:
        boolean(body,combined_text_cut,'DIFFERENCE');remove(combined_text_cut)
    # Higher artwork cuts its footprint out of lower artwork, preserving one
    # material per volume. All raised pieces retain roots that meet the sleeve.
    resolved_pairs=0;covered=[];kept=[]
    def bounds_intersect(a,b):
        av=np.array(a.bound_box);bv=np.array(b.bound_box)
        return bool(np.all(np.minimum(av.max(0),bv.max(0))-np.maximum(av.min(0),bv.min(0))>.000001))
    for i,entry in enumerate(objects):
        ob=entry[0]
        for j in range(i+1,len(objects)):
            # Prepared wrap regions already partition one SVG without overlaps.
            # Preserve their shared boundaries; the final overlap audit still applies.
            if REQUEST['decorations'][i].get('preparedPartition') and REQUEST['decorations'][i].get('partitionRevision')==1 and REQUEST['decorations'][i].get('groupId')==REQUEST['decorations'][j].get('groupId'):continue
            if (REQUEST['decorations'][i].get('wrapScene') or REQUEST['decorations'][i].get('preparedPartition')) and REQUEST['decorations'][i].get('regionClearanceMm',0)>=.07 and REQUEST['decorations'][i].get('groupId')==REQUEST['decorations'][j].get('groupId'):continue
            if not len(ob.data.polygons):break
            cut=stack_cutters[j]
            if bounds_intersect(ob,cut) and intersection_volume(ob,cut)>.00001:
                print('Resolving layer overlap: '+ob.name+' under '+objects[j][0].name,flush=True);boolean(ob,cut,'DIFFERENCE');resolved_pairs+=1
        if not len(ob.data.polygons):covered.append(ob.name);remove(ob);continue
        triangulate(ob);info=inspect(ob)
        if not info['passed']:
            collapse_skin_slivers(ob,7.1);info=inspect(ob)
        if not info['passed']:clean_boolean_skin(ob,7.1);info=inspect(ob)
        if abs(info['signed_volume_mm3'])<.00001:covered.append(ob.name);remove(ob);continue
        if not info['passed']:
            REPORT['issues']=[{'part':'artwork','name':ob.name,'groupId':ob.get('vaso_group_id',''),'message':ob.name+' failed after resolving overlapping artwork. Check the highlighted design and nearby decorations.'}]
            raise ValueError('A layer edge could not be resolved in '+ob.name+'. The export report identifies the affected design; your layout has been preserved.')
        kept.append(entry)
    objects=kept
    for cut in stack_cutters:remove(cut)
    residual_cuts=0
    for i,(a,_,_) in enumerate(objects):
        for b,_,_ in objects[i+1:]:
            overlap=intersection_volume(a,b) if bounds_intersect(a,b) else 0
            if overlap>.01:
                boolean(a,b,'DIFFERENCE');triangulate(a);info=inspect(a)
                if not info['passed']:
                    collapse_skin_slivers(a,7.1);info=inspect(a)
                if not info['passed']:clean_boolean_skin(a,7.1);info=inspect(a)
                if not info['passed']:
                    print('Layer repair details: '+str(info),flush=True)
                    raise ValueError('A fine color boundary needs adjustment. Move the artwork slightly and retry.')
                residual_cuts+=1
                overlap=intersection_volume(a,b)
            if overlap>.01:raise ValueError('A color overlap remains after layer resolution: '+a.name+' / '+b.name+' ('+str(round(overlap,5))+' mm3). Move the artwork slightly and retry.')
    triangulate(body)
    if not USE_MANIFOLD:clean_boolean_skin(body,tolerance=.0001 if any(d.get('theme')=='viking' for d in REQUEST['decorations']) else .00002)
    if USE_MANIFOLD:collapse_skin_slivers(body)
    repaired_skin_fans=split_pinched_skin_fans(body)
    # Compare protected vertices directly. This avoids a very expensive Boolean
    # between two almost-identical 180k-face meshes with coincident surfaces.
    print('Auditing protected mechanical vertices',flush=True)
    key=lambda v:tuple(round(float(x),4) for x in v.co)
    source_keys={key(v) for v in pristine.data.vertices}
    result_keys={key(v) for v in body.data.vertices}
    def protected(v):
        x,y,z=v.co;outer_r=outer(z,PROFILE);r=math.hypot(x,y)
        return z<MIN_ART-.02 or z>MAX_ART+.02 or r<outer_r-1.23 or r>outer_r+2.75
    bad=[v.index for v in pristine.data.vertices if protected(v) and key(v) not in result_keys]
    # New vertices must lie only in the permitted shallow outer skin.
    bad.extend(v.index for v in body.data.vertices if key(v) not in source_keys and protected(v))
    if bad:print('Protected audit: '+str({'count':len(bad),'body_vertices':len(body.data.vertices),'missing_sample':[tuple(v.co) for v in pristine.data.vertices if protected(v) and key(v) not in result_keys][:3],'new_sample':[tuple(v.co) for v in body.data.vertices if key(v) not in source_keys and protected(v)][:3]}),flush=True)
    remove(pristine)
    if bad:raise ValueError('Protected mechanical geometry changed. Export stopped.')
    cap_reference=arrays(base)[0].copy()
    for d in cap_art:
        if PROFILE.get('parametric') and not PROFILE['storage']:raise ValueError('Enable storage before adding cap artwork.')
        if d.get('mode')!='raised' or d.get('regions') or d.get('layer',0):raise ValueError('Cap artwork requires single-color raised shapes.')
        k=storage_scale(PROFILE);v=np.asarray(d['vertices']);r=np.linalg.norm(v[:,:2],axis=1)
        if v[:,2].min()<3.9 or v[:,2].max()>34.1 or r.min()<40.1*k-.57 or r.max()>40.1*k+2.01:raise ValueError('Cap artwork exceeds the protected outer band.')
        ob=create('Cap relief',d['vertices'],d['triangles']);triangulate(ob)
        if not inspect(ob)['passed']:raise ValueError('Invalid cap relief.')
        boolean(base,ob,'UNION');remove(ob)
    if cap_art:clean_boolean_skin(base,3.9)
    parts=[(body,REQUEST['partColors']['body'],'body')]+objects
    if not PROFILE.get('parametric') or PROFILE['storage']:parts += [(base,REQUEST['partColors']['base'],'base'),(disk,REQUEST['partColors']['disk'],'disk')]
    REPORT['parts']=[inspect(ob) for ob,_,_ in parts]
    failed_parts=[p['name'] for p in REPORT['parts'] if not p['passed']]
    if failed_parts:
        REPORT['issues']=[{'part':('artwork' if ob.get('vaso_group_id') else group),'name':ob.name,'groupId':ob.get('vaso_group_id',''),'message':('The sleeve could not be combined cleanly with its details. This does not necessarily mean an SVG is bad.' if ob==body else ob.name+' did not pass the closed-solid checks.')} for (ob,slot,group),info in zip(parts,REPORT['parts']) if not info['passed']]
        raise ValueError('Geometry check failed in '+', '.join(failed_parts)+'. Your design is saved. This can be a surface/artwork intersection issue; removing decorations is not necessarily the solution. Export stopped to avoid an invalid print.')
    base_source=np.load(ROOT/'mechanics'/'final-red-cap.npz')['v'];base_result=cap_reference;base_expected=np.array([base_point(q,PROFILE,BASE_TEXTURE) for q in base_source.tolist()],dtype=np.float32);protected_base=(np.linalg.norm(base_source[:,:2],axis=1)<39)|(base_source[:,2]<=1)|(base_source[:,2]>=37)
    if cap_art:
        result=arrays(base)[0];k=storage_scale(PROFILE);key=lambda q:tuple(round(float(x),4) for x in q);actual={key(q) for q in result};original={key(q) for q in cap_reference};protected=lambda q:math.hypot(q[0],q[1])<39*k or q[2]<=1 or q[2]>=37
        if any(key(q) not in actual for q in cap_reference if protected(q)) or any(key(q) not in original for q in result if protected(q)):raise ValueError('Cap relief changed protected geometry.')
    REPORT['checks']={'cap_reliefs_fused':len(cap_art),'handle_fused_single_solid':handle_fused,'handle_cavity_preserved':handle_cavity_preserved,'base_matches_finish':bool(np.array_equal(base_result,base_expected)),'base_protected_geometry_unchanged':bool(np.array_equal(base_result[protected_base],base_expected[protected_base])),'base_mesh_unchanged':same_mesh(base,'final-red-cap.npz'),'separator_matches_profile':all(abs(v.co.x-source[0]*(PROFILE['base']/2-.1)/35.5)<.00002 and abs(v.co.y-source[1]*(PROFILE['base']/2-.1)/35.5)<.00002 and abs(v.co.z-source[2])<.00002 for v,source in zip(disk.data.vertices,np.load(ROOT/'mechanics'/'final-separator-disk.npz')['v'])),'protected_cavity_and_threads_unchanged':not bad,'decoration_pair_overlaps':0,'resolved_overlapping_pairs':resolved_pairs,'fully_covered_artwork':covered,'residual_color_cuts':residual_cuts,'overlap_tolerance_mm3':.01,'color_boundary_clearance_mm':.1,'minimum_remaining_nominal_wall_mm':round(min(2.8*storage_scale(PROFILE) if PROFILE.get('parametric') and PROFILE['storage'] else 2.8,2.8-max([.35 if TEXTURE in ['wood','brick','scales','waves','ripple','circuit'] else 0]+[d['depth'] if d['mode']=='inlay' else .6 if d.get('textFontId') else .18 for d in REQUEST['decorations']]+[0])),2),'print_layout_min_z_mm':0,'interior_self_intersections':'not separately tested; closed meshes and Boolean intersections checked'}
    if not REPORT['checks']['base_matches_finish'] or not REPORT['checks']['base_protected_geometry_unchanged'] or not REPORT['checks']['separator_matches_profile']:raise ValueError('Mechanical preservation check failed.')
    REPORT['checks']['repaired_skin_fans']=repaired_skin_fans
    REPORT['profile']=PROFILE
    REPORT['handle']=HANDLE
    REPORT['texture']=TEXTURE
    REPORT['base_texture']=BASE_TEXTURE
    REPORT['passed']=True
    REPORT['summary']='PASS — '+str(len(parts))+' closed solids\n0 open edges · 0 nonmanifold edges · 0 zero-area faces\nLayer overlaps resolved; no conflicting color volumes\nCup cavity and threads preserved\nScrew-base threads and cavity preserved; separator matches cup size\nNominal wall remaining: '+str(REPORT['checks']['minimum_remaining_nominal_wall_mm'])+' mm\nAll included print objects sit at Z = 0\nFour filament slots assigned by part\n\nReview supports, filament profiles and the layer preview in Snapmaker Orca before printing. Interior self-intersections are not separately audited.'
    if PROFILE.get('parametric'):
        REPORT['checks']['storage_enabled']=PROFILE['storage'];REPORT['checks']['thread_scale_xy']=storage_scale(PROFILE);REPORT['checks']['sleeve_mode']=PROFILE['sleeveMode']
        if not PROFILE['storage']:REPORT['summary']=REPORT['summary'].replace('Cup cavity and threads preserved','Sleeve cavity preserved').replace('Screw-base threads and cavity preserved; separator matches cup size','Open sleeve: storage base and separator omitted')
    package(parts)
    (FOLDER/'project.json').write_text(json.dumps(REQUEST.get('project',{}),indent=2))
except Exception as e:
    REPORT['passed']=False;REPORT['summary']=str(e)
    import traceback;traceback.print_exc()
finally:
    (FOLDER/'report.json').write_text(json.dumps(REPORT,indent=2));print(REPORT['summary'],flush=True)
