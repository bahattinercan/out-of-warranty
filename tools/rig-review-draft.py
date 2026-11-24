from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json, math
src = Path('assets/robots/kopek.webp')
base = Image.open(src).convert('RGBA')
# Estimated source-space boxes from the approved FIX-8 plan; review pass only.
parts = {
'antenna':(76,24,120,106),'head':(103,43,327,205),'visor_glow':(203,122,293,169),'neck':(194,190,257,225),'backpack':(51,160,141,271),'torso':(132,193,310,319),'pelvis':(184,298,257,373),
'upperArm_B':(89,197,192,309),'foreArm_B':(39,266,133,355),'hand_B':(49,325,130,407),'upperArm_F':(257,199,320,305),'foreArm_F':(281,263,343,345),'hand_F_grip':(0,0,1,1),'prop_welder':(286,232,469,382),
'thigh_B':(119,305,196,390),'shin_B':(104,370,187,442),'wheelHousing_B':(68,423,190,491),'wheel_B':(88,450,178,540),'thigh_F':(216,307,300,397),'shin_F':(231,371,318,443),'wheelHousing_F':(211,423,337,491),'wheel_F':(230,450,326,540)}
# Each crop keeps original pixels and transparent source alpha. The first kit is intentionally a review draft.
out=Path('art/rigs/kopek/parts'); board=Image.new('RGBA',(1200, math.ceil(len(parts)/4)*330),(37,40,46,255)); d=ImageDraw.Draw(board)
font=ImageFont.load_default()
for i,(name,box) in enumerate(parts.items()):
    x0,y0,x1,y1=box
    tile_x=(i%4)*300; tile_y=(i//4)*330
    d.rectangle((tile_x+8,tile_y+28,tile_x+292,tile_y+310),fill=(70,74,82,255))
    # checkerboard under transparency
    for yy in range(tile_y+30,tile_y+310,16):
      for xx in range(tile_x+10,tile_x+292,16):
        if ((xx//16)+(yy//16))%2==0: d.rectangle((xx,yy,min(xx+15,tile_x+291),min(yy+15,tile_y+309)),fill=(90,94,102,255))
    d.text((tile_x+12,tile_y+8),name,fill=(255,255,255,255),font=font)
    if x1>x0+1 and y1>y0+1:
      crop=base.crop(box)
      crop=crop.resize((crop.width*2,crop.height*2),Image.Resampling.NEAREST)
      # fit within preview tile
      crop.thumbnail((270,250),Image.Resampling.LANCZOS)
      board.alpha_composite(crop,(tile_x+150-crop.width//2,tile_y+175-crop.height//2))
      crop.save(out/f'{name}.png')
    else:
      concept=Image.open(out/'hand_F_grip-concept.png').convert('RGBA')
      concept.thumbnail((250,220),Image.Resampling.LANCZOS)
      board.alpha_composite(concept,(tile_x+150-concept.width//2,tile_y+175-concept.height//2))
      d.text((tile_x+12,tile_y+300),'AI concept; cleanup pending',fill=(255,226,120,255),font=font)
board.save('art/rigs/kopek/debug/review-2x.png')
Path('art/rigs/kopek/masks.json').write_text(json.dumps({'source':'assets/robots/kopek.webp','sourceSize':[512,544],'status':'review-draft','parts':{k:{'box':list(v),'pivot':None} for k,v in parts.items()}},indent=2),encoding='utf-8')
print('created',len(parts),'draft crops; board:',board.size)
