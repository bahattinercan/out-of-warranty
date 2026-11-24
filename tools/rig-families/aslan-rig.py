#!/usr/bin/env python3
"""Build the source-specific Aslan cutout atlas and audit its bind reconstruction."""
from pathlib import Path
import json, math
import numpy as np
from PIL import Image, ImageDraw, ImageChops

ROOT=Path(__file__).resolve().parents[2]; RIG=ROOT/'art/rigs/aslan'; PARTS=RIG/'parts'; DEBUG=RIG/'debug'
SRC=ROOT/'assets/robots/aslan.webp'
# Hand-traced working polygons in source pixels; pivots are the visible joint centers.
DATA={
 'halo':([[[252,12],[372,12],[412,62],[405,119],[367,148],[342,120],[378,105],[389,68],[365,38],[321,35],[292,54]]],[330,78],'torso'),
 'head':([[[171,53],[210,43],[237,52],[250,73],[245,100],[221,116],[181,119],[158,101],[165,75]]],[216,115],'torso'),
 'torso':([[[151,126],[205,115],[261,117],[295,133],[320,157],[302,198],[277,219],[230,237],[188,225],[153,199],[130,168]]],[224,218],'root'),
 'shoulder_B':([[[110,139],[145,131],[170,145],[165,178],[136,204],[107,192],[99,166]]],[145,163],'torso'),
 'upperArm_B':([[[108,181],[138,185],[149,213],[135,239],[117,258],[91,246],[86,217]]],[121,208],'torso'),
 'foreArm_B':([[[84,232],[115,243],[122,271],[105,297],[78,289],[72,266]]],[99,271],'upperArm_B'),
 'hand_B':([[[74,282],[100,290],[109,315],[94,338],[72,332],[62,311]]],[87,311],'foreArm_B'),
 'shoulder_F':([[[286,139],[324,147],[344,176],[335,207],[308,220],[280,204],[273,174]]],[305,170],'torso'),
 'upperArm_F':([[[324,194],[348,204],[365,236],[355,261],[330,256],[312,227]]],[339,220],'torso'),
 'foreArm_F':([[[337,246],[367,245],[389,270],[383,302],[356,309],[340,286]]],[366,273],'upperArm_F'),
 'hand_F':([[[358,294],[388,292],[404,314],[391,338],[369,333],[355,316]]],[379,315],'foreArm_F'),
 'pelvis':([[[181,218],[231,218],[271,233],[282,262],[256,282],[205,277],[176,257]]],[229,250],'root'),
 'thigh_B':([[[164,247],[204,252],[219,280],[209,309],[180,314],[157,287]]],[190,275],'pelvis'),
 'shin_B':([[[151,298],[183,304],[192,333],[179,365],[151,360],[140,335]]],[168,333],'thigh_B'),
 'foot_B':([[[127,349],[160,357],[175,385],[161,408],[111,408],[100,398],[109,378]]],[143,385],'shin_B'),
 'thigh_F':([[[235,250],[276,250],[297,278],[287,310],[260,319],[237,294]]],[266,277],'pelvis'),
 'shin_F':([[[254,301],[285,300],[302,330],[295,364],[266,367],[249,341]]],[278,333],'thigh_F'),
 'foot_F':([[[278,353],[308,356],[329,382],[321,404],[274,407],[260,395],[263,375]]],[295,385],'shin_F')}

def build():
    src=Image.open(SRC).convert('RGBA'); w,h=src.size; a=np.asarray(src.getchannel('A')); yy,xx=np.indices((h,w))
    labels=np.full((h,w),-1,dtype=np.int16); score=np.full((h,w),np.inf,dtype=np.float32); coverage=np.zeros((h,w),bool)
    names=list(DATA)
    for i,(name,(polys,pivot,parent)) in enumerate(DATA.items()):
        m=Image.new('1',(w,h)); d=ImageDraw.Draw(m)
        for poly in polys:d.polygon([tuple(p) for p in poly],fill=1)
        inside=np.asarray(m,dtype=bool); coverage|=inside
        px,py=pivot; s=((xx-px)/44)**2+((yy-py)/48)**2
        take=inside&(s<score); labels[take]=i; score[take]=s[take]
    # Uncovered source pixels belong to the torso core; preserves every source alpha pixel.
    labels[(labels<0)&(a>0)]=names.index('torso')
    masks=[]
    for i,name in enumerate(names):
        m=(labels==i)
        masks.append(m)
        out=src.copy(); out.putalpha(Image.fromarray(np.minimum(a,m.astype('uint8')*255).astype('uint8')))
        box=out.getchannel('A').getbbox(); out.crop(box).save(PARTS/(name+'.png'))
    # Bind reconstruction and 2x review board.
    rebuilt=Image.new('RGBA',(w,h));
    for i in range(len(names)):
        p=Image.open(PARTS/(names[i]+'.png')).convert('RGBA'); box=Image.open(PARTS/(names[i]+'.png')).getchannel('A').getbbox()
        # Extracted crops need their source offsets; reconstitute from mask directly.
        layer=src.copy(); layer.putalpha(Image.fromarray(np.minimum(a,masks[i].astype('uint8')*255).astype('uint8'))); rebuilt.alpha_composite(layer)
    rebuilt.save(DEBUG/'reassembled.png')
    board=Image.new('RGBA',(w*2,h*2+36),(55,59,66,255)); board.alpha_composite(src.resize((w*2,h*2),Image.Resampling.NEAREST)); ImageDraw.Draw(board).text((8,h*2+10),f'ASLAN source-specific masks | {w}x{h} | 2x review',fill='white'); board.save(DEBUG/'source-2x.png')
    # Part board shows each independently extracted piece, in source-relative crop space.
    board=Image.new('RGBA',(w*2,h*2+36),(55,59,66,255));
    for i,name in enumerate(names):
        layer=src.copy(); layer.putalpha(Image.fromarray(np.minimum(a,masks[i].astype('uint8')*255).astype('uint8'))); board.alpha_composite(layer.resize((w*2,h*2),Image.Resampling.NEAREST))
    ImageDraw.Draw(board).text((8,h*2+10),'ASLAN extracted overlays | 2x',fill='white'); board.save(DEBUG/'parts-2x.png')
    diff=ImageChops.difference(src.getchannel('A'),rebuilt.getchannel('A')).point(lambda v:255 if v else 0); changed=sum(diff.get_flattened_data()); total=sum(1 for v in a.flat if v)
    # Pack transparent crop images with two pixel gutters.
    crops=[]
    for name in names:
        p=Image.open(PARTS/(name+'.png')).convert('RGBA').resize((Image.open(PARTS/(name+'.png')).width//2,Image.open(PARTS/(name+'.png')).height//2),Image.Resampling.LANCZOS); crops.append((name,p))
    atlas=Image.new('RGBA',(sum(p.width+2 for _,p in crops),max(p.height for _,p in crops)+4)); rects={}; x=1
    for name,p in crops: atlas.alpha_composite(p,(x,1)); rects[name]=[x,1,p.width,p.height]; x+=p.width+2
    atlas.save(ROOT/'assets/robot-rigs/aslan.webp','WEBP',quality=85,method=6)
    origins={}
    for name,(poly,piv,parent) in DATA.items():
        b=Image.open(PARTS/(name+'.png')).getchannel('A').getbbox(); origins[name]=[round((b[0]-piv[0])/2,2),round((b[1]-piv[1])/2,2)]
    masks={'source':'assets/robots/aslan.webp','sourceSize':[w,h],'parts':{n:{'polygon':v[0][0],'pivot':v[1],'parent':v[2]} for n,v in DATA.items()}}
    (RIG/'masks.json').write_text(json.dumps(masks,indent=2)); (RIG/'polygons.json').write_text(json.dumps({n:v[0][0] for n,v in DATA.items()},indent=2))
    emit_js(w*0+atlas.width,atlas.height,rects,origins)
    return changed,total,100*changed/max(1,total),atlas.size

def emit_js(aw,ah,rects,origins):
    bones=[{'id':'root','parent':None,'x':224,'y':400}]
    # Parent offsets follow source-space pivot deltas; all positions use half-resolution rig coordinates.
    piv={n:v[1] for n,v in DATA.items()}; parents={n:v[2] for n,v in DATA.items()}
    ordered=[]
    def add(n):
        if n in ordered:return
        parent=parents[n]
        if parent in DATA:add(parent)
        ordered.append(n)
    for n in DATA:add(n)
    for n in ordered:
        par=parents[n]; p=piv[n]; pp=piv.get(par,[224,400]); bones.append({'id':n,'parent':par,'x':round((p[0]-pp[0])/2,2),'y':round((p[1]-pp[1])/2,2)})
    clips={}
    specs={'idle':(True,1200,{}),'walk':(True,700,{'thigh_B':{'rot':[[0,20],[350,-20],[700,20]]},'thigh_F':{'rot':[[0,-20],[350,20],[700,-20]]},'shin_B':{'rot':[[0,0],[180,28],[350,0],[530,25],[700,0]]},'shin_F':{'rot':[[0,25],[180,0],[350,25],[530,0],[700,25]]},'pelvis':{'y':[[0,0],[175,-2],[350,0],[525,-2],[700,0]]}}),'aim':(False,1,{}),'fire':(False,240,{'torso':{'rot':[[0,0],[40,-3],[240,0]]}}),'jump':(False,320,{'thigh_B':{'rot':[[0,0],[120,-25],[320,-25]]},'thigh_F':{'rot':[[0,0],[120,25],[320,25]]},'shin_B':{'rot':[[0,0],[120,40],[320,40]]},'shin_F':{'rot':[[0,0],[120,40],[320,40]]}}),'fall':(True,400,{'thigh_B':{'rot':[[0,-12],[400,-12]]},'thigh_F':{'rot':[[0,12],[400,12]]}}),'land':(False,260,{'pelvis':{'y':[[0,0],[60,5],[150,-2],[260,0]]}}),'hit':(False,300,{'torso':{'rot':[[0,0],[50,8],[170,-3],[300,0]]}}),'skill':(False,600,{'upperArm_B':{'rot':[[0,0],[180,-35],[420,-35],[600,0]]}}),'death':(False,900,{'root':{'rot':[[0,0],[350,0],[600,75],[900,75]]}})}
    for s,(loop,duration,tracks) in specs.items():clips[s]={'loop':loop,'duration':duration,'tracks':tracks}
    parts={n:{'bone':n,'origin':origins[n]} for n in DATA}; order=list(DATA)
    order=['halo','hand_B','foreArm_B','upperArm_B','shoulder_B','hand_F','foreArm_F','upperArm_F','shoulder_F','foot_B','shin_B','thigh_B','foot_F','shin_F','thigh_F','pelvis','torso','head']
    js='var ROBOT_RIGS = typeof ROBOT_RIGS !== "undefined" ? ROBOT_RIGS : {};\nROBOT_RIGS.aslan = '+json.dumps({'version':1,'atlas':'robot-rigs/aslan','unit':256,'groundY':204,'wheelRadius':1,'bones':bones,'parts':parts,'atlasSize':[aw,ah],'rects':rects,'origins':origins,'drawOrder':order,'sockets':{'contact_B':{'bone':'foot_B','x':0,'y':0},'contact_F':{'bone':'foot_F','x':0,'y':0},'weaponGrip':{'bone':'hand_F','x':0,'y':0},'muzzle':{'bone':'hand_F','x':144,'y':0}},'clips':clips},separators=(',',':'))+';\n'
    (ROOT/'js/rigs/aslan.js').write_text(js)

def main():
    PARTS.mkdir(parents=True,exist_ok=True); DEBUG.mkdir(parents=True,exist_ok=True); (ROOT/'assets/robot-rigs').mkdir(exist_ok=True)
    d,t,p,size=build(); print(f'aslan-rig: source alpha diff {d}/{t} ({p:.3f}%); atlas {size[0]}x{size[1]} { (ROOT/"assets/robot-rigs/aslan.webp").stat().st_size} bytes')
if __name__=='__main__': main()
