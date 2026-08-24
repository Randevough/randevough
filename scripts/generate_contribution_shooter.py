#!/usr/bin/env python3
import json, math, os, random, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

USERNAME = os.getenv('GITHUB_USERNAME', 'Randevough')
TOKEN = os.getenv('GH_TOKEN') or os.getenv('GITHUB_TOKEN')
OUT = Path(__file__).resolve().parents[1] / 'assets' / 'contribution-shooter.gif'
W, H = 960, 320
BG, PAPER, INK, COBALT, ORANGE, GREEN = '#f4ecdd', '#fffaf0', '#171717', '#132daa', '#f26430', '#67ad62'
LEVELS = ['#ded5c4', '#b9d9a8', '#81c77a', '#3d9c59', '#17643d']


def font(size, bold=False, mono=False):
    paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf' if mono else ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
        '/usr/share/fonts/dejavu/DejaVuSans.ttf'
    ]
    for p in paths:
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()


def fetch_calendar():
    if not TOKEN:
        return demo_calendar(), True
    query = '''query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel weekday}}}}}}'''
    req = urllib.request.Request('https://api.github.com/graphql', data=json.dumps({'query': query, 'variables': {'login': USERNAME}}).encode(), headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json', 'User-Agent': 'randevough-readme'})
    with urllib.request.urlopen(req, timeout=30) as r: data = json.load(r)
    if data.get('errors'): raise RuntimeError(', '.join(e['message'] for e in data['errors']))
    return data['data']['user']['contributionsCollection']['contributionCalendar'], False


def demo_calendar():
    weeks=[]
    for w in range(53):
        days=[]
        for d in range(7):
            wave=math.sin(w*.47+d*1.7)+math.cos(w*.16-d*.8)
            count=8 if wave>1.2 else 5 if wave>.55 else 2 if wave>-.1 else 1 if wave>-.55 else 0
            level='FOURTH_QUARTILE' if count>=8 else 'THIRD_QUARTILE' if count>=5 else 'SECOND_QUARTILE' if count>=2 else 'FIRST_QUARTILE' if count else 'NONE'
            days.append({'weekday':d,'contributionCount':count,'contributionLevel':level,'date':''})
        weeks.append({'contributionDays':days})
    return {'totalContributions':0,'weeks':weeks}


def paper_base():
    rng=random.Random(19)
    im=Image.new('RGB',(W,H),BG); px=im.load()
    for _ in range(18000):
        x=rng.randrange(W); y=rng.randrange(H); v=rng.choice([-9,-6,-3,3,5])
        r,g,b=px[x,y]; px[x,y]=(max(0,min(255,r+v)),max(0,min(255,g+v)),max(0,min(255,b+v)))
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((12,12,W-12,H-12),radius=18,outline=INK,width=2)
    d.line((30,45,W-30,45),fill=COBALT,width=2)
    d.text((30,18),'GITHUB ACTIVITY / A YEAR OF BUILDING THINGS',font=font(15,True),fill=COBALT)
    return im


def unpack(cal):
    cells=[]
    level_map={'NONE':0,'FIRST_QUARTILE':1,'SECOND_QUARTILE':2,'THIRD_QUARTILE':3,'FOURTH_QUARTILE':4}
    for w,week in enumerate(cal['weeks']):
        for i,day in enumerate(week['contributionDays']):
            cells.append({'w':w,'d':day.get('weekday',i),'count':day['contributionCount'],'level':level_map.get(day.get('contributionLevel','NONE'),0)})
    return cells


def choose_targets(cells):
    ranked=sorted((c for c in cells if c['count']>0),key=lambda c:(c['count'],c['w']),reverse=True)
    out=[]
    for c in ranked:
        if all(abs(c['w']-x['w'])>5 for x in out): out.append(c)
        if len(out)==6: break
    return list(reversed(out)) or [c for c in cells if c['count']>0][:6]


def draw_ship(d,x,y,thruster=True):
    # deliberately simple, handmade pixel ship
    pts=[(x,y-15),(x-12,y+10),(x-5,y+7),(x,y+13),(x+5,y+7),(x+12,y+10)]
    d.polygon(pts,fill=ORANGE,outline=INK)
    d.polygon([(x,y-9),(x-5,y+4),(x+5,y+4)],fill=PAPER,outline=INK)
    d.rectangle((x-2,y+4,x+2,y+10),fill=COBALT)
    if thruster:
        d.line((x-4,y+14,x-1,y+22,x+2,y+14,x+5,y+22),fill=COBALT,width=2)


def render_frame(base,cells,destroyed,ship_x,bullet=None,impact=None,status='SCANNING'):
    im=base.copy(); d=ImageDraw.Draw(im)
    x0,y0,stepx,stepy=48,61,16.2,20
    for c in cells:
        key=(c['w'],c['d'])
        x=int(x0+c['w']*stepx); y=int(y0+c['d']*stepy)
        if key in destroyed: continue
        fill=LEVELS[c['level']]
        d.rounded_rectangle((x,y,x+12,y+12),radius=2,fill=fill,outline=INK if c['level']>=3 else None,width=1)
    # hand-drawn-ish arena baseline and notes
    d.line((35,222,W-35,222),fill=INK,width=2)
    d.arc((22,207,63,239),190,345,fill=ORANGE,width=3)
    d.text((30,237),'MOVE → AIM → SHOOT',font=font(10,mono=True),fill=INK)
    if bullet:
        bx,by=bullet
        d.line((bx,by+15,bx,252),fill=ORANGE,width=3)
        for yy in range(int(by),253,12): d.ellipse((bx-2,yy-2,bx+2,yy+2),fill=COBALT)
    if impact:
        ix,iy=impact
        for a in range(0,360,45):
            rr=11; ex=ix+math.cos(math.radians(a))*rr; ey=iy+math.sin(math.radians(a))*rr
            d.line((ix,iy,ex,ey),fill=ORANGE,width=2)
    draw_ship(d,ship_x,269)
    total='PREVIEW' if not TOKEN else f"{sum(c['count'] for c in cells):,} CONTRIBUTIONS"
    d.rectangle((610,15,W-28,42),fill=BG)
    d.text((W-30,19),f'{status} / {total}',font=font(11,True,True),fill=COBALT,anchor='ra')
    d.text((30,295),'generated daily · contributions become targets',font=font(10,mono=True),fill=INK)
    return im.convert('P',palette=Image.Palette.ADAPTIVE,colors=64)


def generate():
    cal,demo=fetch_calendar(); cells=unpack(cal); targets=choose_targets(cells); base=paper_base()
    x0,y0,stepx,stepy=48,61,16.2,20
    ship_x=55; destroyed=set(); frames=[]; durations=[]
    frames.append(render_frame(base,cells,destroyed,ship_x,status='READY')); durations.append(700)
    for t in targets:
        tx=int(x0+t['w']*stepx+6); ty=int(y0+t['d']*stepy+6)
        start=ship_x
        for i in range(1,7):
            ease=1-(1-i/6)**3; ship_x=int(start+(tx-start)*ease)
            frames.append(render_frame(base,cells,destroyed,ship_x,status='MOVING')); durations.append(75)
        for i in range(5):
            by=245-(245-ty)*(i+1)/5
            frames.append(render_frame(base,cells,destroyed,ship_x,bullet=(tx,by),status='FIRING')); durations.append(70)
        for i in range(3):
            frames.append(render_frame(base,cells,destroyed,ship_x,impact=(tx,ty),status='HIT!')); durations.append(90)
        destroyed.add((t['w'],t['d']))
        frames.append(render_frame(base,cells,destroyed,ship_x,status='TARGET CLEARED')); durations.append(180)
    for key in list(reversed([((t['w'],t['d'])) for t in targets])):
        destroyed.discard(key); frames.append(render_frame(base,cells,destroyed,ship_x,status='RELOADING FIELD')); durations.append(120)
    frames.append(render_frame(base,cells,set(),55,status='READY')); durations.append(650)
    OUT.parent.mkdir(parents=True,exist_ok=True)
    frames[0].save(OUT,save_all=True,append_images=frames[1:],duration=durations,loop=0,optimize=True,disposal=2)
    print(f'Generated {OUT} with {len(frames)} frames')

if __name__=='__main__': generate()
