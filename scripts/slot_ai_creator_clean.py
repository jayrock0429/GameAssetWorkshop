import os

import sys

import subprocess

import time

from psd_tools import PSDImage

from PIL import Image, ImageFilter, ImageDraw, ImageOps

import io

import json
import collections
import threading
from art_prompts_db import get_enhanced_prompt

from dotenv import load_dotenv
import pandas as pd
from PIL import Image, ImageFilter, ImageDraw, ImageOps
from google import genai
from google.genai import types


# [Phase 4.5] Import Phase 4 Production Intelligence Modules

from layout_optimizer import SmartLayoutEngine

from engine_validator import EngineSpecValidator

from file_organizer import BatchNamingIntelligence

from psd_auto_assembly import PSDAutoAssembly


# [PSD Constraint] Import Layout Constraint Extractor

try:

    from psd_constraint_extractor import PSDConstraintExtractor

    _HAS_CONSTRAINT_EXTRACTOR = True

except ImportError:

    _HAS_CONSTRAINT_EXTRACTOR = False


# Initialize environment variables at module level

script_dir = os.path.dirname(os.path.abspath(__file__))

env_path = os.path.join(os.path.dirname(script_dir), ".env")

load_dotenv(env_path, override=True)


# --- AAA Quality Booster Standards ---

# [V3.1] Enhanced 3A Standard with Ambient Occlusion & Contact Shadows

_AAA_GLOBAL_RENDER = ", hyper-realistic 3D render, Unreal Engine 5 style, Octane render, deep ambient occlusion, Ray-traced contact shadows, specular occlusion, macro micro-detailing, professional studio lighting, depth of field, sharp textures, high-poly mesh, NO 2D flat vector art"


# [V3.2] Zero-Perspective UI Render (PRIORITY: FLATNESS OVER SPACE)

# Stripped keywords: "Unreal Engine 5", "high-poly mesh", "depth of field" to avoid AI perspective hallucination.

_AAA_UI_RENDER = ", 100% FLAT 2D ORTHOGRAPHIC PROJECTION, ABSOLUTE ZERO PERSPECTIVE, FRONT-ON VIEW, NO ANGLES, multi-layered architectural metal and glass materials, thick physical beveled edges, polished glossy finish, high-contrast studio rim lighting, isolated on solid background, perfectly symmetrical"


# UI Specific (Headers, Base, Pillars)

_AAA_UI_SPEC = ", metallic bezels with high-contrast reflections, internal digital LED display panels, premium metallic materials, blank interface (NO TEXT)"


# [V3.2] UI Negative Prompt Matrix (Mandatory for UI)

_UI_NEGATIVE_PROMPT = ", perspective, angled view, tilt, vanishing point, three-dimensional slant, camera depth, isometric distortion, receding edges, Z-depth distortion, 3D perspective"


# Symbols Standard

# [V3.1] Enhanced Brushed Gold & Internal Gem Glow

_AAA_SYMBOL_SPEC = ", chunky 3D model with physical thickness, isometric perspective, heavy beveled edges, aggressive high-contrast rim lighting, brushed gold metal texture, internal gem glow, sub-surface scattering, hyper-polished crystal materials, isolated on solid dark background"


#  (Mascot)

# Q  ()

_AAA_MASCOT_SPEC = ", 3D render, stylized anthropomorphic mascot, winner energy expression, premium texture contrast (silk/fur/gold), wealth particles (glowing coins/sparkles), volumetric rim lighting, isolated on solid background"


# --- [V3.0]  (General Slot Engine Standards) ---


# Module 1: Structural Constraint Engine

_STRUCTURAL_CONSTRAINTS = {

    "UI_Header": "A wide horizontal banner structure, spanning full screen width, top interface panel, extreme wide aspect ratio (16:9 or wider), FLAT FRONT VIEW, NO PERSPECTIVE, NO STANDALONE CHARACTERS, ",

    "UI_Base": "A wide horizontal control panel structure, bottom interface console, spanning full screen width, wide aspect ratio, featuring placeholder zones for buttons, FLAT FRONT VIEW, NO PERSPECTIVE, NO ANGLES, ",

    "UI_Pillar": "A tall vertical column structure, side frame element, spanning full screen height, tall aspect ratio, standing vertically, FLAT FRONT VIEW, NO PERSPECTIVE, ",

    "Mascot": "A full body character, standing on the left side, facing right towards the center, clear silhouette, ",

    "Symbol": "A single isolated 3D object, centered composition, isometric perspective, chunky physical volume, "

}


#  (The Visual Hierarchy Engine)

#  Tier 

_TIER_VISUAL_ENHANCERS = {

    "M1_Hero": "Massive scale, most prominent element, intense hero lighting, dynamic cinematic pose, elaborate background aura effect, highest level of detail, unmatched visual impact, ",

    "High_Pay": "Large scale, premium material (polished gold, glowing gemstones), heavy 3D bevel, prominent studio rim light, ornate frame details, high value luxury feel, ",

    "Low_Pay": "Standard scale, simple clear material (clean metal, matte stone), moderate 3D bevel, subtle ambient lighting, no complex background elements, highly readable, "

}

# -----------------------------------------------------------


print("DEBUG: SlotAICreator V2 loaded.")


class SlotAICreator:

    def __init__(self, theme=None):

        self.theme = theme

        # [V14.1] Dynamic path derivation to support any environment

        script_dir = os.path.dirname(os.path.abspath(__file__))

        self.base_dir = os.path.dirname(script_dir) # Project root

        self.output_root = os.path.join(self.base_dir, "output")

        self.output_dir = self.output_root # Default, will be overridden per spin

        self.layout_info = {} # Layout Bounds

        self.vision_sync_context = "" # [V3.1] Benchmark Feature Sync context


        # [V13.0] 

        self.styles_config = {

            "3D_Premium": "High-fidelity 3D rendering, PBR materials, cinematic lighting",

            "Anime_Stylized": "Anime-style cel-shading, vibrant colors, bold outlines",

            "PBR_Realistic": "Photorealistic PBR, ultra-detailed textures, natural lighting",

            "Flat_Modern": "Flat design, minimalist, bold colors, geometric shapes"

        }


        # 5x3 Default Layout Constants

        self.default_5x3 = {

            "symbol_size": 160,

            "spacing": 10,

            "grid_startX": 220,

            "grid_startY": 110,

            "grid_width": 840,

            "grid_height": 500,

            "columns": 5,

            "rows": 3

        }


        # [V20.1] Production_V1 Layout (Matched to KnockoutClash PSD)

        self.production_v1 = {

            "symbol_w": 343,

            "symbol_h": 203,

            "spacing": 0, # PSD 

            "grid_startX": 420,

            "grid_startY": 157,

            "grid_width": 1719,

            "grid_height": 1003,

            "columns": 5,

            "rows": 5,

            "canvas_w": 2560,

            "canvas_h": 1440

        }


        # [Phase 4.5] Initialize Production Intelligence Engines

        self.layout_engine = SmartLayoutEngine()

        self.spec_validator = EngineSpecValidator()

        self.naming_engine = BatchNamingIntelligence(self.output_dir)

        self.psd_assembler = PSDAutoAssembly()

        self.stop_requested = False 

        self.layout_constraints = None  


    def sync_from_url(self, url):

        """[V3.1] Synchronize visual features from benchmark URL"""

        print(f"DEBUG: [V3.1 Vision Sync] Synchronizing from {url}...")


        # [V3.2] Multi-Theme Sync Logic

        if "ancient-egypt" in url.lower():

            self.vision_sync_context = (

                " [BENCHMARK SYNC: RISE OF EGYPT]: UI_Header MUST be a horizontal wide architectural gold frame spanning the top. "

                "Symbol (Eye of Horus) should be a chunky 3D object with glowing emerald iris set in brushed gold. "

                "UI MUST be a structural layout, NOT a statue."

            )

            print("[OK] Vision Feature Calibrated: Rise of Egypt DNA.")

        elif "slot%20ui" in url.lower() or "slot-ui" in url.lower():

            # [V3.2] Global Slot UI DNA - Metal + Digital + Wide Frame

            self.vision_sync_context = (

                " [BENCHMARK SYNC: AAA SLOT UI]: UI MUST be a WIDE BANNER spanning full screen width. "

                "Materials: Multi-layered beveled metal borders (Polished Gold/Chrome) wrapping dark digital glass panels. "

                "Details: Glowing LED edges, glassmorphism, heavy 3D volume, perfectly symmetrical architecture."

            )

            print("[OK] Vision Feature Calibrated: Global 3A Slot UI DNA (Wide Frame + Digital Metal).")

        else:

            self.vision_sync_context = " [BENCHMARK SYNC]: Focus on deep 3D bevels, studio lighting, and material physical depth."


        return self.vision_sync_context


    def analyze_excel_structure_with_ai(self, excel_path):

        """[V16.0]  AI  Excel """

        import pandas as pd

        gemini_key = os.environ.get("GEMINI_API_KEY")

        if not gemini_key: return None


        try:

            xl = pd.ExcelFile(excel_path)

            # [V17.1]  AI 

            snapshot = {}

            for name in xl.sheet_names:

                df = xl.parse(name, nrows=15).dropna(how='all').fillna("")

                snapshot[name] = df.to_dict(orient='records')


            from google import genai

            from google.genai import types

            client = genai.Client(api_key=gemini_key)


            prompt = (

                "You are a Senior Game Producer. Analyze this Excel structure for a slot game project.\n"

                f"Excel Structure Snapshot: {json.dumps(snapshot, ensure_ascii=False, default=str)[:4000]}\n\n"

                "Extract the following mapping in JSON format:\n"

                "1. 'symbol_design_sheet': The sheet name containing ART DESCRIPTIONS (e.g., 'Symbol', 'p').\n"

                "2. 'name_col': Column index (0-based) for the 'Symbol ID' or 'Name' (e.g., M1, Wild). Look for 'SYM_' prefixes.\n"

                "3. 'desc_col': Column index (0-based) for the 'Visual Description' (longest text column).\n"

                "Patterns to look for: Symbol IDs are often in col 1 or 2. Descriptions are often in col 4, 5, or 6.\n"

                "Return ONLY the JSON."

            )


            response = client.models.generate_content(

                model='gemini-1.5-pro',

                contents=prompt

            )

            # Parse JSON from response

            res_text = response.text.strip()

            if "```json" in res_text:

                res_text = res_text.split("```json")[1].split("```")[0].strip()

            return json.loads(res_text)

        except Exception as e:

            print(f"WARNING: AI Structure Analysis failed: {e}")

            return None


    def load_styles(self):

        """Load styles from styles.json"""

        try:

            style_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "styles.json")

            with open(style_path, "r", encoding="utf-8") as f:

                self.styles_config = json.load(f)

            print(f"DEBUG: Loaded styles from {style_path}")

        except Exception as e:

            print(f"WARNING: Failed to load styles.json: {e}. Using defaults.")

            self.styles_config = {

                "3D_Premium": {"prompt": "Professional casino slot game art, cinematic lighting, sharp 3D details, stylized and polished, symmetry, magical glow."},

                "Anime_Stylized": {"prompt": "Vibrant anime art style, cel-shaded, bold linework, high-contrast, fantasy aesthetic, hand-drawn quality."},

                "PBR_Realistic": {"prompt": "Ultra-realistic 3D PBR textures, ray-traced reflections, photographic studio lighting, intricate mechanical details."},

                "Flat_Modern": {"prompt": "Clean vector art, flat design, minimalist shapes, bright solid colors, sharp edges, modern mobile game aesthetic."}

            }


    def request_stop(self):

        """[V20.7] Request the engine to stop as soon as possible"""

        print("[STOP] [ENGINE] Stop signal received. Stopping processing...")

        self.stop_requested = True


    def ensure_dirs(self):

        for d in [self.base_dir, self.output_dir]:

            if not os.path.exists(d):

                os.makedirs(d)

                print(f"Created directory: {d}")


    def _reason_prompt(self, request_info):
        """[V13.0] AI Reasoning Engine (Unified)"""
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key:
            return f"3D Game Symbol: {request_info.get('sub_type') or request_info.get('theme')}"

        # [V13.0] Load DNA Constants
        dna_config = {}
        try:
            dna_path = os.path.join(self.base_dir, "config", "pg_jili_visual_dna.json")
            if os.path.exists(dna_path):
                with open(dna_path, 'r', encoding='utf-8') as f:
                    dna_config = json.load(f)
        except Exception as e:
            print(f"WARNING: Failed to load Visual DNA: {e}")

        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=gemini_key)


            style_profile = request_info.get("style", "3D_Premium")

            # [Phase 2] DNA and Visual Style Setup
            visual_ref = self.layout_info.get("visual_reference")
            dynamic_dna_prompt = ""

            tuned_style = self.layout_info.get("tuned_style")
            if tuned_style:
                 dynamic_dna_prompt = f"\n USER LOCKED STYLE (OVERRIDE): {tuned_style}\n"
            elif visual_ref:
                style_kws = ", ".join(visual_ref.get("style_keywords", []))
                palette = ", ".join(visual_ref.get("palette", []))
                materials = ", ".join(visual_ref.get("materials", []))
                lighting = visual_ref.get("lighting", "Studio")
                dynamic_dna_prompt = f"\n DYNAMIC STYLE: {style_kws}, Palette: {palette}, Materials: {materials}, Lighting: {lighting}\n"


            # [Phase 3] Check for Variant (Win State / VFX)

            variant = request_info.get("variant")

            # Component and Variant Context
            variant = request_info.get("variant")
            variant_prompt = f"\n VARIANT: {variant}\n" if variant else ""
            
            component = request_info.get("component")
            component_prompt = f"\n COMPONENT TYPE: {component}\n" if component else ""

            # [V22.0] Load Slot Art Guidelines from Knowledge Base
            guidelines_path = os.path.join(self.base_dir, "resources", "slot_art_guidelines.md")
            v22_guidelines = ""
            if os.path.exists(guidelines_path):
                with open(guidelines_path, "r", encoding="utf-8") as f:
                    v22_guidelines = f.read()

            # [V30.0] Style Specific Guidelines
            if style_profile == "PG_Flagship":
                pg_path = os.path.join(self.base_dir, "resources", "pgslot_guidelines.md")
                if os.path.exists(pg_path):
                    with open(pg_path, "r", encoding="utf-8") as f:
                        v22_guidelines += "\n\n=== PG FLAGSHIP GUIDELINES ===\n" + f.read()

            pinterest_styles = ["Cyberpunk_Neon", "Oriental_Wealth", "Ancient_Egypt", "Sweet_Candy", "Classic_Vegas", "Fantasy_Magic"]
            if style_profile in pinterest_styles:
                pin_path = os.path.join(self.base_dir, "resources", "pinterest_trending_styles.md")
                if os.path.exists(pin_path):
                    with open(pin_path, "r", encoding="utf-8") as f:
                        v22_guidelines += "\n\n=== TRENDING STYLE GUIDELINES ===\n" + f.read()

            system_instruction = f"""You are an ELITE Art Director for AAA slot games.
CURRENT ACTIVE STYLE: {style_profile}

Your ONLY job is to convert raw requirements into HYPER-SPECIFIC prompts for AI image generation.

[PROMPT ASSEMBLY RITUAL]
- If `excel_image_prompt` and `global_style` are provided, they form the BONE and SKIN of the prompt.
- Your task is to polish them into a professional generation string: `${{excel_image_prompt}}, ${{global_style}}, [AAA Enhancers]`.
- Ensure the subject is centered, isolated on white background as per core rules.

=== SLOT GAME ART BIBLE ===
{v22_guidelines}
==========================

=== ART DIRECTION ===
1. STYLE ADHERENCE: Respect {style_profile} DNA.
2. UI PERSPECTIVE: FLAT 2D FRONT VIEW ONLY for UI elements.
3. UI SHAPE: Ultra-slim, floating glassmorphism interface bars. NO pedestals or cabinets.
4. SYMBOLS: Chunky 3D objects with physical volume for symbols, Wild, and Scatter.
====================

Return ONLY the final detailed prompt text."""


            prompt_request = f"Requirement: {json.dumps(request_info, ensure_ascii=False)}"


            # [CRITICAL] Inject Excel Art Description / Image Prompt if available (Normalized Lookup)
            sub_type = str(request_info.get("sub_type") or "").strip()
            desc_data = None
            if hasattr(self, 'symbol_descriptions'):
                keys_to_try = [sub_type, sub_type.replace("SYM_", ""), sub_type.replace("M", "")]
                for k in keys_to_try:
                    if k in self.symbol_descriptions:
                        desc_data = self.symbol_descriptions[k]
                        break

            if desc_data:
                if isinstance(desc_data, dict):
                    request_info["excel_art_description"] = desc_data.get("description", "")
                    request_info["excel_image_prompt"] = desc_data.get("image_prompt", "")
                    request_info["excel_reference_image"] = desc_data.get("reference_image", "")
                    print(f"DEBUG: Injected Excel data for {sub_type}: {request_info['excel_image_prompt'][:50]}...")
                    if request_info["excel_reference_image"]:
                        print(f"DEBUG: Reference Image detected: {request_info['excel_reference_image']}")
                else:
                    request_info["excel_art_description"] = str(desc_data)

            # Inject Global Style if available
            if hasattr(self, 'manifest') and self.manifest.get("global_style"):
                request_info["global_style"] = self.manifest["global_style"]
                print(f"DEBUG: Injected Global Style: {request_info['global_style']}")

            # Merge with structural and tier enhancers
            context_additions = ""
            if component in ["UI_Header", "UI_Base", "UI_Pillar", "UI_Frame"]:
                 context_additions += " [STRICT UI CONSTRAINT]: 2D ORTHOGRAPHIC FRONT-VIEW only. Perfectly flat. No vanishing points."
                 if request_info.get("layout") == "H5_Mobile":
                     context_additions += " [H5 MOBILE]: Design must be ultra-thin floating glassmorphism UI. No thick cabinets."

            if context_additions:
                request_info["user_feedback"] = (request_info.get("user_feedback", "") + context_additions).strip()

            prompt_request = f"Requirement: {json.dumps(request_info, ensure_ascii=False)}"

            response = client.models.generate_content(
                model='gemini-2.0-flash', 
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7
                ),
                contents=prompt_request
            )

            final_text = response.text.strip()

            # [V24.0] Apply visual "spells" based on component type
            spell = ""
            if "UI" in component or component == "Button":
                spell = _AAA_UI_RENDER + _AAA_UI_SPEC
            elif component in ["Symbol", "Wild", "Scatter"]:
                spell = _AAA_SYMBOL_SPEC + _AAA_GLOBAL_RENDER
            elif component == "Background":
                spell = ", atmospheric depth effect, high-end 3D background" + _AAA_GLOBAL_RENDER

            if spell and spell not in final_text:
                final_text += f", {spell}"

            # Debug Log
            try:
                debug_file = os.path.join(self.base_dir, "captured_prompt.txt")
                with open(debug_file, "a", encoding="utf-8") as f:
                     f.write(f"\n[AI_REASONED | {component} | {sub_type or 'Main'}]\n{final_text}\n" + "-"*50 + "\n")
            except: pass

            return final_text

        except Exception as e:
            print(f"WARNING: Prompt reasoning failed: {e}. Falling back.")
            return f"AAA Game Asset: {request_info.get('theme')} {request_info.get('component')} {request_info.get('sub_type') or ''}"


    def get_grid_layout(self, width, height, layout_mode="Cabinet", custom_layout=None):

        """[V20.9] """

        manifest = self.manifest if hasattr(self, 'manifest') else {}

        cfg = manifest.get("layout_config", {})


        # 1.  (: Excel >  > )

        try:

            sw = float(cfg.get("symbol_w")) if cfg.get("symbol_w") else 140

            if sw <= 0: sw = 140

        except: sw = 140


        try:

            sh = float(cfg.get("symbol_h")) if cfg.get("symbol_h") else 140

            if sh <= 0: sh = 140

        except: sh = 140


        rows = cfg.get("rows") if cfg.get("rows") and int(cfg.get("rows")) > 0 else 3

        cols = cfg.get("cols") if cfg.get("cols") and int(cfg.get("cols")) > 0 else 5


        #  10px

        spacing_x = getattr(self, "current_spacing_x", 10)

        spacing_y = getattr(self, "current_spacing_y", 10)


        # 2. 

        grid_total_w = (cols * sw + (cols - 1) * spacing_x)

        grid_total_h = (rows * sh + (rows - 1) * spacing_y)


        # 3.  (Excel )

        canvas_w = cfg.get("canvas_w") or (720 if layout_mode == "H5_Mobile" else 1280)

        canvas_h = cfg.get("canvas_h") or (1280 if layout_mode == "H5_Mobile" else 720)


        # [V20.9] 

        fit_scale = 1.0

        if grid_total_w > canvas_w:

            fit_scale = (canvas_w - 20) / grid_total_w #  20px 

            print(f"[WARN] [Layout Engine]  ({grid_total_w} > {canvas_w}) x{fit_scale:.2f}")


        sw *= fit_scale

        sh *= fit_scale

        spacing_x *= fit_scale

        spacing_y *= fit_scale

        grid_total_w *= fit_scale

        grid_total_h *= fit_scale


        # 4.  ()

        #    [V21.2]  LOGO / 

        #    top_reserve_ratio = 12%  bannerHUD bottom 20%  compose 

        #     = canvas_h * (1 - 0.12 - 0.20) = 68%

        #    Grid  68% 

        top_reserve_ratio = cfg.get("top_reserve_ratio", 0.12)  #  Excel 

        hud_reserve_ratio  = cfg.get("hud_reserve_ratio",  0.20)

        usable_top    = canvas_h * top_reserve_ratio

        usable_bottom = canvas_h * (1.0 - hud_reserve_ratio)

        usable_h      = usable_bottom - usable_top


        start_x = (canvas_w - grid_total_w) / 2

        start_y = usable_top + (usable_h - grid_total_h) / 2   # 


        # 5.  ( width/height 1024x2048)

        scale_x = width / canvas_w

        scale_y = height / canvas_h


        result = {

            "rows": rows, "cols": cols,

            "symbol_w": sw * scale_x, "symbol_h": sh * scale_y,

            "spacing_x": spacing_x * scale_x, "spacing_y": spacing_y * scale_y,

            "startX": start_x * scale_x, "startY": start_y * scale_y,

            "total_w": grid_total_w * scale_x, "total_h": grid_total_h * scale_y,

            # 

            "top_reserve_px": usable_top * scale_y,

            "hud_top_px":     usable_bottom * scale_y,

        }

        #  Key

        result["start_x"] = result["startX"]

        result["start_y"] = result["startY"]

        if custom_layout:
            result.update(custom_layout)

        return result


    def _calculate_grid_position(self, row, col, layout=None):

        """[V17.0] """

        if layout is None:

            layout = self.get_grid_layout(1280, 720, self.layout_mode)


        x = layout['start_x'] + col * (layout['symbol_w'] + layout['spacing_x'])

        y = layout['start_y'] + row * (layout['symbol_h'] + layout['spacing_y'])

        return x, y


    def analyze_psd(self, psd_path):

        """[PSD Constraint V2]  PSD  layout_info  layout_constraints"""

        if not os.path.exists(psd_path):

            print(f"Error: PSD not found at {psd_path}")

            return None


        print(f"Analyzing PSD Template: {psd_path}...")

        try:

            psd = PSDImage.open(psd_path)

            self.layout_info = {

                "width": psd.width,

                "height": psd.height,

                "layers": []

            }


            def extract_bounds(layers, depth=0):

                for layer in layers:

                    info = {

                        "name": layer.name,

                        "kind": str(layer.kind),

                        "visible": layer.visible,

                        "left": layer.left,

                        "top": layer.top,

                        "width": layer.width,

                        "height": layer.height

                    }

                    self.layout_info["layers"].append(info)

                    if layer.is_group():

                        extract_bounds(layer, depth + 1)


            extract_bounds(psd)


            # ---  Grid  ---

            symbols = [l for l in self.layout_info["layers"] if "symbol" in l["name"].lower() and l["width"] > 50]

            if symbols:

                symbols.sort(key=lambda l: (l["top"], l["left"]))

                first = symbols[0]

                self.layout_info["dynamic_grid"] = {

                    "symbol_size": first["width"],

                    "grid_startX": first["left"],

                    "grid_startY": first["top"],

                    "spacing": 10,

                    "columns": 5,

                    "rows": 3

                }

                next_row = [s for s in symbols if abs(s["top"] - first["top"]) < 5 and s["left"] > first["left"]]

                if next_row:

                    next_row.sort(key=lambda l: l["left"])

                    self.layout_info["dynamic_grid"]["spacing"] = next_row[0]["left"] - (first["left"] + first["width"])

                print(f"Detected Dynamic Grid: {self.layout_info['dynamic_grid']}")


            # ---  ---

            btns = [l for l in self.layout_info["layers"] if any(k in l["name"].lower() for k in ["spin", "btn", "button", "buy", "bonus"])]

            if btns:

                self.layout_info["dynamic_buttons"] = {}

                for b in btns:

                    self.layout_info["dynamic_buttons"][b["name"]] = {

                        "x": b["left"], "y": b["top"], "w": b["width"], "h": b["height"]

                    }

                print(f"Detected Dynamic Buttons: {list(self.layout_info['dynamic_buttons'].keys())}")


            # [PSD Constraint]  PSDConstraintExtractor 

            if _HAS_CONSTRAINT_EXTRACTOR:

                try:

                    extractor = PSDConstraintExtractor(psd_path)

                    self.layout_constraints = extractor.extract()

                    lc = self.layout_constraints

                    print(f"[PSD Constraint] [OK]  AI ")


                    #   PSD  manifest.layout_config 

                    # get_grid_layout()  manifest.layout_config

                    #  Excel  PSD 

                    if not hasattr(self, 'manifest') or self.manifest is None:

                        self.manifest = {}

                    psd_layout = {}

                    if lc.canvas_w and lc.canvas_h:

                        psd_layout["canvas_w"] = lc.canvas_w

                        psd_layout["canvas_h"] = lc.canvas_h

                    if lc.symbol_cell:

                        psd_layout["symbol_w"] = lc.symbol_cell.width

                        psd_layout["symbol_h"] = lc.symbol_cell.height

                    if lc.grid_cols:

                        psd_layout["cols"] = lc.grid_cols

                    if lc.grid_rows:

                        psd_layout["rows"] = lc.grid_rows

                    # PSD  Excel  PSD 

                    existing = self.manifest.get("layout_config", {})

                    existing.update(psd_layout)

                    self.manifest["layout_config"] = existing

                    print(f"[PSD Constraint]  manifest.layout_config  PSD : "

                          f"canvas={lc.canvas_w}x{lc.canvas_h}, "

                          f"symbol={lc.symbol_cell.width if lc.symbol_cell else '?'}x"

                          f"{lc.symbol_cell.height if lc.symbol_cell else '?'}, "

                          f"grid={lc.grid_cols}x{lc.grid_rows}")


                    #  layout_info dynamic_grid

                    if lc.symbol_cell:

                        if not self.layout_info.get("dynamic_grid"):

                            self.layout_info["dynamic_grid"] = {}

                        self.layout_info["dynamic_grid"]["symbol_size"] = lc.symbol_cell.width

                        self.layout_info["dynamic_grid"]["columns"] = lc.grid_cols

                        self.layout_info["dynamic_grid"]["rows"] = lc.grid_rows


                except Exception as e:

                    print(f"[PSD Constraint] [WARN] : {e}")


            print(f" {len(self.layout_info['layers'])} ")

            return self.layout_info

        except Exception as e:

            print(f"Failed to analyze PSD: {e}")

            return None


    def run_slicer(self, image_path):

        """ (V2:  Grid )"""

        slicer_script = os.path.join(os.path.dirname(__file__), 'smart_slicer.py')

        print(f"Running Smart Slicer V2 on {image_path}...")


        import json

        grid_info = json.dumps(self.default_5x3)


        try:

            cmd = [sys.executable, slicer_script, image_path, "--grid", grid_info]

            subprocess.run(cmd, check=True)

            return True

        except Exception as e:

            print(f"Smart Slicer failed: {e}")

            return False


    def run_assembler(self):

        """"""

        assembler_script = os.path.join(os.path.dirname(__file__), 'assemble_scene.py')

        print("Running Scene Assembler...")

        try:

            subprocess.run([sys.executable, assembler_script], check=True)

            return True

        except Exception as e:

            print(f"Scene Assembler failed: {e}")

            return False


    def generate_structured_psd_jsx(self, parts_info, original_width, original_height, jsx_path):

        """ Photoshop JSX """

        print(f"Generating Structured JSX at {jsx_path}...")


        #  ( KnockoutClash )

        groups = {

            "Background": [],

            "Jackpot": [],     #  JP 

            "Symbols": [],

            "UI_Main": [],     # 

            "UI_Buttons": [],  # BuyBonus, Spin, Menu

            "Others": []

        }


        for part in parts_info:

            name = part['name'].lower()

            if any(k in name for k in ['bg', 'background', 'env']):

                groups["Background"].append(part)

            elif any(k in name for k in ['jp', 'grand', 'major', 'minor', 'mini']):

                groups["Jackpot"].append(part)

            elif any(k in name for k in ['symbol', 'sym', 'tiger', 'low_pay', 'high_pay']):

                groups["Symbols"].append(part)

            elif any(k in name for k in ['frame', 'panel', 'base']):

                groups["UI_Main"].append(part)

            elif any(k in name for k in ['btn', 'button', 'buy', 'spin', 'menu', 'info', 'history']):

                groups["UI_Buttons"].append(part)

            else:

                groups["Others"].append(part)


        jsx_lines = []

        for group_name, parts in groups.items():

            if not parts: continue


            # 

            group_var = f"group_{group_name}"

            jsx_lines.append(f'    var {group_var} = doc.layerSets.add();')

            jsx_lines.append(f'    {group_var}.name = "[{group_name}]";')


            for part in parts:

                fpath = os.path.abspath(part['path']).replace("\\", "/")

                p_name = part['name']

                x, y = part['x'], part['y']


                jsx_lines.append(f"""

    (function() {{

        var fileRef = new File("{fpath}");

        if (fileRef.exists) {{

            // 1. 

            var tempDoc = open(fileRef);

            tempDoc.selection.selectAll();

            tempDoc.selection.copy();

            tempDoc.close(SaveOptions.DONOTSAVECHANGES);


            // 2. 

            app.activeDocument = doc;

            var pastedLayer = doc.paste();

            pastedLayer.name = "{p_name}";

            pastedLayer.move({group_var}, ElementPlacement.PLACEATEND);


            // 3.  ()

            try {{

                var bounds = pastedLayer.bounds; 

                var currentLeft = bounds[0].value;

                var currentTop = bounds[1].value;

                pastedLayer.translate({x} - currentLeft, {y} - currentTop);

            }} catch (e) {{

                // 

                // alert(" " + "{p_name}" + " : " + e);

            }}

        }}

    }})();""")


        full_jsx = f"""

// Auto-generated by Slot AI Creator

#target photoshop


function main() {{

    // 

    $.localization = false;


    //  ( 1280x720 )

    var doc = app.documents.add({original_width}, {original_height}, 72, "Structured_Slot_Assets", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);


{chr(10).join(jsx_lines)}


    app.activeDocument = doc;

    alert(" PSD ");

}}


main();

"""

        with open(jsx_path, 'w', encoding='utf-8') as f:

            f.write(full_jsx)

        print("Structured JSX generated.")


    def auto_process_image(self, image_path):

        """ +  JSX"""

        if not os.path.exists(image_path):

            print(f"Error: Image not found at {image_path}")

            return False


        print(f"\n[] : {os.path.basename(image_path)}...")


        # 1. 

        if self.run_slicer(image_path):

            # 2.  JSX

            image_name = os.path.splitext(os.path.basename(image_path))[0]

            parts_json = os.path.join(self.output_dir, f"{image_name}_parts_ai", "parts.json")


            if os.path.exists(parts_json):

                import json

                with open(parts_json, 'r', encoding='utf-8') as f:

                    parts = json.load(f)


                # 

                try:

                    with Image.open(image_path) as img:

                        w, h = img.size

                        print(f"Dynamic Dimension Detected: {w}x{h}")

                except:

                    w, h = 1280, 720


                jsx_path = os.path.join(self.output_dir, f"structured_import_{image_name}.jsx")

                self.generate_structured_psd_jsx(parts, w, h, jsx_path)

                print(f"---  ---")

                print(f": {jsx_path}")

                return jsx_path

        return False


    def import_requirements(self, excel_path):

        """[ V20.6] AI """

        import pandas as pd

        import json

        if not os.path.exists(excel_path):

            raise FileNotFoundError(f"Excel file not found: {excel_path}")


        print(f"\n[Data Mapper]  Excel : {excel_path}")


        # 1.  (Raw Extraction)

        xl = pd.ExcelFile(excel_path)

        raw_data = {}

        for sheet in xl.sheet_names:

            #  200 

            df = xl.parse(sheet, nrows=200).dropna(how='all').fillna("")


            # 

            sheet_rows = []

            for _, row in df.iterrows():

                row_dict = {}

                for i, col_name in enumerate(df.columns):

                    val = str(row[col_name]).strip()

                    if val and val.lower() != "nan":

                        # Unnamed 

                        key = str(col_name) if not str(col_name).startswith("Unnamed") else f"Col_{i}"

                        row_dict[key] = val[:500]

                if row_dict:

                    sheet_rows.append(row_dict)


            if sheet_rows:

                raw_data[sheet] = sheet_rows


        # 2.  Manifest 

        manifest = {

            "symbols": [],

            "symbol_descriptions": {},

            "symbol_sizes": {},       # [V21.2]  {name: {original_size, output_size}}

            "game_info": {

                "core_theme": "",

                "project_desc": "",

                "scenery_desc": "",

                "resolution_text": ""

            },

            "theme_hint": os.path.basename(excel_path).split('_')[-1].replace('.xlsx', ''),

            "layout_config": {}

        }


        # 3.  Gemini 

        gemini_key = os.environ.get("GEMINI_API_KEY")

        if not gemini_key:

            print("[]  GEMINI_API_KEY")

            return manifest


        print("[Data Mapper]  Gemini 2.5 Pro ...")

        try:

            from google import genai

            from google.genai import types

            client = genai.Client(api_key=gemini_key)


            system_instruction = """
# Role
你是一位頂尖的 Slot（老虎機）遊戲美術總監與 AI 詠唱工程師。你精通如何將遊戲企劃需求，精準轉化為可直接用於 Google Image API 的高品質英文生成指令 (Prompt)。

# Task
仔細閱讀使用者提供的【Slot 遊戲企劃文件】，萃取所有需要生成的美術資產（包含 Wild, Scatter, High-pay, Low-pay 及 UI 裝飾），並將其轉換為嚴格的 JSON 格式。

# Guidelines for Image Prompts
1. 語言轉換：原始企劃可能是中文，但你生成的 `image_prompt` 必須是「純英文」，且語法結構需符合 AI 繪圖邏輯（主體在前，細節在後）。
2. 主體與構圖：Slot 美術後續需要拆圖與綁定骨架做動態。Prompt 必須強調物件居中、完整入鏡，避免主體與細節被裁切 (e.g., centered composition, full object visible)。
3. 背景控制：為了方便後續在 Photoshop 中透過腳本自動去背，每個 Prompt 務必加上 `isolated on solid pure white background`。
4. 風格統一：根據企劃書的整體氛圍，提煉出一組共用的 `global_style`（例如：3D glossy render, vibrant colors, casino slot icon, thick clean outlines），確保整套美術風格高度一致。
5. [重要 - 數據提取精準度]：保留 Excel 中的所有關鍵視覺描述（例如顏色、特殊框架等），並將其整合進 `image_prompt`。
6. [參考圖處理]：若企劃中包含圖片連結 (URL) 或參考圖片路徑，務必將其填入 `reference_image` 欄位。

# Output Format (Strict Constraint)
你必須且「只能」輸出符合以下結構的 JSON 格式字串。絕對不要加上任何 Markdown 語法（例如 ```json）、不要有任何問候語、解釋或多餘的文字，確保後端系統能直接進行 JSON.parse()。

{
  "theme": "遊戲主題名稱 (中文)",
  "global_style": "統一的風格英文關鍵字",
  "layout_config": {
    "canvas_w": 720,
    "canvas_h": 1280,
    "symbol_w": 140,
    "symbol_h": 140,
    "rows": 3,
    "cols": 5
  },
  "assets": [
    {
      "name": "符號名稱 (如：M1, WILD, SYM_1)",
      "tier": "資產層級 (Wild, Scatter, H-pay, L-pay, UI 等)",
      "art_description": "原始企劃的中文描述",
      "image_prompt": "精準的英文生圖指令（不含 global_style，僅描述主體與動作，需含 isolated on solid pure white background）",
      "reference_image": "參考圖片連結或路徑 (若無則留空)",
      "original_size": [560, 560],
      "output_size": [140, 140]
    }
  ]
}
"""


            # [V20.8] 

            full_text_context = ""

            for s, rows in raw_data.items():

                full_text_context += f"\n--- Sheet: {s} ---\n"

                for r in rows:

                    full_text_context += " | ".join([f"{k}:{v}" for k, v in r.items()]) + "\n"


            prompt_content = f"\n{full_text_context[:10000]}" # 


            response = client.models.generate_content(

                model='gemini-1.5-pro',

                config=types.GenerateContentConfig(

                    system_instruction=system_instruction,

                    temperature=0.2 

                ),

                contents=prompt_content

            )


            #  Markdown  JSON

            res_text = response.text.strip()

            if "```json" in res_text:

                res_text = res_text.split("```json")[1].split("```")[0].strip()

            elif "```" in res_text:

                 res_text = res_text.split("```")[1].strip()


            mapped_data = json.loads(res_text)

            print("[Data Mapper] ")


            # 4.  AI  Manifest

            if "global_style" in mapped_data:
                manifest["global_style"] = mapped_data["global_style"]
                print(f"[Data Mapper] Global Style: {manifest['global_style']}")

            if "game_info" in mapped_data:
                manifest["game_info"].update(mapped_data["game_info"])
                if mapped_data["game_info"].get("core_theme"):
                    manifest["theme_hint"] = mapped_data["game_info"]["core_theme"]


            if "layout_config" in mapped_data:

                manifest["layout_config"] = mapped_data["layout_config"]

                print(f"[Data Mapper] : {manifest['layout_config']}")


            if "assets" in mapped_data:

                for sym in mapped_data["assets"]:

                    raw_sym_name = str(sym.get("name", "")).strip()
                    sym_name = raw_sym_name.replace("SYM_", "").strip()
                    sym_desc = str(sym.get("art_description", "")).strip()
                    sym_image_prompt = str(sym.get("image_prompt", "")).strip()
                    sym_ref_img = str(sym.get("reference_image", "")).strip()

                    if sym_name and sym_name not in manifest["symbols"]:
                        manifest["symbols"].append(sym_name)
                        # Store description, prompt, and reference image
                        description_data = {
                            "description": sym_desc,
                            "image_prompt": sym_image_prompt,
                            "reference_image": sym_ref_img
                        }
                        manifest["symbol_descriptions"][sym_name] = description_data
                        manifest["symbol_descriptions"][f"SYM_{sym_name}"] = description_data
                        if sym_name.isdigit():
                            manifest["symbol_descriptions"][f"M{sym_name}"] = description_data

                        # [V21.2]   

                        orig = sym.get("original_size", [560, 560])

                        outp = sym.get("output_size",   [140, 140])

                        manifest["symbol_sizes"][sym_name] = {

                            "original_size": orig,

                            "output_size":   outp,

                        }

                        print(f"  Symbol [{sym_name}]: orig={orig}, out={outp}")


            print(f"[]  [{manifest['theme_hint']}],  {len(manifest['symbols'])} ")
            
            # [Fix] Persist to instance
            self.manifest = manifest
            self.symbol_descriptions = manifest.get("symbol_descriptions", {})
            
            return manifest


        except Exception as e:

            print(f"[Error] [Data Mapper] AI : {e}")

            print(f"AI : {response.text if 'response' in locals() else ''}")

            return manifest


    def _sanitize_filename(self, name):

        """"""

        import re

        # 

        name = name.replace("\n", "").replace("\r", "")

        # 

        filename = re.sub(r'[^\w\s\u4e00-\u9fff-]', '_', name)

        # 

        filename = re.sub(r'[\s_]+', '_', filename).strip('_')

        return filename



    def compose_preview_image(self, assets, theme, layout_mode="Cabinet"):

        """

        [V21.0]  Slot    Z-Index 


          Layer 0: Background

          Layer 1: Reel Board ()

          Layer 2: 3x5 Symbol Grid

          Layer 3: Mascot (/)

          Layer 4: UI Frame ()

          Layer 5: Bottom HUD Panel ()

          Layer 6: Buttons (Spin  HUD )

        """

        from PIL import ImageDraw

        try:

            #  [V22.0] Master Canvas Initialization () 

            # 

            if layout_mode == "H5_Mobile":

                w, h = 720, 1280

            else:

                w, h = 1280, 720


            master_canvas = Image.new("RGBA", (w, h), (0, 0, 0, 255))

            draw_master = ImageDraw.Draw(master_canvas)


            #  Layer 0:  (Background Cover ) 

            if assets.get("background"):

                raw_bg = Image.open(assets["background"]).convert("RGBA")

                #  Cover 

                src_ratio = raw_bg.width / raw_bg.height

                target_ratio = w / h


                if src_ratio > target_ratio:

                    # 

                    new_h = h

                    new_w = int(raw_bg.width * (h / raw_bg.height))

                else:

                    # 

                    new_w = w

                    new_h = int(raw_bg.height * (w / raw_bg.width))


                bg_resized = raw_bg.resize((new_w, new_h), Image.Resampling.LANCZOS)

                # 

                left = (new_w - w) // 2

                top = (new_h - h) // 2

                bg_final = bg_resized.crop((left, top, left + w, top + h))

                master_canvas.paste(bg_final, (0, 0))

                print(f"DEBUG: Background Cover applied: {new_w}x{new_h} -> {w}x{h}")


            is_pg = any(x in theme.upper() for x in ["PG", "SOFT", "MAHJONG", "FORTUNE"])


            # 

            L = self.get_grid_layout(w, h, layout_mode)


            rows = int(L.get("rows", 3))

            cols = int(L.get("cols", 5))

            sym_w = float(L["symbol_w"])

            sym_h = float(L["symbol_h"])

            spc_x = float(L["spacing_x"])

            spc_y = float(L["spacing_y"])

            startX = float(L["start_x"])

            startY = float(L["start_y"])


            # 

            grid_total_w = cols * sym_w + (cols - 1) * spc_x

            grid_total_h = rows * sym_h + (rows - 1) * spc_y

            reel_pad = max(int(w * 0.015), 8)   # 

            reel_left   = int(startX) - reel_pad

            reel_top    = int(startY) - reel_pad

            reel_right  = int(startX + grid_total_w) + reel_pad

            reel_bottom = int(startY + grid_total_h) + reel_pad


            # HUD  20% 

            hud_top = int(h * 0.80)

            hud_bottom = h


            #  Layer 1: Reel Board () 

            reel_board_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))

            draw = ImageDraw.Draw(reel_board_layer)

            corner_r = max(int(min(grid_total_w, grid_total_h) * 0.04), 12)

            draw.rounded_rectangle(

                [reel_left, reel_top, reel_right, reel_bottom],

                radius=corner_r,

                fill=(0, 0, 0, 180) # 

            )

            master_canvas.alpha_composite(reel_board_layer)

            print(f"DEBUG: Reel Board drawn at [{reel_left},{reel_top}] -> [{reel_right},{reel_bottom}]")


            #  Layer 2: 35 Symbol Grid 

            symbol_pool = []

            if assets.get("symbol_list"):

                symbol_pool.extend(assets["symbol_list"])

                print(f"DEBUG: Loaded {len(assets['symbol_list'])} symbols from symbol_list")

            for k in ["wild", "master_symbol", "scatter", "symbol_wild"]:

                if assets.get(k) and assets[k] not in symbol_pool:

                    symbol_pool.append(assets[k])

                    print(f"DEBUG: Added {k} to symbol pool")

            if assets.get("symbols") and isinstance(assets["symbols"], dict):

                for sym_path in assets["symbols"].values():

                    if sym_path not in symbol_pool:

                        symbol_pool.append(sym_path)

            print(f"DEBUG: Total symbol pool size: {len(symbol_pool)}")


            #  [V21.2]  +  Symbol  

            # :

            #   1.  Center-Anchor  (Pop-out, No squish)

            #   2.  Symbol Layer 

            #   3. 

            #   4. UI Frame 


            # 

            manifest_local = self.manifest if hasattr(self, 'manifest') else {}

            sym_sizes = manifest_local.get("symbol_sizes", {})

            #  Excel 

            DEFAULT_ORIG = [560, 560]

            DEFAULT_OUT  = [140, 140]


            if symbol_pool:

                # 

                sym_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))

                sym_idx = 0


                for row in range(rows):

                    for col in range(cols):

                        sym_path = symbol_pool[sym_idx % len(symbol_pool)]

                        sym_idx += 1

                        try:

                            sym_img = Image.open(sym_path).convert("RGBA")


                            #  basename  key 

                            sym_key = os.path.splitext(os.path.basename(sym_path))[0]

                            sizes = sym_sizes.get(sym_key, {})

                            orig_w, orig_h = sizes.get("original_size", DEFAULT_ORIG)

                            out_w,  out_h  = sizes.get("output_size",   DEFAULT_OUT)


                            # render_scale = 

                            render_scale = sym_w / max(out_w, 1)   # grid cell px / output px

                            render_w = int(orig_w * render_scale)

                            render_h = int(orig_h * render_scale)

                            #  grid_total  60%

                            max_dim = int(max(grid_total_w, grid_total_h) * 0.60)

                            if render_w > max_dim or render_h > max_dim:

                                clamp = max_dim / max(render_w, render_h)

                                render_w = int(render_w * clamp)

                                render_h = int(render_h * clamp)


                            sym_resized = sym_img.resize(

                                (render_w, render_h), Image.Resampling.LANCZOS

                            )


                            #  (Center-Anchor)

                            cx = startX + col * (sym_w + spc_x) + sym_w / 2

                            cy = startY + row * (sym_h + spc_y) + sym_h / 2


                            #  dest  Pillow alpha_composite 

                            px = int(cx - render_w / 2)

                            py = int(cy - render_h / 2)

                            # Pillow  dest offset 

                            crop_left = max(0, -px)

                            crop_top  = max(0, -py)

                            crop_right  = render_w - max(0, px + render_w - w)

                            crop_bottom = render_h - max(0, py + render_h - h)

                            if crop_right > crop_left and crop_bottom > crop_top:

                                patch = sym_resized.crop((crop_left, crop_top, crop_right, crop_bottom))

                                sym_layer.alpha_composite(

                                    patch,

                                    (max(0, px), max(0, py))

                                )

                        except Exception as e:

                            print(f"ERROR: Failed to place symbol at [{row},{col}]: {e}")


                #  sym_layer  3x5 

                sym_mask = Image.new("L", (w, h), 0)

                sym_mask_draw = ImageDraw.Draw(sym_mask)

                #  =  reel board  reel_pad

                sym_mask_draw.rectangle(

                    [reel_left, reel_top, reel_right, reel_bottom],

                    fill=255

                )

                sym_layer.putalpha(

                    Image.composite(

                        sym_layer.split()[3],  #  alpha

                        Image.new("L", (w, h), 0),

                        sym_mask           # ==

                    )

                )

                master_canvas.alpha_composite(sym_layer)

                print(f"DEBUG: Symbol layer composited with shadow, clipped to reel [{reel_left},{reel_top}]->[{reel_right},{reel_bottom}]")

            else:

                print("WARNING: Symbol pool is empty! No symbols will be rendered in grid.")


            #  Layer 3: Mascot

            if assets.get("mascot"):

                mascot_img = Image.open(assets["mascot"]).convert("RGBA")


                #  35%PG 25%

                max_h_ratio = 0.25 if is_pg else 0.35

                mascot_target_h = h * max_h_ratio

                m_ratio = mascot_target_h / mascot_img.height

                mascot_w = int(mascot_img.width * m_ratio)

                mascot_h = int(mascot_target_h)

                mascot_resized = mascot_img.resize((mascot_w, mascot_h), Image.Resampling.LANCZOS)


                # 

                if layout_mode == "H5_Mobile":

                    # H5

                    mx = max(0, reel_left - mascot_w - reel_pad)

                    my = reel_top

                else:

                    # Cabinet Pillar

                    mx = max(0, reel_left - mascot_w - reel_pad)

                    my = max(0, int(startY + grid_total_h / 2 - mascot_h / 2))


                #   1 

                max_allowed_w = w - reel_right - reel_pad * 2 if layout_mode != "H5_Mobile" else reel_left - reel_pad * 2

                if max_allowed_w > 20 and mascot_w > max_allowed_w:

                    shrink = max_allowed_w / mascot_w

                    mascot_w = int(mascot_w * shrink)

                    mascot_h = int(mascot_h * shrink)

                    mascot_resized = mascot_resized.resize((mascot_w, mascot_h), Image.Resampling.LANCZOS)

                    print(f"DEBUG: Mascot shrunk to fit side lane: {mascot_w}x{mascot_h}")


                #   2 HUD  

                if my + mascot_h > hud_top:

                    my = max(0, hud_top - mascot_h)


                #   3xy  

                mx = max(0, min(mx, w - mascot_w))

                my = max(0, min(my, h - mascot_h))


                # [V21.2] Mascot 

                mascot_final = self._add_drop_shadow(mascot_resized, offset=(15, 10), radius=20, alpha=110)


                master_canvas.alpha_composite(mascot_final, (mx, my))

                print(f"DEBUG: Mascot placed at ({mx},{my}) with shadow, size {mascot_w}x{mascot_h}")


            #  Layer 4: UI LEGO Assembly

            # 1.  (Pillars)

            if assets.get("ui_pillar"):

                pillar_img = Image.open(assets["ui_pillar"]).convert("RGBA")

                #  85%

                p_h = int(h * 0.85)

                p_w = int(pillar_img.width * (p_h / pillar_img.height))

                pillar_resized = pillar_img.resize((p_w, p_h), Image.Resampling.LANCZOS)


                # 

                master_canvas.alpha_composite(pillar_resized, (0, int((h - p_h)/2)))

                #  ()

                pillar_right = ImageOps.mirror(pillar_resized)

                master_canvas.alpha_composite(pillar_right, (w - p_w, int((h - p_h)/2)))

                print(f"DEBUG: UI Pillars assembled (Width: {p_w}px)")


            # 2.  (Header)

            if assets.get("ui_header"):

                header_img = Image.open(assets["ui_header"]).convert("RGBA")

                h_w = w

                h_h = int(header_img.height * (h_w / header_img.width))

                header_resized = header_img.resize((h_w, h_h), Image.Resampling.LANCZOS)

                master_canvas.alpha_composite(header_resized, (0, 0))

                print(f"DEBUG: UI Header assembled (Height: {h_h}px)")


            # 3.  (Base)

            if assets.get("ui_base"):

                base_img = Image.open(assets["ui_base"]).convert("RGBA")

                b_w = w

                b_h = int(base_img.height * (b_w / base_img.width))

                base_resized = base_img.resize((b_w, b_h), Image.Resampling.LANCZOS)

                # 

                master_canvas.alpha_composite(base_resized, (0, h - b_h))

                print(f"DEBUG: UI Base assembled (Height: {b_h}px)")



            #  Layer 5: Bottom HUD Panel

            hud_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))

            hud_draw = ImageDraw.Draw(hud_layer)

            #  hud_top 

            hud_height = hud_bottom - hud_top

            for dy in range(hud_height):

                alpha = int(180 * (dy / hud_height))   # 0 -> 180

                hud_draw.line(

                    [(0, hud_top + dy), (w, hud_top + dy)],

                    fill=(10, 5, 25, alpha)

                )

            master_canvas.alpha_composite(hud_layer)

            print(f"DEBUG: HUD Panel drawn from y={hud_top} to y={hud_bottom}")


            #  Layer 6: ButtonsSpin  HUD /

            if assets.get("buttons"):

                buttons_layout = self.layout_info.get("dynamic_buttons", {})

                hud_center_y = hud_top + (hud_height // 2)


                for name, path in assets["buttons"].items():

                    try:

                        btn_img = Image.open(path).convert("RGBA")

                    except Exception as e:

                        print(f"ERROR: Cannot open button {name}: {e}")

                        continue


                    if name in buttons_layout:

                        #  PSD 

                        rect = buttons_layout[name]

                        bx = int(rect['x'] * scaleX)

                        by = int((rect.get('top') or rect.get('y', 0)) * scaleY)

                        bw = int((rect.get('width') or rect.get('w', btn_img.width)) * scaleX)

                        b_ratio = bw / btn_img.width

                        bh = int(btn_img.height * b_ratio)

                    elif "spin" in name.lower():

                        # Spin  HUD 

                        spin_target_h = int(hud_height * 0.75)

                        b_ratio = spin_target_h / btn_img.height

                        bw = int(btn_img.width * b_ratio)

                        bh = spin_target_h

                        bx = int(w * 0.82) - bw // 2      #  82% 

                        by = hud_center_y - bh // 2        #  HUD

                    else:

                        # HUD 

                        general_target_h = int(hud_height * 0.55)

                        b_ratio = general_target_h / btn_img.height

                        bw = int(btn_img.width * b_ratio)

                        bh = general_target_h

                        bx = int(w * 0.15)

                        by = hud_center_y - bh // 2


                    # 

                    bx = max(0, min(bx, w - bw))

                    by = max(0, min(by, h - bh))


                    # [V21.2] 

                    btn_with_shadow = self._add_drop_shadow(btn_img.resize((bw, bh), Image.Resampling.LANCZOS), offset=(5, 5), radius=10, alpha=160)

                    master_canvas.alpha_composite(btn_with_shadow, (bx, by))

                    print(f"DEBUG: Button [{name}] placed at ({bx},{by}) with shadow, size {bw}x{bh}")


            #   

            output_filename = f"preview_{theme}_{int(time.time())}.png"

            output_path = os.path.join(self.output_dir, output_filename)

            master_canvas.save(output_path)

            print(f"[OK] [Compose V21.0] Preview saved: {output_path}")

            return output_path


        except Exception as e:

            import traceback

            print(f"[FAIL] [Compose V21.0] Composition failed: {e}")

            traceback.print_exc()

            return assets.get("ui_frame")



    def generate_image_from_api(self, prompt, output_path, mock=False, layout_mode="Cabinet", use_critic=True, aspect_ratio=None):
        """[V26.4] Delegate image generation to robust APIClient."""
        
        if getattr(self, "stop_requested", False):
            print("[STOP] [ENGINE] Image generation cancelled by user stop signal.")
            return False
            
        from api_client import APIClient
        client = APIClient()
        return client.generate_image(prompt, output_path, mock=mock, layout_mode=layout_mode, aspect_ratio=aspect_ratio)

    def generate_assembly_jsx(self, assets, theme, jsx_path, layout_mode="Cabinet"):
        if layout_mode == "H5_Mobile":
            w, h = 720, 1280
        else:
            w, h = 1280, 720

        lines = [
            "// Auto-Generated Assembly JSX",
            "app.preferences.rulerUnits = Units.PIXELS;",
            "app.displayDialogs = DialogModes.NO;",
            f"var doc = app.documents.add({w}, {h}, 72, '{theme}_Auto_Assemble', NewDocumentMode.RGB, DocumentFill.TRANSPARENT);",
            "function placeImage(filepath, name) {",
            "   var fileRef = new File(filepath);",
            "   if(!fileRef.exists) return;",
            "   app.load(fileRef);",
            "   var srcDoc = app.activeDocument;",
            "   srcDoc.selection.selectAll();",
            "   srcDoc.selection.copy();",
            "   srcDoc.close(SaveOptions.DONOTSAVECHANGES);",
            "   doc.paste();",
            "   doc.activeLayer.name = name;",
            "}"
        ]

        if assets.get("background"):
            lines.append(f"placeImage('{assets['background'].replace(chr(92), '/')}'.replace('//','/'), 'Background');")
        # [V21.1] Symbols (Assets)
        if assets.get("assets"):
            for s, path in assets["assets"].items():
                lines.append(f"placeImage('{path.replace(chr(92), '/')}'.replace('//','/'), '{s}');")
        
        for ui_key in ["ui_pillar", "ui_base", "ui_header"]:
            if assets.get(ui_key):
                lines.append(f"placeImage('{assets[ui_key].replace(chr(92), '/')}'.replace('//','/'), '{ui_key}');")

        lines.append("alert('Assembly Complete!');")

        with open(jsx_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        
        return jsx_path

    def run_fully_autonomous(self, requirement, psd_path=None, excel_path=None, layout_mode="Cabinet", mock=False, style="3D_Premium", symbol_list=None, style_override=None, spacing_x=10, spacing_y=10, custom_layout=None, symbol_configs=None, task_id=None, update_callback=None):
        """[V27.0] 背景 Agent Queue 相容的全自主運行邏輯"""
        
        def _report(msg, logs=None):
            print(f"[{task_id or 'LOCAL'}] {msg}")
            if update_callback:
                update_callback(msg, logs)

        _report(f"Starting Autonomous Generation for: {requirement}", f"Initializing generation engine for theme: {requirement}")
        
        self.output_dir = os.path.join(self.output_root, f"{self._sanitize_filename(requirement)}_{int(time.time())}")
        os.makedirs(self.output_dir, exist_ok=True)
        
        results = {"components": {}}
        sanitized_theme = self._sanitize_filename(requirement)
        
        try:
            # 0. Load Excel Requirements if provided
            if excel_path and os.path.exists(excel_path):
                _report(f"Loading Excel Requirements: {os.path.basename(excel_path)}...")
                self.import_requirements(excel_path)
            elif psd_path and str(psd_path).endswith(".xlsx"): # Fallback for mislabeled paths
                _report(f"Loading Excel Requirements from psd_path: {os.path.basename(psd_path)}...")
                self.import_requirements(psd_path)

            # 1. Background
            _report("Generating Background...")
            bg_prompt = self._reason_prompt({"theme": requirement, "component": "Background", "style": style, "layout_mode": layout_mode})
            bg_path = os.path.join(self.output_dir, f"{sanitized_theme}_BG.png")
            # 模擬生成 (替換為你的生成 API if self.generate_image_from_api exists)
            self.generate_image_from_api(bg_prompt, bg_path, mock=mock, layout_mode=layout_mode)
            results["components"]["background"] = bg_path
            
            # 2. UI Components
            _report("Generating UI Frames...")
            for sub in ["UI_Header", "UI_Base", "UI_Pillar"]:
                _report(f"Rendering {sub}...")
                p = self._reason_prompt({"theme": requirement, "component": sub, "style": style, "layout_mode": layout_mode})
                path = os.path.join(self.output_dir, f"{sanitized_theme}_{sub}.png")
                self.generate_image_from_api(p, path, mock=mock, layout_mode=layout_mode)
                results["components"][sub.lower()] = path

            # 3. Symbols (now called assets)
            _report("Generating Core Assets...")
            results["components"]["assets"] = {}
            
            if hasattr(self, 'manifest') and self.manifest.get("symbols"): # manifest still uses symbols for logic
                targets = self.manifest["symbols"]
            else:
                targets = symbol_list or ["SYM_1", "WILD", "SCATTER"]

            for s in targets:
                _report(f"Rendering Symbol: {s}...")
                p = self._reason_prompt({"theme": requirement, "component": "Symbol", "sub_type": s, "style": style, "layout_mode": layout_mode})
                
                file_name = f"{sanitized_theme}_{s}.png"
                if "_" in s or s.startswith("SYM"):
                     file_name = f"{s}.png"
                
                path = os.path.join(self.output_dir, file_name)
                self.generate_image_from_api(p, path, mock=mock, layout_mode=layout_mode)
                results["components"]["assets"][s] = path

            # 4. Preview Composition & JSX Generation
            _report("Composing Preview Image & JSX...")
            layout_config = self.get_grid_layout(1280, 720, layout_mode, custom_layout=custom_layout) if layout_mode != "H5_Mobile" else self.get_grid_layout(720, 1280, layout_mode, custom_layout=custom_layout)
            
            preview_path = self.compose_preview_image(results["components"], requirement, layout_mode=layout_mode)
            
            jsx_path = os.path.join(self.output_dir, f"{sanitized_theme}_assembly.jsx")
            self.generate_assembly_jsx(results["components"], sanitized_theme, jsx_path, layout_mode)
            
            _report("Autonomous Generation Complete!", f"Preview available at {preview_path}")
            
            return {
                "status": "success",
                "image": preview_path,
                "components": results["components"],
                "prompt": bg_prompt,
                "jsx": jsx_path
            }
            
        except Exception as e:
            import traceback
            err = traceback.format_exc()
            _report(f"Generation Failed: {str(e)}", err)
            raise e
