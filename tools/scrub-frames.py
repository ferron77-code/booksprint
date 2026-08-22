#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Turn a video into a scroll-scrubbed frame sequence.

    python3 tools/scrub-frames.py site/assets/img/buildfly-src.mp4 buildout
    python3 tools/scrub-frames.py <video> <folder> --frames 140

Writes <folder>/f001.jpg ... into site/assets/img/, at the size the scrub
engine already uses, and re-encodes the fallback clip that stands in when the
frame sequence is not worth loading — H.264 first because nearly every
browser takes it, VP9 alongside for the ones that will not.

Then set data-frames on the <section class="scrub"> to the count it reports.
The engine loads coarse-first — every 16th frame, then 8th, then 4th — so the
scrub is usable long before the whole sequence has arrived, which is why the
count matters more than the file names.
"""
import os, subprocess, sys, glob, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
IMG  = os.path.join(ROOT, "site", "assets", "img")
W, H = 960, 540

def ffmpeg():
    for c in ("ffmpeg", "/usr/bin/ffmpeg"):
        if shutil.which(c):
            return c
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    sys.exit("ffmpeg not found:  pip install imageio-ffmpeg")

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode:
        sys.stderr.write(r.stderr[-2000:])
        sys.exit("ffmpeg failed")

def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    src, name = argv[0], argv[1]
    want = 120
    if "--frames" in argv:
        want = int(argv[argv.index("--frames") + 1])
    if not os.path.exists(src):
        sys.exit("no such video: " + src)

    FF = ffmpeg()
    out = os.path.join(IMG, name)
    if os.path.isdir(out):
        for f in glob.glob(os.path.join(out, "*.jpg")):
            os.remove(f)
    else:
        os.makedirs(out)

    # Duration decides the fps needed to land on roughly `want` frames.
    p = subprocess.run([FF, "-i", src], capture_output=True, text=True)
    dur = None
    for line in p.stderr.split("\n"):
        if "Duration:" in line:
            hh, mm, ss = line.split("Duration:")[1].split(",")[0].strip().split(":")
            dur = int(hh) * 3600 + int(mm) * 60 + float(ss)
            break
    if not dur:
        sys.exit("could not read the video duration")
    fps = want / dur

    run([FF, "-v", "error", "-i", src,
         "-vf", "fps=%.4f,scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d"
                % (fps, W, H, W, H),
         "-q:v", "4", os.path.join(out, "f%03d.jpg"), "-y"])
    frames = sorted(glob.glob(os.path.join(out, "*.jpg")))

    # the fallback clip, and a poster taken from the last frame
    vf = "scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d" % (W, H, W, H)
    run([FF, "-v", "error", "-i", src, "-an", "-vf", vf, "-c:v", "libx264",
         "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "slow",
         "-movflags", "+faststart", os.path.join(IMG, name + ".mp4"), "-y"])
    run([FF, "-v", "error", "-i", src, "-an", "-vf", vf, "-c:v", "libvpx-vp9",
         "-crf", "40", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2",
         os.path.join(IMG, name + ".webm"), "-y"])
    if frames:
        shutil.copyfile(frames[-1], os.path.join(IMG, name + "-poster.jpg"))

    kb = lambda p: os.path.getsize(p) / 1024.0
    print("  %-22s %d frames at %dx%d, %.1f s source" % (name + "/", len(frames), W, H, dur))
    print("  %-22s %6.1f KB" % (name + ".mp4", kb(os.path.join(IMG, name + ".mp4"))))
    print("  %-22s %6.1f KB" % (name + ".webm", kb(os.path.join(IMG, name + ".webm"))))
    print("\n  Set data-frames=\"%d\" on the scrub section, then: python3 tools/build.py"
          % len(frames))
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
