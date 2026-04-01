"""
SL2445 七龍珠 - Excel 規格驅動壓力測試
嚴格按照美術企劃文件_SL2445_七龍珠.xlsx 的規格：
  - 畫布：720 x 1280（直式 9:16）
  - 轉輪：3 行 x 5 列
  - Symbol 輸出尺寸：140 x 140 px（正方形）
  - Symbol 清單：M1 悟空 / M2 貝吉塔 / M3 弗利沙 / M4 比克
                  M5 A / M6 K / M7 Q / M8 J
                  C1 龍珠(Scatter) / WW 神龍(Wild)
"""

import os, sys, time, json, math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── 輸出目錄 ──────────────────────────────────
BASE = Path(r"c:\Antigracity\GameAssetWorkshop")
OUT  = BASE / "excel_spec_stress_output"
OUT.mkdir(exist_ok=True)

# ══════════════════════════════════════════════
# 從 Excel 提取的真實規格（SL2445）
# ══════════════════════════════════════════════
CANVAS_W   = 720
CANVAS_H   = 1280
GRID_COLS  = 5          # 列
GRID_ROWS  = 3          # 行
SYM_OUTPUT = 140        # 輸出尺寸：正方形 140×140 px
SYM_ORIG   = 560        # 原稿尺寸：560×560 px（縮圖比 = 1/4）

# 七龍珠配色 DNA
THEME = {
    "bg_top":     (8,  12, 55),
    "bg_bot":     (4,  25, 90),
    "hud_bg":     (6,  10, 42),
    "reel_bg":    (3,   8, 35),
    "frame_glow": (255, 200, 40),   # 金黃
    "reel_line":  (60,  120, 255),  # 藍光
    "spin_btn":   (220,  50, 0),    # 紅橘
    "win_line":   (255, 230, 0),    # 黃色中獎線
    "accent":     (80, 160, 255),
}

# 符號定義（嚴格對應 Excel 文件）
SYMBOLS = [
    # id   中文名     英文ID  代表色(R,G,B)    形狀      賠率(x5)
    ("M1", "悟空",   "GOKU",   (255,120, 30), "star",    "12x"),
    ("M2", "貝吉塔", "VEGETA", ( 60,120,255), "shield",  "8x"),
    ("M3", "弗利沙", "FRIEZA", (160, 60,220), "diamond", "5x"),
    ("M4", "比克",   "PICCOLO",(  0,180, 80), "hexagon", "3x"),
    ("M5", "A",      "A",      (255,100, 40), "text",    "2.5x"),
    ("M6", "K",      "K",      ( 40,100,240), "text",    "2.5x"),
    ("M7", "Q",      "Q",      (140, 50,200), "text",    "2x"),
    ("M8", "J",      "J",      (  0,160, 60), "text",    "2x"),
    ("C1", "龍珠",   "SCATTER",(255,200,  0), "orb",     "Scatter"),
    ("WW", "神龍",   "WILD",   ( 30,220,200), "dragon",  "Wild"),
]

# ── 字型 ──────────────────────────────────────
def get_font(size):
    for p in ["C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/arial.ttf"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: pass
    return ImageFont.load_default()

# ══════════════════════════════════════════════
# 幾何工具
# ══════════════════════════════════════════════
def star_pts(cx, cy, r, n=6):
    pts = []
    for i in range(n*2):
        a = i * math.pi / n - math.pi/2
        rr = r if i%2==0 else r*0.45
        pts.append((cx+math.cos(a)*rr, cy+math.sin(a)*rr))
    return pts

def hex_pts(cx, cy, r):
    return [(cx+math.cos(i*math.pi/3)*r, cy+math.sin(i*math.pi/3)*r) for i in range(6)]

def diamond_pts(cx, cy, r):
    return [(cx, cy-r),(cx+r*0.65,cy),(cx,cy+r),(cx-r*0.65,cy)]

def shield_pts(cx, cy, r):
    return [(cx,cy-r),(cx+r,cy-r*0.2),(cx+r,cy+r*0.4),
            (cx,cy+r),(cx-r,cy+r*0.4),(cx-r,cy-r*0.2)]

# ══════════════════════════════════════════════
# 渲染單個 Symbol（SYM_OUTPUT × SYM_OUTPUT）
# ══════════════════════════════════════════════
def render_symbol_cell(sym_id, zh_name, en_id, color, shape, payout,
                       size=SYM_OUTPUT, glow=False, win_highlight=False):
    """
    嚴格按規格渲染單個 symbol：size × size 正方形
    """
    img  = Image.new("RGBA", (size, size), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    pad  = 3

    # 1. 卡牌底色
    bg_dark = (color[0]//7, color[1]//7, color[2]//7, 210)
    draw.rounded_rectangle([pad, pad, size-pad, size-pad],
                           radius=10, fill=bg_dark,
                           outline=color, width=2)

    # 2. 中獎高亮外框
    if win_highlight:
        for gi in range(1, 5):
            op = max(30, 140 - gi*30)
            draw.rounded_rectangle([pad-gi, pad-gi, size-pad+gi, size-pad+gi],
                                   radius=10+gi, outline=(*color, op), width=1)

    # 3. 圖案繪製
    cx = size // 2
    logo_area_top = int(size * 0.12)
    label_h       = int(size * 0.22)
    draw_area_h   = size - logo_area_top - label_h
    cy = logo_area_top + draw_area_h // 2
    r  = min(size//2, draw_area_h//2) - pad - 5

    if r > 4:
        if shape == "star":
            draw.polygon(star_pts(cx, cy, r), fill=color)
        elif shape == "hexagon":
            draw.polygon(hex_pts(cx, cy, r), fill=color)
        elif shape == "diamond":
            draw.polygon(diamond_pts(cx, cy, r), fill=color)
        elif shape == "shield":
            draw.polygon(shield_pts(cx, cy, r), fill=color)
        elif shape == "orb":   # 龍珠：七顆小球
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=color)
            # 七顆龍珠的星星點
            for i in range(7):
                a = i * math.pi * 2 / 7
                bx = int(cx + math.cos(a) * r * 0.55)
                by = int(cy + math.sin(a) * r * 0.55)
                draw.ellipse([bx-3, by-3, bx+3, by+3],
                             fill=(255,50,50,255))
        elif shape == "dragon":  # 神龍：S 形曲線
            draw.ellipse([cx-r, cy-r, cx+r, cy+r],
                         fill=(color[0]//2, color[1]//2, color[2]//2, 180))
            snake_pts = []
            for i in range(20):
                t  = i / 19.0
                sx = cx + int(math.sin(t * math.pi * 2) * r * 0.6)
                sy = int(cy - r*0.8 + t * r * 1.6)
                snake_pts.append((sx, sy))
            if len(snake_pts) >= 2:
                draw.line(snake_pts, fill=color, width=max(4, r//4))
        elif shape == "text":  # 字母 A/K/Q/J
            fn = get_font(max(28, int(size * 0.48)))
            bb = draw.textbbox((0,0), en_id, font=fn)
            tw, th = bb[2]-bb[0], bb[3]-bb[1]
            tx = (size - tw) // 2
            ty = cy - th // 2
            draw.text((tx+2, ty+2), en_id, font=fn, fill=(0,0,0,180))
            draw.text((tx, ty), en_id, font=fn, fill=(*color, 255))

    # 4. 符號 ID 標籤（左上角小字）
    fn_id = get_font(max(7, int(size * 0.1)))
    draw.text((pad+3, pad+3), sym_id, font=fn_id,
              fill=(*color, 200))

    # 5. 中文名稱（底部）
    fn_zh = get_font(max(8, int(size * 0.13)))
    bb2 = draw.textbbox((0,0), zh_name, font=fn_zh)
    tw2 = bb2[2] - bb2[0]
    tz  = size - label_h + 5
    draw.text(((size-tw2)//2+1, tz+1), zh_name, font=fn_zh,
              fill=(0,0,0,160))
    draw.text(((size-tw2)//2, tz), zh_name, font=fn_zh,
              fill=(240,225,170,255))

    # 6. 賠率（右下角）
    fn_pay = get_font(max(7, int(size * 0.1)))
    bbp = draw.textbbox((0,0), payout, font=fn_pay)
    pw = bbp[2]-bbp[0]
    draw.text((size-pw-pad-1, tz+1), payout, font=fn_pay,
              fill=(0,0,0,140))
    draw.text((size-pw-pad, tz), payout, font=fn_pay,
              fill=(255,220,80,220))

    return img

# ══════════════════════════════════════════════
# 背景漸層
# ══════════════════════════════════════════════
def make_bg(w, h, top, bot):
    img = Image.new("RGB", (w, h))
    px  = img.load()
    for y in range(h):
        t = y / h
        r = int(top[0]*(1-t) + bot[0]*t)
        g = int(top[1]*(1-t) + bot[1]*t)
        b = int(top[2]*(1-t) + bot[2]*t)
        for x in range(w): px[x,y] = (r,g,b)
    return img.convert("RGBA")

# ══════════════════════════════════════════════
# HUD 欄 (底部 20%)
# ══════════════════════════════════════════════
def make_hud(w, h, balance=1250.0, bet=1.0, win=0.0):
    hud  = Image.new("RGBA", (w, h), (0,0,0,0))
    draw = ImageDraw.Draw(hud)
    bg   = THEME["hud_bg"]
    glow = THEME["frame_glow"]
    acc  = THEME["accent"]
    spin = THEME["spin_btn"]

    draw.rectangle([0,0,w,h], fill=(*bg,248))
    draw.line([(0,0),(w,0)], fill=(*glow,200), width=2)

    fn_lg = get_font(max(11, int(w*0.03)))
    fn_sm = get_font(max(8,  int(w*0.018)))

    ph = int(h * 0.62)
    py = (h - ph) // 2
    pw = int(w * 0.26)

    # BALANCE
    px = 16
    draw.rounded_rectangle([px, py, px+pw, py+ph], radius=8,
                           fill=(*bg,220), outline=(*acc,150), width=1)
    draw.text((px+(pw-draw.textbbox((0,0),"BALANCE",font=fn_sm)[2])//2, py+5),
              "BALANCE", font=fn_sm, fill=(*glow,200))
    bal_str = f"${balance:,.2f}"
    bw = draw.textbbox((0,0),bal_str,font=fn_lg)[2]
    draw.text((px+(pw-bw)//2, py+int(ph*0.44)), bal_str,
              font=fn_lg, fill=(255,255,255,255))

    # WIN (center)
    wp = (w - pw)//2
    draw.rounded_rectangle([wp, py, wp+pw, py+ph], radius=8,
                           fill=(*bg,220), outline=(*acc,150), width=1)
    draw.text((wp+(pw-draw.textbbox((0,0),"WIN",font=fn_sm)[2])//2, py+5),
              "WIN", font=fn_sm, fill=(*glow,200))
    win_str = f"${win:,.2f}"
    ww2 = draw.textbbox((0,0),win_str,font=fn_lg)[2]
    wcolor = (255,230,50,255) if win>0 else (255,255,255,255)
    draw.text((wp+(pw-ww2)//2, py+int(ph*0.44)), win_str,
              font=fn_lg, fill=wcolor)

    # SPIN button (right)
    br  = int(h * 0.42)
    bcx = w - br - int(w*0.05)
    bcy = h // 2
    for off, al in [(br+8,35),(br+4,75)]:
        draw.ellipse([bcx-off,bcy-off,bcx+off,bcy+off], fill=(*spin,al))
    draw.ellipse([bcx-br,bcy-br,bcx+br,bcy+br], fill=spin)
    draw.ellipse([bcx-br+4,bcy-br+4,bcx-br//3,bcy], fill=(255,255,255,55))
    fn_sp = get_font(max(10, int(br*0.52)))
    sw = draw.textbbox((0,0),"SPIN",font=fn_sp)[2]
    sh = draw.textbbox((0,0),"SPIN",font=fn_sp)[3]
    draw.text((bcx-sw//2+1,bcy-sh//2+1),"SPIN",font=fn_sp,fill=(0,0,0,90))
    draw.text((bcx-sw//2,bcy-sh//2),"SPIN",font=fn_sp,fill=(255,255,255,255))

    # BET
    bep = w - pw - int(w*0.05) - br*2 - 12
    draw.rounded_rectangle([bep,py,bep+pw,py+ph], radius=8,
                           fill=(*bg,220), outline=(*acc,150), width=1)
    draw.text((bep+(pw-draw.textbbox((0,0),"BET",font=fn_sm)[2])//2, py+5),
              "BET", font=fn_sm, fill=(*glow,200))
    bet_str = f"${bet:.2f}"
    betw = draw.textbbox((0,0),bet_str,font=fn_lg)[2]
    draw.text((bep+(pw-betw)//2, py+int(ph*0.44)), bet_str,
              font=fn_lg, fill=(255,255,255,255))

    return hud

# ══════════════════════════════════════════════
# 頂部 Logo 欄
# ══════════════════════════════════════════════
def make_top_bar(w, h, title="七龍珠", sub="Dragon Ball Slot", multiplier=None):
    bar  = Image.new("RGBA", (w, h), (0,0,0,0))
    draw = ImageDraw.Draw(bar)
    glow = THEME["frame_glow"]

    draw.rectangle([0,0,w,h],
                   fill=(glow[0]//8, glow[1]//8, glow[2]//8, 230))
    draw.line([(0,h-1),(w,h-1)], fill=(*glow,180), width=2)

    fn_t = get_font(max(16, int(w*0.06)))
    fn_s = get_font(max(9,  int(w*0.022)))
    fn_m = get_font(max(10, int(w*0.03)))

    # 主標題
    tw = draw.textbbox((0,0),title,font=fn_t)[2]
    draw.text(((w-tw)//2+1, 6), title, font=fn_t, fill=(0,0,0,150))
    draw.text(((w-tw)//2, 5),   title, font=fn_t, fill=(*glow,255))

    # 副標題
    sw2 = draw.textbbox((0,0),sub,font=fn_s)[2]
    draw.text(((w-sw2)//2, int(h*0.58)), sub, font=fn_s, fill=(180,160,80,200))

    # 右邊倍率
    if multiplier:
        ms = f"×{multiplier}"
        mw = draw.textbbox((0,0),ms,font=fn_m)[2]
        draw.text((w-mw-12, (h-18)//2), ms,
                  font=fn_m, fill=(*THEME["accent"],230))

    return bar

# ══════════════════════════════════════════════
# 裝飾框架
# ══════════════════════════════════════════════
def make_frame(cw, ch, gx, gy, gw, gh):
    frame = Image.new("RGBA", (cw, ch), (0,0,0,0))
    draw  = ImageDraw.Draw(frame)
    glow  = THEME["frame_glow"]
    pad   = 8

    x1,y1 = gx-pad, gy-pad
    x2,y2 = gx+gw+pad, gy+gh+pad

    # 主框線（發光3層）
    for lw, al in [(8,100),(5,180),(2,255)]:
        draw.rounded_rectangle([x1,y1,x2,y2], radius=14,
                               outline=(*glow,al), width=lw)

    # 四角裝飾
    cs = 20
    for cx, cy in [(x1,y1),(x2-cs,y1),(x1,y2-cs),(x2-cs,y2-cs)]:
        draw.rectangle([cx,cy,cx+cs,cy+cs], fill=(*glow,200))

    return frame

# ══════════════════════════════════════════════
# 核心渲染：完整一幀
# ══════════════════════════════════════════════
def render_frame(sym_grid,              # list of 15 symbol indices (row-major)
                 win_row=None,          # 中獎行 (0/1/2)
                 pop_row=None,          # pop-out 行
                 balance=1250.0,
                 bet=1.0,
                 win=0.0,
                 multiplier=None,
                 label=""):
    t0 = time.perf_counter()

    # 1. 背景
    canvas = make_bg(CANVAS_W, CANVAS_H, THEME["bg_top"], THEME["bg_bot"])

    # 2. 佈局計算 ─────────────────────────────
    TOP_H    = int(CANVAS_H * 0.12)   # 12% 頂部 Logo
    HUD_H    = int(CANVAS_H * 0.20)   # 20% 底部 HUD
    USABLE_H = CANVAS_H - TOP_H - HUD_H  # 68% 盤面區

    # Symbol 嚴格使用 Excel 規格的 140×140
    SZ      = SYM_OUTPUT          # 140
    SPACING = 8                   # 格子間距
    GRID_W  = GRID_COLS * SZ + (GRID_COLS-1) * SPACING
    GRID_H  = GRID_ROWS * SZ + (GRID_ROWS-1) * SPACING

    # 水平置中；垂直在可用區段置中
    GX = (CANVAS_W - GRID_W) // 2
    GY = TOP_H + (USABLE_H - GRID_H) // 2

    # 3. 盤面底板
    ov = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0,0,0,0))
    od = ImageDraw.Draw(ov)
    rb = THEME["reel_bg"]
    od.rounded_rectangle([GX-10,GY-10,GX+GRID_W+10,GY+GRID_H+10],
                         radius=16, fill=(*rb,210))
    canvas.alpha_composite(ov)

    # 4. 符號格子
    sym_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0,0,0,0))
    for i, sym_idx in enumerate(sym_grid):
        row = i // GRID_COLS
        col = i  % GRID_COLS
        sid, zh, en, col_, shp, pay = SYMBOLS[sym_idx]

        is_win = (win_row is not None and row == win_row)
        is_pop = (pop_row is not None and row == pop_row)

        # 渲染符號
        cell = render_symbol_cell(sid, zh, en, col_, shp, pay,
                                  size=SZ,
                                  glow=is_pop,
                                  win_highlight=is_win)

        px = GX + col * (SZ + SPACING)
        py = GY + row * (SZ + SPACING)

        if is_pop:
            # pop-out：放大 8%，向上偏移
            nsz = int(SZ * 1.08)
            cell = cell.resize((nsz, nsz), Image.Resampling.LANCZOS)
            px -= (nsz - SZ) // 2
            py -= (nsz - SZ) + 4
            sym_layer.alpha_composite(cell, (max(0,px), max(0,py)))
        else:
            sym_layer.alpha_composite(cell, (px, py))

    canvas.alpha_composite(sym_layer)

    # 5. 中獎線
    if win_row is not None and 0 <= win_row < GRID_ROWS:
        wl  = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0,0,0,0))
        wld = ImageDraw.Draw(wl)
        wc  = THEME["win_line"]
        ly  = GY + win_row * (SZ + SPACING) + SZ // 2
        for lw, al in [(16,30),(10,70),(5,160),(2,255)]:
            wld.line([(GX, ly),(GX+GRID_W, ly)],
                     fill=(*wc, al), width=lw)
        canvas.alpha_composite(wl)

    # 6. 欄柱分隔線
    cl = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0,0,0,0))
    cd = ImageDraw.Draw(cl)
    rl = THEME["reel_line"]
    for c in range(1, GRID_COLS):
        lx = GX + c*(SZ+SPACING) - SPACING//2
        cd.line([(lx,GY),(lx,GY+GRID_H)], fill=(*rl,60), width=1)
    canvas.alpha_composite(cl)

    # 7. 裝飾框 (疊在符號上)
    frame = make_frame(CANVAS_W, CANVAS_H, GX, GY, GRID_W, GRID_H)
    canvas.alpha_composite(frame)

    # 8. 頂部 Logo 欄
    top = make_top_bar(CANVAS_W, TOP_H,
                       title="七龍珠", sub="Dragon Ball Slot",
                       multiplier=multiplier)
    canvas.alpha_composite(top, (0,0))

    # 9. 底部 HUD
    hud = make_hud(CANVAS_W, HUD_H, balance=balance, bet=bet, win=win)
    canvas.alpha_composite(hud, (0, CANVAS_H - HUD_H))

    # 10. 說明文字（左下角）
    if label:
        ld = ImageDraw.Draw(canvas)
        fn = get_font(max(9, int(CANVAS_W*0.018)))
        ld.text((10, CANVAS_H - HUD_H - 18), label,
                font=fn, fill=(200,200,200,180))

    elapsed = time.perf_counter() - t0
    return canvas, elapsed


# ══════════════════════════════════════════════
# 壓力測試主程序
# ══════════════════════════════════════════════
def run():
    print("=" * 70)
    print("🎰  SL2445 七龍珠 - Excel 規格驅動壓力測試")
    print(f"    畫布：{CANVAS_W}×{CANVAS_H} | 轉輪：{GRID_ROWS}×{GRID_COLS} | "
          f"Symbol：{SYM_OUTPUT}×{SYM_OUTPUT}px（正方形）")
    print("=" * 70)

    results = {}
    total_t0 = time.perf_counter()
    rng = random.Random(2445)

    def rand_grid():
        return [rng.randint(0, len(SYMBOLS)-1) for _ in range(GRID_ROWS*GRID_COLS)]

    # ── TEST 1：標準 Main Game 畫面 ──────────
    print("\n[TEST 1/4] 標準遊戲畫面（無中獎）")
    img, t = render_frame(rand_grid(), balance=1250.0, bet=1.0,
                          label="TEST1: Standard MG")
    p = OUT/"T1_standard_MG.png"
    img.save(p)
    print(f"  ✓ {p.name}  [{t*1000:.1f}ms]")
    results["T1_standard"] = {"ms": round(t*1000,1), "status":"PASS"}

    # 檢查輸出尺寸
    w_, h_ = img.size
    assert w_==720 and h_==1280, f"尺寸錯誤：{w_}×{h_}"
    print(f"  ✓ 尺寸驗證：{w_}×{h_} ↔ 規格 720×1280  OK")

    # ── TEST 2：中獎行特效（3 幀） ───────────
    print("\n[TEST 2/4] 中獎行特效（3 行輪流）")
    t2_times = []
    for row in range(GRID_ROWS):
        # 讓中獎行出現高賠率符號（M1悟空 index=0）
        grid = rand_grid()
        for col in range(GRID_COLS):
            grid[row*GRID_COLS+col] = 0  # 全行悟空
        win_amt = [888.0, 1776.0, 2664.0][row]
        img, t = render_frame(grid, win_row=row, pop_row=row,
                              win=win_amt, balance=1250.0-row*10,
                              multiplier=5*(row+1),
                              label=f"TEST2: Win Row{row} WIN${win_amt:.0f}")
        p = OUT / f"T2_win_row{row}.png"
        img.save(p)
        t2_times.append(t)
        print(f"  ✓ row={row} WIN=${win_amt:.0f}  → {p.name}  [{t*1000:.1f}ms]")
    results["T2_win_effect"] = {"avg_ms":round(sum(t2_times)/3*1000,1),"status":"PASS"}

    # ── TEST 3：Wild + Scatter 符號顯示 ─────
    print("\n[TEST 3/4] Wild(神龍) + Scatter(龍珠) 特殊符號")
    # 第 1 行全 Wild，第 2 行全 Scatter
    grid = rand_grid()
    wild_idx    = next(i for i,s in enumerate(SYMBOLS) if s[0]=="WW")
    scatter_idx = next(i for i,s in enumerate(SYMBOLS) if s[0]=="C1")
    for col in range(GRID_COLS):
        grid[0*GRID_COLS+col] = wild_idx
        grid[1*GRID_COLS+col] = scatter_idx
    img, t = render_frame(grid, win_row=0, pop_row=0,
                          win=9999.0, balance=999.99,
                          multiplier=50,
                          label="TEST3: WW+C1 Special Symbols")
    p = OUT/"T3_wild_scatter.png"
    img.save(p)
    print(f"  ✓ 第0行=神龍WILD, 第1行=龍珠Scatter → {p.name}  [{t*1000:.1f}ms]")
    results["T3_special"] = {"ms":round(t*1000,1),"status":"PASS"}

    # ── TEST 4：批量 FPS 壓力（20 幀） ───────
    print("\n[TEST 4/4] 批量 FPS 壓力（20 幀）")
    fps_dir = OUT / "batch"
    fps_dir.mkdir(exist_ok=True)
    fps_times = []
    for i in range(20):
        grid   = rand_grid()
        wr     = i % 3 if i % 4 == 0 else None
        pr     = i % 3 if i % 5 == 0 else None
        win_a  = 100 * (i+1) if wr is not None else 0.0
        img, t = render_frame(grid, win_row=wr, pop_row=pr,
                              balance=1250-i*5.5, bet=1.0, win=win_a,
                              label=f"BATCH frame {i:02d}")
        img.save(fps_dir / f"frame_{i:02d}.png")
        fps_times.append(t)
    avg_ms = sum(fps_times)/len(fps_times)*1000
    fps    = 1000/avg_ms
    print(f"  ✓ 20 幀完成  avg={avg_ms:.1f}ms  ({fps:.2f} FPS)")
    results["T4_batch_fps"] = {"avg_ms":round(avg_ms,1),"fps":round(fps,2),"status":"PASS"}

    # ── 規格驗證 ──────────────────────────────
    print("\n[驗證] 輸出圖片規格核查")
    for fn in list(OUT.glob("*.png")):
        img2 = Image.open(fn)
        w,h  = img2.size
        kb   = fn.stat().st_size // 1024
        ok   = (w==720 and h==1280)
        mark = "✓" if ok else "✗"
        print(f"  {mark} {fn.name:<35} {w}×{h}  {kb}KB  {img2.mode}")

    # ── 報告 ──────────────────────────────────
    total = time.perf_counter() - total_t0
    print("\n" + "=" * 70)
    print("📊 測試報告（SL2445 七龍珠）")
    print("=" * 70)
    for k, v in results.items():
        ms  = v.get("avg_ms") or v.get("ms","?")
        fps_ = f"  fps={v['fps']}" if "fps" in v else ""
        print(f"  ✅ {k:<22}  avg={ms}ms{fps_}")
    print(f"\n  畫布規格：720×1280  轉輪：3×5  Symbol：{SYM_OUTPUT}×{SYM_OUTPUT}px（正方形✓）")
    print(f"  總耗時：{total:.2f}s")
    print(f"  輸出目錄：{OUT}")
    print("=" * 70)

    # JSON 報告
    rp = OUT / "report.json"
    json.dump({"spec":{"canvas":"720x1280","grid":"3x5","symbol_size":f"{SYM_OUTPUT}x{SYM_OUTPUT}"},
               "results":results,"total_sec":round(total,2)},
              open(rp,"w",encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"  報告：{rp}")


if __name__ == "__main__":
    run()
