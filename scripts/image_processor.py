import os
import re
from PIL import Image, ImageFilter, ImageDraw, ImageOps

class ImageProcessor:
    def __init__(self, output_dir=None):
        self.output_dir = output_dir

    def set_output_dir(self, output_dir):
        self.output_dir = output_dir

    def sanitize_filename(self, name):
        if not name: return "Default"
        name = str(name).replace("\n", "").replace("\r", "")
        filename = re.sub(r'[^\w\s\u4e00-\u9fff-]', '_', name)
        filename = re.sub(r'[\s_]+', '_', filename).strip('_')
        return filename

    def add_drop_shadow(self, image, offset=(10, 10), background_color=None, shadow_color=(0, 0, 0, 150), iterations=3, radius=10, alpha=150):
        """Add a drop shadow to an image with an alpha channel."""
        # Create a shadow image
        shadow = Image.new('RGBA', image.size, (0, 0, 0, 0))
        shadow_drawer = Image.new('RGBA', image.size, (0, 0, 0, alpha))
        shadow.paste(shadow_drawer, (0, 0), mask=image.split()[3])
        
        # Blur the shadow
        for _ in range(iterations):
            shadow = shadow.filter(ImageFilter.GaussianBlur(radius / iterations))
            
        # Create the final canvas
        new_w = image.width + abs(offset[0])
        new_h = image.height + abs(offset[1])
        full_canvas = Image.new('RGBA', (new_w, new_h), (0, 0, 0, 0))
        
        # Paste shadow then image
        sx = max(0, offset[0])
        sy = max(0, offset[1])
        ix = max(0, -offset[0])
        iy = max(0, -offset[1])
        
        full_canvas.alpha_composite(shadow, (sx, sy))
        full_canvas.alpha_composite(image, (ix, iy))
        
        return full_canvas

    def process_transparency(self, input_path):
        if not input_path or not os.path.exists(input_path): return input_path
        output_path = input_path.replace(".png", "_transparent.png")
        try:
            from rembg import remove
            with open(input_path, 'rb') as i:
                input_data = i.read()
                output_data = remove(input_data)
                with open(output_path, 'wb') as o: o.write(output_data)
            return output_path
        except Exception as e:
            print(f"[WARN] rembg failed for {input_path}: {e}")
            return input_path

    def auto_crop(self, img):
        # Remove empty/white borders
        temp = img.convert("RGBA")
        bbox = temp.getbbox()
        return temp.crop(bbox) if bbox else img

    def compose_preview_image(self, assets, theme, layout_config, layout_mode="Cabinet", symbol_configs=None):
        """[V26.5] Centroid-based scaling for overflow symbols."""
        print(f"[PREVIEW] Composing master preview for {theme} ({layout_mode})...")
        try:
            w, h = (720, 1280) if layout_mode == "H5_Mobile" else (1280, 720)
            master_canvas = Image.new("RGBA", (w, h), (10, 10, 25, 255))
            
            # Layer 0: Background
            if assets.get("background"):
                raw_bg = Image.open(assets["background"]).convert("RGBA")
                src_ratio = raw_bg.width / raw_bg.height
                target_ratio = w / h
                if src_ratio > target_ratio:
                    new_h = h
                    new_w = int(raw_bg.width * (h / raw_bg.height))
                else:
                    new_w = w
                    new_h = int(raw_bg.height * (w / raw_bg.width))
                
                bg_resized = raw_bg.resize((new_w, new_h), Image.Resampling.LANCZOS)
                left = (new_w - w) // 2
                top = (new_h - h) // 2
                bg_final = bg_resized.crop((left, top, left + w, top + h))
                master_canvas.paste(bg_final, (0, 0))

            # Config extraction
            rows, cols = int(layout_config.get("rows", 3)), int(layout_config.get("cols", 5))
            sym_w, sym_h = float(layout_config.get("cell_w", 140)), float(layout_config.get("cell_h", 140))
            spc_x = spc_y = float(layout_config.get("spacing", 10))
            startX, startY = float(layout_config["start_x"]), float(layout_config["start_y"])

            # Layer 1: Reel Board Shadow
            grid_total_w = cols * sym_w + (cols - 1) * spc_x
            grid_total_h = rows * sym_h + (rows - 1) * spc_y
            reel_pad = max(int(w * 0.015), 10)
            
            draw = ImageDraw.Draw(master_canvas)
            draw.rounded_rectangle(
                [startX - reel_pad, startY - reel_pad, startX + grid_total_w + reel_pad, startY + grid_total_h + reel_pad],
                radius=15, fill=(0, 0, 0, 160)
            )

            # Layer 3: UI Frame (Header/Base/Pillar)
            for key in ["ui_header", "ui_base", "ui_pillar"]:
                if assets.get(key):
                    raw_ui = Image.open(assets[key]).convert("RGBA")
                    ui_img = self.auto_crop(raw_ui)

                    if key == "ui_header":
                        # [Universal Constraint] Header Max Height: 12%
                        target_w = w
                        target_h = int(ui_img.height * (w / ui_img.width))
                        max_h_h = int(h * 0.12)
                        if target_h > max_h_h:
                            target_h = max_h_h  # 實作超標時自動垂直壓縮
                        ui_final = ui_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                        master_canvas.alpha_composite(ui_final, (0, 0))
                    elif key == "ui_base":
                        # [Universal Constraint] Base Max Height: 15%
                        target_w = w
                        target_h = int(ui_img.height * (w / ui_img.width))
                        max_b_h = int(h * 0.15)
                        if target_h > max_b_h:
                            target_h = max_b_h  # 實作超標時自動垂直壓縮
                        ui_final = ui_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                        master_canvas.alpha_composite(ui_final, (0, h - ui_final.height))
                    elif key == "ui_pillar":
                        p_h = int(h * 0.95)
                        p_w = int(ui_img.width * (p_h/ui_img.height))
                        p_resized = ui_img.resize((p_w, p_h), Image.Resampling.LANCZOS)
                        if p_w > w * 0.15:
                            p_w = int(w * 0.15)
                            p_resized = p_resized.resize((p_w, p_h), Image.Resampling.LANCZOS)
                        
                        master_canvas.alpha_composite(p_resized, (0, (h - p_h)//2))
                        master_canvas.alpha_composite(ImageOps.mirror(p_resized), (w - p_w, (h - p_h)//2))

            # Layer 4: Symbols
            symbol_pool = []
            if isinstance(assets.get("symbols"), dict):
                symbol_pool = list(assets["symbols"].values())
            
            if symbol_pool:
                for r in range(rows):
                    for c in range(cols):
                        s_path = symbol_pool[(r * cols + c) % len(symbol_pool)]
                        if not os.path.exists(s_path): continue
                        
                        sym_img = Image.open(s_path).convert("RGBA")
                        sym_img = self.auto_crop(sym_img)
                        
                        # [V26.5] Support Per-Symbol Scale and Overflow
                        sym_name = os.path.basename(s_path).split("_")[-1].replace(".png", "")
                        scale_factor = 1.0
                        if symbol_configs and sym_name in symbol_configs:
                            scale_factor = symbol_configs[sym_name].get("scale", 1.0)
                        
                        target_w = int(sym_w * 0.95 * scale_factor)
                        target_h = int(sym_h * 0.95 * scale_factor)
                        ratio = min(target_w/sym_img.width, target_h/sym_img.height)
                        sym_resized = sym_img.resize((int(sym_img.width*ratio), int(sym_img.height*ratio)), Image.Resampling.LANCZOS)
                        
                        cx = startX + c * (sym_w + spc_x) + sym_w/2
                        cy = startY + r * (sym_h + spc_y) + sym_h/2
                        
                        px = int(cx - sym_resized.width/2)
                        py = int(cy - sym_resized.height/2)
                        master_canvas.alpha_composite(sym_resized, (px, py))

            # Save Output
            output_filename = f"preview_{self.sanitize_filename(theme)}.png"
            output_path = os.path.join(self.output_dir, output_filename) if self.output_dir else output_filename
            master_canvas.save(output_path)
            return output_path
        except Exception as e:
            print(f"[ERROR] Composition failed: {e}")
            return assets.get("background")
