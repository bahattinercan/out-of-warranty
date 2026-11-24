#!/usr/bin/env python3
"""Trace, extract, pack and audit the source-specific tilki cutout rig."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/robots/tilki.webp'
OUT = ROOT / 'art/rigs/tilki'
PARTS = {
    # name: source-space polygon, pivot, parent bone, bind pivot in rig units
    'launcher_B': ([(118,86),(196,15),(227,21),(252,67),(212,120),(175,157),(130,150)], (136,139), 'torso', (157,66)),
    'launcher_F': ([(171,133),(238,62),(271,71),(300,117),(267,154),(229,187)], (181,165), 'torso', (181,82)),
    'head': ([(222,137),(258,108),(305,113),(348,138),(372,165),(351,185),(318,178),(298,196),(260,179),(231,173)], (246,178), 'neck', (213,153)),
    'ear': ([(296,132),(305,84),(329,110),(335,147)], (301,145), 'head', (260,139)),
    'neck': ([(244,174),(312,172),(323,213),(282,232),(248,214)], (268,210), 'torso', (220,184)),
    'torso': ([(154,183),(206,164),(248,174),(284,202),(326,209),(343,247),(319,275),(288,264),(251,258),(222,279),(183,257),(160,225)], (241,247), 'root', (241,247)),
    'pelvis': ([(198,251),(235,246),(274,263),(293,290),(275,319),(239,331),(205,306)], (235,292), 'torso', (235,292)),
    'arm_B_upper': ([(156,188),(207,181),(233,205),(220,241),(194,260),(160,244)], (204,226), 'torso', (204,226)),
    'arm_B_fore': ([(146,229),(175,239),(193,275),(177,301),(147,294),(130,265)], (164,279), 'arm_B_upper', (164,279)),
    'hand_B': ([(134,281),(163,291),(184,311),(180,333),(157,347),(131,332),(120,314)], (157,309), 'arm_B_fore', (157,309)),
    'arm_F_upper': ([(294,209),(330,214),(353,243),(338,268),(317,256),(300,241)], (319,242), 'torso', (319,242)),
    'arm_F_fore': ([(311,244),(341,248),(363,278),(350,297),(325,287)], (343,280), 'arm_F_upper', (343,280)),
    'hand_F': ([(337,278),(365,279),(389,299),(389,320),(368,337),(343,324),(331,305)], (365,303), 'arm_F_fore', (365,303)),
    'thigh_B': ([(205,294),(243,296),(254,334),(236,369),(213,391),(181,370),(187,336)], (218,355), 'pelvis', (218,355)),
    'shin_B': ([(181,360),(214,368),(213,411),(197,449),(174,480),(153,467),(163,424)], (184,447), 'thigh_B', (184,447)),
    'foot_B': ([(148,457),(183,471),(201,501),(218,518),(199,531),(168,526),(141,515),(118,525),(108,513),(124,484)], (173,504), 'shin_B', (173,504)),
    'thigh_F': ([(243,293),(275,292),(299,323),(290,352),(273,377),(246,370),(237,336)], (267,347), 'pelvis', (267,347)),
    'shin_F': ([(271,360),(298,354),(315,390),(326,427),(329,466),(306,479),(284,450),(272,410)], (303,430), 'thigh_F', (303,430)),
    'foot_F': ([(292,455),(319,465),(338,485),(366,503),(385,520),(376,531),(341,532),(315,520),(285,522),(266,512),(277,481)], (330,502), 'shin_F', (330,502)),
}
ORDER=list(PARTS)

def main():
    src=Image.open(SRC).convert('RGBA'); w,h=src.size; a=np.asarray(src.getchannel('A'))
    yy,xx=np.indices((h,w)); centers=np.array([p[1] for p in PARTS.values()],dtype=float)
    # Contours below are source traced. Within painted silhouette, nearest traced joint pivot
    # assigns anti-aliased boundary pixels deterministically, retaining every source pixel.
    polygons={}; masks=[]; scores=[]
    for name,(poly,pivot,parent,_) in PARTS.items():
        polygons[name]=poly
        bitmap=Image.new('1',(w,h),0); ImageDraw.Draw(bitmap).polygon(poly,fill=1)
        inside=np.asarray(bitmap,dtype=bool); cx,cy=pivot
        score=((xx-cx)/42)**2+((yy-cy)/44)**2
        scores.append(np.where(inside,score,np.inf))
    stack=np.stack(scores); labels=np.argmin(stack,axis=0); uncovered=~np.isfinite(stack.min(axis=0))
    # Narrow gaps between traced polygons belong to their nearest anatomical pivot.
    if uncovered.any():
        fallback=np.stack([((xx-cx)/max(12,abs(cx-256)*.24+18))**2+((yy-cy)/38)**2 for cx,cy in centers])
        labels[uncovered]=np.argmin(fallback[:,uncovered],axis=0)
    visible=a>0; OUT.joinpath('parts').mkdir(parents=True,exist_ok=True); OUT.joinpath('debug').mkdir(parents=True,exist_ok=True)
    metadata={'source':'assets/robots/tilki.webp','sourceSize':[w,h],'method':'hand-traced source polygons; nearest traced joint pivot assigns every antialiased source pixel; source pixels preserved without repaint','parts':{}}
    cropmap={}
    for i,(name,(poly,pivot,parent,bind)) in enumerate(PARTS.items()):
        mask=(labels==i)&visible; part=src.copy(); part.putalpha(Image.fromarray(np.where(mask,a,0).astype('uint8')))
        box=part.getchannel('A').getbbox(); part.crop(box).save(OUT/'parts'/f'{name}.png'); cropmap[name]=box
        metadata['parts'][name]={'polygon':poly,'pivot':pivot,'parent':parent,'crop':list(box),'bind':bind}
    (OUT/'masks.json').write_text(json.dumps(metadata,indent=2),encoding='utf8')
    (OUT/'polygons.json').write_text(json.dumps(polygons,indent=2),encoding='utf8')
    # Exact source-space bind reconstruction is preserved; overlaps are assigned once.
    rebuilt=Image.new('RGBA',(w,h),(0,0,0,0))
    for i,name in enumerate(ORDER):
        box=cropmap[name]; rebuilt.alpha_composite(Image.open(OUT/'parts'/f'{name}.png'),(box[0],box[1]))
    rebuilt.save(OUT/'debug/reassembled.png')
    alpha_diff=np.asarray(ImageChops.difference(src.getchannel('A'),rebuilt.getchannel('A')))
    changed=int(np.count_nonzero(alpha_diff)); total=int(np.count_nonzero(a)); percent=100*changed/max(1,total)
    # 2x source and part boards for visual inspection.
    board=Image.new('RGBA',(w*2,h*2+36),(55,59,66,255)); board.alpha_composite(src.resize((w*2,h*2),Image.Resampling.NEAREST)); ImageDraw.Draw(board).text((8,h*2+10),f'tilki source {w}x{h} alpha={total}',fill='white'); board.save(OUT/'debug/source-2x.png')
    cols=4; cw=300; ch=300; rows=(len(ORDER)+cols-1)//cols; review=Image.new('RGBA',(cols*cw,rows*ch),(55,59,66,255)); d=ImageDraw.Draw(review)
    for i,name in enumerate(ORDER):
        x=(i%cols)*cw; y=(i//cols)*ch; d.text((x+8,y+6),name,fill='white'); tile=Image.new('RGBA',(270,250),(76,80,88,255)); p=Image.open(OUT/'parts'/f'{name}.png'); p.thumbnail((260,240)); tile.alpha_composite(p,((270-p.width)//2,(250-p.height)//2)); review.alpha_composite(tile,(x+15,y+28))
    review.resize((review.width*2,review.height*2),Image.Resampling.NEAREST).save(OUT/'debug/parts-2x.png')
    # Pack at 0.5 source scale with stable shelf order.
    items=[]
    for name in ORDER:
        im=Image.open(OUT/'parts'/f'{name}.png').convert('RGBA'); im=im.resize((max(1,round(im.width*.5)),max(1,round(im.height*.5))),Image.Resampling.LANCZOS); items.append((name,im))
    items.sort(key=lambda z:(-z[1].height,-z[1].width,z[0])); x=y=row=0; placements=[]; maxw=1024
    for name,im in items:
        if x+im.width+2>maxw: y+=row+2; x=0; row=0
        placements.append((name,im,x,y)); x+=im.width+2; row=max(row,im.height)
    atlas=Image.new('RGBA',(max(px+im.width for _,im,px,_ in placements),y+row+2),(0,0,0,0)); rects={}
    for name,im,x,y in placements: atlas.alpha_composite(im,(x,y)); rects[name]=[x,y,im.width,im.height]
    atlas.save(ROOT/'assets/robot-rigs/tilki.webp','WEBP',quality=86,method=6)
    (ROOT/'assets/robot-rigs').mkdir(exist_ok=True)
    write_js(metadata,rects,atlas.size)
    print(f'reassembly alpha diff {changed}/{total} ({percent:.3f}%)')
    print(f'atlas {atlas.width}x{atlas.height}, {(ROOT/"assets/robot-rigs/tilki.webp").stat().st_size} bytes')

def write_js(meta,rects,size):
    names=ORDER; bones=[{'id':'root','parent':None,'x':128,'y':260}]
    for name,(_,pivot,parent,bind) in PARTS.items():
        if name in ('launcher_B','launcher_F','torso','pelvis'): continue
        parentbone=parent if parent in ('root','torso','pelvis','head','neck','arm_B_upper','arm_B_fore','arm_F_upper','arm_F_fore','thigh_B','thigh_F','shin_B','shin_F') else 'torso'
        bones.append({'id':name,'parent':parentbone,'x':0,'y':0})
    parents={n:PARTS[n][2] for n in names}
    parents['torso']='root'
    pivots={n:PARTS[n][1] for n in names}; pivots['root']=(256,520)
    ordered=[]; pending=set(names)
    while pending:
        ready=sorted(n for n in pending if parents[n] not in pending)
        if not ready: raise ValueError('cyclic rig hierarchy')
        ordered.extend(ready); pending.difference_update(ready)
    bones=[{'id':'root','parent':None,'x':128,'y':260}]
    for n in ordered:
        par=parents[n]; x=(pivots[n][0]-pivots[par][0])*.5; y=(pivots[n][1]-pivots[par][1])*.5
        bones.append({'id':n,'parent':par,'x':x,'y':y})
    parts={}; origins={}
    for n,(poly,pivot,parent,bind) in PARTS.items():
        bx,by=bind; crop=meta['parts'][n]['crop']; parts[n]={'bone':n,'pivot':[0,0]}; origins[n]=[round((crop[0]-pivot[0])*.5,2),round((crop[1]-pivot[1])*.5,2)]
    order=['launcher_B','launcher_F','arm_B_upper','arm_B_fore','hand_B','thigh_B','shin_B','foot_B','pelvis','torso','neck','head','ear','thigh_F','shin_F','foot_F','arm_F_upper','arm_F_fore','hand_F','weapon']
    clips={
      'idle':(True,1600,{'torso':{'rot':[[0,0],[800,-1],[1600,0]]},'head':{'rot':[[0,0],[800,1],[1600,0]]},'arm_B_fore':{'rot':[[0,0],[800,3],[1600,0]]},'pelvis':{'y':[[0,0],[800,1],[1600,0]]}}),
      'walk':(True,600,{'thigh_B':{'rot':[[0,-20],[300,20],[600,-20]]},'thigh_F':{'rot':[[0,20],[300,-20],[600,20]]},'shin_B':{'rot':[[0,8],[150,32],[300,8],[600,8]]},'shin_F':{'rot':[[0,8],[300,8],[450,32],[600,8]]},'pelvis':{'y':[[0,0],[150,-2],[300,0],[450,-2],[600,0]]},'arm_B_upper':{'rot':[[0,12],[300,-12],[600,12]]}}),
      'aim':(False,1,{'torso':{'rot':[[0,-4]]},'arm_F_upper':{'rot':[[0,-25]]},'arm_F_fore':{'rot':[[0,18]]}}),
      'fire':(False,250,{'torso':{'rot':[[0,0],[50,4,'out'],[250,0]]},'arm_F_upper':{'rot':[[0,0],[40,-8,'out'],[250,0]]},'head':{'rot':[[0,0],[60,2,'out'],[250,0]]}}),
      'jump':(False,300,{'thigh_B':{'rot':[[0,-10],[100,0],[180,-24],[300,-24]]},'thigh_F':{'rot':[[0,-10],[100,0],[180,-24],[300,-24]]},'shin_B':{'rot':[[0,42],[100,0],[180,55],[300,55]]},'shin_F':{'rot':[[0,42],[100,0],[180,55],[300,55]]},'pelvis':{'y':[[0,5],[100,-5],[300,-5]]}}),
      'fall':(True,400,{'torso':{'rot':[[0,-5],[400,-5]]},'thigh_B':{'rot':[[0,-8],[400,-8]]},'thigh_F':{'rot':[[0,14],[400,14]]},'arm_B_upper':{'rot':[[0,-42],[400,-42]]}}),
      'land':(False,250,{'pelvis':{'y':[[0,0],[60,7],[140,-2],[250,0]]},'thigh_B':{'rot':[[0,0],[60,-18],[140,0],[250,0]]},'thigh_F':{'rot':[[0,0],[60,-18],[140,0],[250,0]]}}),
      'hit':(False,300,{'head':{'rot':[[0,0],[60,10],[180,-3],[300,0]]},'torso':{'rot':[[0,0],[60,8],[180,-2],[300,0]]},'arm_B_upper':{'rot':[[0,0],[60,-25],[180,6],[300,0]]}}),
      'skill':(False,600,{'arm_B_upper':{'rot':[[0,0],[150,-55],[250,18],[450,18],[600,0]]},'arm_B_fore':{'rot':[[0,0],[150,-42],[250,-65],[450,-65],[600,0]]},'torso':{'rot':[[0,0],[150,-3],[300,2],[450,2],[600,0]]}}),
      'death':(False,900,{'torso':{'rot':[[0,0],[120,5],[300,6],[550,-8],[900,-8]]},'thigh_B':{'rot':[[0,0],[300,-25],[900,-25]]},'thigh_F':{'rot':[[0,0],[300,-25],[900,-25]]},'root':{'rot':[[0,0],[300,0],[450,-75],[900,-75]]},'pelvis':{'y':[[0,0],[300,8],[550,3],[900,3]]}})}
    js="""/* Tilki source-specific cutout rig; stays opt-in until shared integration. */\nvar ROBOT_RIGS = typeof ROBOT_RIGS !== 'undefined' ? ROBOT_RIGS : {};\nROBOT_RIGS.tilki = {\nversion:1, atlas:'robot-rigs/tilki', unit:256, groundY:260, wheelRadius:1,\n"""
    js+='bones:'+json.dumps(bones,separators=(',',':'))+',\nparts:'+json.dumps(parts,separators=(',',':'))+',\norigins:'+json.dumps(origins,separators=(',',':'))+',\nrects:'+json.dumps(rects,separators=(',',':'))+',\natlasSize:'+json.dumps(size)+',\n'
    js+='drawOrder:'+json.dumps(order,separators=(',',':'))+',\nsockets:{weaponGrip:{bone:"hand_F",x:0,y:0},contact_B:{bone:"foot_B",x:0,y:0},contact_F:{bone:"foot_F",x:0,y:0},muzzle:{bone:"weapon",x:144,y:0}},\nclips:{'
    for i,(name,(loop,duration,tracks)) in enumerate(clips.items()): js+=(',' if i else '')+json.dumps(name)+':{loop:'+str(loop).lower()+',duration:'+str(duration)+',tracks:'+json.dumps(tracks,separators=(',',':'))+'}'
    js+='}\n};\n'; (ROOT/'js/rigs/tilki.js').write_text(js,encoding='utf8')

if __name__=='__main__': main()
