from __future__ import annotations
import argparse, json, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/robots/kopek.webp'
RIG = ROOT / 'art/rigs/kopek'
POLYGONS = json.loads((RIG/'polygons.json').read_text(encoding='utf-8-sig'))
# Source-space estimate boxes and pivots transcribed from docs/robot-rig-animation-plan.md §3.
PARTS = {
'antenna':((76,24,120,106),(106,96)), 'head':((70,34,327,208),(225,198)),
'visor_glow':((203,122,293,169),None), 'neck':((194,190,257,225),(225,220)),
'backpack':((51,160,141,271),(128,215)), 'torso':((132,193,310,319),(215,305)),
'pelvis':((184,298,257,373),(220,320)), 'upperArm_B':((89,197,192,309),(140,230)),
'foreArm_B':((39,266,133,355),(105,282)), 'hand_B':((49,325,130,407),(90,340)),
'upperArm_F':((257,199,320,305),(288,222)), 'foreArm_F':((281,263,343,345),(300,288)),
'hand_F_grip':((0,0,1,1),(318,322)), 'prop_welder':((286,232,469,382),(318,322)),
'thigh_B':((119,305,196,390),(165,330)), 'shin_B':((104,370,187,442),(150,392)),
'wheelHousing_B':((68,423,190,491),(140,440)), 'wheel_B':((88,450,178,540),(130,494)),
'thigh_F':((216,307,300,397),(250,335)), 'shin_F':((231,371,318,443),(280,392)),
'wheelHousing_F':((211,423,337,491),(280,440)), 'wheel_F':((230,450,326,540),(275,494))}
DRAW_ORDER=['antenna','head','visor_glow','neck','backpack','torso','pelvis','upperArm_B','foreArm_B','hand_B','upperArm_F','foreArm_F','prop_welder','thigh_B','shin_B','wheelHousing_B','wheel_B','thigh_F','shin_F','wheelHousing_F','wheel_F']
PARENTS={'antenna':'head','head':'neck','visor_glow':'head','neck':'torso','backpack':'torso','torso':'pelvis','pelvis':'root',
         'upperArm_B':'torso','foreArm_B':'upperArm_B','hand_B':'foreArm_B','upperArm_F':'torso','foreArm_F':'upperArm_F',
         'hand_F_grip':'foreArm_F','prop_welder':'hand_B','thigh_B':'pelvis','shin_B':'thigh_B','wheelHousing_B':'shin_B',
         'wheel_B':'wheelHousing_B','thigh_F':'pelvis','shin_F':'thigh_F','wheelHousing_F':'shin_F','wheel_F':'wheelHousing_F'}

def write_masks(crops=None, generated_pivots=None):
    data={'source':'assets/robots/kopek.webp','sourceSize':[512,544],
          'status':'extracted-review','method':'source-alpha pixels assigned to nearest normalized center among overlapping estimated part boxes; 6px alpha overlap for joint coverage',
          'parts':{name:{'box':list(box),'polygon':POLYGONS.get(name),'pivot':list(pivot) if pivot else None,'parent':PARENTS[name],
                         'crop':(crops or {}).get(name)} for name,(box,pivot) in PARTS.items()}}
    if generated_pivots:
        for name, pivot in generated_pivots.items():
            data['parts'][name]['generatedPivot']=pivot
    (RIG/'masks.json').write_text(json.dumps(data,indent=2),encoding='utf-8')

def extract():
    src=Image.open(SOURCE).convert('RGBA'); w,h=src.size
    a=np.asarray(src.getchannel('A'))
    names=[n for n,(b,_) in PARTS.items() if n!='hand_F_grip']
    boxes=[PARTS[n][0] for n in names]
    # Hand-traced contours take precedence. Estimated boxes only catch small seam pixels
    # between contours; a 6px mask dilation gives neighboring pieces a hidden joint seam.
    yy,xx=np.indices((h,w)); best=np.full((h,w),np.inf,dtype=np.float32); labels=np.full((h,w),-1,dtype=np.int16)
    polygon_coverage=np.zeros((h,w),dtype=bool)
    for i,name in enumerate(names):
        polygon=POLYGONS.get(name)
        if not polygon: continue
        bitmap=Image.new('1',(w,h),0); ImageDraw.Draw(bitmap).polygon(polygon,fill=1)
        inside=np.asarray(bitmap,dtype=bool); polygon_coverage|=inside
        x0,y0,x1,y1=boxes[i]; cx=(x0+x1)/2; cy=(y0+y1)/2
        score=((xx-cx)/max(1,(x1-x0)/2))**2+((yy-cy)/max(1,(y1-y0)/2))**2
        take=inside&(score<best); labels[take]=i; best[take]=score[take]
    fallback=np.full((h,w),np.inf,dtype=np.float32); fallback_labels=np.full((h,w),-1,dtype=np.int16)
    for i,(x0,y0,x1,y1) in enumerate(boxes):
        if x1<=x0+1 or y1<=y0+1: continue
        inside=(xx>=x0)&(xx<x1)&(yy>=y0)&(yy<y1)&~polygon_coverage
        cx=(x0+x1)/2; cy=(y0+y1)/2
        score=((xx-cx)/max(1,(x1-x0)/2))**2+((yy-cy)/max(1,(y1-y0)/2))**2
        take=inside&(score<fallback); fallback_labels[take]=i; fallback[take]=score[take]
    use=(labels<0)&(fallback_labels>=0); labels[use]=fallback_labels[use]
    visible=a>0
    missed=visible&(labels<0)
    parts_dir=RIG/'parts'; parts_dir.mkdir(parents=True,exist_ok=True)
    masks=[labels==i for i in range(len(names))]
    name_to_index={name:i for i,name in enumerate(names)}
    # Add only local 6px joint overlaps; dilating every silhouette edge copied stray
    # neighboring pixels into otherwise clean outer contours.
    for child in names:
        parent=PARENTS[child]; pivot=PARTS[child][1]
        if not pivot or parent not in name_to_index: continue
        joint=Image.new('1',(w,h),0); x,y=pivot
        ImageDraw.Draw(joint).ellipse((x-6,y-6,x+6,y+6),fill=1)
        joint_mask=np.asarray(joint,dtype=bool)&(a>0)
        masks[name_to_index[child]]|=joint_mask
        masks[name_to_index[parent]]|=joint_mask
    crops={}
    for i,name in enumerate(names):
        mask=Image.fromarray(np.where(masks[i],255,0).astype('uint8'),'L')
        # Keep overlap pixels faithful to the original artwork and preserve transparent RGB.
        mask_arr=np.asarray(mask)
        out=src.copy(); out.putalpha(Image.fromarray(np.minimum(a,mask_arr).astype('uint8'),'L'))
        bbox=out.getchannel('A').getbbox()
        if bbox:
            crops[name]=list(bbox)
            filename=('foreArm_F-source.png' if name=='foreArm_F' and (parts_dir/'foreArm_F-concept.png').exists()
                      else 'upperArm_F-source.png' if name=='upperArm_F' else f'{name}.png')
            out.crop(bbox).save(parts_dir/filename)
    # Keep the generated grip isolated as a concept; it is reviewed before becoming final art.
    hand=Image.open(parts_dir/'hand_F_grip-concept.png').convert('RGBA')
    alpha=hand.getchannel('A')
    alpha=alpha.point(lambda value: 0 if value<16 else value)
    hand.putalpha(alpha); bbox=alpha.getbbox()
    if bbox:
        hand=hand.crop(bbox)
        # Quantize to FIX-8's approved 4-color palette while retaining the alpha edge.
        rgba=np.asarray(hand).copy(); palette=np.array([[232,160,32],[233,211,168],[74,77,85],[29,31,36]],dtype=np.int16)
        rgb=rgba[:,:,:3].astype(np.int16); opaque=rgba[:,:,3]>0
        dist=((rgb[opaque,None,:]-palette[None,:,:])**2).sum(axis=2)
        rgb[opaque]=palette[dist.argmin(axis=1)]
        hand=Image.fromarray(rgba,'RGBA')
        hand.thumbnail((44,44),Image.Resampling.LANCZOS)
        hand.save(parts_dir/'hand_F_grip.png')
    generated_pivots={}
    # The front upper arm is mostly hidden by the welder in the source. Use the
    # cleaned concept as a continuous shoulder-to-elbow segment and quantize it
    # to the original FIX-8 colors before atlasing.
    upper_concept=parts_dir/'upperArm_F-concept.png'
    if upper_concept.exists():
        upper=Image.open(upper_concept).convert('RGBA')
        upper=upper.crop(upper.getchannel('A').getbbox()).resize((72,102),Image.Resampling.LANCZOS)
        rgba=np.asarray(upper).copy(); palette=np.array([[251,173,74],[218,142,63],[233,211,168],[99,99,101],[53,52,57],[19,17,15]],dtype=np.int16)
        rgb=rgba[:,:,:3].astype(np.int16); opaque=rgba[:,:,3]>0
        dist=((rgb[opaque,None,:]-palette[None,:,:])**2).sum(axis=2)
        rgb[opaque]=palette[dist.argmin(axis=1)]
        upper=Image.fromarray(rgba,'RGBA')
        upper.save(parts_dir/'upperArm_F.png')
        generated_pivots['upperArm_F']=[36,20]
    else:
        raise FileNotFoundError(f'missing cleaned front-arm concept: {upper_concept}')
    forearm_concept=parts_dir/'foreArm_F-concept.png'
    if forearm_concept.exists():
        # The forearm is hidden by the welder in the source. Transform its two
        # joint centers onto the authored elbow-to-wrist vector (18x34 source px)
        # so the painted segment and hand_F bone meet without changing aim length.
        arm=Image.open(forearm_concept).convert('RGBA')
        arm=arm.crop(arm.getchannel('A').getbbox()).rotate(-20,Image.Resampling.BICUBIC,expand=True)
        arm=arm.crop(arm.getchannel('A').getbbox()).resize((64,76),Image.Resampling.LANCZOS)
        source_pivot=(20.0,11.0); target_pivot=(18.0,10.0)
        scale=math.hypot(18,34)/math.hypot(10,48); angle=math.radians(16)
        c,s=math.cos(angle),math.sin(angle)
        affine=(c/scale,-s/scale,source_pivot[0]-(c*target_pivot[0]-s*target_pivot[1])/scale,
                s/scale,c/scale,source_pivot[1]-(s*target_pivot[0]+c*target_pivot[1])/scale)
        arm=arm.transform((64,76),Image.Transform.AFFINE,affine,resample=Image.Resampling.BICUBIC)
        bbox=arm.getchannel('A').getbbox()
        if bbox:
            generated_pivots['foreArm_F']=[round(target_pivot[0]-bbox[0],2),round(target_pivot[1]-bbox[1],2)]
            arm=arm.crop(bbox)
        rgba=np.asarray(arm).copy(); palette=np.array([[232,160,32],[233,211,168],[74,77,85],[29,31,36]],dtype=np.int16)
        rgb=rgba[:,:,:3].astype(np.int16); opaque=rgba[:,:,3]>0
        dist=((rgb[opaque,None,:]-palette[None,:,:])**2).sum(axis=2)
        rgb[opaque]=palette[dist.argmin(axis=1)]
        arm=Image.fromarray(rgba,'RGBA')
        arm.save(parts_dir/'foreArm_F.png')
    write_masks(crops,generated_pivots)
    print(f'extracted {len(names)} source parts; source pixels outside masks: {int(missed.sum())}')

def review():
    parts_dir=RIG/'parts'; source=Image.open(SOURCE).convert('RGBA')
    names=[n for n in PARTS if (parts_dir/f'{n}.png').exists()]
    cols=4; cellw,cellh=300,330; rows=math.ceil(len(names)/cols)
    board=Image.new('RGBA',(cols*cellw,rows*cellh),(37,40,46,255)); d=ImageDraw.Draw(board); font=ImageFont.load_default()
    for i,name in enumerate(names):
        tx=(i%cols)*cellw; ty=(i//cols)*cellh
        d.rectangle((tx+8,ty+28,tx+292,ty+310),fill=(70,74,82,255))
        for y in range(ty+30,ty+310,16):
            for x in range(tx+10,tx+292,16):
                if ((x//16+y//16)%2)==0: d.rectangle((x,y,min(x+15,tx+291),min(y+15,ty+309)),fill=(90,94,102,255))
        d.text((tx+12,ty+8),name,fill='white',font=font)
        part=Image.open(parts_dir/f'{name}.png').convert('RGBA')
        if name=='hand_F_grip': d.text((tx+12,ty+300),'AI concept; palette cleaned',fill=(255,226,120,255),font=font)
        if name=='upperArm_F': d.text((tx+12,ty+300),'Generated fill; source palette matched',fill=(255,226,120,255),font=font)
        if name=='foreArm_F': d.text((tx+12,ty+300),'Generated forearm; pivots aligned to rig',fill=(255,226,120,255),font=font)
        part.thumbnail((135,125),Image.Resampling.LANCZOS)
        part=part.resize((part.width*2,part.height*2),Image.Resampling.LANCZOS)
        board.alpha_composite(part,(tx+150-part.width//2,ty+175-part.height//2))
    path=RIG/'debug/review-2x.png'; path.parent.mkdir(parents=True,exist_ok=True); board.save(path)
    print(f'review: {path.relative_to(ROOT)} ({board.width}x{board.height})')

def reassemble():
    src=Image.open(SOURCE).convert('RGBA'); canvas=np.zeros((src.height,src.width,4),dtype=np.uint8)
    for name in DRAW_ORDER:
        path=RIG/'parts'/f'{name}.png'
        if not path.exists(): continue
        # Part files are cropped; restore their exact source offset from masks.json.
        source_part=RIG/'parts'/f'{name}-source.png'
        if name in ('foreArm_F','upperArm_F') and source_part.exists():
            part=Image.open(source_part).convert('RGBA')
        else:
            part=Image.open(path).convert('RGBA')
        meta=json.loads((RIG/'masks.json').read_text(encoding='utf-8'))
        crop=meta['parts'][name]['crop']
        if crop:
            px=np.asarray(part); x0,y0=crop[:2]; h,w=px.shape[:2]
            view=canvas[y0:y0+h,x0:x0+w]; take=px[:,:,3]>0; view[take]=px[take]
    canvas_img=Image.fromarray(canvas,'RGBA')
    out=RIG/'debug/reassembled.png'; canvas_img.save(out)
    srca=np.asarray(src); outa=canvas
    diff=np.any(srca!=outa,axis=2)&((srca[:,:,3]>0)|(outa[:,:,3]>0))
    total=np.count_nonzero(srca[:,:,3]>0); count=np.count_nonzero(diff)
    print(f'reassembly alpha/RGBA diff: {count}/{total} ({100*count/max(1,total):.2f}%)')

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('robot',nargs='?',default='kopek'); ap.add_argument('--review',action='store_true'); ap.add_argument('--reassemble',action='store_true'); args=ap.parse_args()
    if args.robot!='kopek': ap.error('this first extractor pass supports only kopek')
    if args.review: review()
    elif args.reassemble: reassemble()
    else: extract(); review()
