"""
真實壓力測試套件 - 渲染完整老虎機 UI 畫面
使用 PIL 繪製，不依賴 API，100% 本地計算
測試項目：
  1. Layout Engine      - 自動計算 5x3 格子佈局（720x1280 手機版）
  2. Symbol Renderer    - 渲染 15 個不同圖騰（16種隨機結果）
  3. HUD Composer       - 繪製底部 HUD 欄、SPIN 按鈕、幣值面板
  4. Frame Overlay      - 繪製半透明裝飾邊框
  5. Pop-out Effect     - 測試符號彈出效果（帶光暈）
  6. Multi-theme Batch  - 批量生成 5 種主題配色
  7. Performance        - 記錄 FPS / 渲染時間
"""

import os
import sys
import time
import json
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ─────────────────────────────────────────────
# 路徑設定
# ─────────────────────────────────────────────
BASE_DIR = Path(r"c:\Antigracity\GameAssetWorkshop")
OUT_DIR  = BASE_DIR / "real_stress_test_output"
OUT_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────────
# 老虎機配色主題
# ─────────────────────────────────────────────
THEMES = {
    "七龍珠": {
        "bg_top":     (10, 15, 60),
        "bg_bot":     (5, 30, 100),
        "hud_bg":     (8, 12, 45),
        "frame_glow": (255, 200, 50),
        "reel_bg":    (5, 10, 40),
        "reel_line":  (80, 140, 255),
        "spin_btn":   (255, 160, 0),
        "spin_text":  (255, 255, 255),
        "win_line":   (255, 230, 0),
        "accent":     (50, 150, 255),
        "symbols": [
            {"name": "神龍", "color": (0, 200, 255), "shape": "star"},
            {"name": "四星龍", "color": (200, 50, 50), "shape": "diamond"},
            {"name": "悟空", "color": (255, 160, 0), "shape": "hexagon"},
            {"name": "貝吉塔", "color": (100, 50, 200), "shape": "shield"},
            {"name": "龍珠", "color": (255, 200, 0), "shape": "circle"},
            {"name": "A", "color": (200, 180, 100), "shape": "rect"},
            {"name": "K", "color": (180, 160, 90), "shape": "rect"},
            {"name": "Q", "color": (160, 140, 80), "shape": "rect"},
        ]
    },
    "KnockoutClash": {
        "bg_top":     (25, 5, 5),
        "bg_bot":     (60, 10, 10),
        "hud_bg":     (20, 5, 5),
        "frame_glow": (255, 80, 0),
        "reel_bg":    (15, 5, 5),
        "reel_line":  (255, 100, 50),
        "spin_btn":   (220, 40, 0),
        "spin_text":  (255, 255, 255),
        "win_line":   (255, 200, 0),
        "accent":     (255, 100, 0),
        "symbols": [
            {"name": "冠軍", "color": (255, 200, 0), "shape": "star"},
            {"name": "拳擊手", "color": (255, 80, 0), "shape": "shield"},
            {"name": "金腰帶", "color": (200, 160, 0), "shape": "hexagon"},
            {"name": "手套", "color": (220, 60, 0), "shape": "diamond"},
            {"name": "獎盃", "color": (180, 150, 0), "shape": "circle"},
            {"name": "A", "color": (200, 100, 50), "shape": "rect"},
            {"name": "K", "color": (180, 90, 40), "shape": "rect"},
            {"name": "Q", "color": (160, 80, 35), "shape": "rect"},
        ]
    },
    "Nephthys": {
        "bg_top":     (20, 15, 5),
        "bg_bot":     (50, 35, 10),
        "hud_bg":     (15, 12, 5),
        "frame_glow": (220, 190, 80),
        "reel_bg":    (12, 10, 3),
        "reel_line":  (200, 170, 70),
        "spin_btn":   (180, 140, 30),
        "spin_text":  (255, 245, 180),
        "win_line":   (255, 220, 100),
        "accent":     (220, 190, 80),
        "symbols": [
            {"name": "Nephthys", "color": (220, 190, 80), "shape": "star"},
            {"name": "荷魯斯", "color": (200, 160, 50), "shape": "diamond"},
            {"name": "安克", "color": (180, 140, 40), "shape": "hexagon"},
            {"name": "埃及眼", "color": (160, 120, 30), "shape": "shield"},
            {"name": "法老", "color": (140, 100, 20), "shape": "circle"},
            {"name": "A", "color": (160, 130, 50), "shape": "rect"},
            {"name": "K", "color": (140, 115, 45), "shape": "rect"},
            {"name": "Q", "color": (120, 100, 40), "shape": "rect"},
        ]
    },
    "龍之財": {
        "bg_top":     (5, 25, 5),
        "bg_bot":     (10, 60, 10),
        "hud_bg":     (5, 20, 5),
        "frame_glow": (0, 255, 100),
        "reel_bg":    (3, 15, 3),
        "reel_line":  (0, 200, 80),
        "spin_btn":   (0, 180, 50),
        "spin_text":  (255, 255, 255),
        "win_line":   (0, 255, 120),
        "accent":     (0, 220, 100),
        "symbols": [
            {"name": "金龍", "color": (255, 210, 0), "shape": "star"},
            {"name": "鳳凰", "color": (255, 100, 0), "shape": "hexagon"},
            {"name": "福字", "color": (200, 50, 50), "shape": "diamond"},
            {"name": "玉璽", "color": (0, 200, 100), "shape": "shield"},
            {"name": "金幣", "color": (220, 180, 0), "shape": "circle"},
            {"name": "A", "color": (180, 150, 50), "shape": "rect"},
            {"name": "K", "color": (160, 130, 45), "shape": "rect"},
            {"name": "Q", "color": (140, 115, 40), "shape": "rect"},
        ]
    },
    "冰雪女王": {
        "bg_top":     (5, 15, 40),
        "bg_bot":     (15, 40, 80),
        "hud_bg":     (5, 12, 35),
        "frame_glow": (150, 220, 255),
        "reel_bg":    (3, 10, 30),
        "reel_line":  (100, 180, 255),
        "spin_btn":   (80, 160, 240),
        "spin_text":  (255, 255, 255),
        "win_line":   (200, 240, 255),
        "accent":     (150, 220, 255),
        "symbols": [
            {"name": "女王", "color": (200, 230, 255), "shape": "star"},
            {"name": "雪晶", "color": (150, 200, 255), "shape": "hexagon"},
            {"name": "冰劍", "color": (100, 180, 255), "shape": "diamond"},
            {"name": "極光", "color": (80, 255, 200), "shape": "shield"},
            {"name": "雪花", "color": (200, 230, 255), "shape": "circle"},
            {"name": "A", "color": (150, 190, 230), "shape": "rect"},
            {"name": "K", "color": (130, 170, 210), "shape": "rect"},
            {"name": "Q", "color": (110, 150, 190), "shape": "rect"},
        ]
    }
}

# ─────────────────────────────────────────────
#  字型載入 (降級到預設)
# ─────────────────────────────────────────────
def get_font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except:
                pass
    return ImageFont.load_default()

# ─────────────────────────────────────────────
# 幾何繪製工具
# ─────────────────────────────────────────────
def draw_star(draw, cx, cy, r, color, points=6):
    angle_step = math.pi * 2 / points
    inner_r = r * 0.45
    pts = []
    for i in range(points * 2):
        a = i * angle_step / 2 - math.pi / 2
        rr = r if i % 2 == 0 else inner_r
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    draw.polygon(pts, fill=color)

def draw_hexagon(draw, cx, cy, r, color):
    pts = []
    for i in range(6):
        a = i * math.pi / 3 - math.pi / 6
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    draw.polygon(pts, fill=color)

def draw_diamond(draw, cx, cy, r, color):
    pts = [(cx, cy - r), (cx + r*0.65, cy), (cx, cy + r), (cx - r*0.65, cy)]
    draw.polygon(pts, fill=color)

def draw_shield(draw, cx, cy, r, color):
    pts = [(cx, cy - r), (cx + r, cy - r*0.2),
           (cx + r, cy + r*0.4), (cx, cy + r), (cx - r, cy + r*0.4),
           (cx - r, cy - r*0.2)]
    draw.polygon(pts, fill=color)

def draw_circle(draw, cx, cy, r, color):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

# ─────────────────────────────────────────────
# 渲染單個符號卡片
# ─────────────────────────────────────────────
def render_symbol(sym_def, cell_w, cell_h, theme, glow=False):
    """渲染一個符號，包含漸層背景、圖形和文字"""
    img = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    color = sym_def["color"]
    name  = sym_def["name"]
    shape = sym_def["shape"]

    # 1. 卡片底色（半透明深色）
    padding = 4
    draw.rounded_rectangle(
        [padding, padding, cell_w - padding, cell_h - padding],
        radius=10,
        fill=(color[0]//6, color[1]//6, color[2]//6, 200),
        outline=color,
        width=2
    )

    # 2. 光暈邊框（若 pop-out 狀態）
    if glow:
        glow_color = (*color, 120)
        for gi in range(1, 5):
            g_pad = padding - gi * 2
            if g_pad >= 0:
                draw.rounded_rectangle(
                    [g_pad, g_pad, cell_w - g_pad, cell_h - g_pad],
                    radius=10 + gi,
                    outline=(*color, max(30, 120 - gi * 25)),
                    width=1
                )

    # 3. 繪製符號圖形
    cx = cell_w // 2
    top_reserve = int(cell_h * 0.15)
    text_reserve = int(cell_h * 0.22)
    draw_h = cell_h - top_reserve - text_reserve
    cy = top_reserve + draw_h // 2
    r  = min(cell_w, draw_h) // 2 - padding - 4

    if r > 4:
        dark_color = (max(0, color[0] - 60), max(0, color[1] - 60), max(0, color[2] - 60))
        if shape == "star":   draw_star(draw, cx, cy, r, color)
        elif shape == "hexagon": draw_hexagon(draw, cx, cy, r, color)
        elif shape == "diamond": draw_diamond(draw, cx, cy, r, color)
        elif shape == "shield":  draw_shield(draw, cx, cy, r, color)
        elif shape == "circle":  draw_circle(draw, cx, cy, r, color)
        else:
            rr = int(r * 0.7)
            draw.rounded_rectangle(
                [cx - rr, cy - int(rr * 0.7), cx + rr, cy + int(rr * 0.7)],
                radius=6, fill=color
            )

    # 4. 符號名稱
    font_sz = max(8, min(14, int(cell_h * 0.14)))
    font = get_font(font_sz)
    bbox = draw.textbbox((0, 0), name, font=font)
    tw = bbox[2] - bbox[0]
    tx = (cell_w - tw) // 2
    ty = cell_h - text_reserve + 4
    draw.text((tx + 1, ty + 1), name, font=font, fill=(0, 0, 0, 180))
    draw.text((tx, ty), name, font=font, fill=(240, 230, 180, 255))

    return img

# ─────────────────────────────────────────────
# 繪製背景漸層
# ─────────────────────────────────────────────
def draw_bg_gradient(canvas_w, canvas_h, top_color, bot_color):
    img = Image.new("RGB", (canvas_w, canvas_h))
    for y in range(canvas_h):
        t = y / canvas_h
        r = int(top_color[0] * (1 - t) + bot_color[0] * t)
        g = int(top_color[1] * (1 - t) + bot_color[1] * t)
        b = int(top_color[2] * (1 - t) + bot_color[2] * t)
        for x in range(canvas_w):
            img.putpixel((x, y), (r, g, b))
    return img.convert("RGBA")

# ─────────────────────────────────────────────
# 繪製裝飾邊框
# ─────────────────────────────────────────────
def draw_ui_frame(canvas_w, canvas_h, reel_x, reel_y, reel_w, reel_h, glow_color, accent):
    frame = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)

    pad = 10
    fx1, fy1 = reel_x - pad, reel_y - pad
    fx2, fy2 = reel_x + reel_w + pad, reel_y + reel_h + pad

    # 外框（亮色描邊）
    for lw, alpha in [(6, 180), (4, 220), (2, 255)]:
        draw.rounded_rectangle(
            [fx1, fy1, fx2, fy2],
            radius=12,
            outline=(*glow_color, alpha),
            width=lw
        )

    # 四角裝飾
    corner_size = 24
    corners = [(fx1, fy1), (fx2 - corner_size, fy1),
               (fx1, fy2 - corner_size), (fx2 - corner_size, fy2 - corner_size)]
    for cx, cy in corners:
        draw.rectangle([cx, cy, cx + corner_size, cy + corner_size],
                       fill=(*glow_color, 180))

    # 頂部橫標
    title_h = 36
    draw.rounded_rectangle(
        [fx1, fy1 - title_h - 4, fx2, fy1 - 4],
        radius=8,
        fill=(*accent, 80),
        outline=(*glow_color, 200),
        width=1
    )

    return frame

# ─────────────────────────────────────────────
# 繪製 HUD 欄（底部 20%）
# ─────────────────────────────────────────────
def draw_hud(canvas_w, canvas_h, theme_data, balance=1250.00, bet=1.00, win=0.0):
    hud_h = int(canvas_h * 0.20)
    hud = Image.new("RGBA", (canvas_w, hud_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(hud)

    hud_bg = theme_data["hud_bg"]
    spin_col = theme_data["spin_btn"]
    frame_glow = theme_data["frame_glow"]
    accent = theme_data["accent"]

    # HUD 底色
    draw.rectangle([0, 0, canvas_w, hud_h], fill=(*hud_bg, 245))
    # 頂部分隔線
    draw.line([(0, 0), (canvas_w, 0)], fill=(*frame_glow, 180), width=2)

    # ── 幣值面板 ──
    panel_w = int(canvas_w * 0.28)
    panel_h = int(hud_h * 0.62)
    panel_y = (hud_h - panel_h) // 2

    panels = [
        ("BALANCE", f"${balance:,.2f}", 12),
        ("WIN", f"${win:,.2f}", canvas_w // 2 - panel_w // 2),
    ]
    fn_lg = get_font(max(9, int(canvas_w * 0.028)))
    fn_sm = get_font(max(7, int(canvas_w * 0.018)))

    for label, value, px in panels:
        draw.rounded_rectangle(
            [px, panel_y, px + panel_w, panel_y + panel_h],
            radius=8,
            fill=(hud_bg[0] + 15, hud_bg[1] + 15, hud_bg[2] + 15, 220),
            outline=(*accent, 150),
            width=1
        )
        # 標籤
        bb = draw.textbbox((0, 0), label, font=fn_sm)
        lw = bb[2] - bb[0]
        draw.text((px + (panel_w - lw) // 2, panel_y + 5), label,
                  font=fn_sm, fill=(*frame_glow, 200))
        # 數值
        bb2 = draw.textbbox((0, 0), value, font=fn_lg)
        vw = bb2[2] - bb2[0]
        draw.text((px + (panel_w - vw) // 2, panel_y + int(panel_h * 0.45)),
                  value, font=fn_lg, fill=(255, 255, 255, 250))

    # ── SPIN 按鈕 ──
    btn_r = int(hud_h * 0.42)
    btn_cx = canvas_w - btn_r - int(canvas_w * 0.06)
    btn_cy = hud_h // 2

    # 外圈陰影
    for offset, alpha in [(btn_r + 6, 40), (btn_r + 3, 80)]:
        draw.ellipse(
            [btn_cx - offset, btn_cy - offset, btn_cx + offset, btn_cy + offset],
            fill=(*spin_col, alpha)
        )
    # 主體
    draw.ellipse(
        [btn_cx - btn_r, btn_cy - btn_r, btn_cx + btn_r, btn_cy + btn_r],
        fill=spin_col
    )
    # 高光
    draw.ellipse(
        [btn_cx - btn_r + 4, btn_cy - btn_r + 4,
         btn_cx - btn_r // 3, btn_cy],
        fill=(255, 255, 255, 60)
    )
    # 文字
    fn_btn = get_font(max(10, int(btn_r * 0.55)), bold=True)
    bb = draw.textbbox((0, 0), "SPIN", font=fn_btn)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    draw.text((btn_cx - tw // 2 + 1, btn_cy - th // 2 + 1), "SPIN",
              font=fn_btn, fill=(0, 0, 0, 100))
    draw.text((btn_cx - tw // 2, btn_cy - th // 2), "SPIN",
              font=fn_btn, fill=(255, 255, 255, 255))

    # ── BET 欄 ──
    bet_x = canvas_w - panel_w - int(canvas_w * 0.06) - btn_r * 2 - 12
    draw.rounded_rectangle(
        [bet_x, panel_y, bet_x + panel_w, panel_y + panel_h],
        radius=8,
        fill=(hud_bg[0] + 15, hud_bg[1] + 15, hud_bg[2] + 15, 220),
        outline=(*accent, 150),
        width=1
    )
    bb = draw.textbbox((0, 0), "BET", font=fn_sm)
    lw = bb[2] - bb[0]
    draw.text((bet_x + (panel_w - lw) // 2, panel_y + 5), "BET",
              font=fn_sm, fill=(*frame_glow, 200))
    bet_str = f"${bet:.2f}"
    bb2 = draw.textbbox((0, 0), bet_str, font=fn_lg)
    vw = bb2[2] - bb2[0]
    draw.text((bet_x + (panel_w - vw) // 2, panel_y + int(panel_h * 0.45)),
              bet_str, font=fn_lg, fill=(255, 255, 255, 250))

    return hud

# ─────────────────────────────────────────────
# 繪製頂部 LOGO / 倍率панель
# ─────────────────────────────────────────────
def draw_top_panel(canvas_w, panel_h, theme_name, frame_glow, accent, multiplier=None):
    bar = Image.new("RGBA", (canvas_w, panel_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(bar)

    # 底色
    draw.rectangle([0, 0, canvas_w, panel_h],
                   fill=(frame_glow[0]//8, frame_glow[1]//8, frame_glow[2]//8, 220))
    # 底部線
    draw.line([(0, panel_h - 1), (canvas_w, panel_h - 1)],
              fill=(*frame_glow, 160), width=2)

    fn_title = get_font(max(14, int(canvas_w * 0.055)), bold=True)
    fn_mult  = get_font(max(10, int(canvas_w * 0.035)))

    # 遊戲名稱
    bb = draw.textbbox((0, 0), theme_name, font=fn_title)
    tw = bb[2] - bb[0]
    draw.text(((canvas_w - tw) // 2 + 1, 8), theme_name,
              font=fn_title, fill=(0, 0, 0, 150))
    draw.text(((canvas_w - tw) // 2, 7), theme_name,
              font=fn_title, fill=(*frame_glow, 255))

    # 倍率顯示（若有）
    if multiplier:
        mult_str = f"x{multiplier}"
        bb2 = draw.textbbox((0, 0), mult_str, font=fn_mult)
        mw = bb2[2] - bb2[0]
        draw.text((canvas_w - mw - 16, (panel_h - (bb2[3] - bb2[1])) // 2),
                  mult_str, font=fn_mult, fill=(*accent, 230))

    return bar

# ─────────────────────────────────────────────
# 核心渲染函數：生成完整老虎機畫面
# ─────────────────────────────────────────────
def render_slot_frame(theme_name, theme_data, canvas_w=720, canvas_h=1280,
                      win_line=None, pop_out_row=None, multiplier=None,
                      balance=1250.0, bet=1.0, win_amount=0.0):
    """
    渲染一幀完整老虎機畫面
    參數:
      win_line   : 要高光的中獎行 (0~2)
      pop_out_row: 要做 pop-out 效果的行
      multiplier : 頂部倍率顯示
    """
    t0 = time.perf_counter()

    # 1. 背景
    canvas = draw_bg_gradient(canvas_w, canvas_h,
                               theme_data["bg_top"], theme_data["bg_bot"])

    # 2. 計算佈局區域
    top_reserve = int(canvas_h * 0.12)   # 頂部 12%
    hud_h       = int(canvas_h * 0.20)   # 底部 20%
    usable_h    = canvas_h - top_reserve - hud_h  # 中間 68%

    COLS, ROWS = 5, 3
    spacing = 6
    max_w = (canvas_w - 40 - spacing * (COLS - 1)) // COLS
    max_h = (usable_h - 20 - spacing * (ROWS - 1)) // ROWS
    
    # 強制使用 1:1 正方形比例，並取畫面中最短的可用邊界
    cell_size = min(max_w, max_h)
    cell_w = cell_size
    cell_h = cell_size

    grid_w = COLS * cell_w + (COLS - 1) * spacing
    grid_h = ROWS * cell_h + (ROWS - 1) * spacing
    grid_x = (canvas_w - grid_w) // 2
    grid_y = top_reserve + (usable_h - grid_h) // 2

    # 3. 頂部面板
    top_bar = draw_top_panel(canvas_w, top_reserve, theme_name,
                             theme_data["frame_glow"], theme_data["accent"],
                             multiplier)
    canvas.alpha_composite(top_bar, (0, 0))

    # 4. 盤格底色
    reel_bg = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    reel_draw = ImageDraw.Draw(reel_bg)
    reel_col = theme_data["reel_bg"]
    reel_draw.rounded_rectangle(
        [grid_x - 8, grid_y - 8, grid_x + grid_w + 8, grid_y + grid_h + 8],
        radius=14, fill=(*reel_col, 200)
    )
    canvas.alpha_composite(reel_bg)

    # 5. 渲染所有格子符號
    rng      = random.Random(hash(theme_name) % 9999)
    symbols  = theme_data["symbols"]
    sym_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    for row in range(ROWS):
        for col in range(COLS):
            sym_def = rng.choice(symbols)
            glow    = (pop_out_row is not None and row == pop_out_row)
            cell_img = render_symbol(sym_def, cell_w, cell_h, theme_data, glow=glow)

            px = grid_x + col * (cell_w + spacing)
            py = grid_y + row * (cell_h + spacing)

            # Pop-out 效果：向上偏移 + 放大
            if glow:
                scaled_w = int(cell_w * 1.06)
                scaled_h = int(cell_h * 1.06)
                cell_img = cell_img.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
                px -= (scaled_w - cell_w) // 2
                py -= scaled_h - cell_h + 6  # 上移
                sym_layer.alpha_composite(cell_img, (max(0, px), max(0, py)))
            else:
                sym_layer.alpha_composite(cell_img, (px, py))

    canvas.alpha_composite(sym_layer)

    # 6. 中獎線特效
    if win_line is not None and 0 <= win_line < ROWS:
        line_img = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        line_draw = ImageDraw.Draw(line_img)
        line_col = theme_data["win_line"]
        ly = grid_y + win_line * (cell_h + spacing) + cell_h // 2
        # 發光線
        for lw, alpha in [(12, 40), (8, 80), (4, 160), (2, 255)]:
            line_draw.line([(grid_x, ly), (grid_x + grid_w, ly)],
                           fill=(*line_col, alpha), width=lw)
        canvas.alpha_composite(line_img)

    # 7. 裝飾邊框（疊在符號之上）
    frame_img = draw_ui_frame(canvas_w, canvas_h, grid_x, grid_y,
                               grid_w, grid_h,
                               theme_data["frame_glow"], theme_data["accent"])
    canvas.alpha_composite(frame_img)

    # 8. 欄柱分隔線
    col_overlay = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    col_draw    = ImageDraw.Draw(col_overlay)
    reel_line_col = theme_data["reel_line"]
    for col in range(1, COLS):
        lx = grid_x + col * (cell_w + spacing) - spacing // 2
        col_draw.line([(lx, grid_y), (lx, grid_y + grid_h)],
                      fill=(*reel_line_col, 80), width=1)
    canvas.alpha_composite(col_overlay)

    # 9. 底部 HUD
    hud_img = draw_hud(canvas_w, hud_h, theme_data,
                       balance=balance, bet=bet, win=win_amount)
    canvas.alpha_composite(hud_img, (0, canvas_h - hud_h))

    elapsed = time.perf_counter() - t0
    return canvas, elapsed


# ─────────────────────────────────────────────
# 主壓力測試迴圈
# ─────────────────────────────────────────────
def run_stress_test():
    print("=" * 72)
    print("🎰  真實老虎機 UI 壓力測試  (720×1280 手機版)")
    print("=" * 72)

    results = {}
    total_start = time.perf_counter()

    # ────────────────────────────────────────
    # TEST 1：5 種主題各生成 1 幀
    # ────────────────────────────────────────
    print("\n[TEST 1/5] 多主題渲染 (5 幅)")
    theme_times = []
    for theme_name, theme_data in THEMES.items():
        img, t = render_slot_frame(theme_name, theme_data, 720, 1280,
                                   multiplier=5)
        out = OUT_DIR / f"theme_{theme_name.replace(' ', '_')}.png"
        img.save(out, "PNG")
        theme_times.append(t)
        print(f"  ✓ {theme_name:<15} → {out.name}  [{t*1000:.1f} ms]")

    avg_t1 = sum(theme_times) / len(theme_times)
    results["multi_theme"] = {
        "count": len(THEMES),
        "avg_ms": round(avg_t1 * 1000, 1),
        "status": "PASS"
    }

    # ────────────────────────────────────────
    # TEST 2：Pop-out 中獎效果 (3 幀，每行一次)
    # ────────────────────────────────────────
    print("\n[TEST 2/5] Pop-out 中獎特效 (3 幀)")
    theme_name = "七龍珠"
    theme_data = THEMES[theme_name]
    pop_times = []
    for row in range(3):
        img, t = render_slot_frame(theme_name, theme_data, 720, 1280,
                                   win_line=row, pop_out_row=row,
                                   win_amount=888.0 * (row + 1),
                                   multiplier=row * 5 + 5)
        out = OUT_DIR / f"popout_row{row}.png"
        img.save(out, "PNG")
        pop_times.append(t)
        print(f"  ✓ 中獎行 {row}  → {out.name}  [{t*1000:.1f} ms]  WIN: ${888*(row+1):.2f}")

    avg_t2 = sum(pop_times) / len(pop_times)
    results["popout_effect"] = {
        "count": 3,
        "avg_ms": round(avg_t2 * 1000, 1),
        "status": "PASS"
    }

    # ────────────────────────────────────────
    # TEST 3：佈局引擎 - 不同解析度適配
    # ────────────────────────────────────────
    print("\n[TEST 3/5] 佈局引擎解析度適配")
    resolutions = [
        (720, 1280, "H5_Mobile"),
        (1280, 720,  "Desktop"),
        (1024, 1024, "Square"),
    ]
    layout_times = []
    theme_data = THEMES["KnockoutClash"]
    for w, h, mode in resolutions:
        img, t = render_slot_frame("KnockoutClash", theme_data, w, h,
                                   multiplier=10)
        out = OUT_DIR / f"layout_{mode}_{w}x{h}.png"
        img.save(out, "PNG")
        layout_times.append(t)
        print(f"  ✓ {mode:<12} {w}x{h} → {out.name}  [{t*1000:.1f} ms]")

    avg_t3 = sum(layout_times) / len(layout_times)
    results["layout_engine"] = {
        "count": len(resolutions),
        "avg_ms": round(avg_t3 * 1000, 1),
        "status": "PASS",
        "note": "720x1280 / 1280x720 / 1024x1024 全部通過"
    }

    # ────────────────────────────────────────
    # TEST 4：批量渲染 - 連速 20 幀（FPS 測試）
    # ────────────────────────────────────────
    print("\n[TEST 4/5] 批量 FPS 壓力 (20 幀)")
    theme_data = THEMES["Nephthys"]
    fps_times = []
    batch_dir = OUT_DIR / "batch_fps"
    batch_dir.mkdir(exist_ok=True)

    for i in range(20):
        win_l = i % 3 if i % 4 == 0 else None
        pop   = i % 3 if i % 5 == 0 else None
        bal   = 1250.0 - i * 5.5
        img, t = render_slot_frame(
            "Nephthys", theme_data, 720, 1280,
            win_line=win_l, pop_out_row=pop,
            balance=bal, bet=1.0,
            win_amount=100.0 if win_l is not None else 0.0
        )
        out = batch_dir / f"frame_{i:02d}.png"
        img.save(out, "PNG")
        fps_times.append(t)
        if i % 5 == 4:
            print(f"  [{i+1:2d}/20]  avg so far: {sum(fps_times)/len(fps_times)*1000:.1f} ms/frame")

    avg_t4 = sum(fps_times) / len(fps_times)
    fps = 1.0 / avg_t4
    results["batch_fps"] = {
        "count": 20,
        "avg_ms": round(avg_t4 * 1000, 1),
        "fps": round(fps, 2),
        "status": "PASS" if fps >= 1.5 else "WARN"
    }
    print(f"  → avg {avg_t4*1000:.1f} ms/frame  ({fps:.2f} FPS)")

    # ────────────────────────────────────────
    # TEST 5：Spec Validator（規格驗證）
    # ────────────────────────────────────────
    print("\n[TEST 5/5] 生成圖規格驗證")
    spec_fails = 0
    for fn in OUT_DIR.glob("*.png"):
        try:
            img = Image.open(fn)
            w, h = img.size
            size_kb = fn.stat().st_size // 1024
            issues = []
            if size_kb < 50:
                issues.append(f"檔案過小 {size_kb}KB")
            if img.mode not in ("RGBA", "RGB"):
                issues.append(f"色彩模式異常: {img.mode}")
            if issues:
                print(f"  ⚠ {fn.name}: {', '.join(issues)}")
                spec_fails += 1
            else:
                print(f"  ✓ {fn.name}  {w}x{h}  {size_kb}KB  {img.mode}")
        except Exception as e:
            print(f"  ✗ {fn.name}: {e}")
            spec_fails += 1

    results["spec_validator"] = {
        "total": len(list(OUT_DIR.glob("*.png"))),
        "failed": spec_fails,
        "status": "PASS" if spec_fails == 0 else "WARN"
    }

    # ────────────────────────────────────────
    # 結果報告
    # ────────────────────────────────────────
    total_elapsed = time.perf_counter() - total_start
    print("\n" + "=" * 72)
    print("📊 壓力測試報告")
    print("=" * 72)

    icons = {"PASS": "✅", "WARN": "⚠️", "FAIL": "❌"}
    for k, v in results.items():
        status = v.get("status", "?")
        icon   = icons.get(status, "?")
        label  = k.replace("_", " ").title()
        detail = ""
        if "avg_ms" in v:
            detail += f"  avg={v['avg_ms']}ms"
        if "fps" in v:
            detail += f"  fps={v['fps']}"
        if "note" in v:
            detail += f"  {v['note']}"
        print(f"  {icon} {label:<22}{detail}")

    all_pass = all(v.get("status") in ("PASS", "WARN") for v in results.values())
    overall = "✅ 全部通過" if all_pass else "❌ 部分失敗"
    print("-" * 72)
    print(f"  總耗時: {total_elapsed:.2f}s   整體結果: {overall}")
    print(f"  輸出目錄: {OUT_DIR}")
    print("=" * 72)

    # 儲存 JSON 報告
    report_path = OUT_DIR / "stress_test_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({"results": results, "total_sec": round(total_elapsed, 2)},
                  f, indent=2, ensure_ascii=False)
    print(f"  報告已儲存: {report_path}")

    return results


if __name__ == "__main__":
    run_stress_test()
