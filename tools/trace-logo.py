# -*- coding: utf-8 -*-
# Run once to regenerate the brand paths from the supplied artwork.
"""Trace the supplied logo artwork into vector paths."""
from PIL import Image, ImageFilter
import os, numpy as np, potrace
from collections import deque

SRC=os.path.join(os.path.dirname(os.path.abspath(__file__)),
     '..','site','assets','brand','supplied-original.png')
im=Image.open(SRC).convert('RGBA'); A=np.array(im).astype(int)
R,G,B,AL=A[...,0],A[...,1],A[...,2],A[...,3]
BLUE=(AL>90)&(B>85)&(B>R+35)&(B>G+25)
WHITE=(AL>170)&(R>205)&(G>205)&(B>205)

def biggest(mask):
    lab=np.zeros(mask.shape,int); cur=0; best=(0,None)
    ys,xs=np.nonzero(mask)
    for y0,x0 in zip(ys,xs):
        if lab[y0,x0]: continue
        cur+=1; q=deque([(y0,x0)]); lab[y0,x0]=cur; n=0
        while q:
            y,x=q.popleft(); n+=1
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                v,u=y+dy,x+dx
                if 0<=v<mask.shape[0] and 0<=u<mask.shape[1] and mask[v,u] and not lab[v,u]:
                    lab[v,u]=cur; q.append((v,u))
        if n>best[0]: best=(n,cur)
    return lab==best[1]

P=lambda p:(p.x,p.y)
def trace(mask, ox, oy, scale, tol=1.0, turd=80, up=2, blur=2.2, prec=1):
    """mask -> svg path data, coordinates mapped through (x-ox)/scale."""
    sm=Image.fromarray((mask*255).astype('uint8'))
    sm=sm.resize((sm.width*up,sm.height*up),Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))
    m=(np.array(sm)>128)
    path=potrace.Bitmap(~m).trace(turdsize=turd,alphamax=1.334,opticurve=True,opttolerance=tol)
    f="%%.%df"%prec
    def pt(p):
        x,y=P(p); return (f+" "+f)%((x/up-ox)/scale,(y/up-oy)/scale)
    out=[]
    for c in path:
        d=["M"+pt(c.start_point)]
        for s in c:
            if s.is_corner: d.append("L"+pt(s.c)+"L"+pt(s.end_point))
            else: d.append("C"+pt(s.c1)+" "+pt(s.c2)+" "+pt(s.end_point))
        d.append("Z"); out.append("".join(d))
    return " ".join(out)

def crop(mask, box):
    m=np.zeros_like(mask); y0,y1,x0,x1=box; m[y0:y1,x0:x1]=mask[y0:y1,x0:x1]; return m

# ── the two lockup marks ────────────────────────────────────────────
TOP=(0,295,100,370); BOT=(295,585,240,530)
out={}
for name,box in (("elighting",TOP),("ebuilt",BOT)):
    sph=biggest(crop(BLUE,box))
    out[name+"_sphere"]=sph
    shell=biggest(crop(WHITE,box))
    out[name+"_shell"]=shell
    for k,m in ((name+" sphere",sph),(name+" shell",shell)):
        ys,xs=np.nonzero(m)
        print("%-20s x %d..%d y %d..%d  px %d"%(k,xs.min(),xs.max(),ys.min(),ys.max(),m.sum()))
np.save('masks.npy',out,allow_pickle=True)

# ── emit ─────────────────────────────────────────────────────────────
def emit(name, box, vb=100.0):
    sph = biggest(crop(BLUE, box))
    shell = crop(WHITE, box)          # every white blob, base cap included
    ys,xs = np.nonzero(shell|sph)
    x0,x1,y0,y1 = xs.min(),xs.max(),ys.min(),ys.max()
    w,h = x1-x0+1, y1-y0+1
    s = max(w,h)/vb
    ox,oy = x0-(s*vb-w)/2.0, y0-(s*vb-h)/2.0     # center in a square viewBox
    d_shell = trace(shell, ox, oy, s, turd=60)
    d_sph   = trace(sph,   ox, oy, s, turd=60)
    print("%-10s shell %5d chars   sphere %5d chars   source %dx%d"%(name,len(d_shell),len(d_sph),w,h))
    return d_shell, d_sph

if __name__ == "__main__":
    import io, json
    res = {}
    res["elighting"] = emit("elighting", TOP)
    res["ebuilt"]    = emit("ebuilt",    BOT)
    # the monogram on its own: the eBuilt sphere is the least occluded
    sph = biggest(crop(BLUE, BOT))
    ys,xs = np.nonzero(sph); x0,x1,y0,y1 = xs.min(),xs.max(),ys.min(),ys.max()
    w,h = x1-x0+1, y1-y0+1; s = max(w,h)/100.0
    res["mono"] = trace(sph, x0-(s*100-w)/2.0, y0-(s*100-h)/2.0, s, turd=60)
    print("%-10s        %5d chars   source %dx%d"%("monogram",len(res["mono"]),w,h))
    io.open("paths.json","w",encoding="utf-8").write(json.dumps(res))
