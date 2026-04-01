"""
PSD Layout Constraint Extractor
================================
從 PSD 模板中精確提取每個元件的像素規格，
並組成可供 AI 提示詞使用的「尺寸規格書」。

用法：
    from psd_constraint_extractor import PSDConstraintExtractor
    extractor = PSDConstraintExtractor("path/to/template.psd")
    constraints = extractor.extract()
    print(constraints.to_prompt_spec())
"""

import os
import json
from dataclasses import dataclass, field, asdict
from typing import Dict, Optional, Tuple, List

# ─── 圖層分類關鍵字 ───────────────────────────────────────────────────────────
LAYER_KEYWORDS = {
    "background": ["bg", "background", "scenery", "env", "backdrop"],
    "ui_frame":   ["frame", "board", "panel", "reel_window", "ui_frame", "border", "盤框", "框"],
    "symbol":     ["symbol", "sym_", "icon", "wild", "scatter", "m1", "m2", "m3",
                   "low", "high", "符號", "圖案"],
    "button":     ["spin", "btn", "button", "buy", "bonus", "menu", "info",
                   "history", "turbo", "auto", "按鈕"],
    "jackpot":    ["jp", "grand", "major", "minor", "mini", "jackpot"],
}

@dataclass
class BoundBox:
    left:   int = 0
    top:    int = 0
    width:  int = 0
    height: int = 0

    @property
    def right(self):  return self.left + self.width
    @property
    def bottom(self): return self.top + self.height
    @property
    def aspect_ratio(self):
        if self.height == 0: return "1:1"
        from math import gcd
        g = gcd(self.width, self.height)
        return f"{self.width // g}:{self.height // g}"


@dataclass
class SlotLayoutConstraints:
    """完整的 Slot 遊戲版面約束規格"""
    psd_file:       str = ""
    canvas_w:       int = 1920
    canvas_h:       int = 1080
    layout_mode:    str = "Cabinet"   # Cabinet / H5_Mobile

    # 各元件的像素範圍
    background:     Optional[BoundBox] = None
    ui_frame:       Optional[BoundBox] = None
    symbol_cell:    Optional[BoundBox] = None   # 單格 symbol 大小
    grid_cols:      int = 5
    grid_rows:      int = 3
    buttons:        Dict[str, BoundBox] = field(default_factory=dict)
    jackpot:        Optional[BoundBox] = None

    # 所有原始圖層備份
    raw_layers:     List[dict] = field(default_factory=list)

    def to_prompt_spec(self) -> str:
        """
        產生可直接插入 AI 提示詞的像素規格文字。
        """
        lines = [
            "📐 STRICT PIXEL SPECIFICATION (FROM PSD TEMPLATE — MUST FOLLOW EXACTLY):",
            f"  • Canvas Size: {self.canvas_w} × {self.canvas_h} px ({self.layout_mode})",
        ]

        if self.background:
            b = self.background
            lines.append(
                f"  • Background: {b.width} × {b.height} px "
                f"(fill entire canvas, no cutoff, no borders)"
            )

        if self.ui_frame:
            f = self.ui_frame
            lines.append(
                f"  • UI Frame / Reel Window: {f.width} × {f.height} px "
                f"at position ({f.left}, {f.top}). "
                f"Center area ({int(f.width*0.7)} × {int(f.height*0.7)} px) MUST BE HOLLOW/TRANSPARENT."
            )

        if self.symbol_cell:
            s = self.symbol_cell
            lines.append(
                f"  • Symbol Cell Size: {s.width} × {s.height} px "
                f"(aspect ratio {s.aspect_ratio}). "
                f"Grid: {self.grid_cols} columns × {self.grid_rows} rows. "
                f"Subject must fill >80% of this area. Transparent background."
            )

        for name, bbox in self.buttons.items():
            lines.append(
                f"  • Button '{name}': {bbox.width} × {bbox.height} px "
                f"at ({bbox.left}, {bbox.top}). Must be readable at this scale."
            )

        if self.jackpot:
            j = self.jackpot
            lines.append(
                f"  • Jackpot Display: {j.width} × {j.height} px. "
                f"Must legibly show large numbers."
            )

        lines.append(
            "⚠️ CRITICAL: Generate EXACTLY within these dimensions. "
            "Do NOT add extra whitespace, borders, or change the aspect ratio."
        )
        return "\n".join(lines)

    def to_dict(self) -> dict:
        """序列化為可存 JSON 的字典"""
        def _b(box: Optional[BoundBox]):
            if box is None: return None
            return {"left": box.left, "top": box.top,
                    "width": box.width, "height": box.height}

        return {
            "psd_file":    self.psd_file,
            "canvas_w":    self.canvas_w,
            "canvas_h":    self.canvas_h,
            "layout_mode": self.layout_mode,
            "background":  _b(self.background),
            "ui_frame":    _b(self.ui_frame),
            "symbol_cell": _b(self.symbol_cell),
            "grid_cols":   self.grid_cols,
            "grid_rows":   self.grid_rows,
            "buttons":     {k: _b(v) for k, v in self.buttons.items()},
            "jackpot":     _b(self.jackpot),
        }


class PSDConstraintExtractor:
    """
    解析 PSD 模板，提取版面約束規格。

    支援兩種來源：
    1. 真實 PSD 檔案（需安裝 psd-tools）
    2. 手動傳入 layout_config dict（來自 Excel 解析結果）
    """

    def __init__(self, psd_path: Optional[str] = None):
        self.psd_path = psd_path

    # ── 主要提取入口 ──────────────────────────────────────────────────────────

    def extract(self) -> SlotLayoutConstraints:
        """從 PSD 路徑提取並回傳 SlotLayoutConstraints"""
        if not self.psd_path or not os.path.exists(self.psd_path):
            print(f"[PSDConstraintExtractor] 找不到 PSD: {self.psd_path}，使用預設值")
            return self._default_constraints()

        try:
            from psd_tools import PSDImage
        except ImportError:
            print("[PSDConstraintExtractor] psd-tools 未安裝，使用預設值")
            return self._default_constraints()

        print(f"[PSDConstraintExtractor] 解析 PSD: {os.path.basename(self.psd_path)}")
        psd = PSDImage.open(self.psd_path)
        canvas_w, canvas_h = psd.width, psd.height

        # 決定 layout mode
        layout_mode = "H5_Mobile" if canvas_h > canvas_w else "Cabinet"

        constraints = SlotLayoutConstraints(
            psd_file    = self.psd_path,
            canvas_w    = canvas_w,
            canvas_h    = canvas_h,
            layout_mode = layout_mode,
        )

        # 攤平所有圖層
        all_layers = []
        self._walk_layers(psd, all_layers)
        constraints.raw_layers = all_layers

        # 分析並填充各元件
        self._detect_background(all_layers, constraints)
        self._detect_ui_frame(all_layers, constraints)
        self._detect_symbols(all_layers, constraints)
        self._detect_buttons(all_layers, constraints)
        self._detect_jackpot(all_layers, constraints)

        print(f"[PSDConstraintExtractor] 完成！共分析 {len(all_layers)} 個圖層")
        print(f"  Canvas:  {canvas_w} × {canvas_h} ({layout_mode})")
        if constraints.symbol_cell:
            print(f"  Symbol:  {constraints.symbol_cell.width} × {constraints.symbol_cell.height} px")
        if constraints.ui_frame:
            print(f"  Frame:   {constraints.ui_frame.width} × {constraints.ui_frame.height} px")
        print(f"  Grid:    {constraints.grid_cols} × {constraints.grid_rows}")
        print(f"  Buttons: {list(constraints.buttons.keys())}")
        return constraints

    def extract_from_layout_config(self, layout_config: dict) -> SlotLayoutConstraints:
        """
        從 Excel 解析出的 layout_config dict 建立約束規格
        （不需要 PSD 檔案）
        """
        canvas_w = layout_config.get("canvas_w", 1920)
        canvas_h = layout_config.get("canvas_h", 1080)
        sym_w    = layout_config.get("symbol_w", 200)
        sym_h    = layout_config.get("symbol_h", 200)
        rows     = layout_config.get("rows", 3)
        cols     = layout_config.get("cols", 5)
        layout_mode = "H5_Mobile" if canvas_h > canvas_w else "Cabinet"

        constraints = SlotLayoutConstraints(
            psd_file    = "(from Excel)",
            canvas_w    = canvas_w,
            canvas_h    = canvas_h,
            layout_mode = layout_mode,
            grid_rows   = rows,
            grid_cols   = cols,
            symbol_cell = BoundBox(width=sym_w, height=sym_h),
        )

        # 估算 UI Frame（佔畫面中間 70%）
        frame_w = int(canvas_w * 0.7)
        frame_h = int(canvas_h * 0.7)
        constraints.ui_frame = BoundBox(
            left   = (canvas_w - frame_w) // 2,
            top    = (canvas_h - frame_h) // 2,
            width  = frame_w,
            height = frame_h,
        )
        return constraints

    # ── 私有輔助方法 ─────────────────────────────────────────────────────────

    def _walk_layers(self, parent, result: list, depth: int = 0):
        """遞迴攤開所有圖層"""
        for layer in parent:
            if layer.width <= 0 or layer.height <= 0:
                continue
            result.append({
                "name":   layer.name,
                "kind":   str(layer.kind),
                "left":   layer.left,
                "top":    layer.top,
                "width":  layer.width,
                "height": layer.height,
                "depth":  depth,
            })
            if layer.is_group():
                self._walk_layers(layer, result, depth + 1)

    def _match(self, layer: dict, category: str) -> bool:
        """判斷圖層名稱是否符合指定分類"""
        name_lower = layer["name"].lower()
        return any(kw in name_lower for kw in LAYER_KEYWORDS[category])

    def _to_bbox(self, layer: dict) -> BoundBox:
        return BoundBox(
            left   = layer["left"],
            top    = layer["top"],
            width  = layer["width"],
            height = layer["height"],
        )

    def _detect_background(self, layers: list, c: SlotLayoutConstraints):
        candidates = [l for l in layers if self._match(l, "background") and l["width"] > c.canvas_w * 0.5]
        if candidates:
            # 取最大的
            best = max(candidates, key=lambda l: l["width"] * l["height"])
            c.background = self._to_bbox(best)
        else:
            # 預設：整個畫布
            c.background = BoundBox(width=c.canvas_w, height=c.canvas_h)

    def _detect_ui_frame(self, layers: list, c: SlotLayoutConstraints):
        candidates = [l for l in layers if self._match(l, "ui_frame") and l["width"] > 50]
        if candidates:
            best = max(candidates, key=lambda l: l["width"] * l["height"])
            c.ui_frame = self._to_bbox(best)

    def _detect_symbols(self, layers: list, c: SlotLayoutConstraints):
        candidates = [l for l in layers
                      if self._match(l, "symbol")
                      and 20 < l["width"] < c.canvas_w * 0.6
                      and 20 < l["height"] < c.canvas_h * 0.6]

        if not candidates:
            return

        # 取最具代表性的（中位數大小）
        candidates.sort(key=lambda l: l["width"])
        mid = candidates[len(candidates) // 2]
        c.symbol_cell = self._to_bbox(mid)

        # 估算行列數
        sym_w = mid["width"]
        sym_h = mid["height"]

        # 找同行符號（top 差距 < sym_h/2）
        same_row = [l for l in candidates if abs(l["top"] - mid["top"]) < sym_h // 2]
        if same_row:
            c.grid_cols = len(same_row)

        # 找同列符號（left 差距 < sym_w/2）
        same_col = [l for l in candidates if abs(l["left"] - mid["left"]) < sym_w // 2]
        if same_col:
            c.grid_rows = len(same_col)

    def _detect_buttons(self, layers: list, c: SlotLayoutConstraints):
        for layer in layers:
            if self._match(layer, "button") and layer["width"] > 10:
                c.buttons[layer["name"]] = self._to_bbox(layer)

    def _detect_jackpot(self, layers: list, c: SlotLayoutConstraints):
        candidates = [l for l in layers if self._match(l, "jackpot") and l["width"] > 50]
        if candidates:
            best = max(candidates, key=lambda l: l["width"] * l["height"])
            c.jackpot = self._to_bbox(best)

    def _default_constraints(self) -> SlotLayoutConstraints:
        """當 PSD 不可用時的安全預設值"""
        c = SlotLayoutConstraints(
            psd_file    = "(default)",
            canvas_w    = 1920,
            canvas_h    = 1080,
            layout_mode = "Cabinet",
            grid_cols   = 5,
            grid_rows   = 3,
            symbol_cell = BoundBox(width=200, height=200),
            ui_frame    = BoundBox(left=240, top=90, width=1440, height=900),
        )
        return c


# ─── CLI 測試入口 ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    # 優先測試模板 PSD，其次測試大型 PSD
    test_paths = [
        r"c:\Antigracity\GameAssetWorkshop\5x3_Slot_Template_Layout.psd",
        r"c:\Antigracity\GameAssetWorkshop\KnockoutClash_basegameL_資產出圖版本.psd",
    ]

    psd_arg = sys.argv[1] if len(sys.argv) > 1 else None
    target = psd_arg or next((p for p in test_paths if os.path.exists(p)), None)

    if target:
        extractor = PSDConstraintExtractor(target)
        constraints = extractor.extract()

        print("\n" + "="*60)
        print("📋  AI PROMPT SPEC OUTPUT:")
        print("="*60)
        print(constraints.to_prompt_spec())

        # 儲存 JSON 供其他模組使用
        out_json = os.path.join(os.path.dirname(target), "psd_constraints.json")
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(constraints.to_dict(), f, indent=2, ensure_ascii=False)
        print(f"\n✅ 約束規格已儲存至: {out_json}")
    else:
        print("找不到測試用 PSD，使用預設值測試：")
        ext = PSDConstraintExtractor()
        c = ext._default_constraints()
        print(c.to_prompt_spec())
