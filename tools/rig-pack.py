from __future__ import annotations
from pathlib import Path
from PIL import Image
import json, math
ROOT=Path(__file__).resolve().parents[1]; RIG=ROOT/'art/rigs/kopek'; PARTS=RIG/'parts'; MASKS=json.loads((RIG/'masks.json').read_text(encoding='utf-8'))
NAMES=[n for n in MASKS['parts'] if n!='hand_F_grip-concept']
SCALE=.5; PAD=2; MAX_W=1024
items=[]
for name in NAMES:
    p=PARTS/f'{name}.png'
    if not p.exists(): raise SystemExit(f'missing part: {p}')
    im=Image.open(p).convert('RGBA'); im=im.resize((max(1,round(im.width*SCALE)),max(1,round(im.height*SCALE))),Image.Resampling.LANCZOS)
    items.append((name,im))
# Deterministic shelf packing; keep the atlas bounded and rect coordinates stable.
items.sort(key=lambda item:(-item[1].height,-item[1].width,item[0]))
shelves=[]; x=y=row_h=0
for name,im in items:
    w,h=im.size
    if x+w+PAD>MAX_W: y+=row_h+PAD; x=0; row_h=0
    if y+h+PAD>MAX_W: raise SystemExit('atlas exceeds 1024x1024')
    shelves.append((name,im,x,y)); x+=w+PAD; row_h=max(row_h,h)
atlas_h=y+row_h+PAD; atlas_w=max((px+im.width for _,im,px,_py in shelves),default=1)
atlas=Image.new('RGBA',(atlas_w,atlas_h),(0,0,0,0)); rects={}
for name,im,x,y in shelves:
    atlas.alpha_composite(im,(x,y)); rects[name]=[x,y,im.width,im.height]
out=ROOT/'assets/robot-rigs/kopek.webp'; out.parent.mkdir(parents=True,exist_ok=True); atlas.save(out,'WEBP',quality=86,method=6)
js=ROOT/'js/rigs/kopek.js'; source=js.read_text(encoding='utf-8') if js.exists() else ''
start='  // GENERATED ATLAS START'; end='  // GENERATED ATLAS END'
if start not in source or end not in source: raise SystemExit('kopek.js missing generated atlas markers')
a=source.index(start)+len(start); b=source.index(end)
source=source[:a]+'\n  atlasSize: '+json.dumps([atlas_w,atlas_h])+',\n  rects: '+json.dumps(rects,separators=(',',':'))+',\n'+source[b:]
origins={}
for name in NAMES:
    meta=MASKS['parts'][name]; pivot=meta.get('pivot')
    if name=='hand_F_grip': origins[name]=[0,-9.5]
    elif name in ('upperArm_F','foreArm_F'):
        generated_pivot=meta.get('generatedPivot')
        if not generated_pivot: raise SystemExit(f'{name} is missing its generated joint pivot; rerun tools/rig-extract.py')
        origins[name]=[round(-generated_pivot[0]*SCALE,2),round(-generated_pivot[1]*SCALE,2)]
    elif pivot and meta.get('crop'):
        crop=meta['crop']; origins[name]=[round((crop[0]-pivot[0])*.5,2),round((crop[1]-pivot[1])*.5,2)]
    else: origins[name]=[0,0]
start2='  // GENERATED ORIGINS START'; end2='  // GENERATED ORIGINS END'
if start2 not in source or end2 not in source: raise SystemExit('kopek.js missing generated origins markers')
c=source.index(start2)+len(start2); d=source.index(end2)
source=source[:c]+'\n  origins: '+json.dumps(origins,separators=(',',':'))+',\n'+source[d:]
js.write_text(source,encoding='utf-8')
print(json.dumps({'atlas':str(out.relative_to(ROOT)).replace('\\','/'),'size':atlas.size,'bytes':out.stat().st_size,'parts':len(rects)}))
