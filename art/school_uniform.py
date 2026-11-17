# Executed by build_mixamo_runner.py with the original Boy01 topology loaded.
shirt=connected_island(2437,720)
trousers=connected_island(1568,606)
remove=connected_island(3157,291)|connected_island(80,24)|connected_island(104,24)|connected_island(2174,31)|connected_island(2205,31)
def fabric(name,color):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=.83
    body.data.materials.append(mat);return len(body.data.materials)-1
white=fabric('School shirt white',(.88,.90,.88))
green=fabric('School shorts forest green',(.015,.063,.035))
skin=fabric('Exposed arms and calves',(.57,.32,.18))
socks=fabric('School socks',(.72,.77,.74))
shoes=fabric('Black school shoes',(.014,.018,.021))
for v in shirt:
    p=to_model@v.co
    if abs(p.x)>.39:
        p.y=.045+(p.y-.045)*.66;p.z=1.263+(p.z-1.263)*.64
    elif abs(p.x)<.23 and p.z<.87:p.z=.85+(p.z-.87)*.25
    v.co=to_mesh@p
for f in mesh.faces:
    if all(v in shirt for v in f.verts):
        x=sum(abs((to_model@v.co).x) for v in f.verts)/len(f.verts)
        f.material_index=skin if x>.40 else white
    if all(v in trousers for v in f.verts):
        z=sum((to_model@v.co).z for v in f.verts)/len(f.verts)
        f.material_index=green if z>.47 else skin if z>.22 else socks if z>.12 else shoes
for v in trousers:
    p=to_model@v.co
    if .14<p.z<.47:
        center=.095 if p.x>0 else -.095;p.x=center+(p.x-center)*.72;p.y=.005+(p.y-.005)*.72
    v.co=to_mesh@p
bmesh.ops.delete(mesh,geom=list(remove),context='VERTS')
def garment(name,points,faces,color):
    data=bpy.data.meshes.new(name);data.from_pydata([to_mesh@Vector(p) for p in points],[],faces);data.materials.append(body.data.materials[color])
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=rig;obj.matrix_world=to_model
    for i,p in enumerate(points):
        bone='mixamorig:Spine2' if p[2]>1.18 else 'mixamorig:Spine1'
        group=obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone);group.add([i],1,'REPLACE')
    mod=obj.modifiers.new('Uniform skin','ARMATURE');mod.object=rig
    solid=obj.modifiers.new('Fabric thickness','SOLIDIFY');solid.thickness=.003
    meshes.append(obj)
for side in [-1,1]:
    garment('Shirt collar',[(side*.025,-.086,1.35),(side*.105,-.083,1.32),(side*.075,-.132,1.245),(side*.012,-.135,1.30)],[(0,1,2,3)],white)
tie=fabric('Navy school tie',(.014,.025,.045))
garment('School tie',[(-.018,-.142,1.30),(.018,-.142,1.30),(.012,-.151,1.26),(.032,-.152,1.05),(0,-.158,1.014),(-.032,-.152,1.05),(-.012,-.151,1.26)],[(0,1,2,6),(6,2,3,4,5)],tie)
stripe=fabric('Tie gold stripe',(.42,.40,.16))
for z in [1.08,1.14,1.20]:garment('Tie stripe',[(-.022,-.155,z),(.022,-.155,z+.021),(.022,-.156,z+.029),(-.022,-.156,z+.008)],[(0,1,2,3)],stripe)
garment('Shirt pocket',[(.07,-.122,1.20),(.135,-.115,1.20),(.13,-.12,1.12),(.103,-.127,1.104),(.07,-.126,1.12)],[(0,1,2,3,4)],white)
