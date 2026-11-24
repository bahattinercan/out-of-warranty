#!/usr/bin/env python3
"""Extract, pack, and audit the source-specific Kaplan cutout kit."""
from __future__ import annotations
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops

ROOT = Path(__file__).resolve().parents[2]
RIG = ROOT / "art/rigs/kaplan"
SOURCE = ROOT / "assets/robots/kaplan.webp"

# Polygons follow visible armor seams in the approved 512x544 source.
SHAPES = {
 "head": [(202,12),(257,27),(322,76),(333,94),(290,109),(252,91),(222,86),(201,67),(205,54),(195,42)],
 "neck": [(220,83),(277,88),(284,117),(258,139),(224,126)],
 "backpack": [(112,105),(148,106),(176,137),(173,178),(146,197),(113,181),(111,133)],
 "upperArm_B": [(153,108),(192,110),(220,137),(211,166),(180,177),(155,155)],
 "foreArm_B": [(137,160),(166,173),(159,203),(142,230),(111,220),(111,199)],
 "hand_B": [(90,198),(118,209),(112,241),(89,270),(59,262),(46,250),(74,225)],
 "saw_B": [(45,251),(82,245),(116,269),(147,288),(143,314),(123,343),(91,345),(49,328),(42,305)],
 "torso": [(180,113),(217,107),(249,119),(280,111),(315,130),(330,168),(308,199),(286,218),(260,226),(242,251),(215,244),(199,216),(171,201),(160,172)],
 "pelvis": [(198,208),(224,211),(250,221),(272,214),(293,228),(294,251),(278,268),(248,268),(226,256),(202,265),(183,248),(183,227)],
 "upperArm_F": [(284,137),(313,141),(336,171),(329,192),(310,203),(289,186)],
 "foreArm_F": [(312,187),(333,194),(358,214),(380,226),(370,250),(340,248),(317,227)],
 "hand_F": [(360,220),(394,224),(430,242),(453,267),(455,298),(434,315),(402,307),(385,281),(364,264)],
 "saw_F": [(399,250),(443,246),(469,263),(485,297),(468,329),(447,345),(418,333),(403,313),(388,290)],
 "thigh_B": [(199,247),(222,252),(238,276),(230,307),(215,329),(190,331),(177,310),(185,279)],
 "shin_B": [(181,317),(209,322),(206,359),(194,396),(181,420),(157,419),(153,395),(169,357)],
 "ankle_B": [(151,404),(177,409),(183,440),(167,463),(143,458),(137,441)],
 "foot_B": [(142,443),(175,446),(190,466),(189,487),(170,499),(128,495),(119,483),(129,461)],
 "thigh_F": [(244,251),(269,246),(288,267),(296,293),(288,323),(272,339),(247,332),(238,308)],
 "shin_F": [(267,325),(293,319),(307,351),(313,386),(322,418),(305,433),(283,421),(276,390)],
 "ankle_F": [(291,407),(316,411),(327,438),(310,459),(285,453),(277,433)],
 "foot_F": [(290,441),(320,438),(344,450),(366,469),(371,486),(357,499),(308,496),(287,478)],
}
PIVOTS = {"head":(258,106),"neck":(253,119),"backpack":(145,145),"upperArm_B":(183,143),"foreArm_B":(144,194),"hand_B":(99,222),"saw_B":(90,286),"torso":(244,220),"pelvis":(241,247),"upperArm_F":(305,165),"foreArm_F":(336,218),"hand_F":(391,254),"saw_F":(420,285),"thigh_B":(207,267),"shin_B":(184,331),"ankle_B":(158,424),"foot_B":(154,464),"thigh_F":(267,270),"shin_F":(288,333),"ankle_F":(304,426),"foot_F":(321,463)}

def extract():
    src=Image.open(SOURCE).convert("RGBA"); w,h=src.size
    RIG.joinpath("parts").mkdir(parents=True,exist_ok=True); (RIG/"debug").mkdir(exist_ok=True)
    assigned=Image.new("L",src.size,0); masks={}
    # Far/back pieces first, near/front pieces later; remaining source detail is retained on torso.
    order=list(SHAPES)
    for name in order:
        mask=Image.new("L",src.size,0); ImageDraw.Draw(mask).polygon(SHAPES[name],fill=255)
        mask=ImageChops.darker(mask,ImageChops.invert(assigned)); assigned=ImageChops.lighter(assigned,mask); masks[name]=mask
    # Assign every alpha pixel outside a traced silhouette to its nearest authored joint,
    # preserving the complete source while keeping residual slivers with a nearby part.
    px=list(assigned.getdata()); alpha=list(src.getchannel("A").getdata()); owners={n:list(m.getdata()) for n,m in masks.items()}
    candidates=list(SHAPES)
    for i,(own,a) in enumerate(zip(px,alpha)):
        if not own and a:
            x=i%w; y=i//w; nearest=min(candidates,key=lambda n:(x-PIVOTS[n][0])**2+(y-PIVOTS[n][1])**2)
            owners[nearest][i]=255
    masks={n:Image.new("L",src.size) for n in candidates}
    for n in candidates: masks[n].putdata(owners[n])
    part_bounds={}
    for name,mask in masks.items():
        piece=src.copy(); piece.putalpha(ImageChops.multiply(src.getchannel("A"),mask))
        bbox=piece.getchannel("A").getbbox() or (0,0,1,1)
        part_bounds[name]=list(bbox)
        # retain source-coordinate box in metadata; unscaled source pieces are editable.
        piece.crop(bbox).save(RIG/"parts"/(name+".png"))
    (RIG/"debug/part-bounds.json").write_text(json.dumps(part_bounds,indent=2),encoding="utf-8")
    (RIG/"masks.json").write_text(json.dumps({"source":"assets/robots/kaplan.webp","size":[w,h],"parts":{n:{"polygon":p,"pivot":PIVOTS[n]} for n,p in SHAPES.items()}},indent=2),encoding="utf-8")
    (RIG/"polygons.json").write_text(json.dumps({"coordinateSpace":"assets/robots/kaplan.webp pixels","parts":{n:{"polygon":p,"pivot":PIVOTS[n]} for n,p in SHAPES.items()}},indent=2),encoding="utf-8")
    # Exact bind reconstruction preserves every source-alpha pixel; polygon assignment only controls ownership.
    rebuilt=Image.new("RGBA",src.size,(0,0,0,0))
    for name in order:
        piece=src.copy(); piece.putalpha(ImageChops.multiply(src.getchannel("A"),masks[name])); rebuilt.alpha_composite(piece)
    rebuilt.save(RIG/"debug/reassembled.png")
    overlay=src.copy(); d=ImageDraw.Draw(overlay)
    for name,poly in SHAPES.items():
        d.line(poly+[poly[0]],fill=(50,255,90,230),width=2); x,y=PIVOTS[name]; d.ellipse((x-3,y-3,x+3,y+3),fill=(255,40,40,255)); d.text((x+3,y),name,fill=(255,255,255,255),stroke_width=1,stroke_fill=(0,0,0,255))
    overlay.resize((w*2,h*2),Image.Resampling.NEAREST).save(RIG/"debug/masks-2x.png")
    board=Image.new("RGBA",(w*2,h*2+34),(55,59,66,255)); board.alpha_composite(src.resize((w*2,h*2),Image.Resampling.NEAREST)); ImageDraw.Draw(board).text((8,h*2+9),"kaplan source 512x544 | polygon cutout kit | 2x",fill="white",font=ImageFont.load_default()); board.save(RIG/"debug/source-2x.png")

def pack():
    files=sorted((RIG/"parts").glob("*.png")); scale=.5; gap=2; pieces=[]
    for f in files:
        im=Image.open(f).convert("RGBA").resize((max(1,round(Image.open(f).width*scale)),max(1,round(Image.open(f).height*scale))),Image.Resampling.LANCZOS)
        pieces.append((f.stem,im))
    # Shelf pack with max width 512.
    x=y=row=0; rects={}; origins={}; atlas=Image.new("RGBA",(512,512),(0,0,0,0))
    for name,im in pieces:
        if x+im.width>512: x=0; y+=row+gap; row=0
        atlas.alpha_composite(im,(x,y)); rects[name]=[x,y,im.width,im.height]
        px,py=PIVOTS[name]
        src=Image.open(SOURCE).convert("RGBA"); mask=Image.new("L",src.size,0); ImageDraw.Draw(mask).polygon(SHAPES[name],fill=255)
        piece=Image.open(RIG/"parts"/(name+".png")); bbox=piece.getchannel("A").getbbox() or (0,0,1,1)
        # Source-coordinate crop origin is recorded beside each part.
        meta=json.loads((RIG/"debug/part-bounds.json").read_text(encoding="utf-8"))
        bbox=meta[name]
        origins[name]=[round((bbox[0]-px)*scale,2),round((bbox[1]-py)*scale,2)]
        x+=im.width+gap; row=max(row,im.height)
    atlas=atlas.crop((0,0,512,y+row)); atlas.save(ROOT/"assets/robot-rigs/kaplan.webp","WEBP",quality=90,method=6)
    (RIG/"debug/atlas-layout.json").write_text(json.dumps({"size":list(atlas.size),"rects":rects,"origins":origins},indent=2),encoding="utf-8")
    return atlas.size,rects,origins

def main():
    extract(); size,rects,origins=pack()
    src=Image.open(SOURCE).convert("RGBA"); rebuilt=Image.open(RIG/"debug/reassembled.png").convert("RGBA")
    diff=sum(a!=b for a,b in zip(src.getchannel("A").getdata(),rebuilt.getchannel("A").getdata())); total=sum(a>0 for a in src.getchannel("A").getdata())
    print(f"reassembly alpha diff {diff}/{total} ({100*diff/max(1,total):.3f}%)")
    print(f"atlas {size[0]}x{size[1]} { (ROOT/'assets/robot-rigs/kaplan.webp').stat().st_size} bytes")
    print(json.dumps({"rects":rects,"origins":origins},separators=(",",":")))
if __name__=="__main__": main()
