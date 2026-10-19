"""Sound design for the Play trailer: an ambient bed plus UI sounds synced to the same timeline as
trailer.html (read from the JSON that `render_trailer.mjs timeline` prints). Pure numpy: no samples,
no voice. The trailer autoplays muted on Google Play; this track is what people hear when they tap it.

usage: python3 make_audio.py timeline.json out.wav
"""
import json
import sys
import wave

import numpy as np

TL = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
SR = 44100
TOTAL = TL["total"]
N = int(TOTAL * SR)
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)
REV_L = np.zeros(N)  # send bus for the reverb
REV_R = np.zeros(N)


def hz(note):  # MIDI -> Hz
    return 440.0 * 2 ** ((note - 69) / 12)


def add(sig, t, gain=1.0, pan=0.0, send=0.0):
    i = int(t * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i]
    gl = gain * np.cos((pan + 1) * np.pi / 4)
    gr = gain * np.sin((pan + 1) * np.pi / 4)
    L[i : i + len(sig)] += sig * gl
    R[i : i + len(sig)] += sig * gr
    if send:
        REV_L[i : i + len(sig)] += sig * gl * send
        REV_R[i : i + len(sig)] += sig * gr * send


def env(n, a, d, s=0.0, r=0.0):
    e = np.ones(n)
    na, nd = int(a * SR), int(d * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nd and s < 1:
        e[na : na + nd] = np.linspace(1, s, nd)[: max(0, min(nd, n - na))]
        e[na + nd :] = s
    nr = int(r * SR)
    if nr and nr < n:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def tone(freq, dur, harm=(1.0, 0.3, 0.1), a=0.005, decay=None, vib=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * freq * t + (vib * np.sin(2 * np.pi * 5 * t) if vib else 0)
    s = sum(h * np.sin(ph * (k + 1)) for k, h in enumerate(harm))
    e = np.exp(-t / decay) if decay else np.ones(n)
    e = e * np.minimum(1, t / max(a, 1e-4))
    return s * e / sum(harm)


def lowpass(x, cutoff):  # one-pole, vectorised via cumulative filter in blocks
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def click(t, gain=1.0, pitch=2200, pan=0.0):
    n = int(0.035 * SR)
    tt = np.arange(n) / SR
    noise = np.convolve(rng.standard_normal(n), np.ones(7) / 7, mode='same') * 2.2 * np.exp(-tt / 0.004)  # dulled: no hiss above ~5 kHz
    body = np.sin(2 * np.pi * pitch * tt) * np.exp(-tt / 0.01)
    add((0.6 * noise + 0.8 * body) * 0.5, t, gain, pan, send=0.15)


def whoosh(t, dur, up=True, gain=0.5):
    """Band-limited swell: one continuous filter whose cutoff glides, so there are no block seams."""
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    frac = np.linspace(0, 1, n)
    cutoff = 250 + 2600 * (frac if up else 1 - frac)
    a = np.exp(-2 * np.pi * cutoff / SR)
    out = np.zeros(n)
    acc = 0.0
    acc2 = 0.0
    for i in range(n):
        acc = (1 - a[i]) * noise[i] + a[i] * acc
        acc2 = (1 - a[i]) * acc + a[i] * acc2  # two poles: steeper, less hiss
        out[i] = acc2
    out /= np.sqrt((out**2).mean()) + 1e-9
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    add(out * e * 0.5, t, gain * 0.55, 0.0, send=0.25)


def chime(t, notes, gap=0.09, gain=0.5, dur=1.4):
    for k, m in enumerate(notes):
        add(tone(hz(m), dur, harm=(1.0, 0.35, 0.12, 0.05), a=0.004, decay=0.55), t + k * gap, gain, pan=-0.2 + 0.1 * k, send=0.45)


# ---------------------------------------------------------------- music bed
def chord_pad(t0, t1, notes, gain=0.16, bright=0.5):
    dur = t1 - t0 + 1.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    pad = np.zeros(n)
    for m in notes:
        for det in (-0.07, 0.0, 0.07):
            f = hz(m) * 2 ** (det / 12)
            pad += np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(4 * np.pi * f * t) + 0.12 * bright * np.sin(6 * np.pi * f * t)
    pad /= max(1, len(notes) * 3)
    slow = 0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t + t0)
    e = env(n, 1.1, 0, 1.0, 1.5) * slow
    add(pad * e, t0, gain, 0.0, send=0.5)


A_MIN9 = [45, 52, 55, 59, 60]
F_MAJ9 = [41, 48, 52, 55, 57]
C_MAJ7 = [48, 55, 59, 64]
D_MIN9 = [38, 45, 48, 52, 57]
C_RES = [48, 52, 55, 60, 64]
C_FIN = [36, 48, 55, 59, 64, 67]

chord_pad(0.0, 4.0, A_MIN9, 0.2)
chord_pad(4.0, 8.4, F_MAJ9, 0.21)
chord_pad(8.4, 12.9, C_MAJ7, 0.21)
chord_pad(12.9, TL["curtainAt"], A_MIN9, 0.2)
chord_pad(TL["curtainAt"], TL["sentAt"], D_MIN9, 0.19, bright=0.25)  # darker while the prompt is held
chord_pad(TL["sentAt"], TL["outro1"][0], C_RES, 0.22, bright=0.8)
chord_pad(TL["outro1"][0], TL["outro3"][0], F_MAJ9, 0.21)
chord_pad(TL["outro3"][0], TOTAL, C_FIN, 0.25, bright=0.9)

# sparse plucks (only where nothing is being held)
def arp(t0, t1, notes, step=0.5455, gain=0.1, pattern=(0, 2, 1, 3, 2, 4)):
    t = t0
    k = 0
    while t < t1:
        m = notes[pattern[k % len(pattern)] % len(notes)] + 12
        add(tone(hz(m), 0.9, harm=(1.0, 0.4, 0.15), a=0.003, decay=0.28), t, gain, pan=-0.3 + 0.6 * ((k % 6) / 5), send=0.5)
        t += step
        k += 1

arp(4.6, 8.3, F_MAJ9)
arp(8.5, 12.5, C_MAJ7)
arp(TL["sentAt"] + 0.6, TL["outro1"][0] - 0.2, C_RES, gain=0.12)
arp(TL["outro1"][0] + 0.2, TL["outro3"][0], F_MAJ9, gain=0.1)

# ---------------------------------------------------------------- UI sounds
# intro
chime(0.35, [76, 81, 88], gap=0.16, gain=0.28, dur=2.2)
whoosh(TL["intro"][1] - 1.0, 1.0, up=True, gain=0.35)

# checkbox taps
for i, tt in enumerate(TL["tick"]):
    click(tt - 0.15, 0.7, pitch=1800)
    chime(tt, [84 + [0, 4, 7][i]], gain=0.22, dur=0.9)

# protection on
chime(TL["protectOn"], [69, 76, 81], gap=0.11, gain=0.4)
whoosh(TL["protectOn"] - 0.2, 0.7, up=True, gain=0.25)

# typing
prompt_len = len("Why does this fail? Email jordan.lee@example.com, my AWS key is AKIAIOSFODNN7EXAMPLE")
span = TL["typeTo"] - TL["typeFrom"]
for i in range(1, prompt_len + 1):
    frac = i / prompt_len  # invert ease(x)=1-(1-x)^3
    t = TL["typeFrom"] + span * (1 - (1 - frac) ** (1 / 3))
    click(t + rng.uniform(-0.004, 0.004), 0.2 + 0.07 * rng.random(), pitch=rng.uniform(1700, 2600), pan=rng.uniform(-0.25, 0.25))

# the curtain drops: soft descending two-note alert and a low thump
a = TL["curtainAt"]
add(tone(hz(64), 0.5, harm=(1.0, 0.25), a=0.01, decay=0.22), a, 0.38, send=0.4)
add(tone(hz(57), 0.8, harm=(1.0, 0.25), a=0.01, decay=0.32), a + 0.17, 0.4, send=0.4)
add(tone(hz(36), 0.6, harm=(1.0, 0.3), a=0.01, decay=0.16), a, 0.2)

# tap on the curtain, gate opens
click(TL["tapCurtain"], 0.9, pitch=1500)
whoosh(TL["gateAt"] - 0.05, 0.5, up=True, gain=0.3)
add(tone(hz(69), 0.5, a=0.004, decay=0.15), TL["gateAt"] + 0.25, 0.2, send=0.3)

# options highlighted one by one
for k, tt in enumerate(TL["hiGate"]):
    add(tone(hz(81 + 2 * k), 0.18, a=0.003, decay=0.06), tt, 0.22, send=0.3)

# Sanitize & Send tapped, text goes out
click(TL["tapSanitize"], 0.9, pitch=1400)
whoosh(TL["gateOut"] - 0.1, 0.5, up=False, gain=0.25)
chime(TL["sentAt"], [72, 76, 79, 84], gap=0.1, gain=0.42, dur=1.8)
whoosh(TL["sentAt"] - 0.05, 0.45, up=True, gain=0.3)

# outro
whoosh(TL["outro1"][0] - 0.5, 0.9, up=True, gain=0.3)
chime(TL["outro1"][0] + 0.1, [67, 72], gap=0.14, gain=0.28)
chime(TL["outro2"][0] + 0.1, [69, 76], gap=0.14, gain=0.26)
chime(TL["outro3"][0] + 0.1, [60, 67, 72, 76, 79], gap=0.13, gain=0.34, dur=3.0)

# ---------------------------------------------------------------- reverb + master
def reverb_ir(seconds=2.2):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / 0.55)
    # darken the tail
    ir = lowpass(ir, 5000)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.sqrt(np.sum(ir**2))

ir = reverb_ir()
def conv(x):
    n = len(x) + len(ir) - 1
    nfft = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[: len(x)]
    return y

wet_l, wet_r = conv(REV_L), conv(REV_R)
mix_l = L + wet_l * 0.55
mix_r = R + wet_r * 0.55

# gentle fade in/out
fade_in = np.minimum(1, np.arange(N) / (0.08 * SR))
fade_out = np.minimum(1, (N - np.arange(N)) / (0.9 * SR))
mix_l *= fade_in * fade_out
mix_r *= fade_in * fade_out

peak = max(np.abs(mix_l).max(), np.abs(mix_r).max())
mix_l, mix_r = mix_l / peak * 0.89, mix_r / peak * 0.89
pcm = (np.stack([mix_l, mix_r], axis=1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", OUT, f"{TOTAL:.1f}s")
